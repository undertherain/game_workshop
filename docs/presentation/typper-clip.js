export function createTypperClip() {
  const video = document.getElementById('typper-video');
  const button = document.getElementById('typper-play');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, paused = reducedMotion.matches, failed = false, revision = 0;
  video.muted = true;
  function sync() {
    const current = ++revision;
    if (failed) return;
    button.textContent = paused ? 'Play clip' : 'Pause clip';
    button.setAttribute('aria-pressed', String(!paused));
    if (!active || document.hidden || paused) { video.pause(); return; }
    video.play().catch(() => {
      if (current !== revision || failed) return;
      // Autoplay restrictions leave an explicit Play button and the poster.
      paused = true; sync();
    });
  }
  button.onclick = () => { paused = !paused; sync(); };
  video.addEventListener('error', () => {
    failed = true; revision++; video.pause();
    video.removeAttribute('src'); video.load();
    button.disabled = true; button.textContent = 'Preview unavailable';
    button.setAttribute('aria-pressed', 'false');
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { active = false; sync(); });
  window.addEventListener('pageshow', () => { active = !document.getElementById('typper').hidden; sync(); });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { paused = true; sync(); }
  });
  sync();
  return { show(visible) { active = visible; sync(); } };
}
