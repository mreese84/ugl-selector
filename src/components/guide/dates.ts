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
