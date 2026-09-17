import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, skillLabels, branches } from '../public/curriculum.js';
import { readContent, loadLessons, validateLesson } from '../public/content-loader.js';
import { resolveLesson, migrateDraft, lessonPosition, lessonChapters, editorHelp, canRecordPractice } from '../public/lesson-model.js';

test('chapters group the route without breaking navigation across boundaries', () => {
  const branch = branches.find(branch => branch.id === 'foundations');
  const chapters = lessonChapters(lessons, branch);
  assert.equal(chapters.length, 7);
  assert.deepEqual(chapters.flatMap(chapter => chapter.lessons), lessons.filter(lesson => lesson.branch === branch.id));
  for (const [index, chapter] of chapters.entries()) {
    assert.ok(chapter.lessons.length <= 10);
    if (index) {
      const first = chapter.lessons[0], previous = chapters[index - 1].lessons.at(-1);
      assert.equal(lessonPosition(lessons, first).previous, previous);
      assert.equal(lessonPosition(lessons, previous).next, first);
    }
  }
  const drawing = lessonChapters(lessons, branches.find(branch => branch.id === 'drawing'));
  assert.equal(drawing.length, 1);
  assert.equal(drawing[0].lessons.length, 9);
});

test('chapter content rejects missing and unknown chapter references', async () => {
  for (const chapter of [undefined, 'missing']) {
    await assert.rejects(loadLessons(skillLabels, async path => {
      const content = await readContent(path);
      return path === 'lessons/calculator.json' ? { ...content, chapter } : content;
    }), /chapter/);
  }
});

test('manifest order drives navigation even with renamed and reordered lessons', async () => {
  const ids = await readContent('lessons/index.json');
  const order = [...ids].reverse().map(id => id === 'calculator' ? 'new-lab' : id);
  const reordered = await loadLessons(skillLabels, async path => {
    if (path === 'lessons/index.json') return order;
    if (path === 'lessons/new-lab.json') return { ...await readContent('lessons/calculator.json'), id: 'new-lab' };
    return readContent(path);
  });
  assert.deepEqual(reordered.map(lesson => lesson.id), order);
  for (const lesson of reordered) {
    const expected = reordered.filter(item => item.branch === lesson.branch);
    const { previous, next } = lessonPosition(reordered, lesson);
    assert.equal(previous, expected[expected.indexOf(lesson) - 1]);
    assert.equal(next, expected[expected.indexOf(lesson) + 1]);
  }
  assert.equal(resolveLesson(reordered, 'new-lab').presentation, 'console');
});

test('aliases and draft updates follow content and preserve custom work', () => {
  const lesson = { id: 'new-id', aliases: ['old-id'], draftMigrations: [{ from: ['old example'], to: ['new example'] }] };
  assert.equal(resolveLesson([lesson], 'old-id'), lesson);
  assert.equal(resolveLesson([lesson], 'new-id'), lesson);
  assert.equal(resolveLesson([lesson], 'unknown'), undefined);
  assert.equal(migrateDraft(lesson, 'old example'), 'new example');
  assert.equal(migrateDraft(lesson, 'my edited example'), 'my edited example');
  assert.equal(migrateDraft({ actor: 'character', legacyActors: ['fox'] }, 'fox.jump()\n  fox.move(20)\nmessage = "fox.jump()"'), 'character.jump()\n  character.move(20)\nmessage = "fox.jump()"');
  for (const actual of lessons) for (const change of actual.draftMigrations || []) {
    assert.equal(migrateDraft(actual, change.from.join('\n')), change.to.join('\n'));
  }
});

test('editor help and practice requirements are independent of lesson ID and skill name', () => {
  assert.deepEqual(editorHelp({ editorHelp: { text: 'Change the distance.', display: 'once' } }), { text: 'Change the distance.', display: 'once' });
  const generic = editorHelp({ editableLine: 2, editor: { runOnEnter: true } });
  assert.match(generic.text, /Edit line 2/);
  assert.doesNotMatch(generic.text, /greeting/);
  const result = { features: { assignment: true }, actions: ['jump'] };
  assert.equal(canRecordPractice({ mode: 'basics', skill: 'anything', practiceFeature: 'assignment' }, result), true);
  assert.equal(canRecordPractice({ mode: 'basics', skill: 'anything', practiceFeature: 'function' }, result), false);
  assert.equal(canRecordPractice({ mode: 'basics', skill: 'functions' }, result), true);
});

test('invalid content rules and ambiguous aliases fail at load time', async () => {
  const base = await readContent('lessons/calculator.json');
  const defaults = await readContent('lesson-defaults.json');
  for (const patch of [
    { aliases: ['bad/id'] }, { draftMigrations: [{ from: 'text', to: [] }] },
    { legacyActors: ['.*'] }, { editorHelp: { text: 'Hi', display: 'sometimes' } },
    { editor: { runOnEnter: 'yes' } }, { editor: { maxLines: 0 } }, { practiceFeature: 'magic' },
  ]) assert.throws(() => validateLesson({ ...base, ...patch }, base.id, defaults, skillLabels));
  for (const patch of [{ aliases: ['greeting'] }, { branch: 'missing' }]) {
    await assert.rejects(loadLessons(skillLabels, async path => {
      const content = await readContent(path);
      return path === 'lessons/calculator.json' ? { ...content, ...patch } : content;
    }), /alias|branch/);
  }
});
