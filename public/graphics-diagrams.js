// Enlarged raster cells are a teaching model, independent of the drawing API.
import { bresenhamDiagram } from './bresenham-diagrams.js';
import { pixelFan } from './pixel-fan.js';
const NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function graphicsDiagram(kind, readout) {
  if (kind === 'pixel-fan') return pixelFan(readout);
  if (['raster-line', 'bresenham-steps'].includes(kind)) return bresenhamDiagram(kind === 'bresenham-steps', readout);
  const interactive = kind === 'pixel-coordinates';
  const point = kind === 'point-grid';
  const root = document.createElement('div'); root.className = 'graphics-diagram';
  const svg = svgNode('svg', { viewBox: '0 0 320 235', role: 'img' });
  const title = svgNode('title'); svg.append(title);
  const left = 42, top = 42, cell = 32, columns = 8, rows = 5;
  svg.append(svgNode('rect', { x: left, y: top, width: columns * cell, height: rows * cell, fill: '#edf2e6' }));
  const selection = svgNode(point ? 'circle' : 'rect', point
    ? { r: 6, fill: '#b15b35' }
    : { width: cell, height: cell, fill: '#b15b35' });
  // Fill the entire cell before drawing its thin boundary.
  if (!point) svg.append(selection);
  for (let x = 0; x <= columns; x++) svg.append(svgNode('line', { x1: left + x * cell, y1: top, x2: left + x * cell, y2: top + rows * cell, stroke: '#acbba5' }));
  for (let y = 0; y <= rows; y++) svg.append(svgNode('line', { x1: left, y1: top + y * cell, x2: left + columns * cell, y2: top + y * cell, stroke: '#acbba5' }));
  if (point) svg.append(selection);
  root.append(svg);
  const update = (x, y) => {
    selection.setAttribute(point ? 'cx' : 'x', left + x * cell);
    selection.setAttribute(point ? 'cy' : 'y', top + y * cell);
    title.textContent = point ? 'A small marker at the crossing of two grid lines represents a geometric point.'
      : `An enlarged pixel grid. The whole cell at column ${x}, row ${y} is shaded. Columns count right and rows count down from zero at the top left.`;
    if (interactive) readout.textContent = `Pixel (${x}, ${y}) · ${x} right, ${y} down`;
  };
  update(2, 1);
  if (!interactive) return root;

  for (let x = 0; x < columns; x++) svg.append(svgNode('text', { x: left + (x + .5) * cell, y: 33, 'text-anchor': 'middle' }, x));
  for (let y = 0; y < rows; y++) svg.append(svgNode('text', { x: 30, y: top + (y + .5) * cell + 5, 'text-anchor': 'middle' }, y));
  svg.append(svgNode('text', { x: 170, y: 15, 'text-anchor': 'middle' }, 'x increases →'));
  svg.append(svgNode('text', { x: 12, y: 130, transform: 'rotate(-90 12 130)', 'text-anchor': 'middle' }, '← y increases'));
  svg.append(svgNode('text', { x: 170, y: 225, 'text-anchor': 'middle' }, '8 columns × 5 rows · enlarged pixels'));
  const controls = document.createElement('div'); controls.className = 'pixel-controls';
  const inputs = [];
  for (const [axis, max, initial, direction] of [['x', columns - 1, 2, 'right'], ['y', rows - 1, 1, 'down']]) {
    const label = document.createElement('label'); label.textContent = `${axis} ${axis === 'x' ? '→' : '↓'} ${direction}`;
    const input = document.createElement('input'); input.type = 'range';
    input.min = 0; input.max = max; input.step = 1; input.value = initial;
    input.setAttribute('aria-label', `${axis}: count ${direction}`);
    label.append(input); controls.append(label); inputs.push(input);
    input.addEventListener('input', () => update(...inputs.map(control => Number(control.value))));
  }
  readout.setAttribute('aria-live', 'polite');
  root.append(controls);
  return root;
}
