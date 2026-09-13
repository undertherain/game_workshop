// Keep supplied lines intact while allowing one complete line to be edited.
export function restoreProvidedLines(source, lesson) {
  if (!lesson.editableLine) return source;
  const lines = lesson.code.split('\n');
  const row = lesson.editableLine - 1;
  lines[row] = source.split('\n')[row] ?? lines[row];
  return lines.join('\n');
}

export function allowsLessonEdit(source, lesson) {
  return restoreProvidedLines(source, lesson) === source;
}

export function editableRange(source, lesson) {
  if (!lesson.editableLine) return { start: 0, end: source.length };
  const lines = source.split('\n');
  const start = lines.slice(0, lesson.editableLine - 1).reduce((n, line) => n + line.length + 1, 0);
  return { start, end: start + lines[lesson.editableLine - 1].length };
}
