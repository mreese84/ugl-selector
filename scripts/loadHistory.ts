// Reads the repo's history/ folder (used by the Vite build and the history scripts)

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EventFile, HistoryData, HistoryEvent, HistoryMatch, HistoryPlayer, MatchFile } from '../src/history/types.ts';
import { validateHistory } from '../src/history/validate.ts';

async function readJson<T>(dir: string, path: string): Promise<T> {
  const text = await readFile(join(dir, path), 'utf8');
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`history/${path} isn't valid JSON: ${(e as Error).message}`, { cause: e });
  }
}

async function list(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

// Every event (samples included), checked; errors list anything that doesn't add up
export async function loadHistory(dir: string): Promise<{ data: HistoryData; errors: string[] }> {
  const players = await readJson<HistoryPlayer[]>(dir, 'players.json');
  const events: HistoryEvent[] = [];
  for (const entry of await list(dir)) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const event = await readJson<EventFile>(dir, `${id}/event.json`);
    const matches: HistoryMatch[] = [];
    for (const file of await list(join(dir, id, 'matches'))) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      const match = await readJson<MatchFile>(dir, `${id}/matches/${file.name}`);
      matches.push({ ...match, id: file.name.replace(/\.json$/, '') });
    }
    const order = (m: HistoryMatch) => event.sessions?.findIndex((s) => s.id === m.session) ?? 0;
    matches.sort((a, b) => order(a) - order(b) || a.match - b.match);
    events.push({ ...event, id, year: Number(id.slice(0, 4)), matches });
  }
  events.sort((a, b) => b.id.localeCompare(a.id));
  const data = { players, events };
  return { data, errors: validateHistory(data) };
}

// What the live site shows: no sample events, and only players who have played
export function publicHistory(data: HistoryData, includeSamples: boolean): HistoryData {
  const events = data.events.filter((e) => includeSamples || !e.sample);
  const played = new Set(events.flatMap((e) => e.teams.flatMap((t) => t.players)));
  return { players: data.players.filter((p) => played.has(p.id)), events };
}
