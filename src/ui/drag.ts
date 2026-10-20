/**
 * src/ui/drag.ts
 * ----------------------------------------------------------------------------
 * One drag controller used for both
 *   - reordering tracks (press in a track's left column), and
 *   - dropping a chip from the hidden-tracks tray into an exact slot.
 *
 * Mouse: press and move ≥ 4 px to drag; press and release = click.
 * Touch: press and HOLD ~0.3 s, then move to drag. Moving before the hold
 * scrolls the page instead; a quick tap = click. A long press without moving
 * is left alone, so the phone's long-press menu (track options) still works.
 * A ghost follows the pointer, and a line shows where the track will land.
 * Dropping outside the track area cancels.
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
  /** Touch only: the hold has completed and a drag may start. */
  onArm?: () => void;
  onStart?: () => void;
  /** Always called when the gesture ends, whether or not a drag happened. */
  onEnd?: () => void;
}

const THRESHOLD = 4;
const TOUCH_HOLD_MS = 300;

export function startDrag(o: DragOptions): void {
  if (o.event.button !== 0) return;
  const id = o.event.pointerId;
  const touch = o.event.pointerType === 'touch';
  const x0 = o.event.clientX;
  const y0 = o.event.clientY;
  let armed = !touch;            // mouse and pen may drag right away
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let index: number | null = null;
  let holdTimer = 0;
  let lastX = x0;
  let lastY = y0;
  if (touch) {
    holdTimer = window.setTimeout(() => {
      armed = true;
      navigator.vibrate?.(10);
      o.onArm?.();
      pickUp(lastX, lastY);          // touch: picked up as soon as the hold completes
    }, TOUCH_HOLD_MS);
  }

  const rows = () =>
    [...o.stack.querySelectorAll<HTMLElement>('.track-row')].filter((r) => r.dataset.id !== o.excludeId);

  const slotAt = (clientX: number, clientY: number): number | null => {
    const box = o.stack.getBoundingClientRect();
    const inside = clientX >= box.left - 20 && clientX <= box.right + 20 && clientY >= box.top - 40 && clientY <= box.bottom + 60;
    if (!inside) return null;
    let i = 0;
    for (const r of rows()) {
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

  function pickUp(x: number, y: number) {
    dragging = true;
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `<span class="swatch"></span>`;
    (ghost.firstChild as HTMLElement).style.background = o.color;
    ghost.append(o.label);
    document.body.append(ghost);
    document.body.classList.add('is-dragging');
    o.onStart?.();
    follow(x, y);
  }

  function follow(x: number, y: number) {
    ghost!.style.transform = `translate(${x + 12}px, ${y - 10}px)`;
    index = slotAt(x, y);
    placeIndicator(index);
  }

  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (!dragging) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < THRESHOLD) return;
      if (!armed) { stop(); return; }   // touch moved before the hold: let the page scroll
      pickUp(e.clientX, e.clientY);     // mouse: starts on movement
    }
    e.preventDefault();
    follow(e.clientX, e.clientY);
  };

  // Touch: once armed, stop the page scrolling under the finger.
  const touchMove = (e: TouchEvent) => { if (armed || dragging) e.preventDefault(); };

  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const wasDragging = dragging;
    const dropAt = index;
    stop();
    if (!wasDragging) { o.onClick?.(); return; }
    // Swallow the click that follows a drag (e.g. on a track name link).
    const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    if (dropAt !== null) o.onDrop(dropAt);
  };

  const cancel = (e: Event) => {
    if (e instanceof PointerEvent && e.pointerId !== id) return;
    stop();
  };
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };
  // Touch: block the phone's long-press menu, which fires at about the same moment as the
  // pick-up and would otherwise cancel it (the track menu is a tap on the name).
  // Mouse: a right-click before dragging gives up the drag; during a drag it's blocked.
  const menu = (e: Event) => {
    if (touch || dragging) { e.preventDefault(); e.stopPropagation(); }
    else stop();
  };

  function stop() {
    clearTimeout(holdTimer);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
    window.removeEventListener('contextmenu', menu, true);
    window.removeEventListener('touchmove', touchMove);
    ghost?.remove();
    o.indicator.hidden = true;
    document.body.classList.remove('is-dragging');
    o.onEnd?.();
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key);
  window.addEventListener('contextmenu', menu, true);
  if (touch) window.addEventListener('touchmove', touchMove, { passive: false });
}