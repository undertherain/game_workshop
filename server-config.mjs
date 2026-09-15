// Public origins are explicit. Forwarded headers never grant access to a host.
export function serverConfig(env = process.env) {
  const onVercel = env.VERCEL === '1';
  const publicOrigins = (env.WORKSHOP_PUBLIC_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (onVercel) {
    for (const name of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
      if (env[name]) publicOrigins.push(`https://${env[name]}`);
    }
  }
  const origins = new Map();
  for (const value of publicOrigins) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new Error('WORKSHOP_PUBLIC_ORIGINS must contain comma-separated HTTP(S) origins without paths.');
    }
    if (origins.has(url.host) && origins.get(url.host) !== url.origin) {
      throw new Error('Each public host must use a single configured origin.');
    }
    origins.set(url.host, url.origin);
  }
  const port = Number(env.PORT || env.WORKSHOP_PORT || 4179);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid server port.');
  return {
    port,
    bindHost: env.WORKSHOP_BIND_HOST || (onVercel ? '0.0.0.0' : '127.0.0.1'),
    requestOrigin(host = '') {
      if (typeof host !== 'string') return null;
      const normalized = host.toLowerCase();
      if (origins.has(normalized)) return origins.get(normalized);
      if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return `http://${normalized}`;
      return null;
    },
  };
}
