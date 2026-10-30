import { useState } from 'react';
import type { GuideNight } from '../../types';
import { fmt, parseDate } from './dates';
import { mapsUrl, normalizeUrl } from './links';
import { Card, GlobeIcon, IconLink, MapPinIcon, Tbd, inputClass } from './parts';

interface Draft {
  date: string;
  plan: string;
  note: string;
  place: string;
  address: string;
  website: string;
}

const toDraft = (n: GuideNight): Draft => ({
  date: n.date,
  plan: n.plan ?? '',
  note: n.note ?? '',
  place: n.place ?? '',
  address: n.address ?? '',
  website: n.website ?? '',
});

// Firestore rejects undefined fields, so blanks become null (or are left out)
function fromDraft(d: Draft): GuideNight {
  const night: GuideNight = {
    date: d.date,
    plan: d.plan.trim() || null,
    place: d.place.trim() || null,
    address: d.address.trim() || null,
    website: normalizeUrl(d.website),
  };
  if (d.note.trim()) night.note = d.note.trim();
  return night;
}

// The day after the last planned night (YYYY-MM-DD), or blank when there are none
function nextDate(nights: GuideNight[]) {
  const last = nights.at(-1);
  if (!last) return '';
  const d = parseDate(last.date);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const byDate = (a: GuideNight, b: GuideNight) => a.date.localeCompare(b.date);

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

// Admin-only form for one night's plan
function NightEditor({
  initial,
  location,
  takenDates,
  onSave,
  onRemove,
  onCancel,
}: {
  initial: Draft;
  location: string;
  takenDates: string[]; // other nights' dates
  onSave: (night: GuideNight) => Promise<void>;
  onRemove?: () => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: e.target.value });

  const taken = takenDates.includes(draft.date);
  const canSave = /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && !taken && !saving;

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch {
      setError('Save failed. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 py-3">
      <FormField label="Night">
        <input type="date" value={draft.date} onChange={set('date')} className={inputClass} />
        {taken && <span className="block text-xs text-red-600 mt-1">There's already a plan for that night.</span>}
      </FormField>
      <FormField label="Plan">
        <input value={draft.plan} onChange={set('plan')} placeholder="Dinner at Blue Marlin" className={inputClass} />
      </FormField>
      <FormField label="Details">
        <input value={draft.note} onChange={set('note')} placeholder="Reservation at 6:45 PM" className={inputClass} />
      </FormField>
      <FormField label="Place" hint="Adds a directions button">
        <input value={draft.place} onChange={set('place')} placeholder="Blue Marlin" className={inputClass} />
      </FormField>
      <FormField label="Address" hint={`Optional. Without one, directions search near ${location}.`}>
        <input value={draft.address} onChange={set('address')} placeholder="1200 Lincoln St, Columbia, SC" className={inputClass} />
      </FormField>
      <FormField label="Website" hint="Optional. Adds a website button.">
        <input
          value={draft.website}
          onChange={set('website')}
          placeholder="bluemarlincolumbia.com"
          inputMode="url"
          autoCapitalize="none"
          className={inputClass}
        />
      </FormField>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={() => canSave && run(() => onSave(fromDraft(draft)))}
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
        {onRemove && (
          <button
            onClick={() => confirm('Remove this night from the guide?') && run(onRemove)}
            disabled={saving}
            className="ml-auto text-sm text-gray-400 hover:text-red-500 font-medium transition-colors cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

interface NightlifeCardProps {
  nights: GuideNight[];
  location: string;
  onSave?: (nights: GuideNight[]) => Promise<void>; // admin only; enables editing
}

export default function NightlifeCard({ nights, location, onSave }: NightlifeCardProps) {
  // The date of the night being edited, or 'new' while adding one
  const [editing, setEditing] = useState<string | null>(null);
  const sorted = [...nights].sort(byDate);

  const save = async (next: GuideNight[]) => {
    await onSave!(next.sort(byDate));
    setEditing(null);
  };
  const otherDates = (date: string | null) => sorted.map((n) => n.date).filter((d) => d !== date);

  return (
    <Card className="!py-2">
      {sorted.length === 0 && editing !== 'new' && <p className="py-3 text-sm text-gray-400">No nightlife plans yet.</p>}
      <ul className="divide-y divide-gray-100">
        {sorted.map((night) =>
          onSave && editing === night.date ? (
            <li key={night.date}>
              <NightEditor
                initial={toDraft(night)}
                location={location}
                takenDates={otherDates(night.date)}
                onSave={(updated) => save(sorted.map((n) => (n.date === night.date ? updated : n)))}
                onRemove={() => save(sorted.filter((n) => n.date !== night.date))}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={night.date} className="flex gap-3 py-3 text-sm">
              <div className="w-20 shrink-0">
                <p className="font-semibold text-gray-800">{fmt(night.date, { weekday: 'long' })}</p>
                <p className="text-xs text-gray-400">{fmt(night.date, { month: 'short', day: 'numeric' })}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-700">{night.plan ?? <Tbd />}</p>
                {night.note && <p className="text-xs text-gray-400 mt-0.5">{night.note}</p>}
                {onSave && editing === null && (
                  <button
                    onClick={() => setEditing(night.date)}
                    className="text-xs font-medium text-(--guide) hover:underline mt-1 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
              {(night.website || night.place) && (
                <div className="flex gap-1.5 shrink-0">
                  {night.website && (
                    <IconLink href={night.website} label={`${night.place ?? 'Venue'} website`}>
                      <GlobeIcon />
                    </IconLink>
                  )}
                  {night.place && (
                    <IconLink
                      href={mapsUrl(`${night.place}, ${night.address ?? location}`)}
                      label={`Directions to ${night.place}`}
                    >
                      <MapPinIcon />
                    </IconLink>
                  )}
                </div>
              )}
            </li>
          ),
        )}
        {onSave && editing === 'new' && (
          <li>
            <NightEditor
              initial={toDraft({ date: nextDate(sorted), plan: null })}
              location={location}
              takenDates={otherDates(null)}
              onSave={(night) => save([...sorted, night])}
              onCancel={() => setEditing(null)}
            />
          </li>
        )}
      </ul>
      {onSave && editing === null && (
        <button
          onClick={() => setEditing('new')}
          className="w-full my-2 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500
                     hover:border-(--guide) hover:text-(--guide) transition-colors cursor-pointer"
        >
          + Add a night
        </button>
      )}
    </Card>
  );
}
