import { loadPyodide } from './vendor/pyodide/pyodide.mjs';

let python;
try {
  python = await loadPyodide({ indexURL: new URL('./vendor/pyodide/', import.meta.url).href, stdout: () => {}, stderr: () => {} });
  // Install the same package used by ordinary Python and bundled in exports.
  const manifest = await fetch(new URL('./framework-files.json', import.meta.url));
  if (!manifest.ok) throw new Error('Could not load the game framework.');
  python.FS.mkdirTree('/home/pyodide/framework');
  await Promise.all((await manifest.json()).map(async name => {
    const response = await fetch(new URL('./framework/' + name, import.meta.url));
    if (!response.ok) throw new Error('Could not load the game framework.');
    python.FS.writeFile('/home/pyodide/framework/' + name, await response.text());
  }));
  python.runPython(`
import json
from framework import WorkshopGame
from framework.workshop import _error
from framework.workshop_checks import check_exercise
_session = None

def _request(kind, source, keys):
    global _session
    try:
        if source is not None:
            _session = None
            _session = WorkshopGame(source, kind)
            state = _session.snapshot()
        else:
            state = _session.step(json.loads(keys))
        return json.dumps({'state': state})
    except Exception as exc:
        return json.dumps({'error': _error(exc)})
`);
  postMessage({ type: 'ready' });
} catch (error) {
  python = null;
  postMessage({ type: 'boot-error', message: error.message });
}

onmessage = ({ data }) => {
  if (!python) return;
  try {
    python.globals.set('_request_source', data.code ?? null);
    python.globals.set('_request_keys', JSON.stringify(data.keys || {}));
    python.globals.set('_request_kind', data.template || 'platformer');
    if (data.type === 'check') {
      python.globals.set('_request_step', data.step);
      const result = python.runPython('check_exercise(_request_source, _request_kind, _request_step)');
      postMessage({ id: data.id, type: 'check', check: JSON.parse(result) });
      return;
    }
    if (!['load', 'step'].includes(data.type)) throw new Error('Unknown game request.');
    const result = python.runPython('_request(_request_kind, _request_source, _request_keys)');
    postMessage({ id: data.id, type: data.type, ...JSON.parse(result) });
  } catch (error) {
    postMessage({ id: data.id, type: data.type, error: { type: 'PythonError', message: error.message.slice(-800), line: null } });
  }
};
