/**
 * src/pages/help.ts
 * ----------------------------------------------------------------------------
 * The Help page. Its HTML is prebuilt from help/*.md by build/help.ts; this
 * module only adds the table of contents, highlights the section in view,
 * scrolls to anchors (#/help/<anchor>) and opens images full size on click.
 */
import type { HelpBundle, TocEntry } from '../../shared/types';
import { helpHash } from '../router';

export interface HelpPage {
  el: HTMLElement;
  show(anchor: string | null): void;
}

export function createHelpPage(help: HelpBundle): HelpPage {
  const el = document.createElement('section');
  el.className = 'page page-help';
  const tocHtml = (entries: TocEntry[]): string =>
    `<ul>${entries.map((e) => `<li><a href="${helpHash(e.id)}" data-id="${e.id}">${escapeHtml(e.text)}</a>${e.children.length ? tocHtml(e.children) : ''}</li>`).join('')}</ul>`;
  el.innerHTML = `
    <nav class="toc" aria-label="Contents"><h2 class="toc-title">Contents</h2>${tocHtml(help.toc)}</nav>
    <article class="help-content">${help.html}</article>`;

  const content = el.querySelector<HTMLElement>('.help-content')!;
  const links = new Map([...el.querySelectorAll<HTMLAnchorElement>('.toc a')].map((a) => [a.dataset.id!, a]));

  // Highlight the TOC entry for the section nearest the top of the screen.
  const targets = [...links.keys()].map((id) => document.getElementById(id) ?? content.querySelector<HTMLElement>(`#${CSS.escape(id)}`)).filter(Boolean) as HTMLElement[];
  const spy = () => {
    let current = targets[0]?.id;
    for (const t of targets) if (t.getBoundingClientRect().top < 120) current = t.id;
    for (const [id, a] of links) a.classList.toggle('current', id === current);
  };
  window.addEventListener('scroll', () => { if (!el.hidden) spy(); }, { passive: true });

  // Lightbox
  content.addEventListener('click', (e) => {
    const img = (e.target as HTMLElement).closest('img');
    if (!img) return;
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', img.alt || 'Image');
    box.innerHTML = `<img alt=""><button class="lightbox-close" aria-label="Close">×</button>`;
    const big = box.querySelector('img')!;
    big.src = img.src;
    big.alt = img.alt;
    const close = () => { box.remove(); window.removeEventListener('keydown', onKey); };
    const onKey = (k: KeyboardEvent) => { if (k.key === 'Escape') close(); };
    box.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    document.body.append(box);
    box.querySelector<HTMLElement>('.lightbox-close')!.focus();
  });

  return {
    el,
    show(anchor) {
      requestAnimationFrame(() => {
        const target = anchor ? content.querySelector<HTMLElement>(`#${CSS.escape(anchor)}`) : null;
        if (target) {
          target.scrollIntoView({ block: 'start' });
          target.classList.remove('flash');
          void target.offsetWidth;
          target.classList.add('flash');
        } else {
          window.scrollTo(0, 0);
        }
        spy();
      });
    },
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
