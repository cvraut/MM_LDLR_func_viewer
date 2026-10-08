/**
 * src/data/query.ts
 * ----------------------------------------------------------------------------
 * Fast lookups of "what is on screen":
 *   - signalSummary: one min/max/mean per pixel, from the coarsest pyramid
 *     level that is still finer than a pixel (or raw data when zoomed in).
 *   - bedInView: features overlapping the visible window (binary search).
 */
import type { BedData, BedFeature, SignalData } from './decode';

/** First index i with arr[i] >= value (arr sorted ascending). */
export function lowerBound(arr: ArrayLike<number>, value: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export interface PixelSummary {
  min: Float32Array;
  max: Float32Array;
  mean: Float32Array;
  /** Bases represented by one pixel; also tells the tooltip whether to show one value or a range. */
  bpPerPx: number;
  /** Which source was used: 0 = raw data, otherwise the pyramid bin size. */
  source: number;
}

export function signalSummary(d: SignalData, viewStart: number, bpPerPx: number, width: number): PixelSummary {
  const min = new Float32Array(width).fill(NaN);
  const max = new Float32Array(width).fill(NaN);
  const mean = new Float32Array(width).fill(NaN);
  const wsum = new Float32Array(width);
  const viewEnd = viewStart + bpPerPx * width;

  const accumulate = (s: number, e: number, vmin: number, vmax: number, vmean: number) => {
    const px0 = (s - viewStart) / bpPerPx;
    const px1 = (e - viewStart) / bpPerPx;
    const a = Math.max(0, Math.floor(px0));
    const b = Math.min(width, Math.ceil(px1));
    for (let p = a; p < b; p++) {
      const w = Math.min(px1, p + 1) - Math.max(px0, p);
      if (w <= 0) continue;
      if (Number.isNaN(min[p]) || vmin < min[p]) min[p] = vmin;
      if (Number.isNaN(max[p]) || vmax > max[p]) max[p] = vmax;
      mean[p] = (Number.isNaN(mean[p]) ? 0 : mean[p] * wsum[p]) + vmean * w;
      wsum[p] += w;
      mean[p] /= wsum[p];
    }
  };

  let level = null as SignalData['levels'][number] | null;
  for (const l of d.levels) if (l.binSize <= bpPerPx) level = l;

  if (level) {
    const b = level.binSize;
    for (let i = lowerBound(level.idx, Math.floor(viewStart / b)); i < level.idx.length && level.idx[i] * b < viewEnd; i++) {
      accumulate(level.idx[i] * b, (level.idx[i] + 1) * b, level.min[i], level.max[i], level.mean[i]);
    }
  } else {
    for (let i = lowerBound(d.starts, viewStart - d.maxSpan); i < d.starts.length && d.starts[i] < viewEnd; i++) {
      if (d.ends[i] <= viewStart) continue;
      const v = d.values[i];
      accumulate(d.starts[i], d.ends[i], v, v, v);
    }
  }
  return { min, max, mean, bpPerPx, source: level ? level.binSize : 0 };
}

const startCache = new WeakMap<BedData, Float64Array>();

export function bedInView(d: BedData, start: number, end: number): BedFeature[] {
  let starts = startCache.get(d);
  if (!starts) {
    starts = Float64Array.from(d.features, (f) => f.start);
    startCache.set(d, starts);
  }
  const out: BedFeature[] = [];
  for (let i = lowerBound(starts, start - d.maxSpan); i < d.features.length && d.features[i].start < end; i++) {
    if (d.features[i].end > start) out.push(d.features[i]);
  }
  return out;
}
