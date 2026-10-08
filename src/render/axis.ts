/**
 * src/render/axis.ts
 * ----------------------------------------------------------------------------
 * The thin coordinate axis above the tracks: chromosome name, a few labeled
 * ticks (1-based positions, like UCSC) and a scale bar on the right.
 */
import { fmtInt, formatSpan, niceStep } from '../core/coords';
import { cssVar, font } from './canvas';

export const AXIS_HEIGHT = 38;

export function drawAxis(ctx: CanvasRenderingContext2D, chrom: string, start: number, end: number, w: number, h: number): void {
  const bpPerPx = (end - start) / w;
  const ink = cssVar('--ink');
  const muted = cssVar('--muted');
  const baseY = h - 6;

  // Scale bar (right): about one eighth of the width, rounded to a nice length.
  const barBp = niceStep((end - start) / 8, 1);
  const barPx = barBp / bpPerPx;
  const bx1 = w - 4;
  const bx0 = bx1 - barPx;
  ctx.fillStyle = ink;
  ctx.fillRect(bx0, 9, barPx, 1.5);
  ctx.fillRect(bx0, 6, 1, 7);
  ctx.fillRect(bx1 - 1, 6, 1, 7);
  ctx.font = font(10.5);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(formatSpan(barBp), bx0 - 6, 10);

  // Chromosome name (left)
  ctx.textAlign = 'left';
  ctx.font = font(11, 600);
  ctx.fillText(chrom, 0, 10);

  // Ticks along the bottom
  ctx.fillStyle = cssVar('--hairline-strong');
  ctx.fillRect(0, baseY, w, 1);
  const step = niceStep(end - start, Math.max(2, Math.floor(w / 120)));
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const first = Math.ceil((start + 1) / step) * step;
  for (let p = first; p <= end; p += step) {
    // Center of 1-based base p is at 0-based position p - 0.5
    const x = Math.round((p - 0.5 - start) / bpPerPx) + 0.5;
    if (x < 0 || x > w) continue;
    ctx.fillStyle = muted;
    ctx.fillRect(x - 0.5, baseY - 4, 1, 4);
    const label = fmtInt(p);
    const lw = ctx.measureText(label).width;
    if (x + lw / 2 > w || x - lw / 2 < 0) continue;
    ctx.fillText(label, x, baseY - 5);
  }
}
