import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as serverWithAccess } from '../server.mjs';
import { createAccess } from '../ai-access.mjs';
// Transport regressions isolate transport; ai-access.test.mjs exercises real quotas.
function createServer(options) {
  const access = createAccess({ env: {}, localAi: true });
  access.reserve = async () => {};
  return serverWithAccess({ ...options, access });
}
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
  assert.deepEqual(payload.session.client.data_channel.allowed_server_events.filter(event => event.type === 'response.event'), [
    { type: 'response.event', response_event: 'response.output_text.done' },
  ]);
  assert.match(payload.session.instructions, /ess tee ar/);
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

test('voice shows exact completed code examples without rewriting captions or exposing other backend events', () => {
  const chat = [];
  const receive = createVoiceCaptions(role => content => chat.push({ role, content }));
  const answer = (text, item_id = 'answer1') => ({ type: 'response.event', delegation_id: 'delegation1',
    event: { type: 'response.output_text.done', item_id, content_index: 0, text } });
  const code = answer('Use `str(3)` to turn 3 into `"3"`. Try `str(3)`.');
  receive({ type: 'response.event', event: { type: 'response.reasoning_text.done', text: '`private`' } });
  receive({ type: 'response.event', event: { type: 'response.output_text.delta', delta: '`str(' } });
  receive(answer('You can convert an integer to a string.', 'no-code'));
  assert.equal(chat.length, 0);
  receive(code); receive(code);
  assert.deepEqual(chat, [{ role: 'assistant', content: 'Written answer\nUse str(3) to turn 3 into "3". Try str(3).' }]);
  receive({ type: 'session.output_transcript.delta', delta: 'Call S T R with three.', start_ms: 0, end_ms: 1000 });
  assert.equal(chat[1].content, 'Call S T R with three.');
  receive(answer('Use `fox.say(str(3))`.', 'answer2'));
  assert.equal(chat[2].content, 'Written answer\nUse fox.say(str(3)).');
  receive(answer('```python\nstr(3)\n```', 'fenced'));
  receive(answer('`' + 'x'.repeat(1001) + '`', 'oversize'));
  assert.equal(chat.length, 3);
});

test('voice endpoint protects credentials, validates requests and recovers after upstream errors', async () => {
  let captured, calls = 0, fail = false;
  const server = createServer({localAi: true, apiKey: 'secret-test-key', fetchImpl: async (url, options) => {
    calls++; captured = { url, options };
    return fail ? new Response('private upstream error', { status: 403 }) : Response.json({ session: { id: 'live_test' }, transport: { sdp: 'answer' }, secret: 'never return this' });
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
    assert.deepEqual(await reply.json(), { transport: { type: 'webrtc', sdp: 'answer' }, limit: { maxSeconds: 120 } });
    assert.equal(captured.url, 'https://api.openai.com/v1/live/sessions');
    assert.equal(captured.options.headers.Authorization, 'Bearer secret-test-key');
    fail = true;
    const failure = await post();
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /private upstream/);
    fail = false; assert.equal((await post()).status, 201);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const offline = createServer({localAi: true, apiKey: '' });
  await new Promise(resolve => offline.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${offline.address().port}/api/voice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offer) });
    assert.equal(response.status, 401);
  } finally { await new Promise(resolve => offline.close(resolve)); }
});

test('abandoning voice setup cancels the upstream request and frees the next Talk attempt', { timeout: 5000 }, async () => {
  let markStarted, markCancelled, calls = 0;
  const started = new Promise(resolve => { markStarted = resolve; });
  const cancelled = new Promise(resolve => { markCancelled = resolve; });
  const server = createServer({localAi: true, apiKey: 'test-key', fetchImpl: async (url, options) => {
    if (++calls > 1) return Response.json({ session: { id: 'live_fresh' }, transport: { sdp: 'fresh answer' } });
    markStarted();
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => { markCancelled(); reject(options.signal.reason); }, { once: true });
    });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/voice`;
  const controller = new AbortController();
  const request = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offer) };
  try {
    const first = fetch(url, { ...request, signal: controller.signal });
    await started; controller.abort();
    await assert.rejects(first, { name: 'AbortError' });
    await cancelled;
    const second = await fetch(url, request);
    assert.equal(second.status, 201);
    assert.equal((await second.json()).transport.sdp, 'fresh answer');
    assert.equal(calls, 2);
  } finally { controller.abort(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});


test('Pip receives museum, complete game and variation activity in both voice layers', () => {
  for (const activity of ['museum', 'complete', 'lesson']) {
    const payload = voiceSession({ ...offer, kind:'game', context:{template:'breaker',code:'pass',activity,exercise:{index:3}} }, 'test-model');
    assert.ok(payload.session.instructions.includes('"activity":"'+activity+'"'));
    assert.match(payload.session.delegation.responses.instructions, /Invent your variation/);
    assert.ok(payload.session.delegation.responses.instructions.includes('"activity":"'+activity+'"'));
    if(activity==='museum') {
      assert.match(payload.session.instructions,/There is no editor in the museum/);
      assert.match(payload.session.instructions,/Atari’s Breakout, released in 1976/);
      assert.match(payload.session.delegation.responses.instructions,/Atari’s Breakout, released in 1976/);
    }
  }
});
