// Shared by the browser and Node tutor: lesson content has one source of truth.
export async function readContent(path) {
  const url = new URL(`./content/${path}`, import.meta.url);
  try {
    if (url.protocol === 'file:') {
      const { readFile } = await import('node:fs/promises');
      return JSON.parse(await readFile(url, 'utf8'));
    }
    const response = await fetch(url);
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) { throw Error(`Could not load content/${path}: ${error.message}`); }
}
const modes = ['commands', 'loop', 'style', 'event', 'update', 'drawing'];
function requireValue(condition, message) { if (!condition) throw Error(message); }
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
export function validateIds(ids, label) {
  requireValue(Array.isArray(ids) && ids.length > 0 && ids.every(id => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id)), `${label}: expected a nonempty list of lowercase IDs`);
  requireValue(new Set(ids).size === ids.length, `${label}: duplicate IDs`);
}
export function validateLesson(lesson, id, defaults, skills) {
  const label = `lessons/${id}.json`;
  requireValue(lesson?.id === id, `${label}: id must match the manifest`);
  for (const key of ['title', 'heading', 'description', 'placeholder', 'skill']) requireValue(text(lesson[key]), `${label}: missing ${key}`);
  requireValue(Object.hasOwn(skills, lesson.skill), `${label}: unknown skill`);
  requireValue(['foundations', 'drawing'].includes(lesson.branch), `${label}: unknown branch`);
  requireValue(modes.includes(lesson.mode), `${label}: unknown runtime mode`);
  requireValue(!lesson.actor || lesson.actor === 'character', `${label}: unsupported actor`);
  requireValue(Number.isInteger(lesson.rows) && lesson.rows >= 1 && lesson.rows <= 12, `${label}: rows must be 1–12`);
  requireValue(Array.isArray(lesson.starter) && lesson.starter.every(line => typeof line === 'string') && lesson.starter.join('\n').length <= 1000, `${label}: starter must be an array of Python lines (up to 1,000 characters)`);
  requireValue(text(lesson.scene?.title) && text(lesson.scene?.label), `${label}: missing scene text`);
  requireValue(Array.isArray(lesson.completions) && lesson.completions.every(c => text(c.code) && text(c.description)), `${label}: invalid completions`);
  if (lesson.quiz) {
    for (const key of ['title', 'initial', 'prompt', 'match', 'different', 'ready']) requireValue(text(lesson.quiz[key]), `${label}: missing quiz.${key}`);
    validateIds(lesson.quiz.choices?.map(c => c.id), `${label}: quiz choices`);
    requireValue(lesson.quiz.choices.every(c => text(c.label) && text(c.firstLine)), `${label}: each quiz choice needs label and firstLine`);
  }
  if (lesson.palette) {
    requireValue(lesson.mode === 'style' && text(lesson.palette.label) && Array.isArray(lesson.palette.choices) && lesson.palette.choices.length > 0 && lesson.palette.choices.every(c => ['peach','lavender','mint','night'].includes(c.value) && text(c.label)), `${label}: invalid sky palette`);
  }
  const feedback = { ...defaults.feedback, ...lesson.feedback };
  for (const key of ['initial','success','empty','installed', ...(['event','update'].includes(lesson.mode) ? ['triggered'] : []), ...(lesson.mode === 'drawing' ? ['drawn'] : [])]) requireValue(text(feedback[key]), `${label}: missing feedback.${key}`);
  return { ...lesson, code: lesson.starter.join('\n'), feedback };
}
export async function loadLessons(skills, read = readContent) {
  const [ids, defaults] = await Promise.all([read('lessons/index.json'), read('lesson-defaults.json')]);
  validateIds(ids, 'lessons/index.json');
  requireValue(defaults && typeof defaults.feedback === 'object', 'lesson-defaults.json: missing feedback');
  return Promise.all(ids.map(async id => validateLesson(await read(`lessons/${id}.json`), id, defaults, skills)));
}
export async function loadTemplates(ids, read = readContent) {
  validateIds(ids, 'catalog.json: templates');
  return Object.fromEntries(await Promise.all(ids.map(async id => {
    const template = await read(`games/${id}.json`);
    for (const key of ['title','genre','icon','description','file','controls','action','placeholder','intro']) requireValue(text(template[key]), `games/${id}.json: missing ${key}`);
    for (const key of ['ideas','guide']) requireValue(Array.isArray(template[key]) && template[key].every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(text)), `games/${id}.json: invalid ${key}`);
    validateIds(template.lessons, `games/${id}.json: lessons`);
    requireValue(template.lessons.length === 4, `games/${id}.json: the game runtime currently expects four exercises`);
    const steps = await Promise.all(template.lessons.map(async lessonId => {
      const lesson = await read(`game-lessons/${lessonId}.json`);
      requireValue(lesson?.id === lessonId && ['title','description','hint'].every(k => text(lesson[k])), `game-lessons/${lessonId}.json: expected id, title, description and hint`);
      return [lesson.title, lesson.description, lesson.hint];
    }));
    return [id, { ...template, steps }];
  })));
}
