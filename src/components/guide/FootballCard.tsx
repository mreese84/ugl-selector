import { useState } from 'react';
import { espnGameUrl, parseEspnEventId, useEspnGame, type EspnGame, type EspnTeam } from '../../espn';
import type { GuideFootball } from '../../types';
import { fmt } from './dates';
import { Card, Field, Tbd, inputClass } from './parts';

// ESPN marks TBD kickoffs as midnight Eastern, so read their date in Eastern time
const kickoffDate = (game: EspnGame) =>
  new Date(game.kickoff).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(game.timeTbd && { timeZone: 'America/New_York' }),
  });

// Shown in the viewer's own time zone, labeled ("7:30 PM EST")
const kickoffTime = (game: EspnGame) =>
  new Date(game.kickoff).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

function TeamRow({ team, showScore, dim }: { team: EspnTeam; showScore: boolean; dim: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {team.logo ? (
        <img src={team.logo} alt="" className="w-10 h-10 object-contain shrink-0" />
      ) : (
        <div className="w-10 h-10 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 leading-tight">
          {team.rank && <span className="text-xs font-medium text-gray-400 mr-1">#{team.rank}</span>}
          {team.name}
        </p>
        {team.record && <p className="text-xs text-gray-400">{team.record}</p>}
      </div>
      {showScore && (
        <p className={`text-2xl font-bold tabular-nums ${dim ? 'text-gray-400' : 'text-gray-900'}`}>
          {team.score ?? '–'}
        </p>
      )}
    </div>
  );
}

function LiveGame({ game }: { game: EspnGame }) {
  const showScore = game.state !== 'pre';
  return (
    <>
      {game.state === 'in' && (
        <p className="flex items-center gap-2 text-xs font-semibold text-red-600 mb-3">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          LIVE · {game.status}
        </p>
      )}
      {game.state === 'post' && (
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{game.status}</p>
      )}
      <div className="space-y-3">
        <TeamRow team={game.away} showScore={showScore} dim={game.state === 'post' && !game.away.winner} />
        <TeamRow team={game.home} showScore={showScore} dim={game.state === 'post' && !game.home.winner} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
        <Field label="Date">{kickoffDate(game)}</Field>
        <Field label="Kickoff">{game.timeTbd ? <Tbd /> : kickoffTime(game)}</Field>
        <Field label="TV">{game.broadcast ?? <Tbd />}</Field>
        <Field label="Line">
          {game.line ? (
            <>
              {game.line}
              {game.overUnder !== null && <span className="text-gray-500 font-normal"> · O/U {game.overUnder}</span>}
            </>
          ) : (
            <Tbd />
          )}
        </Field>
      </div>
      {game.venue && (
        <p className="text-sm text-gray-500 mt-4">
          {game.venue}
          {game.city && ` · ${game.city}`}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-4 text-xs">
        <a href={game.url} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-(--guide) hover:underline">
          ESPN Gamecast ↗
        </a>
        <span className="text-gray-400">
          Live from ESPN{game.line && game.oddsProvider && ` · odds via ${game.oddsProvider}`}
        </span>
      </div>
    </>
  );
}

// The guide's saved details, used when no ESPN game is linked or ESPN can't be reached
function SavedGame({ football }: { football: GuideFootball }) {
  return (
    <>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">{football.away}</p>
        <p className="text-xs text-gray-400 uppercase tracking-wider my-1">at</p>
        <p className="text-lg font-semibold text-gray-800">{football.home}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100 text-center">
        <Field label="Date">
          {football.date ? fmt(football.date, { weekday: 'short', month: 'short', day: 'numeric' }) : <Tbd />}
        </Field>
        <Field label="Kickoff">{football.kickoff ?? <Tbd />}</Field>
        <Field label="Line">{football.line ?? <Tbd />}</Field>
      </div>
      {football.venue && <p className="text-sm text-gray-500 text-center mt-4">{football.venue}</p>}
    </>
  );
}

// Admin-only: link the guide to an ESPN game
function EspnLinkEditor({
  eventId,
  onSave,
  onCancel,
}: {
  eventId: string | null;
  onSave: (eventId: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(eventId ? espnGameUrl(eventId) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const id = value.trim() ? parseEspnEventId(value) : null;
    if (value.trim() && !id) {
      setError("That doesn't look like an ESPN game link.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(id);
    } catch {
      setError('Save failed. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">ESPN game link</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://www.espn.com/college-football/game/_/gameId/…"
          className={inputClass}
        />
      </label>
      <p className="text-xs text-gray-400">
        Open the game on espn.com and paste its address. Leave blank to show only the saved details.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
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

interface FootballCardProps {
  football: GuideFootball;
  onSaveEventId?: (eventId: string | null) => Promise<void>; // admin only
}

export default function FootballCard({ football, onSaveEventId }: FootballCardProps) {
  const { status, game } = useEspnGame(football.espnEventId);
  const [editing, setEditing] = useState(false);

  return (
    <Card className="relative">
      {onSaveEventId && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 right-5 text-xs font-medium text-gray-400 hover:text-green-600 cursor-pointer"
        >
          Edit
        </button>
      )}
      {editing && onSaveEventId ? (
        <EspnLinkEditor
          eventId={football.espnEventId ?? null}
          onCancel={() => setEditing(false)}
          onSave={async (id) => {
            await onSaveEventId(id);
            setEditing(false);
          }}
        />
      ) : game ? (
        <LiveGame game={game} />
      ) : (
        <div className={status === 'loading' ? 'opacity-60' : ''}>
          <SavedGame football={football} />
          {status === 'error' && (
            <p className="text-xs text-gray-400 text-center mt-4">Live game info from ESPN is unavailable right now.</p>
          )}
        </div>
      )}
    </Card>
  );
}
