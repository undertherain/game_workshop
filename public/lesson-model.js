// Content rules shared by navigation, restoration and the lesson UI.
export function resolveLesson(lessons, id) {
  return lessons.find(lesson => lesson.id === id || lesson.aliases?.includes(id));
}

export function migrateDraft(lesson, source) {
  const migration = lesson.draftMigrations?.find(change => change.from.join('\n') === source);
  if (migration) source = migration.to.join('\n');
  for (const actor of lesson.legacyActors || []) {
    source = source.replace(new RegExp(`^([ \\t]*)${actor}(?=\\s*\\.)`, 'gm'), `$1${lesson.actor}`);
  }
  return source;
}

export function lessonPosition(lessons, lesson) {
  const branch = lessons.filter(item => item.branch === lesson.branch);
  const position = branch.indexOf(lesson);
  return { branch, position, previous: branch[position - 1], next: branch[position + 1] };
}

export function editorHelp(lesson) {
  if (lesson.editorHelp) return lesson.editorHelp;
  const shortcut = lesson.editor?.runOnEnter ? 'Enter runs your program.' : 'Ctrl / ⌘ + Enter runs your program.';
  return {
    text: lesson.editableLine ? `Edit line ${lesson.editableLine}. The other lines stay fixed. ${shortcut}` : `Tab completes a suggestion or indents. ${shortcut}`,
    display: 'always',
  };
}

export function canRecordPractice(lesson, result) {
  if (!result) return false;
  const meaningful = lesson.mode === 'loop' ? result.features.loop && result.actions.length > 0
    : lesson.mode === 'style' ? result.features.assignment
    : lesson.mode === 'drawing' ? result.shapes.length > 0
    : result.interactive ? result.changed : result.actions.length > 0;
  return !!meaningful && (!lesson.practiceFeature || !!result.features[lesson.practiceFeature]);
}

export function requiresQuizAnswer(lesson) {
  return lesson.quiz?.required ?? !!lesson.quiz?.only;
}
