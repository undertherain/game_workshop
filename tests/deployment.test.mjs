import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildDeployment } from '../scripts/build-vercel.mjs';

test('fresh deployment includes Python assets, an importable default handler and streaming API aliases', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'little-makers-build-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = pathToFileURL(temporary + '/output/');
  await buildDeployment(output);
  const fn = new URL('functions/api/status.func/', output);
  const config = JSON.parse(await readFile(new URL('.vc-config.json', fn), 'utf8'));
  assert.equal(config.runtime, 'nodejs22.x');
  assert.equal(config.shouldAddHelpers, false);
  assert.equal(config.supportsResponseStreaming, true);
  const { default: handler } = await import(new URL(config.handler, fn));
  assert.equal(typeof handler, 'function');
  for (const name of ['help', 'lesson-help', 'voice', 'export']) {
    assert.equal(await realpath(new URL(`functions/api/${name}.func`, output)), await realpath(fn));
  }
  for (const [artifact, source] of [
    ['static/index.html', '../public/index.html'],
    ['static/vendor/pyodide/pyodide.asm.wasm', '../node_modules/pyodide/pyodide.asm.wasm'],
    ['static/framework/workshop.py', '../framework/workshop.py'],
    ['functions/api/status.func/node_modules/pyodide/python_stdlib.zip', '../node_modules/pyodide/python_stdlib.zip'],
    ['functions/api/status.func/public/content/lessons/index.json', '../public/content/lessons/index.json'],
  ]) assert.deepEqual(await readFile(new URL(artifact, output)), await readFile(new URL(source, import.meta.url)), artifact);
  const names = await readdir(output, { recursive: true });
  assert.ok(!names.some(name => /(^|\/)(\.env[^/]*|__pycache__|tests|\.git)(\/|$)/.test(name)));
  assert.ok(!names.includes('static/framework/raylib_host.py'));
  // Rebuilding uses source assets again and recreates aliases without stale files.
  await buildDeployment(output);
  assert.equal(await realpath(new URL('functions/api/export.func', output)), await realpath(fn));
});
