import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
import { voiceSession } from '../voice-tutor.mjs';
import { createVoiceCaptions } from '../public/voice-captions.js';
const offer = { kind: 'lesson', context: { lessonId: 'command', code: 'fox.jump()' }, sdp: 'v=0\r\n' };

test('voice configuration uses canonical context and cannot be overridden by the browser', () => {
  const payload = voiceSession({ ...offer, model: 'wrong', session: { instructions: 'wrong' } }, 'gpt-5.4-mini');
  assert.equal(payload.session.model, 'gpt-live-1');
  assert.equal(payload.session.store, false);
  assert.equal(payload.session.delegation.responses.model, 'gpt-5.4-mini');
  assert.match(payload.session.delegation.responses.instructions, /fox.jump/);
  assert.match(payload.session.delegation.responses.instructions, /slidesFromCurrent/);
  assert.equal(payload.session.delegation.responses.tools, undefined);
  const history = [{ role: 'user', content: 'Where is fox defined?' }, { role: 'assistant', content: 'The workshop supplies it.' }];
  const continued = voiceSession({ ...offer, context: { ...offer.context, history } }, 'gpt-5.4-mini');
  assert.deepEqual(continued.session.input.map(item => [item.role, item.content[0].text]), history.map(item => [item.role, item.content]));
  assert.match(continued.session.instructions, /not built into Python/);
  assert.throws(() => voiceSession({ ...offer, sdp: '' }));
  assert.throws(() => voiceSession({ ...offer, kind: 'unknown' }));
  assert.throws(() => voiceSession({ ...offer, context: { lessonId: 'missing', code: '' } }));
  const game = voiceSession({ ...offer, kind: 'game', context: { template: 'breaker', code: 'pass', exercise: { index: 1, title: 'fake' } } }, 'gpt-5.4-mini');
  assert.doesNotMatch(game.session.delegation.responses.instructions, /"title":"fake"/);
});

test('overlapping voice streams update existing chat entries and a new call keeps prior chat', () => {
  const chat = [];
  const createMessage = role => { const entry = { role }; chat.push(entry); return content => { entry.content = content; }; };
  const receive = createVoiceCaptions(createMessage);
  const user = (delta, start_ms, end_ms) => ({ type: 'session.input_transcript.delta', delta, start_ms, end_ms });
  const pip = (delta, start_ms, end_ms) => ({ type: 'session.output_transcript.delta', delta, start_ms, end_ms });
  receive(user('Where is ', 0, 200)); receive(pip('The workshop ', 100, 400));
  receive(user('fox from?', 200, 600)); receive(pip('supplies it.', 400, 800));
  assert.deepEqual(chat, [{ role: 'user', content: 'Where is fox from?' }, { role: 'assistant', content: 'The workshop supplies it.' }]);
  receive(user('Is it Python?', 4000, 4600));
  assert.equal(chat.length, 3);
  receive({ type: 'error', delta: 'ignore' }); receive(pip('', 5000, 5100));
  assert.equal(chat.length, 3);
  createVoiceCaptions(createMessage)(pip('Welcome back.', 0, 400));
  assert.equal(chat.length, 4); assert.equal(chat[0].content, 'Where is fox from?');
});

test('voice endpoint protects credentials, validates requests and recovers after upstream errors', async () => {
  let captured, calls = 0, fail = false;
  const server = createServer({ apiKey: 'secret-test-key', fetchImpl: async (url, options) => {
    calls++; captured = { url, options };
    return fail ? new Response('private upstream error', { status: 403 }) : Response.json({ transport: { sdp: 'answer' }, secret: 'never return this' });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/voice`;
  const post = (body = offer, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await post(offer, { Origin: 'https://elsewhere.example' })).status, 403);
    assert.equal((await post({ ...offer, sdp: 'bad' })).status, 400);
    assert.equal((await post({ ...offer, extra: 'a'.repeat(100001) })).status, 413);
    assert.equal(calls, 0);
    const reply = await post();
    assert.equal(reply.status, 201);
    assert.deepEqual(await reply.json(), { transport: { type: 'webrtc', sdp: 'answer' } });
    assert.equal(captured.url, 'https://api.openai.com/v1/live/sessions');
    assert.equal(captured.options.headers.Authorization, 'Bearer secret-test-key');
    fail = true;
    const failure = await post();
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /private upstream/);
    fail = false; assert.equal((await post()).status, 201);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const offline = createServer({ apiKey: '' });
  await new Promise(resolve => offline.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${offline.address().port}/api/voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offer) });
    assert.equal(response.status, 503);
  } finally { await new Promise(resolve => offline.close(resolve)); }
});
