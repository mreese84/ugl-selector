# UGL history data

The permanent competition record. Competition tracking starts with UGL2 (2026, Columbia, SC);
UGL1 (2025) wasn't a competition and has no folder here. Every stat, record and superlative on the
site is computed from these files when the site is built or viewed. Nothing here is a hand-entered stat.

This repo is public, so everything in this folder is public too.

```
history/
  players.json                 everyone who has played, with a stable id
  2026-columbia/               one folder per event (same name as the trip's guide address)
    event.json                 teams, handicaps, rounds and format
    matches/
      fourball-1.json          one file per match: <session>-<match>.json
      singles-1.json
      aggregate-1.json
```

## players.json

```json
[{ "id": "jeff-siarto", "name": "Jeff Siarto" }]
```

`id` is permanent: first-last, lowercase, hyphenated. Every other file refers to players by it.
Never change an id once it's used. To fix a misspelled name, edit `name` only.

## event.json

| Field | Meaning |
| --- | --- |
| `edition` | 2 for UGL2 |
| `title`, `location`, `dates` | `dates` is `[first day, last day]`, as YYYY-MM-DD |
| `format` | Display name, e.g. "Modified Ryder Cup" |
| `sample` | `true` while the event holds made-up data. Sample events show only on the local dev server (`npm run dev`), never on the live site |
| `teams` | `id`, `name`, `color`, `emblem` (`palmetto` / `crescent` / none), `captain`, `players` |
| `handicaps` | Player id → handicap index **for this event**. Plus handicaps are negative (+2.0 = -2) |
| `rounds` | One per day of golf: `id`, `label` ("Day 1"), `date`, `course`, and, for scorecards, `par` and `strokeIndex` (18 numbers each) |
| `sessions` | What's played for points (see below) |

A round with no sessions (for example Sunday's casual round) appears in the history but doesn't
count toward the competition.

### Sessions (the format)

```json
{ "id": "fourball", "round": "fri", "name": "2-Man Net Best Ball", "format": "fourball", "scoring": "match", "points": 1, "matches": 3 }
```

- `round` decides which day the session is played. To move singles to Day 1, change its `round`.
- `format` groups a player's record across years ("fourball", "singles", or any new name).
- `scoring`:
  - `match` is net match play. Each side's score on a hole is its best net score, so the same rule
    covers singles, 2-man best ball, or 3-man best ball. Players get individual W-L-H credit.
  - `aggregate` is team total net strokes. It counts for the team score only, not players' records.
- `points` is points per match. A halved match splits them.
- `matches` is how many matches the session has, so the site can show "not played yet" and the
  points available before every result is in.

Total points and the number needed to win are computed from the sessions and their matches. In
2026 that's 3 + 6 + 2 = 11, so 6 wins.

## Match files

```json
{
  "session": "fourball",
  "match": 1,
  "sides": { "palmetto": ["mark-reese", "justin-thompson"], "crescent": ["ricky-menchaca", "nick-smith"] },
  "result": { "winner": "palmetto", "margin": "3&2", "points": { "palmetto": 1, "crescent": 0 } },
  "scores": [
    { "player": "mark-reese", "strokes": 17, "gross": [5, 6, 4, 6, 5, 5, 4, 5, null, 5, 4, 6, 6, 5, 5, 4, 5, 7] }
  ]
}
```

- `sides`: team id → player ids.
- `result.winner`: a team id, or `null` for a halved match.
- `result.margin`: `"3&2"`, `"1 UP"` or `"AS"` (halved) for match play; free text such as `"6 strokes"` for aggregate.
- `result.points`: points each team earned from this match.
- `totals` (aggregate only, optional): each team's combined net score.
- `scores` (optional): one row per player, which is what a Squabbit CSV row turns into.
  - `strokes`: handicap strokes the player received this round. Stroke holes come from the
    round's `strokeIndex`.
  - `gross`: 18 scores in hole order; `null` means no score (picked up or didn't play the hole).
  - Players keep their full 18 holes after a match ends; the match status stops where the match was decided.

The build and the dev server check these files and stop with a clear message when something doesn't
add up. For example: an unknown player id, points that don't match the session, a scorecard that
disagrees with the result, or aggregate totals that don't match the day's scorecards.

The History tab appears on the live site once there's at least one event without `sample`.
