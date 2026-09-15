import { gameKey, gameControls, configureGameControls } from './game-controls.js';
import { createScene } from './scene.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), scene = createScene(canvas);
let project, source, worker, timer, pending = false, ready = false, playing = false, lastStep = 0;
let keys = {}, requestId = 0;
const clearKeys = () => { keys = {}; };
function fail(message) {
  clearTimeout(timer); worker?.terminate(); worker = null;
  playing = ready = pending = false; clearKeys();
  $('status').textContent = message + ' Press Restart to try again.';
}
function send(type) {
  pending = true;
  timer = setTimeout(() => fail('Your Python took too long to respond.'), 2200);
  worker.postMessage({ id: ++requestId, type, template: project.template, ...(type === 'load' ? { code: source } : { keys: { ...keys } }) });
}
function boot() {
  worker?.terminate(); clearTimeout(timer); clearKeys();
  playing = ready = pending = false; $('win').hidden = true;
  $('status').textContent = 'Loading your game…';
  worker = new Worker('./python-worker.js', { type: 'module' });
  const current = worker;
  timer = setTimeout(() => fail('Python could not start.'), 30000);
  current.onerror = event => { if (worker !== current) return; event.preventDefault(); fail('Python could not start.'); };
  current.onmessage = ({ data }) => {
    if (worker !== current) return;
    clearTimeout(timer); pending = false;
    if (data.type === 'boot-error') { fail(data.message); return; }
    if (data.type === 'ready') { ready = true; send('load'); return; }
    if (data.error) { fail(`${data.error.type}${data.error.line ? ' on line ' + data.error.line : ''}: ${data.error.message}`); return; }
    if (data.state) {
      scene.update(data.state);
      $('score').textContent = data.state.kind === 'sokoban' ? `${data.state.collected}/${data.state.items.length} goals · ${data.state.moves} moves` : 'Score: ' + data.state.world.score;
      for(const button of document.querySelectorAll('[data-key=next]'))button.disabled=!data.state.can_next;
      if (data.state.lives !== undefined) $('score').textContent += ` · ${data.state.lives} shields`;
      $('win').textContent=data.state.lost?'Game over · Restart to try again':data.state.can_next?'Puzzle solved! Press N for the next room.':'You did it!';
      $('win').hidden = !(data.state.won || data.state.lost);
    }
    if (data.type === 'load') {
      playing = true;
      $('status').textContent = 'Click the game to play. Restart begins a new game.';
      canvas.focus({ preventScroll: true });
    }
  };
}
function keyName(event) { return gameKey(project?.template, event); }
document.addEventListener('keydown', event => {
  const key = keyName(event);
  if (key && document.activeElement === canvas) { event.preventDefault(); keys[key] = true; }
});
document.addEventListener('keyup', event => { const key = keyName(event); if (key) keys[key] = false; });
window.addEventListener('blur', clearKeys); canvas.addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', clearKeys);
window.addEventListener('pagehide', () => { clearTimeout(timer); worker?.terminate(); playing = false; });
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
document.querySelectorAll('[data-key]').forEach(button => {
  for(const type of ['keydown','keyup'])button.addEventListener(type,event=>{
    if(['Enter',' '].includes(event.key)){event.preventDefault();keys[button.dataset.key]=type==='keydown';}
  });
  button.addEventListener('blur',()=>{keys[button.dataset.key]=false;});
  button.onpointerdown = event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys[button.dataset.key] = true; };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { keys[button.dataset.key] = false; });
});
$('restart').onclick = () => { if (project && source !== undefined) boot(); else location.reload(); };
function frame(time) {
  if (!document.hidden) {
    if (time - lastStep >= 1000 / 30 && playing && ready && !pending) { lastStep = time; send('step'); }
    scene.draw(time);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try {
  const responses = await Promise.all([fetch('./game.json'), fetch('./my_game.py')]);
  if (responses.some(response => !response.ok)) throw new Error('Could not load the exported game files.');
  project = await responses[0].json(); source = await responses[1].text();
  if (project.format !== 'little-makers-game' || project.version !== 1 || !['platformer', 'breaker', 'paratroopers', 'sokoban', 'invaders', 'asteroids'].includes(project.template)) throw new Error('Unsupported game export.');
  document.title = project.title; $('title').textContent = project.title;
  const action = { platformer: 'Jump', breaker: 'Reset ball', paratroopers: 'Fire', sokoban: 'Undo ↶', invaders: 'Fire', asteroids: 'Fire' }[project.template];
  $('controls').textContent = gameControls(project.template);
  canvas.setAttribute('aria-label',project.title+'. '+gameControls(project.template));
  configureGameControls(project.template);
  $('action').textContent = action;
  boot();
} catch (error) { fail(error.message); }
