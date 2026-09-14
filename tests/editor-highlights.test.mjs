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
    ...guidance, templates, initialState: {}, createScene: () => ({}), createPipVoice() {}, stopPipVoice() {},
    document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, createElement: () => element(Symbol()) },
    window: { addEventListener() {} },
    localStorage: { setItem() {} }, requestAnimationFrame() {}, clearTimeout() {},
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

for (const inputType of ['insertText', 'insertFromPaste', 'deleteContentBackward']) {
  test(`${inputType} accepts a rule selection from the left edge and preserves indentation`, () => {
    const { element, run } = editorHarness();
    run('renderStep()');
    const editor = element('editor');
    const start = run('protection.prefix.length');
    const end = run('editor.value.length-protection.suffix.length');
    const prefix = editor.value.slice(0, start);
    editor.setSelectionRange(prefix.lastIndexOf('\n') + 1, end);
    let prevented = false;
    editor.handlers.beforeinput({ inputType, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
    assert.equal(editor.selectionStart, start);
    editor.setRangeText(inputType.startsWith('delete') ? '' : 'paddle.x += 4', editor.selectionStart, editor.selectionEnd);
    editor.handlers.input();
    assert.ok(editor.value.startsWith(prefix));
    assert.ok(run('acceptsEdit(protection,editor.value)'));
  });
}

test('selections crossing supplied code remain protected', () => {
  const { element, run } = editorHarness();
  run('renderStep()');
  element('editor').setSelectionRange(0, run('editor.value.length-protection.suffix.length'));
  let prevented = false;
  element('editor').handlers.beforeinput({ inputType: 'insertText', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});


test('paddle steps use independent drafts and reset the current exercise', () => {
  const { element, run } = editorHarness();
  run('selectStep(1)');
  assert.equal(element('editor').value, templates.breaker.starters[1]);
  assert.ok(element('editor').value.includes('if keyboard.right:'));
  element('editor').value = element('editor').value.replace('    pass', '    ball.vx = (ball.x - paddle.x) / 8');
  run('save()');
  const draft = element('editor').value;
  run('selectStep(2)');
  assert.equal(element('editor').value, templates.breaker.starters[2]);
  run('selectStep(1)');
  assert.equal(element('editor').value, draft);
  element('editor-guide-focus').click = () => {};
  element('reset-code').onclick();
  assert.equal(run('stepIndex'), 1);
  assert.equal(element('editor').value, templates.breaker.starters[1]);
  element('undo').onclick();
  assert.equal(element('editor').value, draft);
});
