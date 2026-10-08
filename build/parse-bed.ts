/**
 * build/parse-bed.ts
 * ----------------------------------------------------------------------------
 * Parses BED3 through BED12 into column-oriented, start-sorted arrays per
 * chromosome (see EncodedBedChrom in shared/types.ts). Honors `track` lines.
 * Columns: chrom start end [name score strand thickStart thickEnd itemRgb
 *          blockCount blockSizes blockStarts]
 */
import type { EncodedBedChrom, TrackStyle } from '../shared/types';
import { trackLineToStyle } from './track-line';

export interface ParsedBed {
  byChrom: Map<string, EncodedBedChrom>;
  style: Partial<TrackStyle>;
  count: number;
  fields: number;
  warnings: string[];
}

interface Feature {
  s: number; e: number; name: string; score: number; strand: string;
  ts: number; te: number; rgb: string; bs: number[]; bst: number[];
}

const nums = (v: string | undefined) =>
  (v ?? '').split(',').filter((x) => x !== '').map(Number);

export function parseBed(text: string, chromSizes: Map<string, number>): ParsedBed {
  const warnings: string[] = [];
  const unknownChroms = new Map<string, number>();
  const feats = new Map<string, Feature[]>();
  let style: Partial<TrackStyle> = {};
  let fields = 0;
  let bad = 0;
  let firstBad = -1;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line[0] === '#' || line.startsWith('browser')) continue;
    if (line.startsWith('track')) { style = { ...style, ...trackLineToStyle(line) }; continue; }
    const f = raw.includes('\t') ? raw.replace(/\r$/, '').split('\t') : line.split(/\s+/);
    const s = Number(f[1]);
    const e = Number(f[2]);
    if (f.length < 3 || !Number.isFinite(s) || !Number.isFinite(e) || e < s) {
      if (bad++ === 0) firstBad = i + 1;
      continue;
    }
    const size = chromSizes.get(f[0]);
    if (size === undefined) { unknownChroms.set(f[0], (unknownChroms.get(f[0]) ?? 0) + 1); continue; }
    fields = Math.max(fields, Math.min(f.length, 12));
    const ts = f[6] !== undefined && f[6] !== '' ? Number(f[6]) : s;
    const te = f[7] !== undefined && f[7] !== '' ? Number(f[7]) : e;
    const rgb = f[8] && f[8] !== '0' && f[8].includes(',') ? f[8] : '';
    let bs: number[] = [];
    let bst: number[] = [];
    if (f.length >= 12) {
      bs = nums(f[10]);
      bst = nums(f[11]);
      const count = Number(f[9]);
      if (bs.length !== count || bst.length !== count) {
        if (bad++ === 0) firstBad = i + 1;
        bs = []; bst = [];
      }
    }
    const strand = f[5] === '+' || f[5] === '-' ? f[5] : '.';
    const score = f[4] !== undefined && f[4] !== '' && Number.isFinite(Number(f[4])) ? Number(f[4]) : 0;
    let list = feats.get(f[0]);
    if (!list) feats.set(f[0], (list = []));
    list.push({ s, e: Math.min(e, size), name: f[3] ?? '', score, strand, ts, te, rgb, bs, bst });
  }

  if (bad) warnings.push(`${bad} malformed line(s) skipped or simplified (first at line ${firstBad}).`);
  for (const [c, n] of unknownChroms) warnings.push(`${n} feature(s) on "${c}" skipped: chromosome not in chrom.sizes.`);

  const byChrom = new Map<string, EncodedBedChrom>();
  let count = 0;
  for (const [c, list] of feats) {
    list.sort((a, b) => a.s - b.s || a.e - b.e);
    const enc: EncodedBedChrom = {
      n: list.length, maxSpan: 0, starts: [], ends: [], names: [], scores: [], strands: '',
      thickStarts: [], thickEnds: [], rgb: [], blockSizes: [], blockStarts: [],
    };
    for (const x of list) {
      enc.maxSpan = Math.max(enc.maxSpan, x.e - x.s);
      enc.starts.push(x.s); enc.ends.push(x.e); enc.names.push(x.name); enc.scores.push(x.score);
      enc.strands += x.strand; enc.thickStarts.push(x.ts); enc.thickEnds.push(x.te); enc.rgb.push(x.rgb);
      enc.blockSizes.push(x.bs); enc.blockStarts.push(x.bst);
    }
    count += list.length;
    byChrom.set(c, enc);
  }
  return { byChrom, style, count, fields: fields || 3, warnings };
}
