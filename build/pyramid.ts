/**
 * build/pyramid.ts
 * ----------------------------------------------------------------------------
 * Precomputes zoom levels for signal tracks (the same idea as bigWig zoom
 * levels). Level k summarises the data in bins of 32 * 4^k bases, storing
 * min / max / mean (mean over covered bases only) for every bin that has data.
 *
 * When the viewer is zoomed out, it reads the coarsest level whose bins are
 * still smaller than one pixel, so drawing cost stays ~1 value per pixel no
 * matter how much raw data the track holds.
 */
import type { EncodedLevel, EncodedSignalChrom } from '../shared/types';
import type { RawSignal } from './parse-wig';
import { b64 } from './encode';

export const BASE_BIN = 32;
export const BIN_FACTOR = 4;

export interface Level {
  binSize: number;
  idx: number[];
  min: number[];
  max: number[];
  mean: number[];
}

/** Summarise intervals into fixed-size bins (only non-empty bins are returned). */
export function buildLevel(r: RawSignal, binSize: number): Level {
  const acc = new Map<number, { min: number; max: number; sum: number; cov: number }>();
  for (let i = 0; i < r.starts.length; i++) {
    const s = r.starts[i];
    const e = r.ends[i];
    const v = r.values[i];
    for (let b = Math.floor(s / binSize); b * binSize < e; b++) {
      const overlap = Math.min(e, (b + 1) * binSize) - Math.max(s, b * binSize);
      let a = acc.get(b);
      if (!a) acc.set(b, (a = { min: v, max: v, sum: 0, cov: 0 }));
      if (v < a.min) a.min = v;
      if (v > a.max) a.max = v;
      a.sum += v * overlap;
      a.cov += overlap;
    }
  }
  const keys = [...acc.keys()].sort((x, y) => x - y);
  const lvl: Level = { binSize, idx: [], min: [], max: [], mean: [] };
  for (const k of keys) {
    const a = acc.get(k)!;
    lvl.idx.push(k);
    lvl.min.push(a.min);
    lvl.max.push(a.max);
    lvl.mean.push(a.sum / a.cov);
  }
  return lvl;
}

/**
 * Build all useful levels for one chromosome. A level is skipped when it would
 * not be meaningfully smaller than the data below it.
 */
export function buildPyramid(r: RawSignal, chromSize: number): Level[] {
  const levels: Level[] = [];
  let prevCount = r.starts.length;
  for (let bin = BASE_BIN; bin <= chromSize; bin *= BIN_FACTOR) {
    const lvl = buildLevel(r, bin);
    if (lvl.idx.length <= prevCount * 0.5) {
      levels.push(lvl);
      prevCount = lvl.idx.length;
    }
    if (lvl.idx.length <= 16) break;
  }
  return levels;
}

export function encodeSignalChrom(r: RawSignal, chromSize: number): EncodedSignalChrom {
  let maxSpan = 0;
  for (let i = 0; i < r.starts.length; i++) maxSpan = Math.max(maxSpan, r.ends[i] - r.starts[i]);
  const levels: EncodedLevel[] = buildPyramid(r, chromSize).map((l) => ({
    binSize: l.binSize,
    n: l.idx.length,
    idx: b64(Uint32Array.from(l.idx)),
    min: b64(Float32Array.from(l.min)),
    max: b64(Float32Array.from(l.max)),
    mean: b64(Float32Array.from(l.mean)),
  }));
  return {
    n: r.starts.length,
    maxSpan,
    starts: b64(Uint32Array.from(r.starts)),
    ends: b64(Uint32Array.from(r.ends)),
    values: b64(Float32Array.from(r.values)),
    levels,
  };
}
