import { useState } from 'react';
import { useAppState } from '../store';
import { useAuth } from '../auth';
import TripForm from './TripForm';

export default function TripsTab() {
  const { isAdmin } = useAuth();
  const { members, trips, addTrip, removeTrip, updateTrip } = useAppState();
  const [showForm, setShowForm] = useState(false);

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Unknown';

  const sortedTrips = [...trips].sort((a, b) => b.year - a.year);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Trips</h2>
        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm
                       hover:bg-green-700 transition-colors cursor-pointer"
          >
            + New Trip
          </button>
        )}
      </div>

      {showForm && (
        <TripForm
          members={members}
          trips={trips}
          onSave={(tripData) => {
            addTrip(tripData);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {sortedTrips.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No trips yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {trip.location}
                  </h3>
                  <p className="text-sm text-gray-500">{trip.year}</p>
                </div>
                <div className="flex items-start gap-3">
                <div className="text-right text-sm">
                  <p className="text-gray-500">
                    Selected by{' '}
                    <span className="font-medium text-gray-700">
                      {getMemberName(trip.selectedById)}
                    </span>
                  </p>
                  {trip.nextSelectorId && (
                    <p className="text-green-600 font-medium mt-1">
                      🎯 {getMemberName(trip.nextSelectorId)} picks next
                    </p>
                  )}
                  {!trip.nextSelectorId && (
                    <p className="text-amber-500 text-xs mt-1">Draw pending</p>
                  )}
                </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete the ${trip.location} (${trip.year}) trip?`)) {
                          removeTrip(trip.id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer mt-0.5"
                      title="Delete trip"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
                  Attendees ({trip.attendeeIds.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trip.attendeeIds.map((id) => {
                    const isLocked = trip.nextSelectorId !== null;
                    const isSelector = id === trip.selectedById;
                    const canRemove = isAdmin && !isLocked && !isSelector;
                    return (
                      <span
                        key={id}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1
                          ${id === trip.selectedById
                            ? 'bg-green-100 text-green-700'
                            : id === trip.nextSelectorId
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {getMemberName(id)}
                        {canRemove && (
                          <button
                            onClick={() => {
                              updateTrip({
                                ...trip,
                                attendeeIds: trip.attendeeIds.filter((a) => a !== id),
                              });
                            }}
                            className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer leading-none"
                            title={`Remove ${getMemberName(id)}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
