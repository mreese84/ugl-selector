import { useState, type CSSProperties, type ReactNode } from 'react';
import type { GuideFlight, GuideGroup, GuideRound, GuideTeam, Member, PlayerGuide } from '../../types';
import Emblem from './Emblem';
import FootballCard from './FootballCard';
import { Card, Field, Tbd, inputClass } from './parts';
import { dateRange, fmt, parseDate } from './dates';

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// FlightAware links need ICAO airline codes ("AA 1234" -> AAL1234)
const ICAO_AIRLINES: Record<string, string> = {
  AA: 'AAL', AS: 'ASA', B6: 'JBU', DL: 'DAL', F9: 'FFT', G4: 'AAY',
  HA: 'HAL', NK: 'NKS', SY: 'SCX', UA: 'UAL', WN: 'SWA',
};

// Pinned to the flight's date, so it never shows the same number on another day or route
function flightAwareUrl(f: GuideFlight) {
  const compact = f.flight.replace(/\s+/g, '').toUpperCase();
  const match = compact.match(/^([A-Z0-9]{2})(\d+)$/);
  const code = match ? `${ICAO_AIRLINES[match[1]] ?? match[1]}${match[2]}` : compact;
  return `https://www.flightaware.com/live/flight/${encodeURIComponent(code)}/history/${f.date.replaceAll('-', '')}`;
}

// FlightAware lists a dated flight roughly 36–47 hours before departure (seen Oct 2026),
// so only show its link once the flight should be there.
const TRACKING_HOURS_AHEAD = 30;

// Departure in the viewer's time zone; close enough to pick which link to show
function departureTime(f: GuideFlight) {
  const when = parseDate(f.date);
  const match = f.departs?.match(/^(\d{1,2}):(\d{2})\s*([AP])M$/i);
  if (match) {
    const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'P' ? 12 : 0);
    when.setHours(hour, Number(match[2]));
  } else {
    when.setHours(12);
  }
  return when;
}

function trackingUrl(f: GuideFlight) {
  const opens = departureTime(f);
  opens.setHours(opens.getHours() - TRACKING_HOURS_AHEAD);
  return new Date() < opens ? null : flightAwareUrl(f);
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-(--guide)">{title}</h3>
      {children}
    </section>
  );
}

