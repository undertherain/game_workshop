import { AccessError, digest, token } from './ai-access.mjs';

export function createVoiceControl({ access, env = process.env, fetchImpl = fetch, now = Date.now, scheduleLocal = setTimeout } = {}) {
  const queueUrl = env.QSTASH_URL || 'https://qstash.upstash.io';
  const callback = env.WORKSHOP_VOICE_CALLBACK_URL || '';
  const hostedReady = Boolean(access.ready && env.QSTASH_TOKEN && /^https:\/\//.test(callback));
  if (callback) {
    const url = new URL(callback);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/api/voice-expire' || url.search || url.hash) throw Error('WORKSHOP_VOICE_CALLBACK_URL must be the HTTPS /api/voice-expire endpoint.');
  }
  if (new URL(queueUrl).protocol !== 'https:') throw Error('QSTASH_URL requires HTTPS.');
  async function hangup(id, apiKey) {
    const response = await fetchImpl(`https://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/hangup`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok && ![404, 410].includes(response.status)) throw new AccessError(503, 'Voice could not be ended yet. Please try again.');
  }
  const available = session => session?.kind === 'local' || session?.local === true || hostedReady;
  async function arm(session, liveId) {
    if (typeof liveId !== 'string' || !liveId || liveId.length > 200) throw new AccessError(502, 'Voice returned an invalid session.');
    const seconds = Math.max(1, Math.min(access.config.voiceSeconds, Math.floor((session.expires - now()) / 1000)));
    if (session.kind === 'local' || session.local === true) {
      const timer = scheduleLocal(() => hangup(liveId, session.apiKey).catch(() => {}), seconds * 1000);
      timer.unref?.();
      return { maxSeconds: seconds };
    }
    if (!hostedReady) throw new AccessError(503, 'Limited voice access is not configured. You can still type to Pip.');
    const secret = token(), id = digest(secret);
    const call = { liveId, apiKey: session.apiKey, principal: session.principal, deadline: now() + seconds * 1000 };
    try {
      await access.store.set(`call:${id}`, access.encrypt(call), 86400);
      await access.store.set(`active-call:${session.principal}`, id, 86400);
      const response = await fetchImpl(`${queueUrl.replace(/\/$/, '')}/v2/publish/${callback}`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.QSTASH_TOKEN}`, 'Content-Type': 'application/json',
          'Upstash-Forward-Authorization': `Bearer ${secret}`, 'Upstash-Delay': `${seconds}s`, 'Upstash-Retries': '8',
          'Upstash-Retry-Delay': '1000 * (1 + retried)', 'Upstash-Redact-Fields': 'headers', },
        body: '{}', signal: AbortSignal.timeout(5000), redirect: 'error',
      });
      const result = await response.json();
      if (!response.ok || !result.messageId) throw Error();
      return { id, maxSeconds: seconds };
    } catch {
      // Never deliver SDP without a confirmed durable cutoff. Retain the record
      // if hangup fails so the scheduled callback, if accepted, can still retry.
      await hangup(liveId, session.apiKey);
      await access.store.delete(`call:${id}`);
      throw new AccessError(503, 'Voice limits could not be scheduled. You can still type to Pip.');
    }
  }
  async function close(id, principal, dueOnly = false) {
    if (!access.ready) throw new AccessError(503, 'Voice access storage is unavailable.');
    const raw = await access.store.get(`call:${id}`);
    if (!raw) return;
    const call = access.decrypt(raw);
    if (principal && call.principal !== principal) throw new AccessError(403, 'This voice call belongs to another session.');
    if (dueOnly && call.deadline > now()) throw new AccessError(503, 'The voice cutoff is not due yet.');
    await hangup(call.liveId, call.apiKey);
    await access.store.delete(`call:${id}`);
  }
  async function expire(authorization = '') {
    const secret = authorization.replace(/^Bearer /, '');
    if (!/^[\w-]{43}$/.test(secret)) throw new AccessError(403, 'Invalid voice callback.');
    await close(digest(secret), null, true);
  }
  async function stopActive(session) {
    if (!session || session.kind === 'local' || session.local === true) return;
    const id = await access.store.get(`active-call:${session.principal}`);
    if (id) await close(id, session.principal);
  }
  return { hostedReady, available, arm, expire, close, stopActive, hangup };
}
