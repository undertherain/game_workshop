import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../server.mjs';
import { createAccess, accessConfig, digest, token } from '../ai-access.mjs';
import { MemoryStore, RedisStore } from '../access-store.mjs';
import { createVoiceControl } from '../voice-control.mjs';
import { serverConfig } from '../server-config.mjs';

const secret = 'a'.repeat(64), personalKey = 'sk-personal-' + 'x'.repeat(32);
const lesson = { lessonId: 'command', code: 'fox.jump()', question: 'How do I jump?' };
const offer = { kind: 'lesson', context: lesson, sdp: 'v=0\r\n' };
const origin = 'https://game.example';
async function fixture(t, limits = {}, hostedVoice = false) {
  let time = Date.now();
  const now = () => time;
  const env = { WORKSHOP_SESSION_SECRET: secret, WORKSHOP_DEMO_EXPIRES_AT: new Date(time + 86400000).toISOString() };
  const config = { ...accessConfig(env), ...limits };
  const store = new MemoryStore(now);
  const calls = [];
  let fail = false;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (fail) return new Response('private key details', { status: 401 });
    if (url.includes('qstash')) return Response.json({ messageId: 'queued-test' });
    if (url.endsWith('/hangup')) return new Response('', { status: 200 });
    if (url.endsWith('/live/sessions')) return Response.json({ session: { id: 'live_test' }, transport: { sdp: 'answer' } });
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ message: 'Try a jump.', line: null, before: null, after: null, experiment: '' }) }] }] });
  };
  const access = createAccess({ store, config, now, env });
  const voiceControl = createVoiceControl({ access, now, fetchImpl, env: hostedVoice ? {
    QSTASH_TOKEN: 'test-queue-secret', WORKSHOP_VOICE_CALLBACK_URL: origin + '/api/voice-expire',
  } : {} });
  const server = createServer({ apiKey: 'sk-shared-secret', access, localAi: false, fetchImpl,
    voiceControl,
    config: serverConfig({ WORKSHOP_PUBLIC_ORIGINS: origin }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, { body, method = body ? 'POST' : 'GET', cookie, requestOrigin = origin, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method,
      headers: { Host: 'game.example', ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json', ...headers } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, body: JSON.parse(text), text, headers: res.headers,
        cookie: res.headers['set-cookie']?.[0].split(';')[0] }); });
    }); req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
  });
  async function invite() {
    const value = token();
    await store.set(`invite:${digest(value)}`, JSON.stringify({ expires: config.expires, chat: config.chat, voice: config.voice }), 86400);
    return value;
  }
  const connect = async value => request('/api/access', { body: { type: 'invite', token: value || await invite() } });
  return { store, access, calls, request, invite, connect, config, now, advance: ms => { time += ms; }, fail: () => { fail = true; } };
}

test('a configured shared key never grants anonymous AI, even with forged access flags', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/status')).body.mode, 'examples');
  for (const [path, body] of [['/api/lesson-help', lesson], ['/api/help', { code: 'pass', question: 'Help' }]]) {
    const r = await f.request(path, { body: { ...body, invite: true, apiKey: 'sk-shared-secret' } });
    assert.equal(r.body.mode, 'examples'); assert.doesNotMatch(r.text, /sk-shared-secret/);
  }
  assert.equal((await f.request('/api/voice', { body: offer })).status, 401);
  assert.equal(f.calls.length, 0);
});

