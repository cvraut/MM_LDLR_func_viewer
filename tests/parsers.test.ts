/**
 * tests/parsers.test.ts: WIG/bedGraph, BED, FASTA and track-line parsing.
 */
import { describe, expect, it } from 'vitest';
import { parseWig } from '../build/parse-wig';
import { parseBed } from '../build/parse-bed';
import { packSequence, parseFasta, parseFastaHeader } from '../build/parse-fasta';
import { trackLineToStyle } from '../build/track-line';
import { decodeSequence, baseAt } from '../src/data/decode';

const sizes = new Map([['chr1', 1000], ['chr2', 500]]);

describe('parseWig', () => {
  it('converts fixedStep 1-based starts to 0-based intervals', () => {
    const p = parseWig('fixedStep chrom=chr1 start=11 step=10 span=5\n1\n2\n3\n', sizes);
    const r = p.byChrom.get('chr1')!;
    expect(r.starts).toEqual([10, 20, 30]);
    expect(r.ends).toEqual([15, 25, 35]);
    expect(r.values).toEqual([1, 2, 3]);
    expect(p.format).toBe('wig');
  });

  it('reads variableStep with span', () => {
    const p = parseWig('variableStep chrom=chr2 span=3\n1 0.5\n100 2\n', sizes);
    const r = p.byChrom.get('chr2')!;
    expect(r.starts).toEqual([0, 99]);
    expect(r.ends).toEqual([3, 102]);
  });

  it('reads bedGraph as-is (0-based) and sorts', () => {
    const p = parseWig('chr1\t50\t60\t2\nchr1\t0\t10\t1\n', sizes);
    expect(p.format).toBe('bedGraph');
    expect(p.byChrom.get('chr1')!.starts).toEqual([0, 50]);
  });

  it('merges touching intervals with equal values', () => {
    const p = parseWig('fixedStep chrom=chr1 start=1 step=1\n4\n4\n4\n5\n', sizes);
    const r = p.byChrom.get('chr1')!;
    expect(r.starts).toEqual([0, 3]);
    expect(r.ends).toEqual([3, 4]);
  });

  it('skips unknown chromosomes with a warning and clips at chromosome end', () => {
    const p = parseWig('chrZ\t0\t10\t1\nchr2\t490\t600\t1\n', sizes);
    expect(p.warnings.join()).toContain('chrZ');
    expect(p.byChrom.get('chr2')!.ends).toEqual([500]);
  });

  it('picks up style from a track line', () => {
    const p = parseWig('track type=wiggle_0 name="My signal" color=255,0,0 viewLimits=0:20\nchr1\t0\t1\t1\n', sizes);
    expect(p.style).toMatchObject({ label: 'My signal', color: 'rgb(255,0,0)', viewLimits: [0, 20] });
  });
});

describe('parseBed', () => {
  it('parses BED12 blocks, thick range, strand and itemRgb', () => {
    const line = 'chr1\t100\t500\tg1\t900\t-\t150\t450\t10,20,30\t2\t50,100,\t0,300,';
    const p = parseBed(line, sizes);
    const c = p.byChrom.get('chr1')!;
    expect(p.fields).toBe(12);
    expect(c.strands).toBe('-');
    expect(c.thickStarts[0]).toBe(150);
    expect(c.rgb[0]).toBe('10,20,30');
    expect(c.blockSizes[0]).toEqual([50, 100]);
    expect(c.blockStarts[0]).toEqual([0, 300]);
  });

  it('accepts BED3 and defaults the rest', () => {
    const p = parseBed('chr1 5 9\nchr1 1 2\n', sizes);
    const c = p.byChrom.get('chr1')!;
    expect(c.starts).toEqual([1, 5]);
    expect(c.names).toEqual(['', '']);
    expect(c.thickEnds).toEqual([2, 9]);
    expect(c.maxSpan).toBe(4);
  });

  it('reports malformed lines', () => {
    const p = parseBed('chr1\tx\t9\n', sizes);
    expect(p.count).toBe(0);
    expect(p.warnings[0]).toContain('line 1');
  });

  it('maps UCSC visibility to modes and hidden', () => {
    expect(trackLineToStyle('track visibility=dense')).toMatchObject({ mode: 'dense' });
    expect(trackLineToStyle('track visibility=hide')).toMatchObject({ hidden: true });
    expect(trackLineToStyle('track itemRgb="On"')).toMatchObject({ itemRgb: true });
  });
});

describe('FASTA 2-bit packing', () => {
  it('reads slice headers as 1-based inclusive', () => {
    expect(parseFastaHeader('>chr1:101-200 note')).toEqual({ chrom: 'chr1', offset: 100 });
    expect(parseFastaHeader('>chr2')).toEqual({ chrom: 'chr2', offset: 0 });
  });

  it('round-trips bases and N runs', () => {
    const seq = 'ACGTNNacgtA';
    const { records } = parseFasta(`>chr1:11-21\n${seq}\n`, sizes);
    const d = decodeSequence(records[0]);
    const back = Array.from({ length: seq.length }, (_, i) => baseAt(d, 10 + i)).join('');
    expect(back).toBe(seq.toUpperCase());
    expect(baseAt(d, 9)).toBe('');
  });

  it('packs 4 bases per byte, high bits first', () => {
    const { packed } = packSequence('ACGT');
    expect(packed[0]).toBe(0b00011011);
  });
});
