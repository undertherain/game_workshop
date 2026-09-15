import { lessonInstructions, validateLessonInput, lessonExample } from './lesson-tutor.mjs';
import { voiceSession } from './voice-tutor.mjs';
import { exportGame, validateExport, frameworkFiles } from './export-game.mjs';
import { serverConfig } from './server-config.mjs';
import http from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instructions, arcadeInstructions, schema, validateInput, validateReply, guidedExample } from './tutor.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
// Match load_dotenv's upward discovery. Never send environment contents to the browser.
if (process.env.VERCEL !== '1' && process.env.WORKSHOP_LOAD_DOTENV !== '0') {
  let dir = root;
  while (true) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) { process.loadEnvFile(candidate); break; }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.py': 'text/plain', '.wasm': 'application/wasm', '.zip': 'application/zip' };
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function createServer({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-5.4-mini', fetchImpl = fetch, config = serverConfig() } = {}) {
  let busy = false;
  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || '';
      const origin = config.requestOrigin(host);
      if (!origin) return json(res, 403, { error: 'This workshop address is not enabled.' });
      const url = new URL(req.url, origin);
      if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, { mode: apiKey ? 'ai' : 'examples' });
      if (url.pathname === '/api/export' && req.method === 'POST') {
        if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Please use the workshop tab.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Expected JSON.' });
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 150000) return json(res, 413, { error: 'That game is too large.' }); chunks.push(chunk); }
        let input;
        try { input = validateExport(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { return json(res, 400, { error: error.message }); }
        const archive = await exportGame(input);
        res.writeHead(200, { 'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="little-makers-${input.template}.zip"`, 'Cache-Control': 'no-store' });
        // Stream the ZIP so it can exceed Vercel's buffered response limit.
        await pipeline(Readable.from((function* () {
          for (let offset = 0; offset < archive.length; offset += 64 * 1024) yield archive.subarray(offset, offset + 64 * 1024);
        })()), res);
        return;
      }
      if (url.pathname === '/api/voice' && req.method === 'POST') {
        if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Please use the workshop tab.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Expected JSON.' });
        let raw = ''; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 100000) return json(res, 413, { error: 'Voice context is too large.' }); raw += chunk; }
        let payload;
        try { payload = voiceSession(JSON.parse(raw), model); } catch (error) { return json(res, 400, { error: error.message }); }
        if (!apiKey) return json(res, 503, { error: 'Voice needs OPENAI_API_KEY on the server. You can still use the built-in guide.' });
        if (res.destroyed) return;
        if (busy) return json(res, 429, { error: 'Pip is connecting or answering another question. Try again in a moment.' });
        busy = true;
        const connection = new AbortController();
        const cancelConnection = () => { if (!res.writableEnded) connection.abort(); };
        res.once('close', cancelConnection);
        const connectionTimer = setTimeout(() => connection.abort(), 30000);
        try {
          const response = await fetchImpl('https://api.openai.com/v1/live/sessions', {
            method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            signal: connection.signal, body: JSON.stringify(payload),
          });
          if (!response.ok) return json(res, 502, { error: `Voice connection returned ${response.status}. Check GPT-Live access and try again.` });
          const result = await response.json();
          if (typeof result.transport?.sdp !== 'string' || !result.transport.sdp) throw Error('Missing answer');
          return json(res, 201, { transport: { type: 'webrtc', sdp: result.transport.sdp } });
        } catch {
          if (!res.destroyed) json(res, 502, { error: 'Voice could not connect. Please try again.' });
          return;
        }
        finally { clearTimeout(connectionTimer); res.removeListener('close', cancelConnection); busy = false; }
      }
      if (['/api/help', '/api/lesson-help'].includes(url.pathname) && req.method === 'POST') {
        const isLesson = url.pathname === '/api/lesson-help';
        if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Please use the workshop tab.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Expected JSON.' });
        let raw = ''; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 60000) return json(res, 413, { error: 'That question is too large.' }); raw += chunk; }
        let input;
        try { input = (isLesson ? validateLessonInput : validateInput)(JSON.parse(raw)); } catch (e) { return json(res, 400, { error: e.message }); }
        if (!apiKey) return json(res, 200, { mode: 'examples', ...(isLesson ? lessonExample(input) : guidedExample(input)) });
        if (busy) return json(res, 429, { error: 'The helper is answering another question. Try again in a moment.' });
        busy = true;
        try {
          const response = await fetchImpl('https://api.openai.com/v1/responses', {
            method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({ model, instructions: isLesson ? lessonInstructions : instructions + '\n' + arcadeInstructions[input.template], input: JSON.stringify(input), store: false,
              max_output_tokens: 1800, text: { format: { type: 'json_schema', name: 'game_tutor', strict: true, schema } } }),
          });
          if (!response.ok) {
            await response.text();
            return json(res, 502, { error: `The AI connection returned ${response.status}. Your game and code are still here. Try again shortly.` });
          }
          const output = await response.json();
          const content = output.output?.flatMap(item => item.content || []) || [];
          const refusal = content.find(item => item.type === 'refusal');
          if (refusal) return json(res, 200, { mode: 'ai', message: refusal.refusal, line: null, before: null, after: null, experiment: '' });
          const text = content.filter(item => item.type === 'output_text').map(item => item.text).join('');
          const reply = validateReply(JSON.parse(text), input.code);
          if (isLesson) reply.line = null;
          if (isLesson || input.mode === 'hint' || input.mode === 'explain') { reply.before = null; reply.after = null; }
          return json(res, 200, { mode: 'ai', ...reply });
        } catch (error) {
          return json(res, 502, { error: error.name === 'TimeoutError' ? 'The helper took too long. Try asking again.' : 'The helper could not answer just now. Your code is safe; please try again.' });
        } finally { busy = false; }
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
      const pathname = decodeURIComponent(url.pathname);
      const vendor = pathname.startsWith('/vendor/pyodide/');
      const framework = pathname.startsWith('/framework/');
      if (framework && !frameworkFiles.includes(pathname.slice('/framework/'.length))) return json(res, 404, { error: 'Not found.' });
      const base = path.join(root, vendor ? 'node_modules/pyodide' : framework ? 'framework' : 'public');
      const relative = vendor ? pathname.slice('/vendor/pyodide/'.length) : framework ? pathname.slice('/framework/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      const target = path.resolve(base, relative);
      if (!target.startsWith(base + path.sep) || relative.split('/').some(s => s.startsWith('.'))) return json(res, 404, { error: 'Not found.' });
      const info = await stat(target);
      if (!info.isFile()) return json(res, 404, { error: 'Not found.' });
      const body = await readFile(target);
      res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
        'Content-Length': body.length, 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': vendor ? 'public, max-age=86400' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      json(res, error.code === 'ENOENT' ? 404 : 500, { error: 'Could not load that resource.' });
    }
  });
}

// Vercel invokes this raw Node request handler. Importing it never opens a port.
export default createServer().listeners('request')[0];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = serverConfig();
  createServer({ config }).listen(config.port, config.bindHost, () => console.log(`Little Makers listening on ${config.bindHost}:${config.port} · helper: ${process.env.OPENAI_API_KEY ? 'AI connected' : 'built-in examples'}`));
}
