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
const modes = ['commands', 'loop', 'style', 'event', 'update', 'drawing', 'basics', 'robot', 'jump-design'];
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
  requireValue(typeof lesson.branch === 'string' && /^[a-z][a-z0-9-]*$/.test(lesson.branch), `${label}: invalid branch`);
  requireValue(lesson.chapter === undefined || (typeof lesson.chapter === 'string' && /^[a-z][a-z0-9-]*$/.test(lesson.chapter)), `${label}: invalid chapter`);
  requireValue(modes.includes(lesson.mode), `${label}: unknown runtime mode`);
  requireValue(!lesson.layout || lesson.layout === 'compact', `${label}: unknown layout`);
  requireValue(lesson.presentation === undefined || ['scene', 'console'].includes(lesson.presentation), `${label}: unknown presentation`);
  if (lesson.aliases !== undefined) validateIds(lesson.aliases, `${label}: aliases`);
  if (lesson.draftMigrations !== undefined) {
    const source = lines => Array.isArray(lines) && lines.every(line => typeof line === 'string' && !/[\r\n]/.test(line)) && lines.join('\n').length <= 1000;
    requireValue(Array.isArray(lesson.draftMigrations) && lesson.draftMigrations.every(change => change && source(change.from) && source(change.to)), `${label}: invalid draft migrations`);
    requireValue(new Set(lesson.draftMigrations.map(change => change.from.join('\n'))).size === lesson.draftMigrations.length, `${label}: duplicate draft migration source`);
  }
  if (lesson.legacyActors !== undefined) requireValue(lesson.actor && Array.isArray(lesson.legacyActors) && lesson.legacyActors.every(actor => typeof actor === 'string' && /^[a-z][a-z0-9_]*$/.test(actor)), `${label}: invalid legacy actors`);
  if (lesson.editorHelp !== undefined) requireValue(text(lesson.editorHelp?.text) && ['once', 'always'].includes(lesson.editorHelp?.display), `${label}: invalid editor help`);
  if (lesson.editor !== undefined) requireValue(lesson.editor && typeof lesson.editor === 'object' && (lesson.editor.runOnEnter === undefined || typeof lesson.editor.runOnEnter === 'boolean') && (lesson.editor.maxLines === undefined || (Number.isInteger(lesson.editor.maxLines) && lesson.editor.maxLines > 0 && lesson.editor.maxLines <= 1000)), `${label}: invalid editor options`);
  requireValue(lesson.practiceFeature === undefined || ['expression', 'assignment', 'function', 'parameter', 'condition', 'loop', 'comparison'].includes(lesson.practiceFeature), `${label}: unknown practice feature`);
  requireValue(!lesson.actor || lesson.actor === 'character', `${label}: unsupported actor`);
  requireValue(Number.isInteger(lesson.rows) && lesson.rows >= 1 && lesson.rows <= 12, `${label}: rows must be 1–12`);
  requireValue(Array.isArray(lesson.starter) && lesson.starter.every(line => typeof line === 'string') && lesson.starter.join('\n').length <= 1000, `${label}: starter must be an array of Python lines (up to 1,000 characters)`);
  requireValue(lesson.editableLine === undefined || (Number.isInteger(lesson.editableLine) && lesson.editableLine >= 1 && lesson.editableLine <= lesson.starter.length), `${label}: editableLine must identify a starter line`);
  requireValue((lesson.scene?.title === undefined || text(lesson.scene.title)) && text(lesson.scene?.label), `${label}: missing scene text`);
  requireValue(Array.isArray(lesson.completions) && lesson.completions.every(c => text(c.code) && text(c.description)), `${label}: invalid completions`);
  if (lesson.examples) requireValue(Array.isArray(lesson.examples) && lesson.examples.length <= 3 && lesson.examples.every(example => text(example.label) && text(example.code) && example.code.length <= 1000), `${label}: invalid examples`);
  if (lesson.explanation) {
    requireValue(lesson.layout === 'compact' && Array.isArray(lesson.explanation) && lesson.explanation.length >= 1 && lesson.explanation.length <= 4 && lesson.explanation.every(card => text(card.title) && text(card.code) && text(card.text)), `${label}: explanation needs 1–4 cards with title, code and text`);
    requireValue(lesson.starter.length === 0 || lesson.quiz?.only === true, `${label}: explanations use an empty starter or a standalone quiz`);
  }
  if (lesson.quiz) {
    for (const key of ['title', 'initial', 'prompt', 'match', 'different', 'ready']) requireValue(text(lesson.quiz[key]), `${label}: missing quiz.${key}`);
    requireValue(lesson.quiz.required === undefined || typeof lesson.quiz.required === 'boolean', `${label}: quiz.required must be a boolean`);
    requireValue(!lesson.quiz.type || lesson.quiz.type === 'output', `${label}: unknown quiz type`);
    requireValue(lesson.quiz.only === undefined || (lesson.quiz.only === true && lesson.quiz.type === 'output'), `${label}: quiz.only requires an output quiz`);
    if (lesson.quiz.type !== 'output') {
      validateIds(lesson.quiz.choices?.map(c => c.id), `${label}: quiz choices`);
      requireValue(lesson.quiz.choices.every(c => text(c.label) && text(c.firstLine)), `${label}: each quiz choice needs label and firstLine`);
    }
  }
  if (lesson.palette) {
    requireValue(lesson.mode === 'style' && text(lesson.palette.label) && Array.isArray(lesson.palette.choices) && lesson.palette.choices.length > 0 && lesson.palette.choices.every(c => ['peach','lavender','mint','night'].includes(c.value) && text(c.label)), `${label}: invalid sky palette`);
  }
  const feedback = { ...defaults.feedback, ...lesson.feedback };
  for (const key of ['initial','success','empty','installed', ...(['event','update'].includes(lesson.mode) ? ['triggered'] : []), ...(lesson.mode === 'drawing' ? ['drawn'] : [])]) requireValue(text(feedback[key]), `${label}: missing feedback.${key}`);
  return { ...lesson, code: lesson.starter.join('\n'), feedback };
}
export function validateBranches(branches) {
  requireValue(Array.isArray(branches), 'catalog.json: branches must be an array');
  validateIds(branches.map(branch => branch?.id), 'catalog.json: branches');
  for (const branch of branches) {
    requireValue(['label', 'eyebrow', 'title', 'description'].every(key => text(branch[key])), `catalog.json: incomplete branch ${branch.id}`);
    if (branch.chapters !== undefined) {
      requireValue(Array.isArray(branch.chapters), `catalog.json: chapters for ${branch.id} must be an array`);
      validateIds(branch.chapters.map(chapter => chapter?.id), `catalog.json: chapters for ${branch.id}`);
      requireValue(branch.chapters.every(chapter => text(chapter.title) && text(chapter.description)), `catalog.json: incomplete chapter in ${branch.id}`);
    }
    if (branch.planned !== undefined) requireValue(Array.isArray(branch.planned) && branch.planned.every(item => text(item.title) && text(item.description)), `catalog.json: invalid planned entries for ${branch.id}`);
  }
  return branches;
}
export async function loadLessons(skills, read = readContent, branches) {
  const [ids, defaults] = await Promise.all([read('lessons/index.json'), read('lesson-defaults.json')]);
  validateIds(ids, 'lessons/index.json');
  requireValue(defaults && typeof defaults.feedback === 'object', 'lesson-defaults.json: missing feedback');
  branches = validateBranches(branches ?? (await read('catalog.json')).branches);
  const lessons = await Promise.all(ids.map(async id => validateLesson(await read(`lessons/${id}.json`), id, defaults, skills)));
  const names = new Set(ids);
  for (const lesson of lessons) {
    requireValue(branches.some(branch => branch.id === lesson.branch), `lessons/${lesson.id}.json: unknown branch ${lesson.branch}`);
    const branch = branches.find(branch => branch.id === lesson.branch);
    requireValue(branch.chapters ? branch.chapters.some(chapter => chapter.id === lesson.chapter) : lesson.chapter === undefined, `lessons/${lesson.id}.json: unknown or missing chapter`);
    for (const alias of lesson.aliases || []) {
      requireValue(!names.has(alias), `lessons/${lesson.id}.json: duplicate or active alias ${alias}`);
      names.add(alias);
    }
  }
  return lessons;
}
export async function loadTemplates(ids, read = readContent) {
  validateIds(ids, 'catalog.json: templates');
  return Object.fromEntries(await Promise.all(ids.map(async id => {
    const template = await read(`games/${id}.json`);
    for (const key of ['title','genre','icon','description','file','controls','action','placeholder','intro','museumIntro']) requireValue(text(template[key]), `games/${id}.json: missing ${key}`);
    requireValue(template.museumStory === undefined || (template.museumStory && ['title', 'text', 'prompt'].every(key => text(template.museumStory[key]))), `games/${id}.json: invalid museum story`);
    for (const key of ['ideas','guide']) requireValue(Array.isArray(template[key]) && template[key].every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(text)), `games/${id}.json: invalid ${key}`);
    requireValue(Array.isArray(template.complete) && template.complete.length > 0 && template.complete.every(line => typeof line === 'string'), `games/${id}.json: missing complete program`);
    validateIds(template.lessons, `games/${id}.json: lessons`);
    requireValue(template.lessons.length === 4, `games/${id}.json: the game runtime currently expects four exercises`);
    const exercises = await Promise.all(template.lessons.map(async lessonId => {
      const lesson = await read(`game-lessons/${lessonId}.json`);
      requireValue(lesson?.id === lessonId && ['title','description','hint'].every(k => text(lesson[k])), `game-lessons/${lessonId}.json: expected id, title, description and hint`);
      requireValue(lesson.starter === undefined || (Array.isArray(lesson.starter) && lesson.starter.length > 0 && lesson.starter.every(line => typeof line === 'string')), `game-lessons/${lessonId}.json: invalid starter`);
      if (lesson.guide) {
        requireValue(/^[a-z][a-z0-9_]*$/.test(lesson.guide.function) && text(lesson.guide.instruction) && text(lesson.guide.review)
          && (!lesson.guide.replace || text(lesson.guide.replace)) && (!lesson.guide.editAfter || text(lesson.guide.editAfter)), `game-lessons/${lessonId}.json: invalid editor guide`);
      }
      return lesson;
    }));
    return [id, { ...template, completeCode: template.complete.join('\n')+'\n', steps: exercises.map(l => [l.title, l.description, l.hint]), guides: exercises.map(l => l.guide || null), starters: exercises.map(l => l.starter ? l.starter.join('\n')+'\n' : null) }];
  })));
}
