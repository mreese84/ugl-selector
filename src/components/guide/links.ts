export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// "bluemarlincolumbia.com" -> "https://bluemarlincolumbia.com"; blank -> null
export function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
