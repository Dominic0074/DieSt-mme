import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = path.join(rootDir, 'Retime Save');
const packagePath = path.join(projectDir, 'package.json');
const entryPoint = path.join(projectDir, 'src', 'main.js');
const outDir = path.join(projectDir, 'dist');
const outFile = path.join(outDir, 'Retime Save.user.js');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
packageJson.version = bumpPatchVersion(packageJson.version);
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
await mkdir(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [entryPoint],
  outfile: outFile,
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  banner: {
    js: buildUserscriptHeader(packageJson.version)
  },
  legalComments: 'none'
});

console.log(`Built ${path.relative(rootDir, outFile)} v${packageJson.version}`);

function bumpPatchVersion(version) {
  const parts = String(version || '0.0.0').split('.').map(Number);
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] + 1 : 1
  ].join('.');
}

function buildUserscriptHeader(version) {
  return `// ==UserScript==
// @name         Retime Save
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      ${version}
// @description  Sendet eintreffende Truppen sofort als konfigurierte Unterstuetzung weiter.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Retime%20Save/dist/Retime%20Save.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Retime%20Save/dist/Retime%20Save.user.js
// ==/UserScript==
`;
}
