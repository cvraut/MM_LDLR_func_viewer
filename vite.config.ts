/**
 * vite.config.ts
 * ----------------------------------------------------------------------------
 * Build = Vite + two plugins:
 *   genomeData()     reads tracks/, genome/, help/, tracks.config.ts and exposes
 *                    them to the app as `virtual:genome-data` (build/plugin.ts)
 *   viteSingleFile() inlines all JS and CSS into dist/index.html
 * Result: one self-contained dist/index.html that works offline from file://.
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { genomeData } from './build/plugin';
import { versionData } from './build/version-file';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [
    genomeData({ root }), 
    viteSingleFile({ removeViteModuleLoader: true }),
    versionData({ root })
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    chunkSizeWarningLimit: 100_000,
    reportCompressedSize: false,
  },
  server: { open: false },
});
