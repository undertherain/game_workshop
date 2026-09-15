import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { RedisStore, MemoryStore } from './access-store.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export class AccessError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function number(env, name, fallback, maximum) {
  const value = Number(env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw Error(`Invalid ${name}.`);
  return value;
}
export function accessConfig(env = process.env) {
  const secret = env.WORKSHOP_SESSION_SECRET || '';
  if (secret && !/^[a-f0-9]{64}$/i.test(secret)) throw Error('WORKSHOP_SESSION_SECRET must be 32 random bytes encoded as 64 hex characters.');
  const expires = Date.parse(env.WORKSHOP_DEMO_EXPIRES_AT || '');
  if (env.WORKSHOP_DEMO_EXPIRES_AT && !Number.isFinite(expires)) throw Error('Invalid WORKSHOP_DEMO_EXPIRES_AT.');
  return {
    secret, expires: Number.isFinite(expires) ? expires : 0,
    enabled: env.WORKSHOP_DEMO_ENABLED !== '0',
    chat: number(env, 'WORKSHOP_INVITE_CHATS', 50, 500),
    voice: number(env, 'WORKSHOP_INVITE_VOICE_CALLS', 3, 30),
    totalChat: number(env, 'WORKSHOP_DEMO_TOTAL_CHATS', 500, 5000),
    totalVoice: number(env, 'WORKSHOP_DEMO_TOTAL_VOICE_CALLS', 30, 100),
    voiceSeconds: number(env, 'WORKSHOP_VOICE_SECONDS', 120, 300),
    byokChat: number(env, 'WORKSHOP_BYOK_DAILY_CHATS', 200, 1000),
    byokVoice: number(env, 'WORKSHOP_BYOK_DAILY_VOICE_CALLS', 10, 50),
  };
}
export function configuredStore(env = process.env) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new RedisStore({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN,
    prefix: env.WORKSHOP_REDIS_PREFIX || 'little-makers:' });
}
export function createAccess({ env = process.env, store = configuredStore(env), config = accessConfig(env), now = Date.now, localAi = false } = {}) {
  const localStore = new MemoryStore(now);
  const localExpires = now() + 86400000;
  const key = config.secret ? Buffer.from(config.secret, 'hex') : null;
  const ready = Boolean(store && key);
  function encrypt(value) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString('base64url');
  }
  function decrypt(value) {
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(-16));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString());
  }
  function cookieName(origin) { return origin.startsWith('https:') ? '__Host-lm-session' : 'lm-session'; }
  function sessionId(req, origin) {
    const name = cookieName(origin);
    const values = (req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='));
    if (values.length !== 1) return null;
    const value = values[0].slice(name.length + 1);
    return /^[\w-]{43}$/.test(value) ? digest(value) : null;
  }
  function cookie(res, origin, value, ttl) {
    res.setHeader('Set-Cookie', `${cookieName(origin)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${origin.startsWith('https:') ? '; Secure' : ''}`);
  }
  function localRequest(req, origin) {
    return localAi && env.VERCEL !== '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  }
  async function resolve(req, origin, serverKey) {
    const id = sessionId(req, origin);
    if (id) {
      if (!ready) throw new AccessError(503, 'AI access is not configured. The built-in guide is still available.');
      const raw = await store.get(`session:${id}`);
      if (!raw) throw new AccessError(401, 'Your AI session expired. Enter your key or use a new invite.');
      let session;
      try { session = decrypt(raw); } catch { throw new AccessError(401, 'Your AI session expired. Please reconnect.'); }
      if (session.origin !== origin || session.expires <= now()) throw new AccessError(401, 'Your AI session expired. Please reconnect.');
      if (session.kind === 'byok') return { ...session, id, store };
      if (!config.enabled || config.expires <= now() || !serverKey || !await store.get(`invite:${session.principal}`)) {
        throw new AccessError(403, 'Demo AI access has ended. You can enter your own key or use the built-in guide.');
      }
      return { ...session, id, apiKey: serverKey, store };
    }
    if (localRequest(req, origin) && serverKey && localExpires > now()) return {
      kind: 'local', principal: 'local', apiKey: serverKey, expires: localExpires, chat: config.chat, voice: config.voice, store: localStore,
    };
    return null;
  }
  async function status(req, origin, serverKey, voiceAvailable) {
    let session, error;
    try { session = await resolve(req, origin, serverKey); } catch (e) { error = e instanceof AccessError ? e.message : 'AI access is temporarily unavailable.'; }
    const result = { mode: session ? 'ai' : 'examples', access: session?.kind || 'none', canDisconnect: Boolean(sessionId(req, origin)), byokAvailable: ready, voiceAvailable: Boolean(session && voiceAvailable), ...(error ? { error } : {}) };
    if (session) {
      const usage = quotaEntries(session, 'chat')[0], voiceUsage = quotaEntries(session, 'voice')[0];
      try {
        result.remaining = { chats: Math.max(0, usage.limit - Number(await session.store.get(usage.key) || 0)),
          voiceCalls: Math.max(0, voiceUsage.limit - Number(await session.store.get(voiceUsage.key) || 0)) };
        result.expiresAt = new Date(session.expires).toISOString(); result.voiceSeconds = config.voiceSeconds;
      } catch { return { ...result, mode: 'examples', error: 'AI access is temporarily unavailable.' }; }
    }
    return result;
  }
  function quotaEntries(session, kind) {
    const personal = session.kind === 'byok', day = Math.floor(now() / 86400000), minute = Math.floor(now() / 60000);
    const principal = personal ? `byok:${session.principal}:${day}` : `invite:${session.principal}`;
    const ttl = personal ? 172800 : 315360000;
    const limit = personal ? (kind === 'chat' ? config.byokChat : config.byokVoice) : Math.min(session[kind], config[kind]);
    return [
      { key: `usage:${principal}:${kind}`, limit, ttl },
      ...(!personal ? [{ key: `usage:demo:total:${kind}`, limit: kind === 'chat' ? config.totalChat : config.totalVoice, ttl: 315360000 }] : []),
      { key: `rate:${session.principal}:${minute}`, limit: 6, ttl: 120 },
      { key: `rate:${personal ? 'byok' : 'demo'}:${minute}`, limit: 30, ttl: 120 },
      ...(kind === 'voice' ? [{ key: `voice-window:${session.principal}`, limit: 1, ttl: config.voiceSeconds + 30 }] : []),
    ];
  }
  async function reserve(session, kind) {
    if (kind === 'voice' && !config.voiceSeconds) throw new AccessError(403, 'Voice is disabled. You can still type to Pip.');
    const denied = await session.store.reserve(quotaEntries(session, kind));
    if (denied) throw new AccessError(429, denied === 1 ? 'Your AI allowance is used up. You can still use the built-in guide.' :
      denied === 2 && session.kind !== 'byok' ? 'The demo AI allowance is used up. You can enter your own key or use the built-in guide.' : 'AI request limit reached. Please wait a little before trying again.');
  }
  async function connect(req, res, origin, input, serverKey) {
    if (!origin.startsWith('https:') && !(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) &&
      ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress))) {
      throw new AccessError(403, 'AI connections require HTTPS.');
    }
    if (!ready) throw new AccessError(503, 'AI access is not configured. The built-in guide is still available.');
    if (await store.reserve([{ key: `connect:${Math.floor(now() / 60000)}`, limit: 30, ttl: 120 }])) throw new AccessError(429, 'Too many connection attempts. Please try again in a minute.');
    const value = token(), id = digest(value);
    let session;
    if (input.type === 'invite') {
      if (!config.enabled || config.expires <= now() || !serverKey) throw new AccessError(403, 'Demo AI access has ended or is unavailable.');
      if (typeof input.token !== 'string' || !/^[\w-]{43}$/.test(input.token)) throw new AccessError(400, 'This invite is invalid or expired.');
      const principal = digest(input.token), raw = await store.get(`invite:${principal}`);
      if (!raw) throw new AccessError(403, 'This invite is invalid or expired.');
      const invite = JSON.parse(raw), expires = Math.min(invite.expires, config.expires);
      if (expires <= now()) throw new AccessError(403, 'This invite is invalid or expired.');
      session = { kind: 'invite', principal, origin, expires, chat: invite.chat, voice: invite.voice };
      const ttl = Math.max(1, Math.ceil((expires - now()) / 1000));
      if (!await store.redeem(principal, id, encrypt(session), ttl)) throw new AccessError(403, 'This invite is invalid or expired.');
    } else if (input.type === 'byok') {
      if (typeof input.key !== 'string' || !/^sk-[A-Za-z0-9_-]{16,500}$/.test(input.key)) throw new AccessError(400, 'Enter a valid OpenAI API key.');
      session = { kind: 'byok', principal: createHmac('sha256', key).update(input.key).digest('hex'), origin,
        expires: now() + 8 * 3600000, apiKey: input.key };
      await store.set(`session:${id}`, encrypt(session), 8 * 3600);
    } else throw new AccessError(400, 'Choose an invite or your own key.');
    const oldId = sessionId(req, origin);
    if (oldId) await store.delete(`session:${oldId}`);
    cookie(res, origin, value, Math.max(1, Math.floor((session.expires - now()) / 1000)));
    return { ok: true, access: session.kind };
  }
  async function disconnect(req, res, origin) {
    const id = sessionId(req, origin);
    if (id && store) await store.delete(`session:${id}`);
    cookie(res, origin, '', 0);
    return { ok: true };
  }
  return { config, ready, store, encrypt, decrypt, resolve, status, reserve, connect, disconnect };
}
