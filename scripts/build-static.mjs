import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const frameworkFiles = JSON.parse(await readFile(new URL('public/framework-files.json', root), 'utf8'));
const pyodideFiles = ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip', 'package.json', 'README.md'];

// These two generated directories are ignored by Git. Copy only runtime assets;
// no environment files, dependencies unrelated to Pyodide, or desktop modules.
for (const [destination, source, names] of [
  ['public/vendor/pyodide/', 'node_modules/pyodide/', pyodideFiles],
  ['public/framework/', 'framework/', frameworkFiles],
]) {
  const target = new URL(destination, root);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const name of names) {
    if (!/^[\w.-]+$/.test(name)) throw new Error(`Invalid runtime filename: ${name}`);
    await copyFile(new URL(source + name, root), new URL(name, target));
  }
}
console.log('Prepared Pyodide and Python framework assets for static hosting.');
