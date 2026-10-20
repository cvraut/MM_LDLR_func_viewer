// @vitest-environment jsdom
/**
 * tests/state.test.ts: track placement rules in src/state.ts
 * (show / showAll with `after`, explicit drops, move).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Store } from '../src/state';
import type { Track } from '../src/data/tracks';
import type { TrackStyle } from '../shared/types';

const CHROMS = [{ name: 'chr1', size: 1000 }];

const BASE_STYLE: TrackStyle = {
  label: '', color: '#000', altColor: '#000', height: 50, marginTop: 6, yLabel: '',
  viewLimits: null, autoscaleGroup: null, windowing: 'max', graphType: 'bar', mode: 'pack',
  hidden: false, itemRgb: false, centerLine: false, featureLabels: true, description: '',
  centerLabel: false, after: [], missingParentName: '',
};

function makeTrack(id: string, after: string[] = []): Track {
  return {
    id, kind: 'bed', file: `${id}.bed`,
    style: { ...BASE_STYLE, label: id, after },
    signal: () => null, bed: () => null, sequence: () => [],
  };
}

const makeStore = (tracks: Track[]) => new Store(CHROMS, tracks, 'chr1:1-100', 'test');
const visible = (s: Store) => s.visibleTracks().map((t) => t.id);

beforeEach(() => localStorage.clear());   // no saved layout leaks between tests

describe('show() with after', () => {
  // A, A1 (after A), A2 (after A), B, B1 (after B), C
  let s: Store;
  beforeEach(() => {
    s = makeStore([
      makeTrack('A'), makeTrack('A1', ['A']), makeTrack('A2', ['A']),
      makeTrack('B'), makeTrack('B1', ['B']), makeTrack('C'),
    ]);
  });

  it('puts a track without after at the bottom', () => {
    s.hide('C');
    s.show('C');
    expect(visible(s)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
  });

  it('puts a track directly under its visible parent', () => {
    s.hide('B1');
    s.show('B1');
    expect(visible(s)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
  });

  it("goes past the parent's existing followers, keeping the group together", () => {
    s.hide('A1');
    s.show('A1');
    expect(visible(s)).toEqual(['A', 'A2', 'A1', 'B', 'B1', 'C']);
  });

  it('puts a parent without after directly above its first visible follower', () => {
    s.hide('A');
    s.show('A');
    expect(visible(s)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
  });

  it('falls back to the bottom when no parent is visible', () => {
    s.hide('B');
    s.hide('B1');
    s.show('B1');
    expect(visible(s)).toEqual(['A', 'A1', 'A2', 'C', 'B1']);
  });

  it('lets an explicit drop position win over after', () => {
    s.hide('B1');
    s.show('B1', 0);
    expect(visible(s)).toEqual(['B1', 'A', 'A1', 'A2', 'B', 'C']);
  });

  it('ignores after when moving tracks', () => {
    s.move('A1', 5);
    expect(visible(s)).toEqual(['A', 'A2', 'B', 'B1', 'C', 'A1']);
  });
});

describe('show() through chains and several parents', () => {
  it('looks through a hidden parent to the grandparent', () => {
    const s = makeStore([makeTrack('P'), makeTrack('Q', ['P']), makeTrack('R', ['Q']), makeTrack('X')]);
    s.hide('Q');
    s.hide('R');
    s.show('R');
    expect(visible(s)).toEqual(['P', 'R', 'X']);
  });

  it('goes under the lowest visible parent', () => {
    const s = makeStore([makeTrack('X'), makeTrack('Y'), makeTrack('W'), makeTrack('Z', ['X', 'Y'])]);
    s.hide('Z');
    s.move('Y', 2);                          // order now X, W, Y
    s.show('Z');
    expect(visible(s)).toEqual(['X', 'W', 'Y', 'Z']);
  });
});

describe('showAll()', () => {
  it('re-adds parents before children and places each child under its parent', () => {
    const s = makeStore([
      makeTrack('A'), makeTrack('A1', ['A']), makeTrack('A2', ['A']),
      makeTrack('B'), makeTrack('B1', ['B']), makeTrack('C'),
    ]);
    s.hide('A');
    s.hide('A1');
    s.hide('B1');
    s.showAll();
    expect(visible(s)).toEqual(['A', 'A2', 'A1', 'B', 'B1', 'C']);
    expect(s.hiddenTracks()).toEqual([]);
  });

  it('handles a child listed before its parent in the config', () => {
    const s = makeStore([makeTrack('K1', ['K']), makeTrack('K')]);
    s.hide('K1');
    s.hide('K');
    s.showAll();
    expect(visible(s)).toEqual(['K', 'K1']);
  });
});