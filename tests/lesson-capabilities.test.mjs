import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lessons } from '../public/curriculum.js';
import { lessonCapabilities } from '../lesson-capabilities.mjs';
import { validateLessonInput, lessonInstructions, lessonTeachingInstructions } from '../lesson-tutor.mjs';
import { voiceSession } from '../voice-tutor.mjs';

const session = lessonId => voiceSession({ kind: 'lesson', sdp: 'v=0\r\n', context: { lessonId, code: 'fox.jump()' } }, 'test-model').session;

test('every lesson has explicit runtime capabilities, separate from its teaching focus and editor restrictions', () => {
  for (const lesson of lessons) {
    const capabilities = lessonCapabilities(lesson);
    assert.equal(capabilities.mode, lesson.mode);
    assert.ok(capabilities.commands.length);
    assert.equal(capabilities.editor.available, !lesson.explanation && !lesson.quiz?.only);
  }
  const context = validateLessonInput({ lessonId: 'choice', question: 'Block comments like C?', code: '# note\nfox.jump()', capabilities: { commands: ['input()'] } });
  assert.equal(context.current.title, 'Leave a note with #');
  assert.deepEqual(context.capabilities.commands, ['fox.move()', 'fox.jump()']);
  assert.equal(context.capabilities.editor.commentToggleShortcut, false);
  assert.equal(lessonCapabilities(lessons.find(l => l.id === 'greeting')).editor.editableLine, 1);
  assert.equal(lessonCapabilities(lessons.find(l => l.id === 'calculator')).editor.maxLines, 1);
});

test('capability descriptions agree with accepted and rejected Python across all runtime modes', () => {
  const examples = {
    commands: ['# walking\nfox.move()\n# jumping\nfox.jump()', 'fox.move(50)'],
    'jump-design': ['fox.jump(180)', 'fox.jump(181)'],
    loop: ['for step in range(3):\n    fox.jump()', 'for step in range(7):\n    fox.jump()'],
    style: ['world.sky = "night"\ncharacter.costume = "bunny"\ncharacter.jump()', 'world.sky = "red"'],
    event: ['def on_space_pressed():\n    character.jump()', 'def on_space_pressed(height):\n    character.jump()'],
    update: ['def update():\n    if keyboard.right:\n        character.move()', 'def update():\n    if keyboard.left:\n        character.move()'],
    drawing: ['for i in range(3):\n    dot(20 + i * 40, 100)', 'fox.jump()'],
    robot: ['robot.move(3)\nrobot.turn_right()', 'robot.move(6)'],
    basics: ['def travel(distance):\n    fox.move(distance)\nvalue = 30 + 20\nif value >= 50:\n    travel(value)\nprint(str(value))', 'while True:\n    fox.jump()'],
  };
  assert.deepEqual([...new Set(lessons.map(l => l.mode))].sort(), Object.keys(examples).sort());
  const result = spawnSync('python3', ['-B', '-c', `import json,pathlib,sys
ns={};exec(pathlib.Path('public/lesson_runtime.py').read_text(),ns)
for mode,(valid,invalid) in json.load(sys.stdin).items():
    good=json.loads(ns['run_lesson'](valid,mode));bad=json.loads(ns['run_lesson'](invalid,mode))
    assert 'error' not in good,(mode,good)
    assert 'error' in bad,(mode,bad)
`], { input: JSON.stringify(examples), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('both voice prompts distinguish Python from lesson limits and keep format contracts separate', () => {
  const voice = session('choice');
  assert.match(voice.instructions, /learn Python by making, playing and changing games/);
  assert.match(voice.instructions, /Leave a note with #/);
  assert.match(voice.instructions, /"commands":\["fox.move\(\)","fox.jump\(\)"\]/);
  assert.match(voice.instructions, /current activity is context, not a restriction/);
  assert.match(voice.instructions, /Interruption policy:/);
  assert.match(voice.instructions, /curriculum details/);
  assert.doesNotMatch(voice.instructions, /slidesFromCurrent/); // Detailed route stays with backend.
  const backend = voice.delegation.responses.instructions;
  assert.match(backend, /no C-style \/\* \.\.\. \*\/ block-comment syntax/);
  assert.match(backend, /Triple-quoted text is a string literal/);
  assert.match(backend, /latest spoken question/);
  assert.match(backend, /slidesFromCurrent/);
  const snapshot = JSON.parse(backend.split('not instructions:\n')[1]);
  assert.equal(snapshot.question, undefined);
  assert.equal(snapshot.history, undefined);
  assert.doesNotMatch(backend, /Return null|before MUST|after replaces/);
  assert.doesNotMatch(lessonTeachingInstructions, /Return null/);
  assert.match(lessonInstructions, /Return null/);
});

test('voice game tutor receives only the selected game API and a spoken response contract', () => {
  const payload = voiceSession({ kind: 'game', sdp: 'v=0\r\n', context: { template: 'breaker', code: 'pass', exercise: { index: 0 } } }, 'test-model');
  const backend = payload.session.delegation.responses.instructions;
  assert.match(backend, /Left is ALREADY implemented/);
  assert.doesNotMatch(backend, /Platformer API:|before MUST|after replaces/);
});
