import { loadPyodide } from '/vendor/pyodide/pyodide.mjs';
let python;
try {
  python = await loadPyodide({ indexURL: '/vendor/pyodide/' });
  const response = await fetch('/lesson_runtime.py');
  if (!response.ok) throw Error('Could not load the lesson.');
  python.runPython(await response.text());
  postMessage({ type: 'ready' });
} catch {
  postMessage({ type: 'error', error: 'Python could not start. Press Run to retry.' });
}
onmessage = ({ data }) => {
  try {
    python.globals.set('_lesson_source', data.code || '');
    python.globals.set('_lesson_mode', data.mode || 'commands');
    python.globals.set('_lesson_keys', JSON.stringify(data.keys || {}));
    const expression = data.type === 'step' ? 'step_lesson(_lesson_keys)' : 'run_lesson(_lesson_source, _lesson_mode)';
    postMessage({ type: data.type === 'step' ? 'step' : 'result', ...JSON.parse(python.runPython(expression)) });
  } catch {
    postMessage({ type: 'error', error: 'Something interrupted Python. Press Run to retry.' });
  }
};
