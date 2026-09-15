import { createScene } from './scene.js';

// Recorded gameplay shares the real renderer without starting a Python worker.
export function createGamePreviews() {
  const entries = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frames, active = false, animation = 0, lastDraw = 0, playing = false;
  const ready = fetch('/content/game-previews.json').then(response => {
    if (!response.ok) throw Error('Preview unavailable');
    return response.json();
  }).then(data => { frames = data; draw(performance.now()); }).catch(() => {
    for (const canvas of entries.keys()) canvas.closest('.game-preview').dataset.unavailable = 'true';
  });
  function draw(time) {
    for (const [canvas, entry] of entries) {
      if (!canvas.getClientRects().length || !frames?.[entry.id]) continue;
      const moving = playing && !reducedMotion.matches && canvas.id === 'museum-preview';
      const index = moving ? Math.floor(time / 100) % frames[entry.id].length : entry.index;
      if (!entry.dirty && index === entry.drawnIndex) continue;
      entry.index = index; entry.drawnIndex = index; entry.dirty = false;
      entry.scene.update(frames[entry.id][index]);
      entry.scene.draw(moving ? time : 0);
    }
  }
  function tick(time) {
    if (!active || document.hidden) { animation = 0; return; }
    if (time - lastDraw >= 100) { draw(time); lastDraw = time; }
    animation = requestAnimationFrame(tick);
  }
  function start() { if (active && !document.hidden && !animation) animation = requestAnimationFrame(tick); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animation); animation = 0; } else start();
  });
  return {
    add(canvas, id) {
      const entry = { id, index: 0, drawnIndex: -1, dirty: true };
      entry.scene = createScene(canvas, () => { entry.dirty = true; });
      entries.set(canvas, entry);
      ready.then(() => draw(performance.now()));
    },
    select(canvas, id) { Object.assign(entries.get(canvas), { id, index: 0, dirty: true }); draw(performance.now()); },
    show() { active = true; start(); },
    hide() { active = false; cancelAnimationFrame(animation); animation = 0; },
    play(value) { playing = value; draw(performance.now()); },
  };
}
