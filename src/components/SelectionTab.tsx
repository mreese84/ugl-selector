import { useState, useMemo, useCallback, useRef } from 'react';
import { useAppState } from '../store';
import { useAuth } from '../auth';
import { buildWeightedPool, drawWinner } from '../eligibility';
import SpinnerAnimation from './SpinnerAnimation';

export default function SelectionTab() {
  const { isAdmin } = useAuth();
  const { members, trips, updateTrip } = useAppState();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnWinnerId, setDrawnWinnerId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const drawTripIdRef = useRef<string | null>(null);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatTripDate = (t: { month?: number; year: number }) =>
    `${t.month ? monthNames[t.month - 1] + ' ' : ''}${t.year}`;

  const sortedTrips = useMemo(() => [...trips].sort((a, b) => b.year - a.year || (b.month ?? 0) - (a.month ?? 0)), [trips]);

  // Find the latest trip that hasn't had a draw yet
  const pendingTrip = useMemo(
    () => sortedTrips.find((t) => t.nextSelectorId === null),
    [sortedTrips]
  );

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Unknown';

  // Build the weighted pool for the pending trip
  const pool = useMemo(() => {
    if (!pendingTrip) return [];
    const tripIndex = trips.findIndex((t) => t.id === pendingTrip.id);
    return buildWeightedPool(trips, tripIndex);
  }, [pendingTrip, trips]);

  const totalEntries = pool.reduce((sum, p) => sum + p.entries, 0);

  const handleDraw = () => {
    if (!pendingTrip) return;
    drawTripIdRef.current = pendingTrip.id;
    const tripIndex = trips.findIndex((t) => t.id === pendingTrip.id);
    const winnerId = drawWinner(trips, tripIndex, members);
    setDrawnWinnerId(winnerId);
    setIsDrawing(true);
    setShowResult(false);
  };

  const handleAnimationComplete = useCallback(() => {
    setShowResult(true);
    setIsDrawing(false);
    const tripId = drawTripIdRef.current;
    if (tripId && drawnWinnerId) {
      const trip = trips.find((t) => t.id === tripId);
      if (trip) {
        updateTrip({ ...trip, nextSelectorId: drawnWinnerId });
      }
    }
  }, [drawnWinnerId, trips, updateTrip]);

  const handleRedraw = () => {
    // Undo the saved result
    const tripId = drawTripIdRef.current;
    if (tripId) {
      const trip = trips.find((t) => t.id === tripId);
      if (trip) {
        updateTrip({ ...trip, nextSelectorId: null });
      }
    }
    setDrawnWinnerId(null);
    setShowResult(false);
    setIsDrawing(false);
  };

  // All names for the spinner animation (eligible members)
  const spinnerNames = pool.map((p) => getMemberName(p.memberId));

  if (trips.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Create a trip first on the Trips tab.</p>
      </div>
    );
  }

  // Show result if we just drew (even though pendingTrip is now null after save)
  if (showResult && drawnWinnerId) {
    const tripId = drawTripIdRef.current;
    const drawnTrip = trips.find((t) => t.id === tripId);
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Draw — {drawnTrip?.location ?? '?'} ({drawnTrip ? formatTripDate(drawnTrip) : '?'})
        </h2>
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 max-w-md mx-auto">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-2xl font-bold text-green-700">
              {getMemberName(drawnWinnerId)}
            </p>
            <p className="text-green-600 mt-1">picks the next trip location!</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleRedraw}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              Re-draw (undo and pick again)
            </button>
          )}
        </div>
      </div>
    );
  }

  // If no pending trip and not showing result, all draws are done
  if (!pendingTrip) {
    const lastTrip = sortedTrips[0];
    return (
      <div className="space-y-6 text-center py-8">
        <h2 className="text-xl font-semibold text-gray-800">All Draws Complete</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md mx-auto">
          <p className="text-gray-500 text-sm mb-2">
            {lastTrip.location} ({formatTripDate(lastTrip)})
          </p>
          <p className="text-2xl font-bold text-green-700">
            🎯 {getMemberName(lastTrip.nextSelectorId!)} picks the next location
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">
        Draw — {pendingTrip.location} ({formatTripDate(pendingTrip)})
      </h2>

      <p className="text-sm text-gray-500">
        Who will select next year's trip location? The draw uses weighted entries
        based on how many consecutive trips each person has attended without being
        selected.
      </p>

      <div className="flex flex-col-reverse md:flex-row md:gap-6 gap-6">
        {/* Left column: Eligibility table */}
        <div className="md:flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Member</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Entries</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Chance</th>
                </tr>
              </thead>
              <tbody>
                {[...pool].sort((a, b) => b.entries - a.entries).map(({ memberId, entries }) => (
                  <tr key={memberId} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {getMemberName(memberId)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5
                                       bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {entries}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {totalEntries > 0 ? ((entries / totalEntries) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {pool.length} eligible · {totalEntries} total entries ·{' '}
              <span className="text-amber-600 font-medium">
                {getMemberName(pendingTrip.selectedById)} is ineligible (selected this location)
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Draw button / Spinner */}
        <div className="md:w-64 shrink-0 flex flex-col items-center justify-start gap-4">
          {!isDrawing && isAdmin && (
            <button
              onClick={handleDraw}
              className="px-8 py-4 bg-green-600 text-white rounded-2xl font-semibold text-lg
                         hover:bg-green-700 hover:shadow-lg hover:shadow-green-200/50
                         active:scale-95 transition-all cursor-pointer w-full md:w-auto"
            >
              🎲 Draw a Name
            </button>
          )}

          {isDrawing && drawnWinnerId && (
            <SpinnerAnimation
              names={spinnerNames}
              winnerId={drawnWinnerId}
              winnerName={getMemberName(drawnWinnerId)}
              onComplete={handleAnimationComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
