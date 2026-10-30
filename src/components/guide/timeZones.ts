// Times in the guide read in the trip city's time zone (tee times, kickoff), except flight
// times, which stay local to each airport like tickets and airport boards.

import type { PlayerGuide } from '../../types';

// The zone most of each state is in (Texas: Central; Tennessee: Central; Florida: Eastern).
// A guide in a split state can set its own `timeZone`.
const STATE_ZONES: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago',
  NV: 'America/Los_Angeles', NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver',
  NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};

// "Columbia, SC" -> America/New_York; null when the location doesn't end in a state code
export function tripTimeZone(guide: Pick<PlayerGuide, 'location' | 'timeZone'>): string | null {
  if (guide.timeZone) return guide.timeZone;
  const state = guide.location.match(/,\s*([A-Z]{2})\s*$/)?.[1];
  return (state && STATE_ZONES[state]) || null;
}

const AIRPORTS: Record<string, string[]> = {
  'America/New_York': ['ATL', 'BOS', 'BWI', 'CAE', 'CHS', 'CLT', 'DCA', 'DTW', 'EWR', 'FLL', 'GSP', 'IAD', 'JAX', 'JFK',
    'LGA', 'MCO', 'MIA', 'MYR', 'PHL', 'RDU', 'TPA'],
  'America/Chicago': ['AUS', 'BNA', 'CLL', 'CRP', 'DAL', 'DFW', 'HOU', 'IAH', 'LBB', 'MAF', 'MDW', 'MEM', 'MSP', 'MSY',
    'OKC', 'ORD', 'SAT', 'STL', 'TUL'],
  'America/Denver': ['DEN', 'ELP', 'SLC'],
  'America/Phoenix': ['PHX'],
  'America/Los_Angeles': ['LAS', 'LAX', 'PDX', 'SAN', 'SEA', 'SFO'],
};
const AIRPORT_ZONES = new Map(Object.entries(AIRPORTS).flatMap(([zone, codes]) => codes.map((c) => [c, zone])));

export const airportTimeZone = (code: string | null) => (code && AIRPORT_ZONES.get(code.toUpperCase())) || null;

// The zone's short name on a date (YYYY-MM-DD): "EST", or "EDT" in summer
export function zoneLabel(timeZone: string | null, isoDate: string) {
  if (!timeZone) return '';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(
    new Date(`${isoDate}T12:00:00Z`),
  );
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}
