/**
 * src/data/decode.ts
 * ----------------------------------------------------------------------------
 * Turns the bundled base64 strings back into typed arrays. Decoding happens
 * lazily, one chromosome at a time, the first time it is displayed.
 */
import type { EncodedBedChrom, EncodedSignalChrom, SequenceRecord } from '../../shared/types';

export function bytesFromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const u32 = (s: string) => new Uint32Array(bytesFromB64(s).buffer);
const f32 = (s: string) => new Float32Array(bytesFromB64(s).buffer);

export interface SignalLevel {
  binSize: number;
  idx: Uint32Array;
  min: Float32Array;
  max: Float32Array;
  mean: Float32Array;
}

export interface SignalData {
  starts: Uint32Array;
  ends: Uint32Array;
  values: Float32Array;
  maxSpan: number;
  levels: SignalLevel[];
}

export function decodeSignal(e: EncodedSignalChrom): SignalData {
  return {
    starts: u32(e.starts),
    ends: u32(e.ends),
    values: f32(e.values),
    maxSpan: e.maxSpan,
    levels: e.levels.map((l) => ({ binSize: l.binSize, idx: u32(l.idx), min: f32(l.min), max: f32(l.max), mean: f32(l.mean) })),
  };
}

export interface BedFeature {
  chrom: string;
  start: number;
  end: number;
  name: string;
  score: number;
  strand: string;
  thickStart: number;
  thickEnd: number;
  rgb: string;
  blockSizes: number[];
  blockStarts: number[];
}

export interface BedData {
  features: BedFeature[];
  maxSpan: number;
}

export function decodeBed(chrom: string, e: EncodedBedChrom): BedData {
  const features: BedFeature[] = new Array(e.n);
  for (let i = 0; i < e.n; i++) {
    features[i] = {
      chrom, start: e.starts[i], end: e.ends[i], name: e.names[i], score: e.scores[i], strand: e.strands[i],
      thickStart: e.thickStarts[i], thickEnd: e.thickEnds[i], rgb: e.rgb[i] ? `rgb(${e.rgb[i]})` : '',
      blockSizes: e.blockSizes[i], blockStarts: e.blockStarts[i],
    };
  }
  return { features, maxSpan: e.maxSpan };
}

export interface SequenceData {
  offset: number;
  length: number;
  packed: Uint8Array;
  nRuns: number[];
}

export function decodeSequence(r: SequenceRecord): SequenceData {
  return { offset: r.offset, length: r.length, packed: bytesFromB64(r.packed), nRuns: r.nRuns };
}

const BASES = 'ACGT';

/** Base at genome position `pos` (0-based), or '' if outside the record. */
export function baseAt(seq: SequenceData, pos: number): string {
  const i = pos - seq.offset;
  if (i < 0 || i >= seq.length) return '';
  for (let k = 0; k < seq.nRuns.length; k += 2) {
    if (i >= seq.nRuns[k] && i < seq.nRuns[k + 1]) return 'N';
    if (seq.nRuns[k] > i) break;
  }
  return BASES[(seq.packed[i >> 2] >> (6 - 2 * (i & 3))) & 3];
}
