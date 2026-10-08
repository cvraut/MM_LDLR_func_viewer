/**
 * src/render/bed.ts
 * ----------------------------------------------------------------------------
 * BED track rendering in the four UCSC display modes:
 *   dense   everything on one row
 *   squish  packed rows, half height, no labels
 *   pack    packed rows, names drawn left of features (default)
 *   full    one feature per row, names drawn left of features
 *
 * Gene models (BED12): thick blocks = coding, thin blocks = UTR, a line with
 * strand chevrons joins blocks across introns. Features without blocks are a
 * single block (thick between thickStart/thickEnd).
 */
import type { TrackStyle } from '../../shared/types';
import type { BedFeature } from '../data/decode';
import { packRows } from '../core/packing';
import { cssVar, font, resolveColor } from './canvas';

export const ROW_HEIGHT: Record<TrackStyle['mode'], number> = { dense: 9, squish: 5, pack: 12, full: 12 };
const MAX_ROWS = 60;
const LABEL_FONT = 10;

export interface PlacedFeature {
  f: BedFeature;
  row: number;
  x0: number;
  x1: number;
  label: boolean;
}

export interface BedLayout {
  items: PlacedFeature[];
  rows: number;
  rowHeight: number;
  height: number;
}

export function layoutBed(
  ctx: CanvasRenderingContext2D,
  features: BedFeature[],
  style: TrackStyle,
  viewStart: number,
  bpPerPx: number,
): BedLayout {
  const mode = style.mode;
  const rowHeight = ROW_HEIGHT[mode];
  const showLabels = style.featureLabels && (mode === 'pack' || mode === 'full');
  ctx.font = font(LABEL_FONT);
  const items: PlacedFeature[] = features.map((f) => {
    const x0 = (f.start - viewStart) / bpPerPx;
    const x1 = Math.max(x0 + 1, (f.end - viewStart) / bpPerPx);
    return { f, row: 0, x0, x1, label: false };
  });

  let rows = 1;
  if (mode === 'full') {
    items.forEach((it, i) => {
      it.row = Math.min(i, MAX_ROWS - 1);
      it.label = showLabels && !!it.f.name;
    });
    rows = Math.min(Math.max(1, items.length), MAX_ROWS);
  } else if (mode !== 'dense') {
    const spans = items.map((it) => {
      const lw = showLabels && it.f.name ? ctx.measureText(it.f.name).width + 4 : 0;
      it.label = lw > 0 && it.x0 - lw >= 0;
      return { x0: it.label ? it.x0 - lw : it.x0, x1: it.x1 };
    });
    const r = packRows(spans, 2, MAX_ROWS);
    items.forEach((it, i) => { it.row = r[i]; });
    rows = Math.max(1, ...r.map((x) => x + 1));
  }
  return { items, rows, rowHeight, height: rows * rowHeight + 1 };
}

export function drawBed(ctx: CanvasRenderingContext2D, lay: BedLayout, style: TrackStyle, viewStart: number, bpPerPx: number, w: number): void {
  const mode = style.mode;
  const base = resolveColor(style.color);
  const rh = lay.rowHeight;
  const thickH = mode === 'squish' ? rh - 1 : rh - 3;
  const thinH = Math.max(1, Math.round(thickH / 2));
  const px = (pos: number) => (pos - viewStart) / bpPerPx;

  if (style.centerLine) {
    ctx.fillStyle = cssVar('--hairline-strong') || '#c9ccd1';
    for (let r = 0; r < lay.rows; r++) ctx.fillRect(0, r * rh + Math.floor(rh / 2), w, 1);
  }

  for (const it of lay.items) {
    const f = it.f;
    const color = style.itemRgb && f.rgb ? f.rgb : base;
    const top = it.row * rh + 1;
    const mid = top + Math.floor(thickH / 2);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const block = (s: number, e: number) => {
      // Split each block into thin (UTR) and thick (coding) parts.
      const parts: [number, number, boolean][] = [];
      const ts = Math.max(s, f.thickStart);
      const te = Math.min(e, f.thickEnd);
      if (te > ts) {
        if (ts > s) parts.push([s, ts, false]);
        parts.push([ts, te, true]);
        if (e > te) parts.push([te, e, false]);
      } else {
        parts.push([s, e, false]);
      }
      for (const [a, b, thick] of parts) {
        const x0 = px(a);
        const x1 = Math.max(x0 + 1, px(b));
        const hgt = thick ? thickH : thinH;
        ctx.fillRect(x0, thick ? top : mid - Math.floor(thinH / 2), x1 - x0, hgt);
      }
    };

    const hasBlocks = f.blockSizes.length > 0;
    if (hasBlocks && f.blockSizes.length > 1) {
      // Intron line + chevrons
      const x0 = Math.max(-2, px(f.start));
      const x1 = Math.min(w + 2, px(f.end));
      ctx.fillRect(x0, mid, x1 - x0, 1);
      if (f.strand !== '.' && mode !== 'dense' && x1 - x0 > 12) {
        const dir = f.strand === '+' ? 1 : -1;
        const c = Math.max(2, Math.floor(thickH / 3));
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = Math.max(x0 + 6, 2); x < Math.min(x1 - 4, w); x += 9) {
          ctx.moveTo(x - c * dir + 0.5, mid - c + 0.5);
          ctx.lineTo(x + 0.5, mid + 0.5);
          ctx.lineTo(x - c * dir + 0.5, mid + c + 0.5);
        }
        ctx.stroke();
      }
    }
    if (hasBlocks) {
      for (let k = 0; k < f.blockSizes.length; k++) {
        const s = f.start + f.blockStarts[k];
        block(s, s + f.blockSizes[k]);
      }
    } else {
      block(f.start, f.end);
    }

    if (it.label) {
      ctx.font = font(LABEL_FONT);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.name, it.x0 - 3, top + thickH / 2 + 0.5);
    }
  }
}

/** Find the feature under (x, y) in a laid-out track. */
export function hitBed(lay: BedLayout, x: number, y: number): BedFeature | null {
  const row = Math.floor(y / lay.rowHeight);
  let best: PlacedFeature | null = null;
  for (const it of lay.items) {
    if (it.row !== row) continue;
    if (x >= it.x0 - 2 && x <= it.x1 + 2 && (!best || it.x1 - it.x0 < best.x1 - best.x0)) best = it;
  }
  return best?.f ?? null;
}
