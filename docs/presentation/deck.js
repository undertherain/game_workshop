import { drawSpace } from '/space-scene.js';
import { createLessonDemos } from './lesson-demos.js';
import { createPipDemo } from './pip-demo.js';

const $ = id => document.getElementById(id);
const slides = [...document.querySelectorAll('.slide')];
const contexts = Object.fromEntries(['barebones', 'full'].map(mode => [mode, $(mode + '-canvas').getContext('2d')]));
const states = {};
const resets = new Set();
const lessons = createLessonDemos();
const pip = createPipDemo();
let index = 0, worker, ready = false, pending = false, timer, keys = {}, fireQueued = false, lastStep = 0;
const mode = () => slides[index].dataset.demo;
const clearKeys = () => { keys = {}; fireQueued = false; };
function setKey(action, down) {
  if (action === 'fire' && down && !keys.fire) fireQueued = true;
  keys[action] = down;
}

function fit() {
  const scale = Math.min(innerWidth / 1600, innerHeight / 900);
  $('deck').style.transform = `translate(${(innerWidth - 1600 * scale) / 2}px, ${(innerHeight - 900 * scale) / 2}px) scale(${scale})`;
}
function navigate(next) {
  next = Math.max(0, Math.min(slides.length - 1, next));
  if (next === index) return;
  location.hash = slides[next].id;
}
function showSlide() {
  clearKeys();
  const found = slides.findIndex(slide => '#' + slide.id === location.hash);
  index = found < 0 ? 0 : found;
  slides.forEach((slide, i) => { slide.hidden = i !== index; });
  pip.show();
  $('slide-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  $('previous').disabled = index === 0;
  $('next').disabled = index === slides.length - 1;
  $('progress').style.width = `${(index + 1) / slides.length * 100}%`;
  document.title = `${slides[index].querySelector('h1,h2').textContent} · Little Makers`;
  if (mode()) $(mode() + '-canvas').focus({ preventScroll: true });
  else if (document.activeElement?.closest('.slide[hidden]')) document.activeElement.blur();
}
function sourceMarkup(source) {
  // Tokenize before escaping; source is shown as text, never interpreted as HTML.
  return source.split(/('[^'\n]*'|"[^"\n]*"|\b(?:from|import|class|def|if|not|any|for|in|else)\b|\b\d+\b)/g).map(token => {
    const safe = token.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const kind = /^['"]/.test(token) ? 'string' : /^\d+$/.test(token) ? 'number' : /^(from|import|class|def|if|not|any|for|in|else)$/.test(token) ? 'keyword' : '';
    return kind ? `<span class="${kind}">${safe}</span>` : safe;
  }).join('');
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { $('fullscreen').textContent = 'Use browser fullscreen'; }
}
function fail(message) {
  clearTimeout(timer); worker?.terminate(); worker = null;
  ready = pending = false; clearKeys();
  for (const name of ['barebones', 'full']) $(name + '-status').textContent = `${message} Press Restart to retry.`;
}
function boot() {
  worker?.terminate(); clearTimeout(timer);
  ready = pending = false; clearKeys();
  for (const name of ['barebones', 'full']) {
    delete states[name];
    $(name + '-status').textContent = 'Loading Python…';
    contexts[name].clearRect(0, 0, contexts[name].canvas.width, contexts[name].canvas.height);
  }
  worker = new Worker('./runtime-worker.js', { type: 'module' });
  const current = worker;
  timer = setTimeout(() => fail('Python could not start.'), 45000);
  worker.onerror = event => { if (worker !== current) return; event.preventDefault(); fail('Python could not start.'); };
  worker.onmessage = ({ data }) => {
    if (worker !== current) return;
    clearTimeout(timer); pending = false;
    if (data.type === 'error') { fail(data.message); return; }
    if (data.type === 'ready') {
      ready = true;
      $('game-source').innerHTML = sourceMarkup(data.source);
      for (const name of ['barebones', 'full']) $(name + '-status').textContent = 'Ready to play';
      return;
    }
    if (data.type === 'state') {
      states[data.mode] = data.state;
      draw(data.mode);
    }
  };
}
function send(name, reset = false) {
  pending = true;
  timer = setTimeout(() => fail('Python took too long to respond.'), 3000);
  worker.postMessage({ type: reset ? 'reset' : 'step', mode: name, keys: { ...keys, fire: keys.fire || fireQueued } });
  fireQueued = false;
}
function restart(name) {
  clearKeys();
  resets.add(name);
  if (!worker) boot();
}
function draw(name) {
  const state = states[name], ctx = contexts[name];
  if (!state) return;
  if (name === 'full') {
    drawSpace(ctx, state);
    $('full-score').textContent = `Score ${state.world.score} · ${state.lives} shields`;
  } else {
    ctx.fillStyle = '#090d1d'; ctx.fillRect(0, 0, 960, 640);
    for (const actor of state.actors) {
      const sprite = state.sprites[actor.asset];
      if (!sprite) continue;
      const cw = actor.width / sprite.rows[0].length, ch = actor.height / sprite.rows.length;
      ctx.fillStyle = `rgb(${sprite.color.join(',')})`;
      sprite.rows.forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel !== '.') ctx.fillRect(actor.x + x * cw, actor.y + y * ch, cw, ch);
      }));
    }
    $('barebones-score').textContent = `${state.remaining} aliens`;
  }
  const ended = state.won || state.lost;
  $(name + '-status').textContent = state.lost ? 'They got us! Press R to try again.' : state.won ? 'All clear! Press R to play again.' : '← → Move · Space fires one shot per press';
  if (ended) {
    ctx.fillStyle = '#090d1dbb'; ctx.fillRect(0, ctx.canvas.height / 2 - 48, ctx.canvas.width, 96);
    ctx.textAlign = 'center'; ctx.fillStyle = '#d4f58b'; ctx.font = 'bold 36px monospace';
    ctx.fillText(state.lost ? 'GAME OVER' : 'ALL CLEAR!', ctx.canvas.width / 2, ctx.canvas.height / 2 + 12);
  }
}
function gameKey(event) { return ({ ArrowLeft:'left', ArrowRight:'right', a:'left', d:'right', ' ':'fire' })[event.key]; }
document.addEventListener('keydown', event => {
  if (document.getElementById('ai-access-dialog').open) return;
  // Presenter navigation also works while typing Python in the lesson editors.
  if (!event.ctrlKey && !event.metaKey && !event.altKey && ['PageDown', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    if (!event.repeat) navigate(index + (event.key === 'PageDown' ? 1 : -1));
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,[contenteditable="true"]')) return;
  const key = event.key.toLowerCase();
  if (['n', 'p', 'pagedown', 'pageup', 'f', 'r'].includes(key)) {
    event.preventDefault();
    if (event.repeat) return;
    if (key === 'n' || key === 'pagedown') navigate(index + 1);
    if (key === 'p' || key === 'pageup') navigate(index - 1);
    if (key === 'f') fullscreen();
    if (key === 'r') { if (mode()) restart(mode()); else { lessons.resetCurrent(); pip.reset(); } }
    return;
  }
  const action = gameKey(event);
  if (mode() && action && !event.target.closest('button,a')) { event.preventDefault(); setKey(action, true); }
});
document.addEventListener('keyup', event => { const action = gameKey(event); if (action) setKey(action, false); });
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); setKey(button.dataset.key, true); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) button.addEventListener(type, () => { setKey(button.dataset.key, false); });
  for (const type of ['keydown', 'keyup']) button.addEventListener(type, event => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); setKey(button.dataset.key, type === 'keydown'); }
  });
});
document.querySelectorAll('[data-restart]').forEach(button => { button.onclick = () => {
  restart(button.dataset.restart); $(button.dataset.restart + '-canvas').focus({ preventScroll: true });
}; });
function frame(time) {
  lessons.frame(time);
  const active = mode();
  if (!document.hidden && ready && !pending && time - lastStep >= 1000 / 30) {
    // Warm both demos on the opening slides; after that only the visible game steps.
    const warm = ['barebones', 'full'].find(name => !states[name]);
    const name = active || warm;
    if (name && (warm === name || resets.has(name) || !(states[name]?.won || states[name]?.lost))) {
      lastStep = time;
      send(name, resets.delete(name) || !states[name]);
    }
  }
  requestAnimationFrame(frame);
}
$('previous').onclick = () => navigate(index - 1);
$('next').onclick = () => navigate(index + 1);
$('fullscreen').onclick = fullscreen;
window.addEventListener('resize', fit);
window.addEventListener('hashchange', showSlide);
window.addEventListener('blur', clearKeys);
for (const name of ['barebones', 'full']) $(name + '-canvas').addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', clearKeys);
window.addEventListener('pagehide', () => { clearTimeout(timer); worker?.terminate(); worker = null; ready = false; });
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
// Keep the source slide readable even if Python initialization fails.
fetch('./barebones.py').then(response => { if (!response.ok) throw new Error(); return response.text(); })
  .then(source => { $('game-source').innerHTML = sourceMarkup(source); })
  .catch(() => { $('game-source').textContent = 'Could not load the source. Reload the presentation to retry.'; });
fit(); showSlide(); boot(); requestAnimationFrame(frame);