// Admin-only form for a house's name and address
function TeamEditor({
  team,
  onSave,
  onCancel,
}: {
  team: GuideTeam;
  onSave: (patch: Pick<GuideTeam, 'house' | 'address'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [house, setHouse] = useState(team.house);
  const [address, setAddress] = useState(team.address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = house.trim() && address.trim() && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ house: house.trim(), address: address.trim() });
    } catch {
      setError('Save failed. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">House name</span>
        <input value={house} onChange={(e) => setHouse(e.target.value)} className={inputClass} />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">Address</span>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={inputClass} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main view ───────────────────────────────────────────────────

interface GuideViewProps {
  guide: PlayerGuide;
  members: Member[];
  attendeeCount: number;
  onSave?: (guide: PlayerGuide) => Promise<void>; // admin only; enables editing
}

export default function GuideView({ guide, members, attendeeCount, onSave }: GuideViewProps) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';
  const teamOf = (id: string) => guide.teams.find((t) => t.memberIds.includes(id));
  const rosterSize = guide.teams.length ? Math.ceil(attendeeCount / guide.teams.length) : 0;

  const sections = [
    { id: 'travel', label: 'Travel', show: guide.flights.length > 0 },
    { id: 'lodging', label: 'Lodging', show: guide.teams.length > 0 },
    { id: 'golf', label: 'Golf', show: guide.rounds.length > 0 },
    { id: 'format', label: 'Format', show: true },
    { id: 'football', label: 'Football', show: true },
    { id: 'nightlife', label: 'Nightlife', show: guide.nightlife.length > 0 },
  ].filter((s) => s.show);

  const allDates = [...guide.flights.map((f) => f.date), ...guide.rounds.map((r) => r.date)];
  const emblems = guide.teams.flatMap((t) => (t.emblem ? [t.emblem] : []));

  // Player pill in their team's color, with the team emblem so teams differ by shape too
  const player = (id: string | null, key?: number) => {
    const pill = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap';
    if (!id) {
      return (
        <span key={key} className={`${pill} font-medium border border-dashed border-gray-300 text-gray-400`}>
          TBD
        </span>
      );
    }
    const team = teamOf(id);
    return (
      <span
        key={key}
        className={`${pill} ${team ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
        style={team ? { background: team.color } : undefined}
        title={team?.name}
      >
        {team?.emblem && <Emblem name={team.emblem} className="w-3.5 h-3.5 -ml-0.5 shrink-0" />}
        {nameOf(id)}
      </span>
    );
  };

  const matchup = (group: GuideGroup, round: GuideRound) => {
    const slot = (i: number) => group.playerIds[i] ?? null;
    if (group.playerIds.every((id) => !id)) return <Tbd>Pairings TBD</Tbd>;
    const vs = <span className="text-gray-400 text-xs">vs</span>;
    if (round.matchType === 'fourball') {
      return (
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex flex-wrap items-center gap-1.5">{player(slot(0))}{player(slot(1))}</span>
          <span className="flex flex-wrap items-center gap-1.5">{vs}{player(slot(2))}{player(slot(3))}</span>
        </span>
      );
    }
    if (round.matchType === 'singles') {
      return (
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex flex-wrap items-center gap-1.5">{player(slot(0))}{vs}{player(slot(1))}</span>
          <span className="flex flex-wrap items-center gap-1.5">{player(slot(2))}{vs}{player(slot(3))}</span>
        </span>
      );
    }
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        {group.playerIds.map((id, i) => player(id, i))}
      </span>
    );
  };

  const totalPoints = guide.format.sessions.reduce((sum, s) => sum + s.points, 0);

  return (
    <div
      className="space-y-8"
      style={{ '--guide': guide.theme.primary, '--guide-on': guide.theme.onPrimary } as CSSProperties}
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-(--guide) text-(--guide-on) px-6 py-7">
        <div className="absolute -right-3 -bottom-4 flex items-start gap-1 opacity-20 pointer-events-none">
          {emblems.includes('crescent') && <Emblem name="crescent" className="w-12 h-12 mt-2" />}
          {emblems.includes('palmetto') && <Emblem name="palmetto" className="w-32 h-32" />}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Player's Guide</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{guide.title}</h2>
        <p className="text-sm mt-1 opacity-85">
          {guide.location}
          {allDates.length > 0 && ` · ${dateRange(allDates)}`}
        </p>
      </div>

      {/* Section menu */}
      <nav className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-gray-50/90 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200
                         text-gray-600 hover:border-(--guide) hover:text-(--guide) transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Travel */}
      {guide.flights.length > 0 && (
        <Section id="travel" title="Official UGL Flights">
          <div className="grid sm:grid-cols-2 gap-3">
            {guide.flights.map((f) => {
              const trackUrl = trackingUrl(f);
              return (
                <Card key={f.direction}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {f.direction === 'departure' ? 'Departure' : 'Return'}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {fmt(f.date, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {trackUrl && (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-(--guide) hover:underline shrink-0"
                      >
                        Track on FlightAware ↗
                      </a>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight mt-3">{f.flight}</p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Field label="From">{f.from ?? <Tbd />}{f.departs && <span className="text-gray-500 font-normal"> · {f.departs}</span>}</Field>
                    <Field label="To">{f.to ?? <Tbd />}{f.arrives && <span className="text-gray-500 font-normal"> · {f.arrives}</span>}</Field>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {/* Lodging */}
      {guide.teams.length > 0 && (
        <Section id="lodging" title="Team Houses">
          <div className="grid sm:grid-cols-2 gap-3">
            {guide.teams.map((team: GuideTeam) => (
              <Card key={team.id} className="overflow-hidden !p-0">
                <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: team.color }}>
                  {team.emblem && <Emblem name={team.emblem} className="w-9 h-9 shrink-0" />}
                  <p className="flex-1 min-w-0 font-semibold leading-tight">{team.house}</p>
                  {onSave && editingTeamId !== team.id && (
                    <button
                      onClick={() => setEditingTeamId(team.id)}
                      className="text-xs font-medium opacity-80 hover:opacity-100 shrink-0 cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {onSave && editingTeamId === team.id ? (
                    <TeamEditor
                      team={team}
                      onCancel={() => setEditingTeamId(null)}
                      onSave={async (patch) => {
                        await onSave({
                          ...guide,
                          teams: guide.teams.map((t) => (t.id === team.id ? { ...t, ...patch } : t)),
                        });
                        setEditingTeamId(null);
                      }}
                    />
                  ) : (
                    <a
                      href={mapsUrl(team.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-gray-700 hover:text-(--guide) group"
                    >
                      {team.address}
                      <span className="block text-xs font-medium text-(--guide) mt-0.5 group-hover:underline">
                        Open in Maps ↗
                      </span>
                    </a>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                      Staying here{team.memberIds.length > 0 && ` (${team.memberIds.length})`}
                    </p>
                    {team.memberIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[...team.memberIds]
                          .sort((a, b) => Number(b === team.captainId) - Number(a === team.captainId))
                          .map((id) => (
                            <span key={id} className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                              {nameOf(id)}
                              {id === team.captainId && (
                                <span
                                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full
                                             text-[9px] font-bold text-white align-[1px]"
                                  style={{ background: team.color }}
                                  title="Captain"
                                >
                                  C
                                </span>
                              )}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: rosterSize }, (_, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-400">
                              TBD
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Set once teams are drawn.</p>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Golf itinerary */}
      {guide.rounds.length > 0 && (
        <Section id="golf" title="Golf Itinerary">
          {guide.rounds.map((round) => (
            <Card key={round.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h4 className="text-lg font-semibold text-gray-800">{round.course}</h4>
                <p className="text-sm text-gray-500">{fmt(round.date, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
              <span className="inline-block mt-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-(--guide)/8 text-(--guide)">
                {round.label}
              </span>
              <ul className="mt-4 divide-y divide-gray-100">
                {round.groups.map((group, i) => (
                  <li key={i} className="flex gap-4 py-2.5 text-sm">
                    <div className="w-20 shrink-0">
                      <p className="font-semibold text-gray-800">{group.teeTime}</p>
                      <p className="text-xs text-gray-400">Group {i + 1}</p>
                    </div>
                    <div className="flex-1 min-w-0 pt-px">
                      {matchup(group, round)}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </Section>
      )}

      {/* Format */}
      <Section id="format" title="Golf Format">
        <Card className="space-y-5">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">{guide.format.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{guide.format.summary}</p>
            {guide.format.notes.map((note, i) => (
              <p key={i} className="text-sm text-gray-500 mt-2">{note}</p>
            ))}
          </div>

          {guide.format.sessions.map((s, i) => (
            <div key={i} className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-800">
                  <span className="text-(--guide)">{s.day}</span> · {s.name}
                </p>
                <span className="text-xs font-medium text-gray-500 shrink-0">
                  {s.points} pt{s.points !== 1 && 's'}
                </span>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600 list-disc pl-5 marker:text-gray-300">
                {s.rules.map((rule, j) => <li key={j}>{rule}</li>)}
              </ul>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Points</p>
            <table className="w-full text-sm">
              <tbody>
                {guide.format.sessions.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-600">{s.day} · {s.name}</td>
                    <td className="py-1.5 text-right font-medium text-gray-800">{s.points}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-2 font-semibold text-gray-800">Total</td>
                  <td className="pt-2 text-right font-semibold text-gray-800">{totalPoints}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-(--guide) text-(--guide-on) text-center py-3 font-semibold">
            {guide.format.pointsToWin} points wins
          </div>
        </Card>
      </Section>

      {/* Football */}
      <Section id="football" title="Football">
        <FootballCard
          football={guide.football}
          onSaveEventId={
            onSave && ((espnEventId) => onSave({ ...guide, football: { ...guide.football, espnEventId } }))
          }
        />
      </Section>

      {/* Nightlife */}
      {guide.nightlife.length > 0 && (
        <Section id="nightlife" title="Nightlife">
          <Card className="!py-2">
            <ul className="divide-y divide-gray-100">
              {guide.nightlife.map((night) => (
                <li key={night.date} className="flex gap-4 py-3 text-sm">
                  <div className="w-24 shrink-0">
                    <p className="font-semibold text-gray-800">{fmt(night.date, { weekday: 'long' })}</p>
                    <p className="text-xs text-gray-400">{fmt(night.date, { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700">{night.plan ?? <Tbd />}</p>
                    {night.note && <p className="text-xs text-gray-400 mt-0.5">{night.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}
    </div>
  );
}
