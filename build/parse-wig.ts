/**
 * build/parse-wig.ts
 * ----------------------------------------------------------------------------
 * Parses signal files into sorted intervals per chromosome:
 *   - WIG fixedStep    (positions 1-based in the file)
 *   - WIG variableStep (positions 1-based in the file)
 *   - bedGraph         (chrom start end value, 0-based half-open)
 * All three may be mixed in one file. Output is 0-based half-open.
 * Adjacent intervals with identical values are merged to save space.
 */
import type { TrackStyle } from '../shared/types';
import { parseKeyValues, trackLineToStyle } from './track-line';

export interface RawSignal {
  starts: number[];
  ends: number[];
  values: number[];
}

export interface ParsedSignal {
  byChrom: Map<string, RawSignal>;
  style: Partial<TrackStyle>;
  format: 'wig' | 'bedGraph';
  count: number;
  min: number;
  max: number;
  warnings: string[];
}

export function parseWig(text: string, chromSizes: Map<string, number>): ParsedSignal {
  const byChrom = new Map<string, RawSignal>();
  const unknownChroms = new Map<string, number>();
  const warnings: string[] = [];
  let style: Partial<TrackStyle> = {};
  let sawStepLines = false;
  let badLines = 0;
  let firstBad = -1;

  let mode: 'none' | 'fixed' | 'variable' = 'none';
  let chrom = '';
  let pos = 0;
  let step = 1;
  let span = 1;

  const push = (c: string, s: number, e: number, v: number) => {
    const size = chromSizes.get(c);
    if (size === undefined) {
      unknownChroms.set(c, (unknownChroms.get(c) ?? 0) + 1);
      return;
    }
    if (e > size) e = size;
    if (s >= e) return;
    let r = byChrom.get(c);
    if (!r) byChrom.set(c, (r = { starts: [], ends: [], values: [] }));
    r.starts.push(s);
    r.ends.push(e);
    r.values.push(v);
  };

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line[0] === '#' || line.startsWith('browser')) continue;
    if (line.startsWith('track')) {
      style = { ...style, ...trackLineToStyle(line) };
      continue;
    }
    if (line.startsWith('fixedStep')) {
      const kv = parseKeyValues(line);
      mode = 'fixed';
      sawStepLines = true;
      chrom = kv.chrom;
      pos = Number(kv.start) - 1;
      step = Number(kv.step ?? 1);
      span = Number(kv.span ?? 1);
      continue;
    }
    if (line.startsWith('variableStep')) {
      const kv = parseKeyValues(line);
      mode = 'variable';
      sawStepLines = true;
      chrom = kv.chrom;
      span = Number(kv.span ?? 1);
      continue;
    }
    const f = line.split(/\s+/);
    if (f.length >= 4) {
      // bedGraph line (also valid between WIG blocks)
      const s = Number(f[1]);
      const e = Number(f[2]);
      const v = Number(f[3]);
      if (Number.isFinite(s) && Number.isFinite(e) && Number.isFinite(v)) push(f[0], s, e, v);
      else if (badLines++ === 0) firstBad = i + 1;
      continue;
    }
    if (mode === 'fixed' && f.length === 1) {
      const v = Number(f[0]);
      if (Number.isFinite(v)) push(chrom, pos, pos + span, v);
      else if (badLines++ === 0) firstBad = i + 1;
      pos += step;
      continue;
    }
    if (mode === 'variable' && f.length === 2) {
      const p = Number(f[0]) - 1;
      const v = Number(f[1]);
      if (Number.isFinite(p) && Number.isFinite(v)) push(chrom, p, p + span, v);
      else if (badLines++ === 0) firstBad = i + 1;
      continue;
    }
    if (badLines++ === 0) firstBad = i + 1;
  }

  if (badLines) warnings.push(`${badLines} unreadable line(s) skipped (first at line ${firstBad}).`);
  for (const [c, n] of unknownChroms) {
    warnings.push(`${n} value(s) on "${c}" skipped: chromosome not in chrom.sizes.`);
  }

  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const [c, r] of byChrom) {
    const merged = sortAndMerge(r);
    byChrom.set(c, merged);
    count += merged.values.length;
    for (const v of merged.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!count) { min = 0; max = 0; }
  return { byChrom, style, format: sawStepLines ? 'wig' : 'bedGraph', count, min, max, warnings };
}

/** Sort by start (if needed) and merge touching intervals with equal values. */
export function sortAndMerge(r: RawSignal): RawSignal {
  let sorted = true;
  for (let i = 1; i < r.starts.length; i++) if (r.starts[i] < r.starts[i - 1]) { sorted = false; break; }
  let order = r.starts.map((_, i) => i);
  if (!sorted) order = order.sort((a, b) => r.starts[a] - r.starts[b]);
  const out: RawSignal = { starts: [], ends: [], values: [] };
  for (const i of order) {
    const n = out.starts.length;
    if (n && out.ends[n - 1] === r.starts[i] && out.values[n - 1] === r.values[i]) {
      out.ends[n - 1] = r.ends[i];
    } else {
      out.starts.push(r.starts[i]);
      out.ends.push(r.ends[i]);
      out.values.push(r.values[i]);
    }
  }
  return out;
}
