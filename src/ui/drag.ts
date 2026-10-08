/**
 * src/ui/drag.ts
 * ----------------------------------------------------------------------------
 * One drag controller used for both
 *   - reordering tracks (drag a track name or its grip), and
 *   - dropping a chip from the hidden-tracks tray into an exact slot.
 *
 * Press and release without moving = click. Moving ≥ 4 px starts a drag:
 * a small "ghost" follows the pointer and a blue line shows where the track
 * will land. Dropping outside the track area cancels.
 */

export interface DragOptions {
  event: PointerEvent;
  /** Text and color shown in the ghost that follows the pointer. */
  label: string;
  color: string;
  /** Container holding the .track-row elements. */
  stack: HTMLElement;
  /** Line element used to show the drop position (positioned inside `overlay`). */
  indicator: HTMLElement;
  overlay: HTMLElement;
  /** Row being moved (left out of slot computation). */
  excludeId?: string;
  onClick?: () => void;
  onDrop: (index: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

const THRESHOLD = 4;

export function startDrag(o: DragOptions): void {
  if (o.event.button !== 0) return;
  const x0 = o.event.clientX;
  const y0 = o.event.clientY;
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let index: number | null = null;

  const rows = () =>
    [...o.stack.querySelectorAll<HTMLElement>('.track-row')].filter((r) => r.dataset.id !== o.excludeId);

  const slotAt = (clientX: number, clientY: number): number | null => {
    const box = o.stack.getBoundingClientRect();
    const inside = clientX >= box.left - 20 && clientX <= box.right + 20 && clientY >= box.top - 40 && clientY <= box.bottom + 60;
    if (!inside) return null;
    const rs = rows();
    let i = 0;
    for (const r of rs) {
      const b = r.getBoundingClientRect();
      if (clientY > b.top + b.height / 2) i++;
    }
    return i;
  };

  const placeIndicator = (i: number | null) => {
    if (i === null) { o.indicator.hidden = true; return; }
    const rs = rows();
    const ob = o.overlay.getBoundingClientRect();
    let y: number;
    if (!rs.length) y = o.stack.getBoundingClientRect().top - ob.top;
    else if (i < rs.length) y = rs[i].getBoundingClientRect().top - ob.top - 2;
    else y = rs[rs.length - 1].getBoundingClientRect().bottom - ob.top + 1;
    o.indicator.style.top = `${Math.round(y)}px`;
    o.indicator.hidden = false;
  };

  const move = (e: PointerEvent) => {
    if (!dragging) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < THRESHOLD) return;
      dragging = true;
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = `<span class="swatch"></span>`;
      (ghost.firstChild as HTMLElement).style.background = o.color;
      ghost.append(o.label);
      document.body.append(ghost);
      document.body.classList.add('is-dragging');
      o.onStart?.();
    }
    e.preventDefault();
    ghost!.style.transform = `translate(${e.clientX + 12}px, ${e.clientY - 10}px)`;
    index = slotAt(e.clientX, e.clientY);
    placeIndicator(index);
  };

  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
    if (!dragging) { o.onClick?.(); return; }
    // Swallow the click that follows a drag (e.g. on a track name link).
    const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    finish();
    if (index !== null) o.onDrop(index);
  };

  const finish = () => {
    ghost?.remove();
    o.indicator.hidden = true;
    document.body.classList.remove('is-dragging');
    o.onEnd?.();
  };

  const cancel = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
    if (dragging) finish();
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { index = null; cancel(); } };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key);
}
