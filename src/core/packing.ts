/**
 * src/core/packing.ts
 * ----------------------------------------------------------------------------
 * Greedy row packing for BED pack/squish mode, the same idea UCSC uses:
 * walk features left to right, drop each into the first row where it fits.
 * Works in pixels, because labels take up pixel space at any zoom.
 */

export interface Span {
  /** Left edge in px, including room for a label if drawn. */
  x0: number;
  /** Right edge in px. */
  x1: number;
}

/**
 * Returns a row index for every item (items must be sorted by x0).
 * Items that don't fit within maxRows all land in the last row.
 */
export function packRows(items: Span[], gap: number, maxRows: number): number[] {
  const rowEnds: number[] = [];
  return items.map((it) => {
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] + gap <= it.x0) {
        rowEnds[r] = it.x1;
        return r;
      }
    }
    if (rowEnds.length < maxRows) {
      rowEnds.push(it.x1);
      return rowEnds.length - 1;
    }
    const last = rowEnds.length - 1;
    rowEnds[last] = Math.max(rowEnds[last], it.x1);
    return last;
  });
}
