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
      children: [], value: '', textContent: '', innerHTML: '', hidden: false, dataset: {}, style: {}, handlers: {},
      selectionStart: 0, selectionEnd: 0,
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); },
      focus() {}, setAttribute() {}, replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    ...guidance, templates, initialState: {}, createScene: () => ({ update() {} }), createPipVoice() {}, stopPipVoice() {},
    document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, createElement: () => element(Symbol()), createTextNode: text => ({ textContent: text }) },
    window: { addEventListener() {} },
    localStorage: { setItem() {} }, requestAnimationFrame() {}, clearTimeout() {}, setTimeout() { return 1; },
    Worker: class { postMessage(message) { this.lastMessage = message; } terminate() {} },
    getComputedStyle: () => ({ lineHeight: '20px' }),
  });
  vm.runInContext(app, context);
  const run = code => vm.runInContext(code, context);
  element('editor').value = starter;
  run('save()');
  return { element, run };
}

test('the selected game stays behind its loading overlay until its own state arrives', () => {
  const { element, run } = editorHarness();
  run('templateId="invaders";boot(editor.value);');
  assert.equal(run('renderedTemplate'), null);
  run('worker.onmessage({data:{type:"ready"}})');
  assert.equal(element('boot-overlay').hidden, false);
  assert.equal(run('worker.lastMessage.template'), 'invaders');
  run('worker.onmessage({data:{id:pending.id,type:"load",state:{kind:"invaders",items:[],world:{score:0},collected:0}}})');
  assert.equal(element('boot-overlay').hidden, true);
  assert.equal(element('game').style.visibility, 'visible');
  assert.equal(run('renderedTemplate'), 'invaders');
  run('var previousWorker=worker;templateId="asteroids";renderedTemplate=null;boot(editor.value);previousWorker.onmessage({data:{type:"ready"}})');
  assert.equal(run('renderedTemplate'), null);
  assert.equal(element('boot-overlay').hidden, false);
  assert.equal(run('worker.lastMessage'), undefined);
});

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


test('Pip greets the restored variation and replaces first-exercise conversation on navigation', () => {
  const { element, run } = editorHarness();
  run('renderStep()');
  assert.match(element('conversation').children[0].children[0].textContent, /matching rule for Right/);
  run("history=[{role:'assistant',content:'Add Right'}];selectStep(3)");
  assert.equal(run('history.length'), 0);
  assert.equal(element('conversation').children.length, 1);
  assert.match(element('conversation').children[0].children[0].textContent, /Invent your variation/);
  assert.doesNotMatch(element('conversation').children[0].children[0].textContent, /matching rule for Right/);
  const restored = editorHarness();
  restored.run('stepIndex=3;renderStep()');
  assert.match(restored.element('conversation').children[0].children[0].textContent, /Invent your variation/);
});

test('complete-game storage and reset are separate from exercise drafts', () => {
  const { element, run } = editorHarness();
  run('selectStep(3)');
  element('editor').value += '\n# My lesson variation'; run('save()');
  const lessonDraft = element('editor').value;
  run("completeMode=true;starter=templates.breaker.completeCode;editor.value=starter;save();renderStep()");
  assert.equal(element('build-path').hidden, true);
  assert.equal(run('protection'), null);
  assert.equal(run('storageKey()'), 'little-makers-exercises-v1-breaker-complete');
  element('editor').value += '\n# My complete game'; run('save()');
  element('editor-guide-focus').click = () => {};
  element('reset-code').onclick();
  assert.equal(element('editor').value, templates.breaker.completeCode);
  element('undo').onclick();
  assert.match(element('editor').value, /My complete game/);
  run('completeMode=false;editor.value=readDraft();renderStep()');
  assert.equal(element('editor').value, lessonDraft);
  assert.equal(element('build-path').hidden, false);
});
