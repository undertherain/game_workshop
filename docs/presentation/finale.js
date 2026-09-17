import { createScene } from '/scene.js';

// Loop the workshop's recorded Python snapshots through its real renderers.
export function createFinale() {
  const section = document.getElementById('tldr');
  const button = document.getElementById('finale-play');
  const status = document.getElementById('finale-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let entries, frames, loading, active = false, paused = reducedMotion.matches;
  let elapsed = 0, lastTime = null, drawnFrame = -1, dirty = true;
  function syncButton() {
    button.textContent = paused ? 'Play previews' : 'Pause previews';
    button.setAttribute('aria-pressed', String(!paused));
  }
  function load() {
    if (loading) return;
    entries = [...section.querySelectorAll('canvas[data-game]')].map(canvas => ({
      id: canvas.dataset.game, canvas, scene: createScene(canvas, () => { dirty = true; }),
    }));
    loading = fetch('/content/game-previews.json').then(response => {
      if (!response.ok) throw Error('Preview unavailable');
      return response.json();
    }).then(data => {
      if (entries.some(entry => !Array.isArray(data[entry.id]) || !data[entry.id].length)) throw Error('Missing game');
      frames = data; dirty = true; status.textContent = ''; button.disabled = false;
    }).catch(() => { status.textContent = 'Game previews unavailable. Reload to retry.'; });
  }
  button.onclick = () => { paused = !paused; lastTime = null; syncButton(); };
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { paused = true; lastTime = null; syncButton(); }
  });
  syncButton();
  return {
    show(visible) { active = visible; lastTime = null; if (active) load(); },
    frame(time) {
      if (!active || document.hidden || !frames) { lastTime = null; return; }
      if (!paused && lastTime !== null) elapsed += Math.min(time - lastTime, 100);
      lastTime = time;
      const frame = Math.floor(elapsed / 100);
      if (!dirty && drawnFrame === frame) return;
      for (const entry of entries) {
        const recording = frames[entry.id];
        entry.scene.update(recording[frame % recording.length]);
        entry.scene.draw(time);
      }
      drawnFrame = frame; dirty = false;
    },
  };
}
