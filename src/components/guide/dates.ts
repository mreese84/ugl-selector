// Guide dates are stored as YYYY-MM-DD

// Parse YYYY-MM-DD as a local date (new Date('2026-11-05') would be UTC midnight)
export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  parseDate(iso).toLocaleDateString('en-US', opts);

export function dateRange(dates: string[]) {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort();
  const start = parseDate(sorted[0]);
  const end = parseDate(sorted[sorted.length - 1]);
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  if (start.getMonth() === end.getMonth()) {
    return `${month(start)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

// "10:20 AM" -> 10.33 (hours after midnight); null if it isn't a time like that
export function clockHours(time: string): number | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AP])M$/i);
  if (!m) return null;
  return (Number(m[1]) % 12) + (m[3].toUpperCase() === 'P' ? 12 : 0) + Number(m[2]) / 60;
}
