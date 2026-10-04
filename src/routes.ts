// Page addresses, all under the site's base path (/ugl-selector/):
//   /                       trips, selection, and members tabs
//   /2026-columbia/guide    a trip's Player's Guide
// GitHub Pages only serves files. The build (vite.config.ts) writes a copy of index.html at each
// trip's guide address and as 404.html for anything else, and the app reads the path itself.

const BASE = import.meta.env.BASE_URL;

export { tripSlugs } from './tripSlugs';

export type Route =
  | { page: 'home' }
  | { page: 'guide'; slug: string }
  | { page: 'legacyGuide'; tripId: string }; // old #/guide/<tripId> links

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
