import { loadPyodide } from '/vendor/pyodide/pyodide.mjs';

let python;
async function read(url, json = false) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return json ? response.json() : response.text();
}
try {
  python = await loadPyodide({ indexURL: '/vendor/pyodide/', stdout: () => {}, stderr: () => {} });
  python.FS.mkdirTree('/home/pyodide/framework');
  const names = await read('/framework-files.json', true);
  await Promise.all(names.map(async name => {
    python.FS.writeFile('/home/pyodide/framework/' + name, await read('/framework/' + name));
  }));
  const [bare, full] = await Promise.all([read('./barebones.py'), read('/content/games/invaders.json', true)]);
  python.globals.set('_bare_source', bare);
  python.globals.set('_full_source', full.complete.join('\n'));
  python.runPython(`
import json
from dataclasses import asdict
from framework import WorkshopGame

_namespace = {'__name__': 'presentation_game'}
exec(compile(_bare_source, 'alien_invaders.py', 'exec'), _namespace)
_games = {}

def _request(mode, reset, inputs):
    if reset or mode not in _games:
        _games[mode] = (_namespace['Invaders']() if mode == 'barebones'
                        else WorkshopGame(_full_source, 'invaders'))
        reset = True
    game = _games[mode]
    keys = json.loads(inputs)
    if mode == 'barebones':
        state = game.step({key for key, down in keys.items() if down}, 0 if reset else 1 / 30)
        state['sprites'] = {name: asdict(sprite) for name, sprite in game.asset_definitions.items()}
        state['remaining'] = sum(alien.alive for alien in game.aliens)
        state['won'] = state['remaining'] == 0
    else:
        state = game.snapshot() if reset else game.step({
            'left': keys.get('left', False), 'right': keys.get('right', False),
            'jump': keys.get('fire', False)})
    return json.dumps(state)
`);
  postMessage({ type: 'ready', source: bare });
} catch (error) {
  postMessage({ type: 'error', message: error.message });
}

onmessage = ({ data }) => {
  try {
    python.globals.set('_mode', data.mode);
    python.globals.set('_reset', data.type === 'reset');
    python.globals.set('_keys', JSON.stringify(data.keys || {}));
    const state = JSON.parse(python.runPython('_request(_mode, _reset, _keys)'));
    postMessage({ type: 'state', mode: data.mode, state });
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  }
};
