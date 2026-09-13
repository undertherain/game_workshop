import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { lessons } from '../public/curriculum.js';
import { restoreProvidedLines, allowsLessonEdit, editableRange } from '../public/lesson-editing.js';

const greeting = lessons.find(lesson => lesson.id === 'greeting');
const source = await readFile(new URL('../public/lessons.js', import.meta.url), 'utf8');

test('greeting preserves a saved name and restores the supplied command', () => {
  assert.equal(greeting.editableLine, 1);
  assert.equal(restoreProvidedLines('username = "Me"\nfox.jump()\nfox.move(10)', greeting), 'username = "Me"\nfox.say("Hello " + username)');
  assert.ok(allowsLessonEdit('username = "A longer name"\nfox.say("Hello " + username)', greeting));
  assert.ok(!allowsLessonEdit('username = "Me"', greeting));
  assert.ok(!allowsLessonEdit(greeting.code + '\nfox.jump()', greeting));
  const freeLesson = lessons.find(lesson => lesson.id === 'calculator');
  assert.ok(allowsLessonEdit('10 + 20\n30', freeLesson));
});

test('editor guards typing, deletion, paste and programmatic changes to provided lines', () => {
  const input = { value: greeting.code, selectionStart: 0, selectionEnd: 0,
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
  let saved = '';
  const context = vm.createContext({ input, current: () => greeting, editableRange, allowsLessonEdit,
    acceptedSource: greeting.code, interactive: false, persist: () => { saved = input.value; }, suggestions: () => {} });
  vm.runInContext(source.slice(source.indexOf('function edited() {'), source.indexOf("$('home-link').onclick")), context);
  vm.runInContext(source.slice(source.indexOf('input.onbeforeinput ='), source.indexOf('input.onkeydown =')), context);
  const firstEnd = greeting.code.indexOf('\n');
  for (const [start, end, inputType, data] of [
    [firstEnd + 1, firstEnd + 1, 'insertText', 'x'],
    [firstEnd, firstEnd, 'deleteContentForward'],
    [firstEnd + 1, firstEnd + 1, 'deleteContentBackward'],
    [0, greeting.code.length, 'insertFromPaste', 'replacement'],
    [0, 0, 'insertText', '\n'],
  ]) {
    input.selectionStart = start; input.selectionEnd = end;
    let blocked = false;
    input.onbeforeinput({ inputType, data, preventDefault() { blocked = true; } });
    assert.ok(blocked, inputType);
  }
  input.value = greeting.code.replace('Ola', 'Sam');
  vm.runInContext('edited()', context);
  assert.equal(saved, input.value);
  for (const invalid of [input.value.replace('fox.say', 'fox.jump'), input.value + '\n', 'pasted multiline\ncode']) {
    input.value = invalid;
    vm.runInContext('edited()', context);
    assert.equal(input.value, saved);
  }
});
