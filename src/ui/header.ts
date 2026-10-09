/**
 * src/ui/header.ts
 * ----------------------------------------------------------------------------
 * Top header: developer-defined title and subtitle (tracks.config.ts) on the
 * left, Viewer | Help tabs on the right.
 */
import { helpHash, viewerHash } from '../router';

export interface Header {
  el: HTMLElement;
  setPage(page: 'viewer' | 'help'): void;
  /** Keep the Viewer tab pointing at the current position. */
  setViewerHref(href: string): void;
}

export function createHeader(title: string, subtitle: string): Header {
  const el = document.createElement('header');
  el.className = 'app-header';
  el.innerHTML = `
    <div class="brand">
      <h1 class="title"></h1>
      <p class="subtitle"></p>
    </div>
    <nav class="tabs" aria-label="Pages">
      <a class="tab" data-page="viewer" href="${viewerHash()}">Viewer</a>
      <a class="tab" data-page="help" href="${helpHash()}">Help</a>
    </nav>`;
  el.querySelector('.title')!.textContent = title;
  const sub = el.querySelector<HTMLElement>('.subtitle')!;
  sub.innerHTML = subtitle;
  sub.hidden = !subtitle;
  const tabs = [...el.querySelectorAll<HTMLAnchorElement>('.tab')];
  return {
    el,
    setPage(page) {
      for (const t of tabs) {
        if (t.dataset.page === page) t.setAttribute('aria-current', 'page');
        else t.removeAttribute('aria-current');
      }
    },
    setViewerHref(href) {
      tabs[0].href = href;
    },
  };
}
