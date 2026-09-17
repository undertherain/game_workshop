import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { shallowLineSteps } from '../public/bresenham-diagrams.js';
import { lessons } from '../public/curriculum.js';
import { migrateDraft } from '../public/lesson-model.js';
import { fanLines, linePixels } from '../public/pixel-fan.js';

test('the teaching decisions match the actual Python pixels, including halfway ties', () => {
  const examples = [];
  for (let dx = 1; dx <= 7; dx++) for (let dy = 0; dy <= Math.min(dx, 4); dy++) {
    examples.push({ dx, dy, pixels: shallowLineSteps(dx, dy).map(({ x, y }) => [x, y]) });
  }
  const result = spawnSync('python3', ['-B', '-c', `
import json, pathlib, sys
ns = {}; exec(pathlib.Path('public/lesson_runtime.py').read_text(), ns)
for example in json.load(sys.stdin):
    result = json.loads(ns['run_lesson'](f"line(0, 0, {example['dx']}, {example['dy']})", 'drawing'))
    assert result['shapes'][0]['pixels'] == example['pixels'], (example, result)
`], { input: JSON.stringify(examples), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(shallowLineSteps().map(s => s.decision), [-1, 5, -3, 3, -5, 1, -7, -1]);
});

test('old prepared drawing drafts migrate to pixel practice; custom drafts stay intact', () => {
  for (const id of ['dot', 'line', 'pattern']) {
    const lesson = lessons.find(l => l.id === id);
    assert.equal(migrateDraft(lesson, lesson.draftMigrations[0].from.join('\n')), lesson.code);
    const custom = 'dot(360, 180)';
    assert.equal(migrateDraft(lesson, custom), custom);
  }
});

test('fan lines use the same raster cells as Python in every direction', () => {
  const examples = [];
  for (const [x, y] of [[0, 0], [7, 0], [0, 4], [7, 4]]) {
    for (let endX = 0; endX < 8; endX++) for (let endY = 0; endY < 5; endY++) {
      examples.push({ points: [x, y, endX, endY], pixels: linePixels(x, y, endX, endY) });
    }
  }
  const result = spawnSync('python3', ['-B', '-c', `
import json, pathlib, sys
ns = {}; exec(pathlib.Path('public/lesson_runtime.py').read_text(), ns)
for example in json.load(sys.stdin):
    code = 'line(' + ','.join(map(str, example['points'])) + ')'
    actual = json.loads(ns['run_lesson'](code, 'drawing'))['shapes'][0]['pixels']
    assert actual == example['pixels'], (example, actual)
`], { input: JSON.stringify(examples), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('the fan targets alternate far-edge pixels, shifts phase and mirrors exactly', () => {
  const fan = fanLines(192, 144, 2);
  assert.equal(fan.length, 168);
  assert.ok(fan.every(line => line[0][0] === 0 && line[0][1] === 0));
  assert.ok(fan.every(line => { const [x, y] = line.at(-1); return (x === 191 && y % 2 === 0) || (y === 143 && x % 2 === 0); }));
  assert.deepEqual(fanLines(192, 144, 2, 0, 'bottom-right'), fan.map(line => line.map(([x, y]) => [191 - x, 143 - y])));
  const shifted = fanLines(192, 144, 2, 1);
  assert.equal(shifted.length, 167);
  assert.equal(new Set(shifted.map(line => line.at(-1).join(','))).size, shifted.length);
  assert.notDeepEqual(shifted, fan);
  for (const gap of [1, 2, 3, 4, 6, 8]) {
    const lines = fanLines(192, 144, gap);
    assert.ok(lines.every(line => line.every(([x, y]) => x >= 0 && x < 192 && y >= 0 && y < 144)));
  }
});
