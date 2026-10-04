// Builds teams and golf pairings from handicaps (two teams, foursomes):
// 1. Captains on opposite teams; team handicap totals as close as possible
// 2. Best ball day: each pair's opponents have about the same combined handicap
// 3. Singles day: everyone plays with at least 2 new people and never faces a best-ball
//    opponent again; ties go to closer singles handicaps
// Every option is searched, so this is meant for small groups (up to 16 players).

export interface PairingInput {
  playerIds: string[];
  handicaps: Record<string, number>;
  teamIds: [string, string];
  captains: Record<string, string>; // teamId -> memberId
  groupsPerRound: number; // tee times on the best ball and singles days
}

export interface PairingPlan {
  teams: Record<string, string[]>;
  fourball: string[][]; // [teamA, teamA, teamB, teamB] per tee time
  singles: string[][]; // [teamA, teamB, teamA, teamB] per tee time (two matches)
  teamGap: number; // difference in team handicap totals
}

type Pair = [string, string];

function* pairings(team: string[]): Generator<Pair[]> {
  if (team.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = team;
  for (let i = 0; i < rest.length; i++) {
    const others = rest.filter((_, j) => j !== i);
    for (const more of pairings(others)) yield [[first, rest[i]], ...more];
  }
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) yield [items[i], ...perm];
  }
}

function* combinations<T>(items: T[], k: number, start = 0): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = start; i <= items.length - k; i++) {
    for (const more of combinations(items, k - 1, i + 1)) yield [items[i], ...more];
  }
}

// Compares score arrays left to right
const better = (a: number[], b: number[] | null) => {
  if (!b) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

export function planPairings(input: PairingInput): PairingPlan {
  const { playerIds, handicaps, teamIds, captains, groupsPerRound } = input;
  const n = playerIds.length;
  if (n === 0 || n % 4 !== 0) throw new Error('The player count must be a multiple of 4 (foursomes).');
  if (n > 16) throw new Error('Generating supports up to 16 players.');
  if (n / 4 !== groupsPerRound) {
    throw new Error(`${n} players need ${n / 4} tee times per day, but the guide has ${groupsPerRound}.`);
  }
  const missing = playerIds.filter((id) => typeof handicaps[id] !== 'number' || Number.isNaN(handicaps[id]));
  if (missing.length) throw new Error('Every player needs a handicap.');
  const [teamA, teamB] = teamIds;
  const capA = captains[teamA];
  const capB = captains[teamB];
  if (!capA || !capB || capA === capB) throw new Error('Pick a different captain for each team.');
  if (!playerIds.includes(capA) || !playerIds.includes(capB)) throw new Error('Both captains must be on this trip.');

  // Tenths of a stroke as integers, so totals compare exactly
  const h = (id: string) => Math.round(handicaps[id] * 10);
  const byHandicap = [...playerIds].sort((a, b) => h(a) - h(b) || a.localeCompare(b));
  const sum = (ids: readonly string[]) => ids.reduce((t, id) => t + h(id), 0);

  // 1. Team splits with the smallest total difference
  const others = byHandicap.filter((id) => id !== capA && id !== capB);
  const total = sum(byHandicap);
  let bestGap = Infinity;
  let splits: [string[], string[]][] = [];
  for (const picks of combinations(others, n / 2 - 1)) {
    const a = [capA, ...picks];
    const b = byHandicap.filter((id) => !a.includes(id));
    const gap = Math.abs(2 * sum(a) - total);
    if (gap < bestGap) {
      bestGap = gap;
      splits = [];
    }
    if (gap === bestGap) splits.push([a, b]);
  }

  // 2. Best ball: pair up each team, then match pairs with similar combined handicaps
  const bestBall = (a: string[], b: string[]) => {
    let best: { score: number[]; matches: [Pair, Pair][] } | null = null;
    for (const pa of pairings(a)) {
      for (const pb of pairings(b)) {
        for (const order of permutations(pb)) {
          const gaps = pa.map((p, i) => Math.abs(sum(p) - sum(order[i])));
          const score = [Math.max(...gaps), gaps.reduce((t, g) => t + g, 0)];
          if (better(score, best?.score ?? null)) best = { score, matches: pa.map((p, i) => [p, order[i]]) };
        }
      }
    }
    return best!;
  };

  // 3. Singles: new groupmates, no repeat opponents, close handicaps
  const singlesDay = (a: string[], b: string[], matches: [Pair, Pair][]) => {
    const fridayGroup = new Map<string, Set<string>>();
    const fridayOpponents = new Map<string, Set<string>>();
    for (const [pa, pb] of matches) {
      for (const id of [...pa, ...pb]) fridayGroup.set(id, new Set([...pa, ...pb]));
      for (const id of pa) fridayOpponents.set(id, new Set(pb));
      for (const id of pb) fridayOpponents.set(id, new Set(pa));
    }
    let best: { score: number[]; groups: string[][] } | null = null;
    for (const pa of pairings(a)) {
      for (const pb of pairings(b)) {
        for (const order of permutations(pb)) {
          for (let flips = 0; flips < 1 << pa.length; flips++) {
            let problems = 0;
            let repeats = 0;
            let gap = 0;
            const groups = pa.map((p, i) => {
              const q = (flips >> i) & 1 ? [order[i][1], order[i][0]] : order[i];
              const four = [...p, ...q];
              for (const id of four) {
                const repeat = four.filter((x) => x !== id && fridayGroup.get(id)!.has(x)).length;
                if (3 - repeat < 2) problems++;
                repeats += repeat;
              }
              for (const [x, y] of [[p[0], q[0]], [p[1], q[1]]]) {
                if (fridayOpponents.get(x)!.has(y)) problems++;
                gap += Math.abs(h(x) - h(y));
              }
              return [p[0], q[0], p[1], q[1]];
            });
            const score = [problems, repeats, gap];
            if (better(score, best?.score ?? null)) best = { score, groups };
          }
        }
      }
    }
    return best!;
  };

  let plan: { score: number[]; a: string[]; b: string[]; matches: [Pair, Pair][]; groups: string[][] } | null = null;
  for (const [a, b] of splits) {
    const day1 = bestBall(a, b);
    const day2 = singlesDay(a, b, day1.matches);
    const score = [...day1.score, ...day2.score];
    if (better(score, plan?.score ?? null)) plan = { score, a, b, matches: day1.matches, groups: day2.groups };
  }
  const chosen = plan!;

  // Lowest handicap first within a pair; highest combined match off first
  const ordered = (p: Pair) => [...p].sort((x, y) => h(x) - h(y));
  const fourball = chosen.matches
    .map(([pa, pb]) => [...ordered(pa), ...ordered(pb)])
    .sort((x, y) => sum(y) - sum(x));

  return {
    teams: { [teamA]: chosen.a, [teamB]: chosen.b },
    fourball,
    singles: chosen.groups,
    teamGap: bestGap / 10,
  };
}
