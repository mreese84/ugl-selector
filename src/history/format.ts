// How history numbers read on the page

import type { HistoryEvent } from './types.ts';
import type { WinLoss } from './stats.ts';

export const formatPoints = (n: number) => (n === 0.5 ? '½' : Number.isInteger(n) ? String(n) : `${Math.floor(n)}½`);
export const formatPts = (n: number) => `${formatPoints(n)} ${n === 1 ? 'pt' : 'pts'}`;
export const formatRecord = (r: WinLoss) => `${r.w}-${r.l}-${r.h}`;
export const formatToPar = (n: number) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `−${-n}`);
// Plus handicaps are stored as negatives (+2.0 = -2)
export const formatHandicap = (h: number) => (h < 0 ? `+${(-h).toFixed(1)}` : h.toFixed(1));
export const eventLabel = (event: HistoryEvent) => `UGL${event.edition}`;
