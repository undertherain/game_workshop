// Original SVG character, shared by every Pip panel. Audio is measured locally;
// the existing <audio> element remains the only playback path.
const artwork = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
  <circle class="pip-halo" cx="50" cy="53" r="43" fill="#edf1db"/>
  <ellipse cx="50" cy="89" rx="19" ry="3" fill="#36594b" opacity=".12"/>
  <g class="pip-character">
    <path class="pip-wing pip-wing-left" d="M32 54C5 34 9 76 32 69" fill="#fcfaf0" stroke="#c4d4b1" stroke-width="2"/>
    <path class="pip-wing pip-wing-right" d="M68 54C95 34 91 76 68 69" fill="#fcfaf0" stroke="#c4d4b1" stroke-width="2"/>
    <path d="M42 79L39 84M58 79L61 84" stroke="#36594b" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 32C49 23 52 18 57 14" stroke="#4f7652" stroke-width="3" stroke-linecap="round"/>
    <path class="pip-leaf" d="M51 24C50 12 63 9 70 12C68 22 60 27 51 24Z" fill="#89ae69" stroke="#4f7652" stroke-width="2" stroke-linejoin="round"/>
    <path d="M50 30C32 30 25 43 27 61C28 77 38 82 50 82C62 82 72 77 73 61C75 43 68 30 50 30Z" fill="#e4c86f" stroke="#36594b" stroke-width="2.5"/>
    <path d="M33 47C36 37 44 35 50 35" stroke="#fff0b6" stroke-width="4" stroke-linecap="round"/>
    <g class="pip-face">
      <g class="pip-eyes" fill="#284b43"><ellipse cx="40" cy="53" rx="3.4" ry="4.8"/><ellipse cx="60" cy="53" rx="3.4" ry="4.8"/></g>
      <g fill="#fffbed"><circle cx="41" cy="51.5" r="1"/><circle cx="61" cy="51.5" r="1"/></g>
      <g fill="#cf8968" opacity=".55"><ellipse cx="34" cy="62" rx="4.5" ry="2.5"/><ellipse cx="66" cy="62" rx="4.5" ry="2.5"/></g>
      <path class="pip-smile" d="M45 64Q50 69 55 64" stroke="#284b43" stroke-width="2.3" stroke-linecap="round"/>
      <ellipse class="pip-mouth" cx="50" cy="65" rx="4" ry="5" fill="#284b43"/>
    </g>
  </g>
  <g class="pip-thought" fill="#718951"><circle cx="77" cy="33" r="2"/><circle cx="83" cy="25" r="3"/><circle cx="90" cy="16" r="4"/></g>
</svg>`;

export function createPipAvatar(container) {
  const node = container.querySelector('.pip-avatar');
  if (node) { node.innerHTML = artwork; node.setAttribute('aria-hidden', 'true'); }
  let thinking = false, voice = 'idle', level = 0;
  function render() {
    if (!node) return;
    node.dataset.state = level > 0 ? 'speaking' : voice !== 'idle' ? voice : thinking ? 'thinking' : 'idle';
    node.style.setProperty('--pip-mouth-open', String(.35 + level * .9));
  }
  render();
  return {
    setThinking(value) { thinking = value; render(); },
    setVoiceState(value) { voice = value; level = 0; render(); },
    watchAudio(stream) {
      let context, source, analyser, frame, stopped = false, lastSound = -Infinity;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (frame !== undefined) cancelAnimationFrame(frame);
        source?.disconnect(); analyser?.disconnect();
        context?.close().catch(() => {});
        level = 0; render();
      };
      try {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!node || !AudioContext) return stop;
        context = new AudioContext();
        source = context.createMediaStreamSource(stream);
        analyser = context.createAnalyser(); analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const tick = now => {
          if (stopped) return;
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
          if (rms > .012) lastSound = now;
          level = now - lastSound < 140 ? Math.min(1, Math.max(.15, rms * 7)) : 0;
          render(); frame = requestAnimationFrame(tick);
        };
        context.resume().then(() => { if (!stopped) frame = requestAnimationFrame(tick); }).catch(stop);
      } catch { stop(); /* Animation failure must never interrupt voice. */ }
      return stop;
    },
  };
}
