import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exportGame, validateExport, frameworkFiles } from '../export-game.mjs';
import { templates } from '../public/templates.js';
import { createServer } from '../server.mjs';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
test('export validation never treats a template as a file path', () => {
  for (const template of ['../../.env', '__proto__', 'constructor', '', null]) assert.throws(() => validateExport({ template, code: 'pass' }));
  for (const code of ['', ' ', null, 'a'.repeat(20001)]) assert.throws(() => validateExport({ template: 'breaker', code }));
});

test('all game ZIPs extract and replay the exact draft using only the bundled framework', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'little-makers-export-'));
  try {
    for (const template of Object.keys(templates)) {
      const code = '# My exported draft 🦊\n' + templates[template].completeCode;
      const archive = await exportGame({ template, code });
      const zipPath = path.join(temporary, template + '.zip');
      await writeFile(zipPath, archive);
      const check = spawnSync('python3', ['-B', '-c', `
import json, pathlib, subprocess, sys, zipfile
from framework import WorkshopGame
archive, template, source, root = sys.argv[1:]
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    names = bundle.namelist()
    assert all(not name.startswith('/') and '..' not in name.split('/') for name in names)
    assert not any(name.endswith('.env') or name.startswith(('tests/', 'node_modules/')) or 'tutor' in name for name in names)
    assert bundle.read('my_game.py').decode() == source
    assert json.loads(bundle.read('game.json'))['template'] == template
    for name in ('scene.js', 'forest.js', 'python-worker.js', 'assets/forest/background.png'):
        assert bundle.read(name) == (pathlib.Path('public') / name).read_bytes()
    for name in json.loads(bundle.read('framework-files.json')):
        assert bundle.read('framework/' + name) == (pathlib.Path('framework') / name).read_bytes()
    destination = pathlib.Path(root) / template
    bundle.extractall(destination)
keys = [{}, {'right': True}, {'jump': True}, {'left': True}] * 40
game = WorkshopGame(source, template)
expected = [game.step(value) for value in keys]
# -I plus an explicit isolated export directory prevents repository imports.
script = 'import sys,json,pathlib;sys.path.insert(0,sys.argv[1]);from framework import WorkshopGame;p=json.loads(pathlib.Path(sys.argv[1],"game.json").read_text());g=WorkshopGame(pathlib.Path(sys.argv[1],"my_game.py").read_text(),p["template"]);print(json.dumps([g.step(k) for k in json.loads(sys.argv[2])]))'
result = subprocess.run([sys.executable, '-I', '-B', '-c', script, str(destination), json.dumps(keys)], cwd=root, capture_output=True, text=True, check=True)
assert json.loads(result.stdout) == expected
`, zipPath, template, code, temporary], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
      assert.equal(check.status, 0, check.stderr);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('HTTP export validates requests, keeps credentials out, and serves only declared framework modules', async () => {
  const server = createServer({ apiKey: 'test-secret-never-exported' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(base + '/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({}, { Origin: 'https://other.example' })).status, 403);
    assert.equal((await post({})).status, 400);
    assert.equal((await post({}, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post({ code: 'x'.repeat(150001) })).status, 413);
    assert.equal((await fetch(base + '/framework/raylib_host.py')).status, 404);
    assert.equal((await fetch(base + '/framework/.env')).status, 404);
    for (const name of frameworkFiles) assert.equal(await (await fetch(base + '/framework/' + name)).text(), await read('framework/' + name));
    const result = await post({ template: 'breaker', code: await read('public/breaker.py') });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('content-type'), 'application/zip');
    assert.match(result.headers.get('content-disposition'), /little-makers-breaker.zip/);
    assert.equal(Buffer.from(await result.arrayBuffer()).subarray(0, 4).toString('hex'), '504b0304');
    // Export packages invalid/incomplete drafts without ever executing them on the server.
    const unrun = await post({ template: 'breaker', code: 'while True: pass' });
    assert.equal(unrun.status, 200);
    await unrun.arrayBuffer();
  } finally { await new Promise(resolve => server.close(resolve)); }
});
