/**
 * build/parse-fasta.ts
 * ----------------------------------------------------------------------------
 * Reads a FASTA file and packs each record into 2 bits per base
 * (A=0 C=1 G=2 T=3, 4 bases per byte, first base in the high bits).
 * Runs of N (or any non-ACGT letter) are stored separately as nRuns.
 *
 * Headers decide where a record sits on the genome:
 *   >chr7                       whole chromosome, starts at base 1
 *   >chr7:55000001-55300000     a slice, 1-based inclusive like UCSC
 */
import type { SequenceRecord } from '../shared/types';

const CODE: Record<string, number> = { A: 0, C: 1, G: 2, T: 3 };

export function parseFastaHeader(header: string): { chrom: string; offset: number } {
  const id = header.slice(1).trim().split(/\s+/)[0];
  const m = /^(.+):([\d,]+)-([\d,]+)$/.exec(id);
  if (m) return { chrom: m[1], offset: Number(m[2].replace(/,/g, '')) - 1 };
  return { chrom: id, offset: 0 };
}

export function packSequence(seq: string): { packed: Uint8Array; nRuns: number[] } {
  const packed = new Uint8Array(Math.ceil(seq.length / 4));
  const nRuns: number[] = [];
  let runStart = -1;
  for (let i = 0; i < seq.length; i++) {
    const c = CODE[seq[i]];
    if (c === undefined) {
      if (runStart < 0) runStart = i;
      continue; // N stored as 0 (A) in the packed bits, masked by nRuns
    }
    if (runStart >= 0) { nRuns.push(runStart, i); runStart = -1; }
    packed[i >> 2] |= c << (6 - 2 * (i & 3));
  }
  if (runStart >= 0) nRuns.push(runStart, seq.length);
  return { packed, nRuns };
}

export function parseFasta(text: string, chromSizes: Map<string, number>): {
  records: SequenceRecord[];
  warnings: string[];
  packedBytes: number;
} {
  const records: SequenceRecord[] = [];
  const warnings: string[] = [];
  let packedBytes = 0;
  const chunks = text.split(/^>/m).filter((c) => c.trim());
  for (const chunk of chunks) {
    const nl = chunk.indexOf('\n');
    const header = '>' + (nl < 0 ? chunk : chunk.slice(0, nl));
    const seq = (nl < 0 ? '' : chunk.slice(nl + 1)).replace(/\s+/g, '').toUpperCase();
    const { chrom, offset } = parseFastaHeader(header);
    const size = chromSizes.get(chrom);
    if (size === undefined) { warnings.push(`FASTA record "${chrom}" skipped: not in chrom.sizes.`); continue; }
    if (offset + seq.length > size) warnings.push(`FASTA record "${header.slice(1)}" runs past the end of ${chrom}.`);
    const { packed, nRuns } = packSequence(seq);
    packedBytes += packed.length;
    records.push({ chrom, offset, length: seq.length, packed: Buffer.from(packed).toString('base64'), nRuns });
  }
  return { records, warnings, packedBytes };
}
