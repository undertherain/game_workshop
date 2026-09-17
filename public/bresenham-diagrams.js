// The teaching trace uses the shallow, right-and-down form of Bresenham.
// Python's drawing runtime handles all directions; tests compare the two.
export function shallowLineSteps(dx = 7, dy = 3) {
  const steps = [];
  let y = 0, decision = 2 * dy - dx;
  for (let x = 0; x <= dx; x++) {
    const down = decision >= 0;
    steps.push({ x, y, decision, down });
    if (down) { y++; decision -= 2 * dx; }
    decision += 2 * dy;
  }
  return steps;
}

function svgNode(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function bresenhamDiagram(interactive, readout) {
  const root = document.createElement('div'); root.className = 'graphics-diagram bresenham-diagram';
  const svg = svgNode('svg', { viewBox: '0 0 320 235', role: 'img' });
  const title = svgNode('title'); svg.append(title);
  const cells = svgNode('g'); svg.append(cells);
  const steps = shallowLineSteps();
  let index = interactive ? 0 : steps.length - 1;
  const grid = svgNode('g');
  for (let x = 0; x <= 8; x++) grid.append(svgNode('line', { x1: 42 + x * 32, y1: 42, x2: 42 + x * 32, y2: 202, stroke: '#acbba5' }));
  for (let y = 0; y <= 5; y++) grid.append(svgNode('line', { x1: 42, y1: 42 + y * 32, x2: 298, y2: 42 + y * 32, stroke: '#acbba5' }));
  for (let x = 0; x < 8; x++) grid.append(svgNode('text', { x: 58 + x * 32, y: 33, 'text-anchor': 'middle' }, x));
  for (let y = 0; y < 5; y++) grid.append(svgNode('text', { x: 30, y: 63 + y * 32, 'text-anchor': 'middle' }, y));
  grid.append(svgNode('text', { x: 170, y: 15, 'text-anchor': 'middle' }, 'x increases →'));
  grid.append(svgNode('text', { x: 12, y: 130, transform: 'rotate(-90 12 130)', 'text-anchor': 'middle' }, '← y increases'));
  grid.append(svgNode('text', { x: 170, y: 225, 'text-anchor': 'middle' }, 'Dashed guide = the ideal straight line'));
  svg.append(grid);
  svg.append(svgNode('line', { x1: 58, y1: 58, x2: 282, y2: 154, stroke: '#243f36', 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
  const candidates = svgNode('g'); svg.append(candidates);
  root.append(svg);
  const controls = document.createElement('div'); controls.className = 'bresenham-controls';
  const back = document.createElement('button'), next = document.createElement('button'), reset = document.createElement('button');
  for (const button of [back, next, reset]) button.type = 'button';
  back.textContent = '← Previous pixel'; next.textContent = 'Next pixel →'; reset.textContent = 'Start again';
  controls.append(back, next, reset);
  const status = document.createElement('p'); status.className = 'bresenham-status'; status.setAttribute('role', 'status');
  const render = () => {
    const current = steps[index], done = index === steps.length - 1;
    cells.replaceChildren(svgNode('rect', { x: 42, y: 42, width: 256, height: 160, fill: '#edf2e6' }));
    for (const { x, y } of steps.slice(0, index + 1)) cells.append(svgNode('rect', { x: 42 + x * 32, y: 42 + y * 32, width: 32, height: 32, fill: '#b15b35', 'data-pixel': `${x},${y}` }));
    candidates.replaceChildren();
    if (interactive && !done) {
      for (const y of [current.y, current.y + 1]) candidates.append(svgNode('rect', { x: 44 + (current.x + 1) * 32, y: 44 + y * 32, width: 28, height: 28, fill: 'none', stroke: '#315d4c', 'stroke-width': 2, 'stroke-dasharray': '3 2' }));
    }
    title.textContent = `Line from (0, 0) to (7, 3). ${index + 1} of 8 pixels drawn: ${steps.slice(0, index + 1).map(s => `(${s.x}, ${s.y})`).join(', ')}.`;
    if (interactive) {
      readout.textContent = `Pixel (${current.x}, ${current.y}) · D = ${current.decision}`;
      status.textContent = done ? 'Both endpoints are included. Eight columns, eight coloured pixels.'
        : `Next: D = ${current.decision} ${current.down ? '≥ 0 → right and down' : '< 0 → right'}. D becomes ${current.decision}${current.down ? ' − 14' : ''} + 6 = ${steps[index + 1].decision}.`;
      back.disabled = index === 0; next.disabled = done; reset.disabled = index === 0;
    }
  };
  back.onclick = () => { index--; render(); };
  next.onclick = () => { index++; render(); };
  reset.onclick = () => { index = 0; render(); };
  if (interactive) {
    root.append(controls, status);
    const details = document.createElement('details'); details.className = 'bresenham-table';
    const summary = document.createElement('summary'); summary.textContent = 'Show all decisions';
    const table = document.createElement('table');
    const caption = table.createCaption(); caption.textContent = 'D chooses the move from this pixel to the next.';
    const head = table.createTHead().insertRow();
    for (const text of ['Pixel', 'D', 'Next move', 'Next D']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.append(th); }
    const body = table.createTBody();
    for (const [i, step] of steps.entries()) {
      const row = body.insertRow();
      for (const text of [`(${step.x}, ${step.y})`, step.decision, i === 7 ? 'Done' : step.down ? 'Right + down' : 'Right', steps[i + 1]?.decision ?? '—']) row.insertCell().textContent = text;
    }
    details.append(summary, table); root.append(details);
  }
  render();
  return root;
}
