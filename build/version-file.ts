/**
 * build/version-file.ts
 * ----------------------------------------------------------------------------
 * Moves previous builds to a subdirectory in dist/ called old-builds.
 * returns the path to use for the file. File name is dependent on version number in package.json and current machine time stamp in YYMMDD-HHMMSS format.
 */

import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

export function getBuildFileName(version: string, dateTime: Date = new Date()): string {
  const timestamp = dateTime.toISOString().replace(/[-:]/g, '').slice(2, 15).replace('T', '-');
  return `build-${version}-${timestamp}.html`;
}

export function versionCurrentBuild(indexFilePath: string,
                                    historyDir: string,
                                    newFileName: string): string {
  if (!fs.existsSync(indexFilePath)) {
    // raise an error if the index.html file does not exist
    throw new Error(`index.html file does not exist at path: ${indexFilePath}`);
  }
  fs.mkdirSync(historyDir, { recursive: true });
  const destFilePath = path.join(historyDir, newFileName);
  fs.copyFileSync(indexFilePath, destFilePath);
  return destFilePath;
}

export function versionData(options: { root?: string } = {}): Plugin {
  let root = options.root ?? process.cwd();
  let outDir = path.join(root, 'dist');

  return {
    name: 'version-data',
    apply: 'build', // never runs for the dev server
    configResolved(config) {
      if (!options.root) root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        let version: string = pkg.version;
        if (!version) {
          console.warn('[version-data] package.json has no "version"; using 0.0.0');
          version = '0.0.0';
        }
        const indexFilePath = path.join(outDir, 'index.html');
        const historyDir = path.join(path.dirname(outDir), 'build-history');
        const saved = versionCurrentBuild(indexFilePath, historyDir, getBuildFileName(version));
        console.log(`[version-data] saved ${path.relative(root, saved)}`);
      } catch (err) {
        console.warn(`[version-data] build not versioned: ${(err as Error).message}`);
      }
    },
  };
}