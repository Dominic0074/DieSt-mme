import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(rootDir, 'package.json');
const entryPoint = path.join(rootDir, 'UserScripte', 'src', 'main.js');
const outDir = path.join(rootDir, 'UserScripte', 'dist');
const outFile = path.join(outDir, 'Ausbau Nacht-Modus-OOP.user.js');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
packageJson.version = bumpPatchVersion(packageJson.version);
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

await mkdir(outDir, { recursive: true });

const header = buildUserscriptHeader(packageJson.version);

await esbuild.build({
  entryPoints: [entryPoint],
  outfile: outFile,
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  banner: {
    js: header
  },
  legalComments: 'none'
});

console.log(`Built ${path.relative(rootDir, outFile)} v${packageJson.version}`);

function bumpPatchVersion(version) {
  const parts = String(version || '0.0.0').split('.').map(part => Number(part));
  const major = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] + 1 : 1;
  return `${major}.${minor}.${patch}`;
}

function buildUserscriptHeader(version) {
  return `// ==UserScript==
// @name         Ausbau Nacht-Modus OOP
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Objektorientierter Neuaufbau fuer Die Staemme Automation.
// @author       kk
// @match        *://*.die-staemme.de/game.php*
// @match        *://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/dist/Ausbau%20Nacht-Modus-OOP.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/dist/Ausbau%20Nacht-Modus-OOP.user.js
// ==/UserScript==
`;
}