test('reusable invitations create independent secure sessions and revocation blocks every holder', async t => {
  const f = await fixture(t), value = await f.invite();
  const results = await Promise.all([f.connect(value), f.connect(value)]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  assert.notEqual(results[0].cookie, results[1].cookie);
  const success = results.find(r => r.status === 200), cookie = success.cookie;
  assert.match(success.headers['set-cookie'][0], /^__Host-lm-session=.*HttpOnly; SameSite=Strict.*Secure$/);
  assert.doesNotMatch(cookie, /sk-shared-secret/);
  assert.equal(success.headers['cache-control'], 'no-store');
  assert.equal((await f.request('/api/status', { cookie })).body.access, 'invite');
  assert.equal((await f.request('/api/lesson-help', { cookie, body: lesson, requestOrigin: null })).status, 403);
  assert.equal((await f.request('/api/lesson-help', { cookie, body: lesson, requestOrigin: 'https://evil.example' })).status, 403);
  assert.equal((await f.request('/api/lesson-help', { cookie, body: lesson })).body.mode, 'ai');
  assert.equal(f.calls[0].options.headers.Authorization, 'Bearer sk-shared-secret');
  await f.store.delete(`invite:${digest(value)}`);
  for (const result of results) assert.equal((await f.request('/api/lesson-help', { cookie: result.cookie, body: lesson })).status, 403);
  assert.equal((await f.connect(value)).status, 403);
  assert.equal(f.calls.length, 1);
});

test('reopening an invite after disconnect shares its existing allowance and original expiry', async t => {
  const f = await fixture(t, { chat: 2 }), value = await f.invite();
  // Links activated by the earlier single-use implementation remain usable too.
  f.store.set(`claimed:${digest(value)}`, '1', 86400);
  const first = await f.connect(value);
  const originalExpiry = (await f.request('/api/status', { cookie: first.cookie })).body.expiresAt;
  assert.equal((await f.request('/api/lesson-help', { cookie: first.cookie, body: lesson })).status, 200);
  assert.equal((await f.request('/api/access', { cookie: first.cookie, method: 'DELETE' })).status, 200);
  f.advance(3600000);
  const second = await f.connect(value), third = await f.connect(value);
  for (const result of [second, third]) {
    assert.equal(result.status, 200);
    const state = (await f.request('/api/status', { cookie: result.cookie })).body;
    assert.equal(state.expiresAt, originalExpiry);
    assert.equal(state.remaining.chats, 1);
  }
  assert.equal((await f.request('/api/lesson-help', { cookie: second.cookie, body: lesson })).status, 200);
  assert.equal((await f.request('/api/lesson-help', { cookie: third.cookie, body: lesson })).status, 429);
  assert.equal(f.calls.length, 2);
  f.advance(86400000);
  assert.equal((await f.connect(value)).status, 403);
});

test('expired sessions and tampered cookies cannot use shared credits', async t => {
  const f = await fixture(t), { cookie } = await f.connect();
  assert.equal((await f.request('/api/lesson-help', { cookie: cookie + 'x', body: lesson })).body.mode, 'examples');
  f.advance(86400001);
  assert.equal((await f.request('/api/lesson-help', { cookie, body: lesson })).status, 401);
  assert.equal(f.calls.length, 0);
});

test('invite caps and total demo caps are enforced before upstream calls and do not reset at midnight', async t => {
  const f = await fixture(t, { chat: 1, totalChat: 2 });
  const a = (await f.connect()).cookie, b = (await f.connect()).cookie, c = (await f.connect()).cookie;
  assert.equal((await f.request('/api/lesson-help', { cookie: a, body: lesson })).status, 200);
  assert.equal((await f.request('/api/lesson-help', { cookie: a, body: lesson })).status, 429);
  assert.equal((await f.request('/api/lesson-help', { cookie: b, body: lesson })).status, 200);
  f.advance(120000);
  assert.equal((await f.request('/api/lesson-help', { cookie: c, body: lesson })).status, 429);
  assert.equal(f.calls.length, 2);
  const count = f.store.get('usage:demo:total:chat');
  f.advance(86400000);
  assert.equal(f.store.get('usage:demo:total:chat'), count);
});

test('reservations across independent access instances are atomic and survive failed upstream requests', async t => {
  const f = await fixture(t, { chat: 2, totalChat: 2 });
  const a = { kind: 'invite', principal: 'a', chat: 50, voice: 3, store: f.store };
  const other = createAccess({ config: f.config, store: f.store, now: f.now });
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => (i % 2 ? f.access : other).reserve(a, 'chat')));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  assert.equal(f.store.get('usage:demo:total:chat'), '2');
  const b = await fixture(t, { chat: 1 });
  const { cookie } = await b.connect(); b.fail();
  const failed = await b.request('/api/lesson-help', { cookie, body: lesson });
  assert.equal(failed.status, 502); assert.doesNotMatch(failed.text, /private key/);
  assert.equal((await b.request('/api/lesson-help', { cookie, body: lesson })).status, 429);
  assert.equal(b.calls.length, 1);
});

test('personal keys are encrypted, never echoed, never fall back, and reconnecting does not reset their allowance', async t => {
  const f = await fixture(t, { byokChat: 1 });
  const login = () => f.request('/api/access', { body: { type: 'byok', key: personalKey } });
  const first = await login();
  assert.equal(first.status, 200); assert.doesNotMatch(first.text, /sk-personal/);
  for (const entry of f.store.values.values()) assert.ok(!entry.value.includes(personalKey));
  assert.equal((await f.request('/api/lesson-help', { cookie: first.cookie, body: lesson })).status, 200);
  assert.equal(f.calls[0].options.headers.Authorization, `Bearer ${personalKey}`);
  const second = await login();
  assert.equal((await f.request('/api/lesson-help', { cookie: second.cookie, body: lesson })).status, 429);
  assert.equal(f.calls.length, 1);
  assert.equal((await f.request('/api/access', { cookie: second.cookie, method: 'DELETE', requestOrigin: null })).status, 403);
  const logout = await f.request('/api/access', { cookie: second.cookie, method: 'DELETE' });
  assert.equal(logout.status, 200); assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
  assert.equal((await f.request('/api/lesson-help', { cookie: second.cookie, body: lesson })).status, 401);
});

test('storage failure and unavailable voice scheduling fail closed', async t => {
  const f = await fixture(t), { cookie } = await f.connect();
  assert.equal((await f.request('/api/voice', { cookie, body: offer })).status, 503);
  assert.equal(f.calls.length, 0);
  f.store.reserve = async () => { throw Error('secret store failure'); };
  const failed = await f.request('/api/lesson-help', { cookie, body: lesson });
  assert.equal(failed.status, 503); assert.doesNotMatch(failed.text, /secret store failure/);
  assert.equal(f.calls.length, 0);
});

