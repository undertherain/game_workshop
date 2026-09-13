import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { readContent, loadLessons, validateIds, validateLesson } from '../public/content-loader.js';
import { lessons, skillLabels } from '../public/curriculum.js';
import { templates } from '../public/templates.js';

test('content manifests load all lessons with unique stable IDs and valid source', async () => {
  assert.deepEqual(lessons.map(l => l.id), await readContent('lessons/index.json'));
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
  const sources = Object.fromEntries(await Promise.all(Object.entries(templates).map(async ([id, t]) => [id, await readFile(new URL('../public/' + t.file, import.meta.url), 'utf8')])));
  const py = spawnSync('python3', ['-B', '-c', `import json,pathlib,sys
base=pathlib.Path('public'); data=json.load(sys.stdin)
ns={}; exec((base/'lesson_runtime.py').read_text(),ns)
for lesson in data['lessons']:
    if lesson['code']:
        result=json.loads(ns['run_lesson'](lesson['code'],lesson['mode']))
        assert 'error' not in result,(lesson['id'],result)
ns={}; exec((base/'runtime.py').read_text(),ns); exec((base/'arcade_runtime.py').read_text(),ns)
for kind,source in data['games'].items():
    result=json.loads(ns['_load_selected'](source,kind))
    assert 'error' not in result,(kind,result)
`], { input: JSON.stringify({ lessons, games: sources }), encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
});
test('content validation rejects duplicate IDs, unknown modes and broken quiz choices', async () => {
  assert.throws(() => validateIds(['a','a'], 'manifest'), /duplicate/);
  assert.throws(() => validateIds(['../other'], 'manifest'), /IDs/);
  const lesson = await readContent('lessons/sequence.json');
  const defaults = await readContent('lesson-defaults.json');
  assert.throws(() => validateLesson({ ...lesson, mode: 'unknown' }, 'sequence', defaults, skillLabels), /sequence.json: unknown runtime mode/);
  assert.throws(() => validateLesson({ ...lesson, starter: 'not an array' }, 'sequence', defaults, skillLabels), /starter/);
  assert.throws(() => validateLesson({ ...lesson, quiz: { ...lesson.quiz, choices: [] } }, 'sequence', defaults, skillLabels), /quiz choices/);
});
test('lesson-specific feedback and quiz choices come from content files', async () => {
  const data = await readContent('lessons/sequence.json');
  const defaults = await readContent('lesson-defaults.json');
  const changed = validateLesson({ ...data, heading: 'An edited heading', feedback: { success: 'Edited success' }, quiz: { ...data.quiz, choices: [{ id: 'one', label: 'My answer', firstLine: 'fox.jump()' }] } }, data.id, defaults, skillLabels);
  assert.equal(changed.heading, 'An edited heading');
  assert.equal(changed.feedback.success, 'Edited success');
  assert.equal(changed.feedback.empty, defaults.feedback.empty);
  assert.equal(changed.quiz.choices[0].label, 'My answer');
});
test('a missing lesson fails clearly instead of silently dropping an entry', async () => {
  await assert.rejects(loadLessons(skillLabels, async path => {
    if (path === 'lessons/event.json') throw Error('Missing lessons/event.json');
    return readContent(path);
  }), /lessons\/event.json/);
});
test('typed output predictions need no fixed answer or choices', async () => {
  const base = await readContent('lessons/sequence.json');
  const { choices, ...quiz } = base.quiz;
  const lesson = { ...base, quiz: { ...quiz, type: 'output' } };
  const defaults = await readContent('lesson-defaults.json');
  assert.equal(validateLesson(lesson, 'sequence', defaults, skillLabels).quiz.type, 'output');
  assert.throws(() => validateLesson({ ...lesson, quiz: { ...lesson.quiz, type: 'unknown' } }, 'sequence', defaults, skillLabels), /unknown quiz type/);
});
