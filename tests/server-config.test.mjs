import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { serverConfig } from '../server-config.mjs';
import { createServer } from '../server.mjs';

test('local startup stays on loopback; hosted startup uses PORT and explicit public origins', () => {
  const local = serverConfig({});
  assert.equal(local.bindHost, '127.0.0.1');
  assert.equal(local.port, 4179);
  assert.equal(local.requestOrigin('localhost:4179'), 'http://localhost:4179');
  assert.equal(local.requestOrigin('game.blackbird.pw'), null);
  const hosted = serverConfig({ VERCEL: '1', PORT: '3000', WORKSHOP_PORT: '4179',
    VERCEL_URL: 'deployment-undertherain.vercel.app', VERCEL_BRANCH_URL: 'branch-undertherain.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'game-workshop-xi.vercel.app', WORKSHOP_PUBLIC_ORIGINS: 'https://game.blackbird.pw' });
  assert.equal(hosted.bindHost, '0.0.0.0');
  assert.equal(hosted.port, 3000);
  for (const host of ['game.blackbird.pw', 'game-workshop-xi.vercel.app', 'deployment-undertherain.vercel.app', 'branch-undertherain.vercel.app']) {
    assert.equal(hosted.requestOrigin(host), `https://${host}`);
  }
  assert.equal(hosted.requestOrigin('someone-else.vercel.app'), null);
  assert.equal(hosted.requestOrigin('game.blackbird.pw.evil.example'), null);
  assert.equal(hosted.requestOrigin('game.blackbird.pw@evil.example'), null);
  assert.equal(serverConfig({ VERCEL_URL: 'untrusted.vercel.app' }).requestOrigin('untrusted.vercel.app'), null);
  assert.equal(serverConfig({ WORKSHOP_BIND_HOST: '0.0.0.0' }).bindHost, '0.0.0.0');
  for (const value of ['https://example.com/path', 'https://user:pass@example.com', 'https://example.com?x=1', 'https://example.com#x', 'file:///tmp']) {
    assert.throws(() => serverConfig({ WORKSHOP_PUBLIC_ORIGINS: value }));
  }
});

test('public HTTPS hosts support APIs while rejecting foreign origins and spoofed forwarding headers', async t => {
  const config = serverConfig({ WORKSHOP_PUBLIC_ORIGINS: 'https://game.blackbird.pw,https://game-workshop-xi.vercel.app' });
  const server = createServer({ config, apiKey: '' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (pathname, { host = 'game.blackbird.pw', origin, body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: pathname,
      method: body === undefined ? 'GET' : 'POST', headers: { Host: host, ...(origin ? { Origin: origin } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/api/status', { host: 'game-workshop-xi.vercel.app' })).status, 200);
  assert.equal((await request('/api/status', { host: 'evil.example', headers: { 'X-Forwarded-Host': 'game.blackbird.pw', 'X-Forwarded-Proto': 'https' } })).status, 403);
  for (const pathname of ['/.env', '/server-config.mjs', '/framework/raylib_host.py']) assert.equal((await request(pathname)).status, 404);
  const cases = [
    ['/api/help', { template: 'breaker', question: 'How do I move?', code: 'pass' }, 200],
    ['/api/lesson-help', { lessonId: 'command', question: 'How do I jump?', code: 'fox.jump()' }, 200],
    ['/api/voice', { kind: 'lesson', context: { lessonId: 'command', code: 'fox.jump()' }, sdp: 'v=0\r\n' }, 503],
    ['/api/export', { template: 'breaker', code: 'pass' }, 200],
  ];
  for (const [pathname, body, status] of cases) {
    for (const origin of ['https://evil.example', 'http://game.blackbird.pw', 'https://game-workshop-xi.vercel.app', 'null']) {
      assert.equal((await request(pathname, { origin, body, headers: { 'X-Forwarded-Proto': 'https' } })).status, 403, `${pathname}: ${origin}`);
    }
    const response = await request(pathname, { origin: 'https://game.blackbird.pw', body });
    assert.equal(response.status, status, pathname);
    if (pathname === '/api/export') {
      assert.ok(response.body.length > 4.5 * 1024 * 1024);
      assert.equal(response.body.subarray(0, 4).toString('hex'), '504b0304');
      assert.equal(response.headers['transfer-encoding'], 'chunked');
    }
  }
});
