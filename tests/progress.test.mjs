import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createProgressStore, movementOffer, movementStarter, sanitizeProgress } from '../public/progress.js';
import { validateInput } from '../tutor.mjs';

test('practice and supplied code do not offer a transferable checked skill', () => {
  const store = createProgressStore();
  for (const evidence of ['practice', 'supplied', 'assisted']) {
    store.record({ skill: 'movement', source: 'game:breaker', evidence });
    assert.equal(movementOffer(store.get(), 'platformer'), null);
  }
  store.record({ skill: 'movement', source: 'game:breaker', evidence: 'checked' });
  assert.equal(movementOffer(store.get(), 'platformer').source, 'game:breaker');
  assert.equal(movementOffer(store.get(), 'breaker'), null);
});
test('progress survives reload, deduplicates evidence and tolerates blocked or corrupt storage', () => {
  let value;
  const storage = { getItem: () => value, setItem: (_, v) => value = v };
  const store = createProgressStore(storage);
  for (let i = 0; i < 3; i++) store.record({ skill: 'loops', source: 'lesson:repeat', evidence: 'practice' });
  assert.equal(createProgressStore(storage).get().records.length, 1);
  value = 'broken json'; assert.deepEqual(createProgressStore(storage).get(), { records: [] });
  const blocked = createProgressStore({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  blocked.record({ skill: 'commands', source: 'lesson:command', evidence: 'practice' });
  assert.equal(blocked.get().records.length, 1);
});
test('tutor receives bounded evidence, with no unsupported mastery claims', () => {
  const records = [{ skill: 'movement', source: 'game:breaker', evidence: 'checked' }, { skill: 'loops', source: 'x', evidence: 'mastered' }, { skill: 'invented', source: 'x', evidence: 'checked' }];
  assert.equal(sanitizeProgress({ records }).records.length, 1);
  const input = validateInput({ question: 'What next?', code: '', progress: { records } });
  assert.deepEqual(input.progress.records, [records[0]]);
});
test('included controls pass actual movement checks in both horizontal games and preserve other rules', async () => {
  const sources = {};
  for (const id of ['breaker', 'platformer']) {
    const source = await readFile(new URL(`../public/${id}.py`, import.meta.url), 'utf8');
    sources[id] = movementStarter(source, id);
    assert.ok(sources[id].includes(source.slice(source.indexOf('\n#', source.indexOf('def update():')))));
  }
  const py = spawnSync('python3', ['-B', '-c', `import sys,json,pathlib
base=pathlib.Path('public')
ns={}
exec((base/'runtime.py').read_text(),ns)
exec((base/'arcade_runtime.py').read_text(),ns)
for kind,source in json.load(sys.stdin).items():
    result=json.loads(ns['_check_exercise'](source,kind,0))
    assert result['passed'], (kind,result)
`], { input: JSON.stringify(sources), encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
});

test('Invaders movement transfer preserves supplied firing and scoring', async () => {
  const source = await readFile(new URL('../public/invaders.py', import.meta.url), 'utf8');
  const draft = movementStarter(source, 'invaders');
  assert.equal(draft.slice(draft.indexOf('def fire_laser')), source.slice(source.indexOf('def fire_laser')));
  const py = spawnSync('python3', ['-B', '-c', 'import sys,json;from framework.workshop_checks import check_exercise;assert json.loads(check_exercise(sys.stdin.read(),"invaders",0))["passed"]'], {input:draft,encoding:'utf8'});
  assert.equal(py.status,0,py.stderr);
});
