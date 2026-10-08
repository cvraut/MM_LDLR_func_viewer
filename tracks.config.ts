/**
 * tracks.config.ts
 * ----------------------------------------------------------------------------
 * Optional settings for the browser. Every field is optional; delete this file
 * entirely and the build still works with defaults.
 *
 * Tracks are found automatically in tracks/. Use this file to:
 *   - set the title, subtitle and starting position
 *   - order tracks (they appear in the order listed here; unlisted files follow
 *     alphabetically)
 *   - style tracks (label, color, height, y-axis title, ...)
 *
 * Keys under `tracks` are file names in tracks/ (or the name without extension).
 * Hover any option in your editor to see what it does (from build/config-schema.ts).
 *
 * The settings below style the SYNTHETIC demo files. Replace them with your own.
 */
import { defineConfig } from './build/config-schema';

// Colors reused for each signal and the peaks tucked underneath it.
const PURPLE = '#7466b4';
const PINK = '#e0337f';
const GREEN = '#1a9e77';
const GRAY = '#5f6368';

export default defineConfig({
  title: 'Demo Genome Browser',
  subtitle: 'Synthetic example data on hg38',
  defaultPosition: 'chr7:55,000,001-55,300,000',

  tracks: {
    // Gene models on top, no label (like a figure).
    'demo_genes.bed': { label: '', color: '#1d2127', mode: 'full', featureLabels: false, marginTop: 2 },

    // Each signal is followed by its hits/peaks, same color, tucked underneath
    // (marginTop: 2, label: "") so the pair reads as one unit.
    'demo_sprn.wig':      { label: 'SPRn', color: PURPLE, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 10 },
    'demo_sprn_hits.bed': { label: '', color: PURPLE, mode: 'dense', marginTop: 2 },

    'demo_spri.bedGraph': { label: 'SPRi', color: PINK, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 8 },
    'demo_spri_hits.bed': { label: '', color: PINK, mode: 'dense', marginTop: 2 },

    'demo_spra.wig':      { label: 'SPRa', color: GREEN, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 8 },
    'demo_spra_hits.bed': { label: '', color: GREEN, mode: 'dense', marginTop: 2 },

    'demo_atac.bedGraph':  { label: 'ATAC', color: GRAY, yLabel: 'log_{2}FC', height: 46, marginTop: 8 },
    'demo_atac_peaks.bed': { label: '', color: GRAY, mode: 'dense', marginTop: 2 },

    'demo_h3k27ac.wig':         { label: 'H3K27ac', color: GRAY, altColor: '#b0b4ba', yLabel: 'log_{2}FC', height: 46, marginTop: 8 },
    'demo_h3k27ac_domains.bed': { label: '', color: GRAY, mode: 'dense', marginTop: 2 },

    // Dense rows at the bottom with a thin center line.
    'demo_cons.bed': { label: 'Conserved', color: GRAY, mode: 'dense', centerLine: true, marginTop: 10 },
    'demo_ccre.bed': { label: 'cCREs', color: GRAY, mode: 'dense', centerLine: true, itemRgb: true, marginTop: 4 },
  },
});
