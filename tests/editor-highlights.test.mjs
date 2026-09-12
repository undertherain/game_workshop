import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as guidance from '../public/editor-guidance.js';
import { templates } from '../public/templates.js';

const app = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export async function', 'async function');
const starter = await readFile(new URL('../public/breaker.py', import.meta.url), 'utf8');

function editorHarness() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', hidden: false, dataset: {}, handlers: {},
      selectionStart: 0, selectionEnd: 0,
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); },
      focus() {}, setAttribute() {}, replaceChildren() {}, append() {},
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    ...guidance, templates, initialState: {}, createScene: () => ({}),
    document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, createElement: () => element(Symbol()) },
    window: { addEventListener() {} },
    localStorage: { setItem() {} }, requestAnimationFrame() {},
    getComputedStyle: () => ({ lineHeight: '20px' }),
  });
  vm.runInContext(app, context);
  const run = code => vm.runInContext(code, context);
  element('editor').value = starter;
  run('save()');
  return { element, run };
}

for (const key of ['Enter', 'Tab']) {
  test(`${key} clears a previous helper highlight and suggestion`, () => {
    const { element, run } = editorHarness();
    run("proposal={line:12,before:'pass',after:'return'};proposalSource=editor.value;locate(12)");
    element('suggestion').hidden = false;
    element('editor').setSelectionRange(0, 0);
    element('editor').handlers.keydown({ key, preventDefault() {} });
    assert.equal(run('focusedLine'), null);
    assert.equal(element('suggestion').hidden, true);
    element('show-line').onclick();
    assert.equal(run('focusedLine'), null);
    assert.equal(run('currentGuidance().line'), key === 'Enter' ? 13 : 12);
  });
}

test('applying a proposal still highlights the resulting edit', () => {
  const { element, run } = editorHarness();
  run("proposal={line:12,before:'pass',after:'if keyboard.right:\\n        paddle.x += paddle.speed'};proposalSource=editor.value");
  element('apply').onclick();
  assert.ok(element('editor').value.includes('if keyboard.right:'));
  assert.equal(run('focusedLine'), 12);
  assert.equal(element('suggestion').hidden, true);
});

test('changing exercise replaces the old highlight with the current function location', () => {
  const { element, run } = editorHarness();
  element('editor').value = '# added earlier\n' + starter;
  run('save();locate(13);stepIndex=1;renderStep()');
  assert.equal(run('focusedLine'), null);
  assert.equal(run('currentGuidance().line'), element('editor').value.split('\n').findIndex(line => line.startsWith('def on_paddle(')) + 1);
});
