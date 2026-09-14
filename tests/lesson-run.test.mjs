import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { requiresQuizAnswer } from '../public/lesson-model.js';

const source = await readFile(new URL('../public/lessons.js', import.meta.url), 'utf8');
const runSource = source.slice(source.indexOf('function run() {'), source.indexOf('\nfunction drawGrid()'));

function tryRun(quiz, answered = false) {
  const sent = [], messages = [], elements = new Map();
  const context = vm.createContext({
    requiresQuizAnswer,
    busy: false, quizAnswered: answered, ready: true, requestPending: false,
    input: { value: 'fox.move()\nfox.jump()' },
    current: () => ({ quiz }),
    $: id => {
      if (!elements.has(id)) elements.set(id, { replaceChildren() {}, scrollIntoView() {} });
      return elements.get(id);
    },
    feedback: message => messages.push(message), persist() {}, resetScene() {},
    send: type => sent.push(type),
  });
  vm.runInContext(runSource + '\nrun();', context);
  return { sent, messages };
}

test('Run executes code without an optional prediction', () => {
  for (const quiz of [undefined, { choices: [{ id: 'move' }] }, { type: 'output' }]) {
    assert.deepEqual(tryRun(quiz).sent, ['run']);
  }
});

test('standalone quizzes request an answer, then execute when answered', () => {
  const quiz = { type: 'output', only: true, prompt: 'What will it say?' };
  const unanswered = tryRun(quiz);
  assert.deepEqual(unanswered.sent, []);
  assert.deepEqual(unanswered.messages, [quiz.prompt]);
  assert.deepEqual(tryRun(quiz, true).sent, ['run']);
});

test('required predictions block shortcuts until answered; explicit optional quizzes run', () => {
  for (const quiz of [{ required: true, choices: [] }, { required: true, type: 'output' }]) {
    assert.deepEqual(tryRun(quiz).sent, []);
    assert.deepEqual(tryRun(quiz, true).sent, ['run']);
  }
  assert.deepEqual(tryRun({ type: 'output', only: true, required: false }).sent, ['run']);
});

test('Run and Check answer reflect configured requirements and busy state', () => {
  const syncSource = source.slice(source.indexOf('function syncRunButton() {'), source.indexOf('\nfunction stopLesson()'));
  const elements = new Map();
  const quiz = { required: true, prompt: 'Choose first.' };
  const context = vm.createContext({
    requiresQuizAnswer, current: () => ({ quiz }), busy: false, quizAnswered: false, interactive: false,
    $: id => {
      if (!elements.has(id)) elements.set(id, { setAttribute() {}, querySelectorAll: () => [] });
      return elements.get(id);
    },
  });
  vm.runInContext(syncSource + '\nsyncRunButton();', context);
  assert.equal(elements.get('lesson-run').disabled, true);
  assert.equal(elements.get('quiz-check').disabled, true);
  vm.runInContext('quizAnswered = true; syncRunButton();', context);
  assert.equal(elements.get('lesson-run').disabled, false);
  assert.equal(elements.get('quiz-check').disabled, false);
  vm.runInContext('busy = true; syncRunButton();', context);
  assert.equal(elements.get('lesson-run').disabled, true);
  quiz.required = false;
  vm.runInContext('busy = false; quizAnswered = false; syncRunButton();', context);
  assert.equal(elements.get('lesson-run').disabled, false);
});
