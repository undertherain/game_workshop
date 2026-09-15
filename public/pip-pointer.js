// Spoken references, never learner speech, drive a temporary, read-only pointer.
const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const numberWords = `(?:${tens.join('|')})(?:[ -](?:${small.slice(1, 10).join('|')}))?|${small.join('|')}`;
const reference = new RegExp(`\\b(?:line|ligne|l[ií]nea|linha|lijn|zeile|wiersz)\\s+(\\d+|${numberWords})(?=[\\s,:;.!?])`, 'gi');

export function spokenLineReferences(text) {
  return [...text.matchAll(reference)].map(match => {
    const value = match[1].toLowerCase();
    const words = value.split(/[ -]/);
    const line = /^\d+$/.test(value) ? Number(value) : small.includes(value) ? small.indexOf(value)
      : (tens.indexOf(words[0]) + 2) * 10 + (words[1] ? small.indexOf(words[1]) : 0);
    return { line, end: match.index + match[0].length };
  });
}

export function createSpokenPointer(source, show, clear) {
  let text = '', consumed = 0, end = -Infinity, interruptedUntil = -Infinity, timer;
  const reset = () => { text = ''; consumed = 0; clearTimeout(timer); clear(); };
  return {
    receive(event) {
      if (!Number.isFinite(event.start_ms) || !Number.isFinite(event.end_ms) ||
          event.end_ms < event.start_ms || typeof event.delta !== 'string' || !event.delta) return;
      if (event.type === 'session.input_transcript.delta') {
        interruptedUntil = Math.max(interruptedUntil, event.end_ms); reset(); return;
      }
      if (event.type !== 'session.output_transcript.delta' || event.start_ms < interruptedUntil || event.end_ms < end) return;
      if (event.start_ms > end + 1200) reset();
      end = event.end_ms;
      text += event.delta;
      for (const ref of spokenLineReferences(text)) {
        if (ref.end <= consumed) continue;
        consumed = ref.end;
        const lines = source.split('\n');
        if (Number.isSafeInteger(ref.line) && ref.line > 0 && ref.line <= lines.length && lines[ref.line - 1].trim()) show(ref.line);
        else clear();
      }
      // Keep enough history for a reference split across transcript chunks.
      if (text.length > 1000) { const cut = text.length - 200; text = text.slice(cut); consumed = Math.max(0, consumed - cut); }
      clearTimeout(timer); timer = setTimeout(reset, 8000);
    },
    clear: reset,
  };
}

export function createCodePointer(editor) {
  const host = editor.parentElement;
  const band = document.createElement('div');
  band.className = 'pip-code-pointer'; band.hidden = true; band.setAttribute('aria-hidden', 'true');
  const star = document.createElement('span'); star.textContent = '✦'; band.append(star);
  const mirror = document.createElement('div');
  mirror.className = 'pip-pointer-mirror'; mirror.setAttribute('aria-hidden', 'true');
  host.append(band, mirror);
  const source = editor.value;
  let line = null, disposed = false;
  const clear = () => { line = null; band.hidden = true; delete band.dataset.line; };
  function render(reveal = false) {
    if (disposed || line === null) return;
    if (editor.value !== source || !editor.getClientRects().length) { clear(); return; }
    const style = getComputedStyle(editor);
    star.style.left = `${parseFloat(style.paddingLeft) - 12}px`;
    // A hidden copy measures wrapped lines, tabs and responsive editor fonts.
    for (const key of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'tabSize', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'wordBreak', 'overflowWrap']) mirror.style[key] = style[key];
    mirror.style.whiteSpace = editor.wrap === 'off' || style.whiteSpace === 'pre' ? 'pre' : 'pre-wrap';
    mirror.style.width = `${editor.clientWidth}px`;
    const lines = source.split('\n');
    const target = document.createElement('span'); target.textContent = lines[line - 1] || '\u200b';
    mirror.replaceChildren(document.createTextNode(lines.slice(0, line - 1).map(value => value + '\n').join('')), target);
    const rects = [...target.getClientRects()];
    if (!rects.length) { clear(); return; }
    const lineHeight = parseFloat(style.lineHeight);
    const top = rects[0].top - mirror.getBoundingClientRect().top - (lineHeight - rects[0].height) / 2;
    const height = rects.at(-1).top - rects[0].top + lineHeight;
    if (reveal && (top < editor.scrollTop || top + height > editor.scrollTop + editor.clientHeight)) {
      editor.scrollTop = Math.max(0, top - lineHeight);
      editor.dispatchEvent(new Event('scroll'));
    }
    const y = top - editor.scrollTop;
    const visibleTop = Math.max(0, y), visibleBottom = Math.min(editor.clientHeight, y + height);
    band.hidden = visibleBottom <= visibleTop;
    Object.assign(band.style, { top: `${editor.offsetTop + visibleTop}px`, left: `${editor.offsetLeft}px`, width: `${editor.clientWidth}px`, height: `${Math.max(0, visibleBottom - visibleTop)}px` });
  }
  const onScroll = () => render();
  editor.addEventListener('scroll', onScroll);
  editor.addEventListener('input', clear);
  const resize = new ResizeObserver(() => render()); resize.observe(editor);
  return {
    show(value) {
      if (disposed || !Number.isInteger(value) || value < 1 || value > source.split('\n').length) { clear(); return; }
      line = value; band.dataset.line = String(value); render(true);
    },
    clear,
    destroy() { disposed = true; clear(); resize.disconnect(); editor.removeEventListener('scroll', onScroll); editor.removeEventListener('input', clear); band.remove(); mirror.remove(); },
  };
}
