/**
 * src/ui/tooltip.ts
 * ----------------------------------------------------------------------------
 * Hover tooltip (follows the pointer) and pinned popup (opened by clicking a
 * BED feature; closes on Escape, outside click, or when the view moves).
 */

let tip: HTMLElement | null = null;
let popup: HTMLElement | null = null;

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function place(el: HTMLElement, x: number, y: number, offset = 14, above = false) {
  const r = el.getBoundingClientRect();
  let left = x + offset;
  let top = above ? y - r.height - offset * 3 : y + offset;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - offset;
  if (!above && top + r.height > window.innerHeight - 8) top = y - r.height - offset;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}

export function showTooltip(x: number, y: number, html: string, above = false): void {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.append(tip);
  }
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.hidden = false;
  place(tip, x, y, 14, above);
}

export function hideTooltip(): void {
  if (tip) tip.hidden = true;
}

export interface PopupAction {
  label: string;
  run: () => void;
}

export function openPopup(x: number, y: number, html: string, actions: PopupAction[]): void {
  closePopup();
  hideTooltip();
  popup = document.createElement('div');
  popup.className = 'popup';
  popup.setAttribute('role', 'dialog');
  popup.innerHTML = `<button class="popup-close" aria-label="Close">×</button>${html}<div class="popup-actions"></div>`;
  const bar = popup.querySelector('.popup-actions')!;
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = a.label;
    b.addEventListener('click', a.run);
    bar.append(b);
  }
  popup.querySelector('.popup-close')!.addEventListener('click', closePopup);
  document.body.append(popup);
  place(popup, x, y, 8);
}

export function closePopup(): void {
  popup?.remove();
  popup = null;
}

export const popupOpen = () => popup !== null;

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });
window.addEventListener('pointerdown', (e) => {
  if (popup && !popup.contains(e.target as Node)) closePopup();
}, true);
