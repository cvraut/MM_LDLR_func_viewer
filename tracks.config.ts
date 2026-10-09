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
  title: 'LDLR Locus Browser',
  subtitle: 'Multimodal functional characterization of the <i>LDLR</i> locus',
  defaultPosition: 'chr19:11,039,463-11,163,820',
  genome: {
    chromSizes: 'genome/chrom.sizes',
    fasta: 'genome/hg38_ldlr_region.fa',
  },
  tracks: {
    'genes_coding.bed':    { label: 'canonical genes', color: '#1d2127', mode: 'pack', marginTop: 2 },
    'genes_noncoding.bed': { label: 'ncRNA', color: '#9aa0a6', mode: 'pack', marginTop: 2, hidden: true },

    'CRISPRn_neglog-pDeplete.wig':{"label":"CRISPRn depletion ", color:"#7570b3", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    'CRISPRn_depletion-peaks.bed': {"label":"", color:"#7570b3", mode: 'dense', marginTop: 2},
    
    'CRISPRn_neglog-pEnrich.wig':{"label":"CRISPRn enrichment ", color:"#4b3f87", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    'CRISPRn_enrichment-peaks.bed': {"label":"", color:"#4b3f87", mode: 'dense', marginTop: 2},

    'CRISPRi_neglog-pDeplete.wig':{"label":"CRISPRi depletion ", color:"#e82989", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    'CRISPRi_depletion-peaks.bed': {"label":"", color:"#e82989", mode: 'dense', marginTop: 2},
    
    'CRISPRi_neglog-pEnrich.wig':{"label":"CRISPRi enrichment ", color:"#e82989", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    // 'CRISPRi_enrichment-peaks.bed': {"label":"", color:"#e82989", mode: 'dense', marginTop: 2}, // no enrichment peaks for CRISPRi

    'CRISPRa_neglog-pDeplete.wig':{"label":"CRISPRa depletion ", color:"#1b9d79", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    'CRISPRa_depletion-peaks.bed': {"label":"", color:"#1b9d79", mode: 'dense', marginTop: 2},
    
    'CRISPRa_neglog-pEnrich.wig':{"label":"CRISPRa enrichment ", color:"#1b9d79", yLabel:"-log_{10} p", height: 52, autoscaleGroup:"spr", marginTop:10, centerLabel: true},
    'CRISPRa_enrichment-peaks.bed': {"label":"", color:"#1b9d79", mode: 'dense', marginTop: 2},

    'MPRA_normalized-activity.wig':{"label":"MPRA activity (relative)", color:"#da6406", altColor: "#fdc07f", yLabel:"log_{2}FC", height: 72, autoscaleGroup:"mpra", marginTop:10, centerLabel: true},
    'MPRA_activator-peaks.bed': {"label":"Enhancers", color:"#da6406", mode: 'dense', marginTop: 2},
    'MPRA_repressor-peaks.bed': {"label":"Repressors", color:"#fdc07f", mode: 'dense', marginTop: 2},
    
    // // Gene models on top, no label (like a figure).
    // 'demo_genes.bed': { label: '', color: '#1d2127', mode: 'full', featureLabels: false, marginTop: 2 },

    // // Each signal is followed by its hits/peaks, same color, tucked underneath
    // // (marginTop: 2, label: "") so the pair reads as one unit.
    // 'demo_sprn.wig':      { label: 'SPRn', color: PURPLE, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 10 },
    // 'demo_sprn_hits.bed': { label: '', color: PURPLE, mode: 'dense', marginTop: 2 },

    // 'demo_spri.bedGraph': { label: 'SPRi', color: PINK, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 8 },
    // 'demo_spri_hits.bed': { label: '', color: PINK, mode: 'dense', marginTop: 2 },

    // 'demo_spra.wig':      { label: 'SPRa', color: GREEN, yLabel: '-log_{10} p', height: 52, autoscaleGroup: 'spr', marginTop: 8 },
    // 'demo_spra_hits.bed': { label: '', color: GREEN, mode: 'dense', marginTop: 2 },

    // 'demo_atac.bedGraph':  { label: 'ATAC', color: GRAY, yLabel: 'log_{2}FC', height: 46, marginTop: 8 },
    // 'demo_atac_peaks.bed': { label: '', color: GRAY, mode: 'dense', marginTop: 2 },

    // 'demo_h3k27ac.wig':         { label: 'H3K27ac', color: GRAY, altColor: '#b0b4ba', yLabel: 'log_{2}FC', height: 46, marginTop: 8 },
    // 'demo_h3k27ac_domains.bed': { label: '', color: GRAY, mode: 'dense', marginTop: 2 },

    // // Dense rows at the bottom with a thin center line.
    // 'demo_cons.bed': { label: 'Conserved', color: GRAY, mode: 'dense', centerLine: true, marginTop: 10 },
    // 'demo_ccre.bed': { label: 'cCREs', color: GRAY, mode: 'dense', centerLine: true, itemRgb: true, marginTop: 4 },
  },
  tracksDir: 'tracks/new_data',  // optional, default is "tracks"
});
