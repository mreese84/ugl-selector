import { useRef, useState, type ReactNode } from 'react';
import { useAppState } from '../../store';
import { useAuth } from '../../auth';
import { applyDraft, clearPairings, deleteGuide, saveDraft, saveGuide, useGuide, useGuideDraft } from '../../guides';
import type { PlayerGuide } from '../../types';
import GuideView from './GuideView';
import PairingsAdmin from './PairingsAdmin';

// Light shape check so a wrong file can't be saved as a guide
function isGuide(data: unknown): data is PlayerGuide {
  const g = data as PlayerGuide;
  return (
    !!g &&
    typeof g.title === 'string' &&
    typeof g.location === 'string' &&
    !!g.theme && !!g.format && !!g.football &&
    [g.flights, g.teams, g.rounds, g.nightlife, g.format.sessions].every(Array.isArray)
  );
}

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
      <p className="text-lg font-semibold text-gray-800">{title}</p>
      {children && <div className="text-sm text-gray-500 space-y-3">{children}</div>}
    </div>
  );
}

const buttonClass =
  'px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer';

interface GuidePageProps {
  tripId: string;
  onBack: () => void;
}

export default function GuidePage({ tripId, onBack }: GuidePageProps) {
  const { user, isAdmin, loading: authLoading, signIn } = useAuth();
  const { trips, members, loading, updateTrip } = useAppState();
  const { status, guide } = useGuide(user ? tripId : null, user?.uid ?? null);
  const { draft, status: draftStatus, retry: retryDraft } = useGuideDraft(user ? tripId : null, isAdmin);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trip = trips.find((t) => t.id === tripId);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !trip) return;
    setBusy(true);
    setError(null);
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isGuide(data)) throw new Error('That file is not a Player\'s Guide.');
      // Keep published (or hidden) teams and pairings as they were
      await (draft ? saveDraft(trip.id, draft, data) : saveGuide(trip.id, data));
      if (!trip.hasGuide) updateTrip({ ...trip, hasGuide: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    if (!guide || !trip) return;
    const blob = new Blob([JSON.stringify(guide, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ugl-guide-${trip.year}-${trip.location.split(',')[0].toLowerCase().replace(/\W+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!trip || !confirm(`Delete the Player's Guide for ${trip.location} (${trip.year})?`)) return;
    setBusy(true);
    try {
      await deleteGuide(trip.id);
      updateTrip({ ...trip, hasGuide: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const importInput = (
    <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
  );

  let content: ReactNode;
  if (loading || authLoading || (user && status === 'loading')) {
    content = <p className="text-gray-400 text-center py-8">Loading…</p>;
  } else if (!trip) {
    content = <Notice title="Trip not found" />;
  } else if (!user) {
    content = (
      <Notice title="Members only">
        <p>Sign in with the Google account the league has on file to see the Player's Guide.</p>
        <button onClick={signIn} className={buttonClass}>Sign in</button>
      </Notice>
    );
  } else if (status === 'denied') {
    content = isAdmin ? (
      <Notice title="Firebase blocked access">
        <p>Publish the rules in <code className="text-gray-700">firestore.rules</code> in the Firebase console, then reload.</p>
      </Notice>
    ) : (
      <Notice title="Members only">
        <p>
          You're signed in as <span className="font-medium text-gray-700">{user.email}</span>, which isn't on the
          member list. Ask the league admin to add it.
        </p>
      </Notice>
    );
  } else if (status === 'error') {
    content = <Notice title="Couldn't load the guide"><p>Check your connection and reload.</p></Notice>;
  } else if (status === 'missing' || !guide) {
    content = isAdmin ? (
      <Notice title="No Player's Guide yet">
        <p>Import a guide file (JSON) to create one for this trip.</p>
        <button onClick={() => fileInputRef.current?.click()} disabled={busy} className={buttonClass}>
          {busy ? 'Importing…' : 'Import guide'}
        </button>
        {importInput}
      </Notice>
    ) : (
      <Notice title="The guide isn't ready yet"><p>Check back closer to the trip.</p></Notice>
    );
  } else {
    content = (
      <>
        {isAdmin && (
          <div className="flex items-center justify-end gap-4 text-xs text-gray-400 mb-4">
            <button onClick={handleExport} className="hover:text-green-600 transition-colors cursor-pointer">
              Export JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="hover:text-green-600 transition-colors cursor-pointer"
            >
              Replace from file
            </button>
            <button onClick={handleDelete} disabled={busy} className="hover:text-red-500 transition-colors cursor-pointer">
              Delete guide
            </button>
            {importInput}
          </div>
        )}
        {isAdmin && (
          <PairingsAdmin
            guide={guide}
            draft={draft}
            status={draftStatus}
            attendeeIds={trip.attendeeIds}
            members={members}
            onSave={(d) => saveDraft(trip.id, d, guide)}
            onRetry={retryDraft}
          />
        )}
        {/* The admin always sees the draft; members see it only once it's published */}
        <GuideView
          guide={isAdmin && draft ? applyDraft(guide, draft) : guide}
          members={members}
          attendeeCount={trip.attendeeIds.length}
          onSave={
            isAdmin
              ? (g) =>
                  // Edits arrive on the draft-filled guide; never let an unpublished draft leak into it
                  saveGuide(trip.id, draft ? (draft.published ? applyDraft(g, draft) : clearPairings(g)) : g)
              : undefined
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-green-700 transition-colors cursor-pointer">
        ← All trips
      </button>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
      {content}
    </div>
  );
}
