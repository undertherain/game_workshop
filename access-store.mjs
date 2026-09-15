// Shared Redis state. All check-and-increment operations happen in one Lua call.
export const RESERVE = `
for i, key in ipairs(KEYS) do
  if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[(i-1)*2+1]) then return i end
end
for i, key in ipairs(KEYS) do
  redis.call('INCR', key)
  redis.call('EXPIRE', key, ARGV[(i-1)*2+2], 'NX')
end
return 0`;
export const REDEEM = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
return 1`;

export class RedisStore {
  constructor({ url, token, prefix = 'little-makers:', fetchImpl = fetch }) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw Error('Redis requires an HTTPS REST URL.');
    this.url = parsed.href; this.token = token; this.prefix = prefix; this.fetch = fetchImpl;
  }
  async command(args) {
    try {
      const response = await this.fetch(this.url, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args), signal: AbortSignal.timeout(5000), redirect: 'error' });
      const body = await response.json();
      if (!response.ok || body.error) throw Error();
      return body.result;
    } catch { throw Error('AI access storage is unavailable. Please try again later.'); }
  }
  key(key) { return this.prefix + key; }
  get(key) { return this.command(['GET', this.key(key)]); }
  set(key, value, ttl) { return this.command(['SET', this.key(key), value, 'EX', ttl]); }
  delete(key) { return this.command(['DEL', this.key(key)]); }
  async reserve(entries) {
    const result = await this.command(['EVAL', RESERVE, entries.length, ...entries.map(e => this.key(e.key)), ...entries.flatMap(e => [e.limit, e.ttl])]);
    if (!Number.isInteger(result) || result < 0 || result > entries.length) throw Error('AI usage limits are unavailable.');
    return result;
  }
  async redeem(invite, session, value, ttl) {
    const result = await this.command(['EVAL', REDEEM, 2, this.key(`invite:${invite}`), this.key(`session:${session}`), value, ttl]);
    if (![0, 1].includes(result)) throw Error('AI access storage is unavailable.');
    return result;
  }
}

// Explicit local development and deterministic tests only; never a hosted fallback.
export class MemoryStore {
  constructor(now = Date.now) { this.now = now; this.values = new Map(); }
  get(key) {
    const entry = this.values.get(key);
    if (!entry || entry.expires <= this.now()) { this.values.delete(key); return null; }
    return entry.value;
  }
  set(key, value, ttl) { this.values.set(key, { value, expires: this.now() + ttl * 1000 }); return 'OK'; }
  delete(key) { return Number(this.values.delete(key)); }
  reserve(entries) {
    const denied = entries.findIndex(e => Number(this.get(e.key) || 0) >= e.limit);
    if (denied >= 0) return denied + 1;
    for (const e of entries) {
      const old = this.get(e.key);
      if (old === null) this.set(e.key, '1', e.ttl);
      else this.values.get(e.key).value = String(Number(old) + 1);
    }
    return 0;
  }
  redeem(invite, session, value, ttl) {
    if (!this.get(`invite:${invite}`)) return 0;
    this.set(`session:${session}`, value, ttl); return 1;
  }
}
