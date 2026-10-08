/**
 * build/track-line.ts
 * ----------------------------------------------------------------------------
 * Parses UCSC custom-track header lines such as
 *   track type=wiggle_0 name="ATAC" color=120,120,120 viewLimits=0:5 visibility=full
 * into the subset of TrackStyle we support. Unsupported keys are ignored.
 */
import type { BedMode, TrackStyle, Windowing } from '../shared/types';

/** Split `key=value key2="quoted value"` into a map. */
export function parseKeyValues(line: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)=("([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out[m[1]] = m[3] ?? m[4] ?? m[5] ?? '';
  return out;
}

function rgbToCss(v: string): string | undefined {
  const parts = v.split(',').map(Number);
  if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) return `rgb(${parts.join(',')})`;
  return undefined;
}

const VIS: Record<string, BedMode | 'hide'> = {
  '0': 'hide', hide: 'hide', '1': 'dense', dense: 'dense', '2': 'full', full: 'full',
  '3': 'pack', pack: 'pack', '4': 'squish', squish: 'squish',
};

const WINDOW: Record<string, Windowing> = {
  maximum: 'max', mean: 'mean', minimum: 'min', 'mean+whiskers': 'mean+whiskers',
};

/** Convert a `track` line into style overrides. */
export function trackLineToStyle(line: string): Partial<TrackStyle> {
  const kv = parseKeyValues(line);
  const s: Partial<TrackStyle> = {};
  if (kv.name) s.label = kv.name;
  if (kv.description) s.description = kv.description;
  if (kv.color) s.color = rgbToCss(kv.color);
  if (kv.altColor) s.altColor = rgbToCss(kv.altColor);
  if (kv.itemRgb) s.itemRgb = kv.itemRgb.toLowerCase() === 'on';
  if (kv.visibility && VIS[kv.visibility]) {
    const v = VIS[kv.visibility];
    if (v === 'hide') s.hidden = true;
    else s.mode = v;
  }
  if (kv.viewLimits && kv.autoScale?.toLowerCase() !== 'on') {
    const [a, b] = kv.viewLimits.split(':').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && a < b) s.viewLimits = [a, b];
  }
  if (kv.windowingFunction && WINDOW[kv.windowingFunction]) s.windowing = WINDOW[kv.windowingFunction];
  if (kv.graphType === 'points' || kv.graphType === 'bar') s.graphType = kv.graphType;
  if (kv.maxHeightPixels) {
    const parts = kv.maxHeightPixels.split(':').map(Number);
    const h = parts[1] ?? parts[0];
    if (Number.isFinite(h) && h > 0) s.height = h;
  }
  for (const k of Object.keys(s) as (keyof TrackStyle)[]) if (s[k] === undefined) delete s[k];
  return s;
}
