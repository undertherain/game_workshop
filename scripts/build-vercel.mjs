import { copyFile, cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const frameworkFiles = JSON.parse(await readFile(new URL('public/framework-files.json', root), 'utf8'));
const pyodideFiles = ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip', 'package.json', 'README.md'];
const serverFiles = ['server.mjs', 'server-config.mjs', 'export-game.mjs', 'tutor.mjs',
  'tutor-principles.mjs', 'lesson-tutor.mjs', 'lesson-capabilities.mjs', 'voice-tutor.mjs', 'package.json'];

async function copyFiles(source, target, names) {
  await mkdir(target, { recursive: true });
  for (const name of names) {
    if (!/^[\w.-]+$/.test(name)) throw new Error(`Invalid runtime filename: ${name}`);
    await copyFile(new URL(name, source), new URL(name, target));
  }
}

// Explicit Build Output API artifacts avoid framework-dependent file tracing.
// The target is generated output only; .vercel/project.json is never touched.
export async function buildDeployment(output = new URL('.vercel/output/', root)) {
  await rm(output, { recursive: true, force: true });
  const assets = new URL('static/', output);
  const fn = new URL('functions/api/status.func/', output);
  const sourcePublic = new URL('public/', root);
  const filter = source => {
    const parts = path.relative(fileURLToPath(sourcePublic), source).split(path.sep);
    return !parts.some(part => part.startsWith('.') || part === '__pycache__') &&
      !['vendor', 'framework'].includes(parts[0]);
  };
  await cp(sourcePublic, assets, { recursive: true, filter });
  await cp(sourcePublic, new URL('public/', fn), { recursive: true, filter });
  await copyFiles(root, fn, serverFiles);
  for (const target of [new URL('framework/', assets), new URL('framework/', fn)]) {
    await copyFiles(new URL('framework/', root), target, frameworkFiles);
  }
  for (const target of [new URL('vendor/pyodide/', assets), new URL('node_modules/pyodide/', fn)]) {
    await copyFiles(new URL('node_modules/pyodide/', root), target, pyodideFiles);
  }
  await writeFile(new URL('.vc-config.json', fn), JSON.stringify({
    runtime: 'nodejs22.x', handler: 'server.mjs', launcherType: 'Nodejs',
    shouldAddHelpers: false, supportsResponseStreaming: true, maxDuration: 60,
  }, null, 2) + '\n');
  // Aliases use the same function bundle, with the original API URL intact.
  for (const name of ['help', 'lesson-help', 'voice', 'export']) {
    await symlink('status.func', new URL(`functions/api/${name}.func`, output));
  }
  await writeFile(new URL('config.json', output), JSON.stringify({
    version: 3,
    routes: [
      { src: '/(.*)', headers: { 'X-Content-Type-Options': 'nosniff' }, continue: true },
      { src: '/vendor/pyodide/(.*)', headers: { 'Cache-Control': 'public, max-age=86400' }, continue: true },
      { handle: 'filesystem' },
      { src: '/(.*)', status: 404 },
    ],
  }, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildDeployment();
  console.log('Built static Python assets and streaming Node API in .vercel/output.');
}