test('Redis malformed successful responses cannot silently disable quotas', async () => {
  for (const result of [null, undefined, '0', -1, 2]) {
    const store = new RedisStore({ url: 'https://redis.example', token: 'secret', fetchImpl: async () => Response.json({ result }) });
    await assert.rejects(store.reserve([{ key: 'cap', limit: 1, ttl: 60 }]));
  }
});

test('personal keys cannot be submitted to an insecure public origin', async t => {
  const f = await fixture(t);
  await assert.rejects(f.access.connect({ headers: {}, socket: { remoteAddress: '192.0.2.1' } }, {}, 'http://game.example', { type: 'byok', key: personalKey }, 'shared'), /HTTPS/);
});

test('voice cutoff is queued without an API key, authenticated, and retried on failed hangup', async t => {
  const f = await fixture(t);
  const queued = [], hangs = [];
  let failHang = false;
  const control = createVoiceControl({ access: f.access, now: f.now, env: { QSTASH_TOKEN: 'queue-secret', WORKSHOP_VOICE_CALLBACK_URL: origin + '/api/voice-expire' },
    fetchImpl: async (url, options) => {
      if (url.includes('/hangup')) { hangs.push(options); return new Response('', { status: failHang ? 503 : 200 }); }
      queued.push({ url, options }); return Response.json({ messageId: 'queued' });
    } });
  const session = { kind: 'byok', principal: 'person', apiKey: personalKey, expires: f.now() + 86400000 };
  const limit = await control.arm(session, 'live_test');
  assert.equal(limit.maxSeconds, 120);
  assert.ok(!JSON.stringify(queued).includes(personalKey));
  assert.equal(queued[0].options.headers['Upstash-Delay'], '120s');
  const auth = queued[0].options.headers['Upstash-Forward-Authorization'];
  await assert.rejects(control.expire('Bearer ' + limit.id));
  await assert.rejects(control.close(limit.id, 'different-person'));
  await assert.rejects(control.expire(auth));
  assert.equal(hangs.length, 0);
  f.advance(120001); failHang = true;
  await assert.rejects(control.expire(auth));
  assert.ok(f.store.get(`call:${limit.id}`));
  failHang = false; await control.expire(auth);
  assert.equal(hangs.at(-1).headers.Authorization, `Bearer ${personalKey}`);
  assert.equal(f.store.get(`call:${limit.id}`), null);
  await control.expire(auth); // Queue retries after a lost success response are safe.
});

test('failed queue publication hangs up voice before any SDP can be returned', async t => {
  const f = await fixture(t), urls = [];
  const control = createVoiceControl({ access: f.access, env: { QSTASH_TOKEN: 'queue-secret', WORKSHOP_VOICE_CALLBACK_URL: origin + '/api/voice-expire' },
    fetchImpl: async url => { urls.push(url); return new Response('{}', { status: url.includes('/hangup') ? 200 : 503 }); } });
  await assert.rejects(control.arm({ kind: 'invite', principal: 'a', apiKey: personalKey, expires: Date.now() + 86400000 }, 'live_test'));
  assert.ok(urls.at(-1).endsWith('/live_test/hangup'));
});

test('hosted voice enforces invite and total caps and cannot be reconfigured by the browser', async t => {
  const f = await fixture(t, { voice: 1, totalVoice: 2 }, true);
  const a = (await f.connect()).cookie, b = (await f.connect()).cookie, c = (await f.connect()).cookie;
  const first = await f.request('/api/voice', { cookie: a, body: { ...offer, session: { model: 'expensive', maxSeconds: 99999 } } });
  assert.equal(first.status, 201); assert.equal(first.body.limit.maxSeconds, 120);
  assert.doesNotMatch(first.text, /shared-secret|test-queue-secret|live_test/);
  const setup = f.calls.find(call => call.url.endsWith('/live/sessions'));
  const payload = JSON.parse(setup.options.body);
  assert.equal(payload.session.model, 'gpt-live-1');
  assert.deepEqual(payload.session.client.data_channel.allowed_client_events, ['session.close']);
  assert.equal(payload.session.delegation.responses.max_output_tokens, 1800);
  assert.equal((await f.request('/api/voice', { cookie: a, body: offer })).status, 429);
  assert.equal((await f.request('/api/voice', { cookie: b, body: offer })).status, 201);
  assert.equal((await f.request('/api/voice', { cookie: c, body: offer })).status, 429);
  assert.equal(f.calls.filter(call => call.url.endsWith('/live/sessions')).length, 2);
  assert.equal((await f.request('/api/voice-stop', { cookie: b, body: { id: first.body.limit.id } })).status, 403);
  assert.equal((await f.request('/api/voice-stop', { cookie: a, body: { id: first.body.limit.id } })).status, 200);
});

test('voice start window limits simultaneous calls even with allowance remaining', async t => {
  const f = await fixture(t, {}, true), { cookie } = await f.connect();
  assert.equal((await f.request('/api/voice', { cookie, body: offer })).status, 201);
  assert.equal((await f.request('/api/voice', { cookie, body: offer })).status, 429);
  f.advance(150001);
  assert.equal((await f.request('/api/voice', { cookie, body: offer })).status, 201);
});
