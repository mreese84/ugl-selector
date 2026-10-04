import type { Trip } from './types';

// Page addresses, all under the site's base path (/ugl-selector/):
//   /                       trips, selection, and members tabs
//   /2026-columbia/guide    a trip's Player's Guide
// GitHub Pages serves 404.html (a copy of index.html, see the build script) for addresses
// that aren't files, so the app reads the path itself.

const BASE = import.meta.env.BASE_URL;

export type Route =
  | { page: 'home' }
  | { page: 'guide'; slug: string }
  | { page: 'legacyGuide'; tripId: string }; // old #/guide/<tripId> links

// "Columbia, SC" in 2026 -> "2026-columbia"
function baseSlug(trip: Trip) {
  const city = trip.location
    .split(',')[0]
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${trip.year}-${city || 'trip'}`;
}

// One address per trip. Trips that share a year and city get -2, -3… in date order.
export function tripSlugs(trips: Trip[]): Map<string, string> {
  const ordered = [...trips].sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || a.id.localeCompare(b.id));
  const seen = new Map<string, number>();
  const slugs = new Map<string, string>();
  for (const trip of ordered) {
    const slug = baseSlug(trip);
    const count = (seen.get(slug) ?? 0) + 1;
    seen.set(slug, count);
    slugs.set(trip.id, count === 1 ? slug : `${slug}-${count}`);
  }
  return slugs;
}

export const homePath = () => BASE;
export const guidePath = (slug: string) => `${BASE}${encodeURIComponent(slug)}/guide`;

export function currentRoute(): Route {
  const legacy = window.location.hash.match(/^#\/guide\/(.+)$/);
  if (legacy) return { page: 'legacyGuide', tripId: decodeURIComponent(legacy[1]) };
  const { pathname } = window.location;
  const path = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : '';
  const guide = path.match(/^([^/]+)\/guide\/?$/);
  if (guide) return { page: 'guide', slug: decodeURIComponent(guide[1]) };
  return { page: 'home' };
}

// Changes the address without reloading; App listens for popstate
export function navigate(path: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// For <a> clicks: open in-app, but let Cmd/Ctrl-click etc. open a new tab as usual
export function followLink(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(path);
}
