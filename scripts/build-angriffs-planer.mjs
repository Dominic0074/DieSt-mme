import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = path.join(rootDir, 'AngriffsPlaner');
const packagePath = path.join(projectDir, 'package.json');
const entryPoint = path.join(projectDir, 'src', 'main.js');
const outDir = path.join(projectDir, 'dist');
const outFile = path.join(outDir, 'AngriffsPlaner.user.js');

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
// @name         AngriffsPlaner
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      ${version}
// @description  Liest DS-Ultimate-Angriffsplaene aus, speichert sie lokal und sendet per Monitor zur Send Time.
// @author       kk
// @match        https://ds-ultimate.de/tools/*/attackPlanner/*
// @match        https://ds-ultimate.de/de/*/tools/attackPlanner*
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/AngriffsPlaner/dist/AngriffsPlaner.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/AngriffsPlaner/dist/AngriffsPlaner.user.js
// ==/UserScript==
`;
}
