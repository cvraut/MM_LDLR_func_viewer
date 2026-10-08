/**
 * src/state.ts
 * ----------------------------------------------------------------------------
 * Single source of truth for what the viewer shows.
 *
 *   view   – chrom/start/end on screen (persisted in the URL hash)
 *   layout – track order, hidden tracks, per-track overrides such as display
 *            mode or windowing (persisted in localStorage, keyed by build hash
 *            so a rebuild with different data starts fresh)
 *
 * UI modules call setView / updateLayout and subscribe to changes.
 */
import type { ChromInfo, TrackStyle } from '../shared/types';
import { findChrom, formatPosition, parsePosition, type Locus } from './core/coords';
import type { Track } from './data/tracks';

export type View = Locus;

export interface Layout {
  order: string[];
  hidden: string[];
  overrides: Record<string, Partial<TrackStyle>>;
}

/** Highest zoom: this many screen pixels per base. */
export const MAX_PX_PER_BASE = 14;

type Listener = (what: 'view' | 'layout') => void;

export class Store {
  view: View;
  layout: Layout;
  /** Width in CSS px of the data area; set by the viewer on resize. */
  dataWidth = 800;
  private listeners = new Set<Listener>();
  private saveTimer = 0;
  private readonly storageKey: string;

  constructor(
    readonly chroms: ChromInfo[],
    readonly tracks: Track[],
    readonly defaultPosition: string,
    buildHash: string,
  ) {
    this.storageKey = `genome-browser:layout:${buildHash}`;
    this.view = parsePosition(defaultPosition, chroms) ?? { chrom: chroms[0].name, start: 0, end: chroms[0].size };
    this.layout = this.loadLayout() ?? this.defaultLayout();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(what: 'view' | 'layout') {
    for (const fn of this.listeners) fn(what);
  }

  // ---- view -------------------------------------------------------------

  chromSize(chrom = this.view.chrom): number {
    return findChrom(chrom, this.chroms)?.size ?? 1;
  }
  minSpan(): number {
    return Math.max(10, this.dataWidth / MAX_PX_PER_BASE);
  }

  /** Set the view, clamped to the chromosome and zoom limits. */
  setView(v: View): void {
    const size = this.chromSize(v.chrom);
    let span = Math.min(size, Math.max(this.minSpan(), v.end - v.start));
    const center = (v.start + v.end) / 2;
    let start = center - span / 2;
    start = Math.max(0, Math.min(size - span, start));
    span = Math.min(span, size);
    const next = { chrom: v.chrom, start, end: start + span };
    if (next.chrom === this.view.chrom && next.start === this.view.start && next.end === this.view.end) return;
    this.view = next;
    this.emit('view');
  }

  /** Zoom by `factor` (>1 zooms out) keeping genome position `anchor` at the same pixel. */
  zoomAt(factor: number, anchor: number): void {
    const { start, end, chrom } = this.view;
    const frac = (anchor - start) / (end - start);
    const size = this.chromSize();
    const span = Math.min(size, Math.max(this.minSpan(), (end - start) * factor));
    let s = anchor - frac * span;
    s = Math.max(0, Math.min(size - span, s));
    this.setView({ chrom, start: s, end: s + span });
  }

  pan(bp: number): void {
    const { start, end, chrom } = this.view;
    this.setView({ chrom, start: start + bp, end: end + bp });
  }

  positionString(): string {
    return formatPosition(this.view.chrom, this.view.start, this.view.end);
  }

  // ---- layout -----------------------------------------------------------

  defaultLayout(): Layout {
    return {
      order: this.tracks.map((t) => t.id),
      hidden: this.tracks.filter((t) => t.style.hidden).map((t) => t.id),
      overrides: {},
    };
  }

  /** Effective style = build style + user overrides from the right-click menu. */
  styleOf(track: Track): TrackStyle {
    return { ...track.style, ...this.layout.overrides[track.id] };
  }

  visibleTracks(): Track[] {
    const byId = new Map(this.tracks.map((t) => [t.id, t]));
    return this.layout.order.filter((id) => !this.layout.hidden.includes(id)).map((id) => byId.get(id)!).filter(Boolean);
  }

  hiddenTracks(): Track[] {
    const byId = new Map(this.tracks.map((t) => [t.id, t]));
    // Keep the tray in original config order so chips don't jump around.
    return this.tracks.filter((t) => this.layout.hidden.includes(t.id)).map((t) => byId.get(t.id)!);
  }

  updateLayout(fn: (l: Layout) => void): void {
    fn(this.layout);
    this.emit('layout');
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.saveLayout(), 200);
  }

  hide(id: string): void {
    this.updateLayout((l) => { if (!l.hidden.includes(id)) l.hidden.push(id); });
  }

  /** Show a hidden track. index = position among visible tracks; omitted = bottom. */
  show(id: string, index?: number): void {
    this.updateLayout((l) => {
      l.hidden = l.hidden.filter((h) => h !== id);
      this.placeVisible(l, id, index);
    });
  }

  /** Move a visible track to `index` among visible tracks. */
  move(id: string, index: number): void {
    this.updateLayout((l) => this.placeVisible(l, id, index));
  }

  private placeVisible(l: Layout, id: string, index?: number) {
    l.order = l.order.filter((x) => x !== id);
    const visible = l.order.filter((x) => !l.hidden.includes(x));
    if (index === undefined || index >= visible.length) {
      const after = visible[visible.length - 1];
      l.order.splice(after ? l.order.indexOf(after) + 1 : l.order.length, 0, id);
    } else {
      l.order.splice(l.order.indexOf(visible[Math.max(0, index)]), 0, id);
    }
  }

  setOverride(id: string, patch: Partial<TrackStyle>): void {
    this.updateLayout((l) => { l.overrides[id] = { ...l.overrides[id], ...patch }; });
  }

  resetLayout(): void {
    this.layout = this.defaultLayout();
    try { localStorage.removeItem(this.storageKey); } catch { /* storage unavailable */ }
    this.emit('layout');
  }

  private loadLayout(): Layout | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const saved = JSON.parse(raw) as Layout;
      const ids = new Set(this.tracks.map((t) => t.id));
      const order = saved.order.filter((id) => ids.has(id));
      for (const t of this.tracks) if (!order.includes(t.id)) order.push(t.id);
      return { order, hidden: (saved.hidden ?? []).filter((id) => ids.has(id)), overrides: saved.overrides ?? {} };
    } catch {
      return null;
    }
  }

  private saveLayout(): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.layout)); } catch { /* storage unavailable */ }
  }
}
