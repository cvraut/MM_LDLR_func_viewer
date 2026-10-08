/**
 * src/router.ts
 * ----------------------------------------------------------------------------
 * Two pages in one HTML file, switched by the URL hash:
 *
 *   #/viewer?pos=chr7:55,000,001-55,300,000   viewer at a position
 *   #/viewer                                  viewer, keep current position
 *   #/help                                    top of help
 *   #/help/track-atac                         help, scrolled to an anchor
 *
 * An empty hash means the viewer. Hash routing works from file:// too.
 */

export type Route =
  | { page: 'viewer'; pos: string | null }
  | { page: 'help'; anchor: string | null };

export function parseHash(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  if (h.startsWith('/help')) {
    const anchor = h.slice('/help'.length).replace(/^\//, '');
    return { page: 'help', anchor: anchor || null };
  }
  const m = /[?&]pos=([^&]+)/.exec(h);
  return { page: 'viewer', pos: m ? m[1] : null };
}

export const viewerHash = (pos?: string) => (pos ? `#/viewer?pos=${pos}` : '#/viewer');
export const helpHash = (anchor?: string) => (anchor ? `#/help/${anchor}` : '#/help');

/** Calls `onRoute` now and on every hash change. */
export function startRouter(onRoute: (r: Route) => void): void {
  const fire = () => onRoute(parseHash(location.hash));
  window.addEventListener('hashchange', fire);
  fire();
}

/** Update the hash without adding a history entry (used while panning). */
export function replaceHash(hash: string): void {
  if (location.hash !== hash) history.replaceState(null, '', hash);
}
