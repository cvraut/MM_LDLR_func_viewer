/**
 * src/core/coords.ts
 * ----------------------------------------------------------------------------
 * The ONLY place that converts between internal and displayed coordinates.
 *
 *   internal: 0-based, half-open  [start, end)    (BED convention)
 *   display : 1-based, inclusive  start..end      (UCSC position box)
 *
 * chr7:1-100 on screen  ==  { start: 0, end: 100 } in code.
 * Pure functions, no DOM: also used by the build (build/plugin.ts) and tests.
 */
import type { ChromInfo } from '../../shared/types';

export interface Locus {
  chrom: string;
  start: number;
  end: number;
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

/** { chr7, 0, 100 } → "chr7:1-100" */
export function formatPosition(chrom: string, start: number, end: number): string {
  return `${chrom}:${fmtInt(Math.floor(start) + 1)}-${fmtInt(Math.ceil(end))}`;
}

/** Find a chromosome by exact name, case-insensitively, or with/without "chr". */
export function findChrom(name: string, chroms: ChromInfo[]): ChromInfo | undefined {
  const lower = name.toLowerCase();
  return chroms.find((c) => c.name === name)
    ?? chroms.find((c) => c.name.toLowerCase() === lower)
    ?? chroms.find((c) => c.name.toLowerCase() === `chr${lower}`)
    ?? chroms.find((c) => `chr${c.name.toLowerCase()}` === lower);
}

/**
 * Parse what a person types in the position box:
 *   "chr7:55,000,001-55,300,000"  range (1-based inclusive)
 *   "chr7:55086725"               100 bp centred on that base
 *   "chr7" or "7"                 whole chromosome
 * Returns null when it can't be understood.
 */
export function parsePosition(text: string, chroms: ChromInfo[]): Locus | null {
  const t = text.trim().replace(/[,\s]/g, '').replace(/[–—]/g, '-');
  const m = /^([^:]+?)(?::(\d+)(?:-(\d+))?)?$/.exec(t);
  if (!m) return null;
  const chrom = findChrom(m[1], chroms);
  if (!chrom) return null;
  let start = 0;
  let end = chrom.size;
  if (m[2] && m[3]) {
    start = Number(m[2]) - 1;
    end = Number(m[3]);
  } else if (m[2]) {
    const p = Number(m[2]) - 1;
    start = p - 50;
    end = p + 50;
  }
  start = Math.max(0, start);
  end = Math.min(chrom.size, end);
  if (!(end > start)) return null;
  return { chrom: chrom.name, start, end };
}

/** 1500 → "1.5 kb", 2_000_000 → "2 Mb". */
export function formatSpan(bp: number): string {
  if (bp >= 1e6) return `${+(bp / 1e6).toPrecision(3)} Mb`;
  if (bp >= 1e3) return `${+(bp / 1e3).toPrecision(3)} kb`;
  return `${Math.round(bp)} bp`;
}

/** A "nice" step (1, 2, 5 × 10^n) giving roughly `target` ticks across `span`. */
export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

/** Round a y-axis maximum up to something readable: 8.3 → 9, 1.6 → 2, 0.34 → 0.4. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow - 1e-9) * pow;
}
