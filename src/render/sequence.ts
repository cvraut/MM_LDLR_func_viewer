/**
 * src/render/sequence.ts
 * ----------------------------------------------------------------------------
 * Reference sequence track (only present when a FASTA was bundled):
 *   ≥ 7 px per base   letters
 *   ≥ 1 px per base   colored ticks
 *   further out       a short hint to zoom in
 */
import { baseAt, type SequenceData } from '../data/decode';
import { cssVar, font } from './canvas';

export const BASE_COLORS: Record<string, string> = {
  A: '#2b9348', C: '#2c6db5', G: '#d08a0c', T: '#c8372d', N: '#9aa0a6',
};

export function drawSequence(
  ctx: CanvasRenderingContext2D,
  seqs: SequenceData[],
  viewStart: number,
  bpPerPx: number,
  w: number,
  h: number,
): void {
  const pxPerBase = 1 / bpPerPx;
  if (pxPerBase < 1) {
    ctx.fillStyle = cssVar('--muted');
    ctx.font = font(10);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(seqs.length ? 'Zoom in to see bases' : 'No sequence for this chromosome', 2, h / 2);
    return;
  }
  const first = Math.floor(viewStart);
  const last = Math.ceil(viewStart + w * bpPerPx);
  const letters = pxPerBase >= 7;
  ctx.font = font(Math.min(13, pxPerBase * 0.95), 600);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let pos = first; pos < last; pos++) {
    let b = '';
    for (const s of seqs) if ((b = baseAt(s, pos))) break;
    if (!b) continue;
    const x = (pos - viewStart) * pxPerBase;
    ctx.fillStyle = BASE_COLORS[b];
    if (letters) ctx.fillText(b, x + pxPerBase / 2, h / 2 + 0.5);
    else ctx.fillRect(x, 3, Math.max(1, pxPerBase - (pxPerBase > 3 ? 1 : 0)), h - 6);
  }
}

export function sequenceBaseAt(seqs: SequenceData[], pos: number): string {
  for (const s of seqs) {
    const b = baseAt(s, pos);
    if (b) return b;
  }
  return '';
}
