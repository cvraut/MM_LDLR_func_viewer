/**
 * src/ui/menu.ts
 * ----------------------------------------------------------------------------
 * Minimal right-click menu. Closes on Escape, outside click, scroll or resize.
 * Arrow keys move between items; Enter selects.
 */

export type MenuItem =
  | { label: string; checked?: boolean; onSelect: () => void }
  | { heading: string }
  | { separator: true };

let current: HTMLElement | null = null;
let onCloseCurrent: (() => void) | null = null;

export function closeMenu(): void {
  current?.remove();
  current = null;
  const cb = onCloseCurrent;
  onCloseCurrent = null;
  cb?.();
}

export function openMenu(x: number, y: number, items: MenuItem[], onClose?: () => void): void {
  closeMenu();
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  for (const it of items) {
    if ('separator' in it) {
      el.append(Object.assign(document.createElement('div'), { className: 'menu-sep' }));
    } else if ('heading' in it) {
      el.append(Object.assign(document.createElement('div'), { className: 'menu-heading', textContent: it.heading }));
    } else {
      const b = document.createElement('button');
      b.className = 'menu-item';
      b.setAttribute('role', it.checked === undefined ? 'menuitem' : 'menuitemradio');
      if (it.checked !== undefined) b.setAttribute('aria-checked', String(it.checked));
      b.textContent = it.label;
      b.addEventListener('click', () => { closeMenu(); it.onSelect(); });
      el.append(b);
    }
  }
  document.body.append(el);
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.min(x, window.innerWidth - r.width - 8)}px`;
  el.style.top = `${Math.min(y, window.innerHeight - r.height - 8)}px`;
  current = el;
  onCloseCurrent = onClose ?? null;
  (el.querySelector('.menu-item') as HTMLElement | null)?.focus();

  el.addEventListener('keydown', (e) => {
    const btns = [...el.querySelectorAll<HTMLElement>('.menu-item')];
    const i = btns.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { btns[(i + 1) % btns.length]?.focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { btns[(i - 1 + btns.length) % btns.length]?.focus(); e.preventDefault(); }
  });
}

window.addEventListener('pointerdown', (e) => { if (current && !current.contains(e.target as Node)) closeMenu(); }, true);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', closeMenu);
window.addEventListener('scroll', closeMenu, true);
