/**
 * src/render/signal.ts
 * ----------------------------------------------------------------------------
 * Draws WIG/bedGraph tracks from per-pixel summaries (src/data/query.ts),
 * plus the slim y-axis that sits in the track's left gutter.
 *
 * Windowing (how many bases become one pixel):
 *   max            tallest value in the pixel (default; keeps peaks visible)
 *   mean / min     average / lowest value
 *   mean+whiskers  mean as the bar, min→max as a lighter band behind it
 */
import type { TrackStyle } from '../../shared/types';
import { niceCeil } from '../core/coords';
import type { PixelSummary } from '../data/query';
import { drawRich, font, parseRichLabel, measureRich, resolveColor } from './canvas';

/** Top padding so the tallest bar doesn't touch the track above. */
const PAD_TOP = 2;

/** Value range of what's on screen, honoring windowing. */
export function summaryRange(s: PixelSummary, windowing: TrackStyle['windowing']): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  const useMinMax = windowing === 'max' || windowing === 'mean+whiskers';
  const lowArr = useMinMax ? s.min : windowing === 'min' ? s.min : s.mean;
  const highArr = useMinMax ? s.max : windowing === 'min' ? s.min : s.mean;
  for (let i = 0; i < s.max.length; i++) {
    if (Number.isNaN(highArr[i])) continue;
    if (lowArr[i] < lo) lo = lowArr[i];
    if (highArr[i] > hi) hi = highArr[i];
  }
  if (lo === Infinity) return [0, 1];
  return [lo, hi];
}

/** Turn a data range into a tidy axis range that always includes 0. */
export function niceRange([lo, hi]: [number, number]): [number, number] {
  const top = hi > 0 ? niceCeil(hi) : 0;
  const bottom = lo < 0 ? -niceCeil(-lo) : 0;
  if (top === 0 && bottom === 0) return [0, 1];
  return [bottom, top];
}

export function drawSignal(
  ctx: CanvasRenderingContext2D,
  s: PixelSummary,
  style: TrackStyle,
  [lo, hi]: [number, number],
  w: number,
  h: number,
): void {
  const color = resolveColor(style.color);
  const alt = resolveColor(style.altColor);
  const plotH = h - PAD_TOP;
  const y = (v: number) => PAD_TOP + plotH - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * plotH;
  const y0 = y(0);

  // Baseline
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  ctx.fillRect(0, Math.round(y0) - (lo < 0 ? 0.5 : 1), w, 1);
  ctx.globalAlpha = 1;

  const bar = (x: number, v: number) => {
    const yv = y(v);
    ctx.fillStyle = v < 0 ? alt : color;
    if (style.graphType === 'points') ctx.fillRect(x, yv - 1, 1.5, 2);
    else ctx.fillRect(x, Math.min(yv, y0), 1, Math.max(1, Math.abs(y0 - yv)));
  };

  for (let x = 0; x < w; x++) {
    if (Number.isNaN(s.max[x])) continue;
    switch (style.windowing) {
      case 'mean':
        bar(x, s.mean[x]);
        break;
      case 'min':
        bar(x, s.min[x]);
        break;
      case 'mean+whiskers': {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = color;
        const a = y(s.max[x]);
        const b = y(s.min[x]);
        ctx.fillRect(x, a, 1, Math.max(1, b - a));
        ctx.globalAlpha = 1;
        bar(x, s.mean[x]);
        break;
      }
      default:
        if (s.max[x] > 0 || s.min[x] >= 0) bar(x, s.max[x]);
        if (s.min[x] < 0) bar(x, s.min[x]);
    }
  }
}

/**
 * Y-axis in the gutter: rotated title on the left, a vertical rule on the
 * right edge with ticks at max, min and 0.
 */
export function drawYAxis(
  ctx: CanvasRenderingContext2D,
  style: TrackStyle,
  [lo, hi]: [number, number],
  w: number,
  h: number,
): void {
  const color = resolveColor(style.color);
  const plotH = h - PAD_TOP;
  const y = (v: number) => PAD_TOP + plotH - ((v - lo) / (hi - lo)) * plotH;
  const x = w - 0.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y(hi));
  ctx.lineTo(x, y(lo));
  const ticks = lo < 0 ? [hi, 0, lo] : [hi, lo];
  for (const t of ticks) {
    const ty = Math.round(y(t)) + 0.5;
    ctx.moveTo(x, ty);
    ctx.lineTo(x - 4, ty);
  }
  ctx.stroke();

  ctx.font = font(10);
  ctx.textAlign = 'right';
  for (const t of ticks) {
    const ty = y(t);
    // Skip the 0 label when it would collide with the min or max label.
    if (t === 0 && ticks.length === 3 && (Math.abs(ty - y(lo)) < 12 || Math.abs(ty - y(hi)) < 12)) continue;
    ctx.textBaseline = t === hi ? 'top' : t === lo ? 'bottom' : 'middle';
    const label = (+t.toPrecision(3)).toString().replace('-', '\u2212');
    ctx.fillText(label, x - 6, t === hi ? Math.max(0, ty - 2) : ty + (t === lo ? 1 : 0));
  }

  if (style.yLabel) {
    const segs = parseRichLabel(style.yLabel);
    const size = 10.5;
    const tw = measureRich(ctx, segs, size);
    ctx.save();
    ctx.translate(15, h / 2 + tw / 2);
    ctx.rotate(-Math.PI / 2);
    drawRich(ctx, segs, 0, 0, size);
    ctx.restore();
  }
}
