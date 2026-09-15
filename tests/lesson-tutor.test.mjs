import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLessonInput } from '../lesson-tutor.mjs';
import { createServer } from '../server.mjs';
const body = { lessonId: 'names-intro', question: 'When do we use this?', code: '', visited: ['command'],
  progress: { records: [{ skill: 'commands', source: 'lesson:command', evidence: 'practice' }] } };

test('slide context uses canonical content, exact route distances and distinct evidence', () => {
  const context = validateLessonInput({ ...body, current: { title: 'Fake' }, route: [] });
  assert.equal(context.current.title, 'A variable remembers a value.');
  assert.equal(context.current.explanation.length, 3);
  assert.equal(context.route.find(l => l.id === 'greeting').slidesFromCurrent, 1);
  assert.equal(context.route.find(l => l.id === 'command').visited, true);
  assert.equal(context.route.find(l => l.id === 'command').practised, true);
  assert.equal(context.route.find(l => l.id === 'hello').visited, false);
  assert.equal(context.otherTopics.branches.find(b => b.id === 'drawing').planned[0].title, 'Grow a fractal forest');
  assert.throws(() => validateLessonInput({ ...body, lessonId: 'missing' }));
  assert.throws(() => validateLessonInput({ ...body, code: 'x'.repeat(1001) }));
});

test('lesson endpoint uses slide instructions, strips edits, bounds history and handles offline mode', async () => {
  let captured;
  const server = createServer({localAi: true, apiKey: 'fake', fetchImpl: async (url, options) => {
    captured = JSON.parse(options.body);
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({
      message: 'The greeting is one slide ahead.', experiment: '', before: 'fox.jump()', after: 'fox.move()', line: 1,
    }) }] }] });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/lesson-help`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, history: [null, ...Array(9).fill({ role: 'user', content: 'why?' })] }),
    });
    assert.equal(response.status, 200);
    const reply = await response.json();
    assert.equal(reply.before, null); assert.equal(reply.after, null); assert.equal(reply.line, null);
    assert.match(captured.instructions, /slidesFromCurrent/);
    assert.doesNotMatch(captured.instructions, /Platformer API:/);
    assert.equal(JSON.parse(captured.input).history.length, 6);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const offline = createServer({localAi: true, apiKey: '' });
  await new Promise(resolve => offline.listen(0, '127.0.0.1', resolve));
  try {
    const reply = await (await fetch(`http://127.0.0.1:${offline.address().port}/api/lesson-help`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })).json();
    assert.equal(reply.mode, 'examples'); assert.match(reply.message, /not connected/);
    assert.match(reply.experiment, /Next slide/);
  } finally { await new Promise(resolve => offline.close(resolve)); }
});
