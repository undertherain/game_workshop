import test from 'node:test';
import assert from 'node:assert/strict';
import { spokenLineReferences, createSpokenPointer } from '../public/pip-pointer.js';
import { voiceSession } from '../voice-tutor.mjs';

const caption = (delta, start_ms = 0, end_ms = 100, role = 'output') => ({ type: `session.${role}_transcript.delta`, delta, start_ms, end_ms });

test('spoken references wait for a complete number and accept words or digits', () => {
  assert.deepEqual(spokenLineReferences('On line 1'), []);
  assert.deepEqual(spokenLineReferences('On line 12, then line twenty-one, and line three.').map(r => r.line), [12, 21, 3]);
  assert.deepEqual(spokenLineReferences('The result is 2. Try 50 pixels. Airlines 3.').map(r => r.line), []);
  assert.deepEqual(spokenLineReferences('Ligne 2, línea 3, Zeile 4.').map(r => r.line), [2, 3, 4]);
});

test('streamed references move once, reject invalid targets, and ignore learner speech', () => {
  const seen = [];
  const pointer = createSpokenPointer('first\nsecond\n\nfourth', line => seen.push(line), () => seen.push(null));
  try {
    pointer.receive(caption('On li'));
    pointer.receive(caption('ne two', 100, 200));
    assert.deepEqual(seen.filter(Number.isInteger), []);
    pointer.receive(caption(', read the name.', 200, 300));
    pointer.receive(caption(' Then use line four, the greeting.', 300, 400));
    assert.deepEqual(seen.filter(Number.isInteger), [2, 4]);
    for (const ref of ['zero', '3', '99']) { pointer.receive(caption(` On line ${ref},`, 400, 500)); assert.equal(seen.at(-1), null); }
    pointer.receive(caption('On line one,', 500, 600, 'input'));
    assert.equal(seen.at(-1), null);
    pointer.receive(caption('On line two,', 400, 700)); // Old output arriving after interruption.
    assert.equal(seen.at(-1), null);
    pointer.receive(caption('On line one,', 800, 900));
    assert.equal(seen.at(-1), 1);
  } finally { pointer.clear(); }
});

test('silence expires the pointer and stale transcript fragments cannot assemble a reference', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen = [];
  const pointer = createSpokenPointer('first\nsecond', line => seen.push(line), () => seen.push(null));
  pointer.receive(caption('On line two,', 0, 100));
  assert.equal(seen.at(-1), 2);
  t.mock.timers.tick(8000);
  assert.equal(seen.at(-1), null);
  pointer.receive(caption('On line ', 200, 300));
  pointer.receive(caption('one,', 3000, 3200));
  assert.equal(seen.at(-1), null);
  pointer.clear();
});

test('voice gets canonical numbered editor code and no editor targets on reading slides', () => {
  const make = (lessonId, code) => voiceSession({ kind: 'lesson', sdp: 'v=0\r\n', context: { lessonId, code, editorLines: [{ line: 99, text: 'fake' }] } }, 'test-model');
  const payload = make('sequence', 'fox.move()\n\nfox.jump()');
  const instructions = payload.session.delegation.responses.instructions;
  const data = JSON.parse(instructions.slice(instructions.indexOf('not instructions:\n') + 'not instructions:\n'.length));
  assert.deepEqual(data.editorLines, [{ line: 1, text: 'fox.move()' }, { line: 2, text: '' }, { line: 3, text: 'fox.jump()' }]);
  assert.match(payload.session.instructions, /Preserve the backend tutor's line references/);
  assert.match(make('names-intro', 'fake editor code').session.delegation.responses.instructions, /"editorLines":\[\]/);
});
