import { useEffect, useState } from 'react';

// ESPN's public (unofficial, undocumented) college football API. It allows browser requests
// from any site, but could change without notice, so callers fall back to the guide's saved values.
const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=';
const LIVE_REFRESH_MS = 60_000;

export interface EspnTeam {
  name: string;
  abbreviation: string;
  logo: string | null;
  rank: number | null;
  record: string | null;
  score: string | null;
  winner: boolean;
}

export interface EspnGame {
  state: 'pre' | 'in' | 'post';
  status: string; // "Final", "4:12 - 3rd", "TBD"
  kickoff: string; // ISO timestamp
  timeTbd: boolean;
  venue: string | null;
  city: string | null;
  broadcast: string | null;
  line: string | null; // "SC -2.5"
  overUnder: number | null;
  oddsProvider: string | null;
  away: EspnTeam;
  home: EspnTeam;
  url: string;
}

// Accepts an ESPN game link (…/gameId/401856744/…) or a bare event ID
export function parseEspnEventId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed.match(/gameId[/=](\d+)/)?.[1] ?? null;
}

export const espnGameUrl = (eventId: string) => `https://www.espn.com/college-football/game/_/gameId/${eventId}`;

/* eslint-disable @typescript-eslint/no-explicit-any -- ESPN's response is untyped */
function parseTeam(c: any): EspnTeam {
  return {
    name: c.team.displayName,
    abbreviation: c.team.abbreviation,
    logo: c.team.logos?.[0]?.href ?? null,
    rank: typeof c.rank === 'number' && c.rank <= 25 ? c.rank : null,
    record: c.record?.find((r: any) => r.type === 'total')?.summary ?? null,
    score: c.score ?? null,
    winner: c.winner === true,
  };
}

function parseGame(eventId: string, d: any): EspnGame {
  const comp = d.header.competitions[0];
  const type = comp.status.type;
  const pick = d.pickcenter?.[0];
  const venue = d.gameInfo?.venue;
  return {
    state: type.state,
    status: type.shortDetail,
    kickoff: comp.date,
    timeTbd: /TBD/i.test(type.detail ?? ''),
    venue: venue?.fullName ?? null,
    city: venue?.address ? [venue.address.city, venue.address.state].filter(Boolean).join(', ') : null,
    broadcast: comp.broadcasts?.map((b: any) => b.media?.shortName).filter(Boolean).join(', ') || null,
    line: pick?.details ?? null,
    overUnder: typeof pick?.overUnder === 'number' ? pick.overUnder : null,
    oddsProvider: pick?.provider?.name ?? null,
    away: parseTeam(comp.competitors.find((c: any) => c.homeAway === 'away')),
    home: parseTeam(comp.competitors.find((c: any) => c.homeAway === 'home')),
    url: d.header.links?.find((l: any) => l.rel?.includes('summary'))?.href ?? espnGameUrl(eventId),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Fetched {
  key: string | null;
  status: 'ready' | 'error';
  game: EspnGame | null;
}

// Loads a game once, then refreshes every minute while it's in progress
export function useEspnGame(eventId: string | null | undefined) {
  const [state, setState] = useState<Fetched>({ key: null, status: 'ready', game: null });
  const live = state.key === eventId && state.game?.state === 'in';

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    const load = () =>
      fetch(SUMMARY_URL + encodeURIComponent(eventId))
        .then((res) => {
          if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (!cancelled) setState({ key: eventId, status: 'ready', game: parseGame(eventId, data) });
        })
        .catch(() => {
          // Keep showing the last good data if a refresh fails
          if (!cancelled) setState((prev) => (prev.key === eventId && prev.game ? prev : { key: eventId, status: 'error', game: null }));
        });
    load();
    const timer = live ? setInterval(load, LIVE_REFRESH_MS) : undefined;
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [eventId, live]);

  if (!eventId) return { status: 'off' as const, game: null };
  if (state.key !== eventId) return { status: 'loading' as const, game: null };
  return { status: state.status, game: state.game };
}
