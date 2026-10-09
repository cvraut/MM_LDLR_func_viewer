/**
 * src/data/tracks.ts
 * ----------------------------------------------------------------------------
 * Runtime view of every track: bundled tracks plus the built-in sequence
 * track (when a FASTA was bundled). Data is decoded per chromosome on first
 * use and cached.
 */
import { SEQUENCE_TRACK_ID, type Bundle, type TrackKind, type TrackStyle } from '../../shared/types';
import { decodeBed, decodeSequence, decodeSignal, type BedData, type SequenceData, type SignalData } from './decode';

export interface Track {
  id: string;
  kind: TrackKind;
  file: string;
  /** Style from the build; per-user changes (mode, scale…) live in Layout.overrides. */
  style: TrackStyle;
  signal(chrom: string): SignalData | null;
  bed(chrom: string): BedData | null;
  sequence(chrom: string): SequenceData[];
}

/** Name used in the hidden-tracks tray and menus, even when the label is empty. */
export const displayName = (t: Track) => t.style.label || t.file;

export function buildTracks(bundle: Bundle): Track[] {
  const out: Track[] = [];

  if (bundle.sequence) {
    const seqBundle = bundle.sequence;
    const cache = new Map<string, SequenceData[]>();
    out.push({
      id: SEQUENCE_TRACK_ID,
      kind: 'sequence',
      file: seqBundle.file,
      style: {
        label: seqBundle.label, color: 'var(--ink)', altColor: 'var(--ink)', height: 16, marginTop: 4, yLabel: '',
        viewLimits: null, autoscaleGroup: null, windowing: 'max', graphType: 'bar', mode: 'full',
        hidden: seqBundle.hidden, itemRgb: false, centerLine: false, featureLabels: false, description: '',centerLabel: false,
      },
      signal: () => null,
      bed: () => null,
      sequence(chrom) {
        let v = cache.get(chrom);
        if (!v) cache.set(chrom, (v = seqBundle.records.filter((r) => r.chrom === chrom).map(decodeSequence)));
        return v;
      },
    });
  }

  for (const t of bundle.tracks) {
    const sigCache = new Map<string, SignalData | null>();
    const bedCache = new Map<string, BedData | null>();
    out.push({
      id: t.id,
      kind: t.kind,
      file: t.file,
      style: t.style,
      signal(chrom) {
        if (!sigCache.has(chrom)) sigCache.set(chrom, t.signal?.[chrom] ? decodeSignal(t.signal[chrom]) : null);
        return sigCache.get(chrom)!;
      },
      bed(chrom) {
        if (!bedCache.has(chrom)) bedCache.set(chrom, t.bed?.[chrom] ? decodeBed(chrom, t.bed[chrom]) : null);
        return bedCache.get(chrom)!;
      },
      sequence: () => [],
    });
  }
  return out;
}
