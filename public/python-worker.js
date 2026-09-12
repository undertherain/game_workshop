import { loadPyodide } from '/vendor/pyodide/pyodide.mjs';

let python;
try {
  python = await loadPyodide({ indexURL: '/vendor/pyodide/', stdout: () => {}, stderr: () => {} });
  const response = await fetch('/runtime.py');
  if (!response.ok) throw new Error('Could not load the game runtime.');
  const baseSource = await response.text();
  python.runPython(baseSource);
  const arcade = await fetch('/arcade_runtime.py');
  if (!arcade.ok) throw new Error('Could not load the arcade templates.');
  const arcadeSource = await arcade.text();
  python.runPython(arcadeSource);
  python.globals.set('_base_runtime_source', baseSource);
  python.globals.set('_arcade_runtime_source', arcadeSource);
  postMessage({ type: 'ready' });
} catch (error) {
  postMessage({ type: 'boot-error', message: error.message });
}

onmessage = ({ data }) => {
  if (!python) return;
  try {
    python.globals.set('_request_text', data.type !== 'step' ? data.code : JSON.stringify(data.keys));
    python.globals.set('_request_kind', data.template || 'platformer');
    if (data.type === 'check') {
      python.globals.set('_request_step', data.step);
      const result = python.runPython(`
_check_namespace = {}
exec(_base_runtime_source, _check_namespace)
exec(_arcade_runtime_source, _check_namespace)
_check_namespace['_check_exercise'](_request_text, _request_kind, _request_step)
`);
      postMessage({ id: data.id, type: 'check', check: JSON.parse(result) });
      return;
    }
    const result = python.runPython(data.type === 'load' ? '_load_selected(_request_text, _request_kind)' : '_step_selected(_request_text)');
    postMessage({ id: data.id, type: data.type, ...JSON.parse(result) });
  } catch (error) {
    postMessage({ id: data.id, type: data.type, error: { type: 'PythonError', message: error.message.slice(-800), line: null } });
  }
};
