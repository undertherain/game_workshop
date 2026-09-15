// Load the same optional .env as the local server; importing never opens a port.
import '../server.mjs';
import { accessConfig, configuredStore, digest, token } from '../ai-access.mjs';

const [command, argument] = process.argv.slice(2);
try {
  const store = configuredStore(), config = accessConfig();
  if (!store || !config.secret) throw Error('Configure Redis and WORKSHOP_SESSION_SECRET first.');
  if (command === 'invite') {
    const origin = new URL(argument || 'https://game.blackbird.pw');
    if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw Error('Use the demo HTTPS origin without a path.');
    const expires = Math.min(config.expires, Date.now() + 86400000);
    if (!config.enabled || expires <= Date.now()) throw Error('Set WORKSHOP_DEMO_EXPIRES_AT to the demo closing time first.');
    const value = token(), id = digest(value);
    await store.set(`invite:${id}`, JSON.stringify({ expires, chat: config.chat, voice: config.voice }), Math.ceil((expires - Date.now()) / 1000));
    console.log(`Reusable invite (shared allowance): ${origin.origin}/#invite/${value}\nExpires: ${new Date(expires).toISOString()}\nRevoke ID: ${id}`);
  } else if (command === 'revoke') {
    if (!/^[a-f0-9]{64}$/.test(argument || '')) throw Error('Supply the revoke ID printed when the invite was created.');
    await store.delete(`invite:${argument}`);
    console.log('Invite revoked. New AI requests from all its sessions are blocked; active voice calls keep their scheduled cutoff.');
  } else if (command === 'usage') {
    const chats = await store.get('usage:demo:total:chat'), voice = await store.get('usage:demo:total:voice');
    console.log(`Demo requests reserved: ${chats || 0}/${config.totalChat} chats; ${voice || 0}/${config.totalVoice} voice calls.`);
  } else throw Error('Usage: npm run demo-access -- invite [https://demo-host] | revoke ID | usage');
} catch (error) { console.error(error.message); process.exitCode = 1; }
