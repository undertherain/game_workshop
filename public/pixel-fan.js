// Integer Bresenham cells, with the same tie rules as lesson_runtime.py.
export function linePixels(x, y, endX, endY) {
  const pixels = [], dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
  const stepX = x < endX ? 1 : -1, stepY = y < endY ? 1 : -1;
  let error = dx + dy;
  while (true) {
    pixels.push([x, y]);
    if (x === endX && y === endY) return pixels;
    const twiceError = 2 * error;
    if (twiceError >= dy) { error += dy; x += stepX; }
    if (twiceError <= dx) { error += dx; y += stepY; }
  }
}

export function fanLines(width, height, spacing, offset = 0, corner = 'top-left') {
  const flipX = corner.endsWith('right'), flipY = corner.startsWith('bottom');
  const transform = ([x, y]) => [flipX ? width - 1 - x : x, flipY ? height - 1 - y : y];
  const endpoints = [];
  for (let y = offset; y < height; y += spacing) endpoints.push([width - 1, y]);
  for (let x = offset; x < width; x += spacing) {
    if (x !== width - 1 || !endpoints.some(([, y]) => y === height - 1)) endpoints.push([x, height - 1]);
  }
  // Reflect rasterized cells so changing corner is an exact mirror of the fan.
  return endpoints.map(([x, y]) => linePixels(0, 0, x, y).map(transform));
}

export function pixelFan(readout) {
  const width = 192, height = 144;
  const root = document.createElement('div'); root.className = 'pixel-fan';
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.setAttribute('role', 'img');
  const controls = document.createElement('div'); controls.className = 'fan-controls';
  const select = (name, options) => {
    const label = document.createElement('label'); label.textContent = name;
    const input = document.createElement('select'); input.setAttribute('aria-label', name);
    for (const [value, text] of options) { const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option); }
    label.append(input); controls.append(label); return input;
  };
  const spacing = select('Endpoint spacing', [[2, 'Every 2 pixels'], [1, 'Every pixel'], [3, 'Every 3 pixels'], [4, 'Every 4 pixels'], [6, 'Every 6 pixels'], [8, 'Every 8 pixels']]);
  const corner = select('Start corner', [['top-left', 'Top left'], ['top-right', 'Top right'], ['bottom-left', 'Bottom left'], ['bottom-right', 'Bottom right']]);
  const shift = document.createElement('label');
  const offset = document.createElement('input'); offset.type = 'checkbox';
  shift.append(offset, ' Shift endpoints by one pixel'); controls.append(shift);
  root.append(canvas, controls);
  const render = () => {
    const gap = Number(spacing.value), phase = offset.checked ? 1 : 0;
    const lines = fanLines(width, height, gap, phase, corner.value);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#192d29'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff3cf';
    for (const line of lines) for (const [x, y] of line) ctx.fillRect(x, y, 1, 1);
    const edges = `${corner.value.endsWith('left') ? 'right' : 'left'} and ${corner.value.startsWith('top') ? 'bottom' : 'top'}`;
    const description = `${lines.length} straight pixel lines from the ${corner.options[corner.selectedIndex].text.toLowerCase()} corner to the ${edges} edges, spaced every ${gap} ${gap === 1 ? 'pixel' : 'pixels'}, starting at edge coordinate ${phase}.`;
    canvas.setAttribute('aria-label', `${width} by ${height} pixel picture. ${description} Repeated stair steps form fingerprint-like bands.`);
    readout.textContent = `${width} × ${height} pixels · ${lines.length} lines\nEndpoints: ${phase}, ${phase + gap}, ${phase + 2 * gap}, …`;
  };
  for (const control of [spacing, corner, offset]) control.addEventListener('change', render);
  readout.setAttribute('aria-live', 'polite'); render();
  return root;
}
