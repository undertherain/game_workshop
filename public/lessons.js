import { createLessonTutor } from './lesson-tutor.js';
import { createScene, initialState } from './scene.js';
import { drawRobot, robotStart, robotPose } from './robot-scene.js';
import { startWorkshop } from './app.js';
import { lessons, games, skillLabels, branches } from './curriculum.js';
import { progress, movementOffer } from './progress.js';
import { restoreProvidedLines, allowsLessonEdit, editableRange } from './lesson-editing.js';
import { resolveLesson, migrateDraft, lessonPosition, lessonChapters, editorHelp, canRecordPractice, requiresQuizAnswer } from './lesson-model.js';
const $ = id => document.getElementById(id);
const input = $('lesson-code'), canvas = $('lesson-game'), scene = createScene(canvas), ctx = canvas.getContext('2d');
let hasLastLesson = false;
let index = 0, drafts = {}, worker, ready = false, busy = false, timer, requestPending = false;
let actions = [], actionStart = null, startX = 250, x = 250, y = 430, quizAnswered = false;
let interactive = false, lastStep = 0, lastFrame = 0, keys = { right: false, space: false }, spacePulse = false;
let result = null, recorded = false, runningSource = '', personal = { sky: 'peach', costume: 'fox' };
try {
  const saved = JSON.parse(localStorage.getItem('little-makers-lessons-v2') || '{}');
  for (const lesson of lessons) {
    const draft = saved.drafts?.[lesson.id];
    if (typeof draft === 'string' && draft.length <= 1000) drafts[lesson.id] = migrateDraft(lesson, draft);
  }
  const savedLesson = resolveLesson(lessons, saved.lesson);
  if (savedLesson) { index = lessons.indexOf(savedLesson); hasLastLesson = true; }
  if (['peach', 'lavender', 'mint', 'night'].includes(saved.personal?.sky)) personal.sky = saved.personal.sky;
  if (['fox', 'cat', 'bunny'].includes(saved.personal?.costume)) personal.costume = saved.personal.costume;
} catch { /* Lessons also work without browser storage. */ }
let speech = '', prediction = '';
let robot = robotStart(), robotTrail = [robotStart()];
let resetBackup = null;
let acceptedSource = '';
const seenEditHints = new Set();
try {
  const saved = JSON.parse(localStorage.getItem('little-makers-edit-hints-v1') || '[]');
  if (Array.isArray(saved)) for (const id of saved) if (typeof id === 'string') seenEditHints.add(id);
} catch { /* One-time hints still work during this visit. */ }
const current = () => lessons[index];
const slideTutor = createLessonTutor(() => ({ lessonId: current().id, code: input.value,
  runningCode: result ? runningSource : '', feedback: $('lesson-feedback').textContent, progress: progress.get() }));
function dismissEditHint() { $('lesson-edit-hint').hidden = true; }
function showEditHint(lesson) {
  dismissEditHint();
  if (document.body.dataset.mode !== 'lessons' || lesson.explanation || lesson.quiz?.only || editorHelp(lesson).display !== 'once' || seenEditHints.has(lesson.id)) return;
  $('lesson-edit-hint-text').textContent = $('lesson-input-help').textContent;
  input.closest('.lesson-input-row').append($('lesson-edit-hint'));
  $('lesson-edit-hint').hidden = false;
  seenEditHints.add(lesson.id);
  try { localStorage.setItem('little-makers-edit-hints-v1', JSON.stringify([...seenEditHints])); } catch { /* Keep in memory. */ }
}
function persist() {
  if (!current().quiz?.only) drafts[current().id] = input.value;
  try { localStorage.setItem('little-makers-lessons-v2', JSON.stringify({ drafts, lesson: current().id, personal })); } catch { /* Keep the current draft in memory. */ }
}
function feedback(message, error = false) { if (current().quiz?.only) $('quiz-feedback').textContent = message; if ($('lesson-feedback').textContent !== message) $('lesson-feedback').textContent = message; $('lesson-feedback').dataset.error = String(error); }
function clearKeys() { keys = { right: false, space: false }; spacePulse = false; }
function syncRunButton() {
  const awaitingAnswer = requiresQuizAnswer(current()) && !quizAnswered;
  $('lesson-run').disabled = busy || awaitingAnswer;
  $('lesson-run').title = awaitingAnswer ? current().quiz.prompt : '';
  if ($('quiz-check')) $('quiz-check').disabled = busy || awaitingAnswer;
  if ($('lesson-prediction')) $('lesson-prediction').disabled = busy;
  for (const button of $('lesson-examples').querySelectorAll('button')) button.disabled = busy;
  $('lesson-run').textContent = interactive ? '■ Stop' : '▶ Run';
  $('lesson-run').setAttribute('aria-pressed', String(interactive));
}
function stopLesson() {
  stopWorker(); finish();
  $('lesson-space').disabled = $('lesson-right').disabled = true;
  $('lesson-loop-status').textContent = 'Stopped · Run starts your rule again.';
  feedback('Stopped. Your code is still here. Press Run to start again.');
}
function resetScene() { robot = robotStart(); robotTrail = [robotStart()]; speech = ''; $('lesson-speech').textContent = ''; $('lesson-transcript').replaceChildren(); $('lesson-transcript').hidden = true; $('lesson-output').hidden = true; actions = []; actionStart = null; x = startX = 250; y = 430; result = null; interactive = false; clearKeys(); syncRunButton(); }
function suggestions() {
  const line = input.value.slice(0, input.selectionStart).split('\n').at(-1).trim();
  $('lesson-completions').replaceChildren();
  if (!line) return;
  for (const { code: command, description } of current().completions) {
    if (!command.startsWith(line) || command === line) continue;
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = command; const small = document.createElement('small'); small.textContent = description; button.append(small);
    button.onclick = () => {
      const end = input.value.indexOf('\n', input.selectionStart);
      const start = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1;
      const indent = input.value.slice(start).match(/^ */)[0];
      input.setRangeText(indent + command, start, end < 0 ? input.value.length : end, 'end');
      edited(); input.focus();
    };
    $('lesson-completions').append(button);
  }
}
function render() {
  resetBackup = null; $('lesson-undo-reset').hidden = true;
  const lesson = current(), { position, next } = lessonPosition(lessons, lesson);
  const branchInfo = branches.find(branch => branch.id === lesson.branch);
  const chapters = lessonChapters(lessons, branchInfo);
  const chapterIndex = chapters.findIndex(chapter => chapter.lessons.includes(lesson));
  const chapter = chapters[chapterIndex], chapterPosition = chapter.lessons.indexOf(lesson);
  $('lessons').dataset.layout = lesson.layout || 'split';
  $('lessons').dataset.console = String(lesson.presentation === 'console');
  $('lessons').dataset.explanation = String(!!lesson.explanation);
  document.querySelector('.lesson-topline .eyebrow').textContent = lesson.explanation ? 'A LITTLE PYTHON' : lesson.layout === 'compact' ? 'TRY IT IN CODE' : 'YOUR NEXT LITTLE PROGRAM';
  $('lesson-explanation').hidden = !lesson.explanation;
  $('lesson-explanation').replaceChildren(...(lesson.explanation || []).map(card => {
    const article = document.createElement('article');
    const title = document.createElement('h2'); title.textContent = card.title;
    const code = document.createElement('pre'); const example = document.createElement('code'); example.textContent = card.code; code.append(example);
    const description = document.createElement('p'); description.textContent = card.text;
    article.append(title, code, description); return article;
  }));
  $('lesson-title').textContent = lesson.heading; $('lesson-description').textContent = lesson.description;
  if (branchInfo.chapters) document.querySelector('.lesson-topline .eyebrow').textContent = `CHAPTER ${chapterIndex + 1} OF ${chapters.length}`;
  $('lesson-progress').textContent = `${branchInfo.chapters ? chapter.title : branchInfo.label} · ${chapterPosition + 1} / ${chapter.lessons.length}`;
  $('lesson-dots').replaceChildren(...chapter.lessons.map((item, i) => {
    const dot = document.createElement('button'); dot.type = 'button';
    dot.className = i <= chapterPosition ? 'active' : '';
    dot.title = `${i + 1}. ${item.title}`;
    dot.setAttribute('aria-label', `Lesson ${i + 1}: ${item.title}`);
    if (i === chapterPosition) dot.setAttribute('aria-current', 'step');
    dot.onclick = () => openLesson(item.id);
    return dot;
  }));
  document.querySelector('.lesson-card').hidden = !!lesson.quiz?.only || !!lesson.explanation;
  input.value = lesson.quiz?.only ? lesson.code : (drafts[lesson.id] ?? lesson.code); input.rows = lesson.rows; input.disabled = false;
  input.value = restoreProvidedLines(input.value, lesson); acceptedSource = input.value;
  $('lesson-editor').classList.toggle('guided', !!lesson.editableLine);
  $('lesson-line-highlight').hidden = !lesson.editableLine;
  $('lesson-editor').style.setProperty('--editable-row', (lesson.editableLine || 1) - 1);
  $('lesson-editor').style.setProperty('--code-rows', lesson.rows);
  input.placeholder = lesson.placeholder;
  $('lesson-examples').hidden = !lesson.examples?.length;
  $('lesson-examples').replaceChildren(...(lesson.examples || []).map(example => {
    const button = document.createElement('button'); button.type = 'button';
    const label = document.createElement('span'); label.textContent = example.label;
    const code = document.createElement('code'); code.textContent = example.code;
    button.append(label, code);
    button.onclick = () => { if (!busy) restoreLessonCode(example.code, 'Press Run to try this version.'); };
    return button;
  }));
  $('lesson-back').disabled = position === 0;
  $('lesson-next').textContent = next && next.chapter !== lesson.chapter ? `Next chapter: ${chapters.find(chapter => chapter.lessons.includes(next)).title} →` : !next ? 'Choose a game or another path →' : next.explanation ? 'Next idea →' : lesson.explanation ? 'Try it in code →' : 'Next little step →';
  $('lesson-quiz').hidden = !lesson.quiz; quizAnswered = !lesson.quiz;
  $('quiz-feedback').textContent = ''; renderQuiz(lesson.quiz); renderPalette(lesson.palette); resetScene(); recorded = false; suggestions();
  const live = ['event', 'update'].includes(lesson.mode);
  $('lesson-live').hidden = !live; $('lesson-space').hidden = lesson.mode !== 'event'; $('lesson-right').hidden = lesson.mode !== 'update';
  $('lesson-space').disabled = true; $('lesson-right').disabled = true;
  $('lesson-loop-status').textContent = 'Run installs your rule. Then try the control.';
  $('lesson-palette').hidden = !lesson.palette;
  $('lesson-scene-title').textContent = lesson.scene.title || '';
  $('lesson-scene-title').parentElement.hidden = !lesson.scene.title;
  canvas.dataset.drawing = String(lesson.mode === 'drawing');
  canvas.dataset.robot = String(lesson.mode === 'robot');
  canvas.width = lesson.mode === 'robot' ? 480 : 840;
  canvas.setAttribute('aria-label', lesson.scene.label);
  const help = editorHelp(lesson);
  $('lesson-input-help').textContent = help.text;
  $('lesson-input-help').classList.toggle('sr-only', help.display === 'once');
  showEditHint(lesson);
  feedback(lesson.quiz ? lesson.quiz.initial : lesson.feedback.initial);
  slideTutor.show(lesson);
}
function stopWorker() { worker?.terminate(); worker = null; ready = false; requestPending = false; interactive = false; clearTimeout(timer); clearKeys(); syncRunButton(); }
function finish() { busy = false; input.disabled = false; $('lesson-run').disabled = false; $('lesson-back').disabled = !lessonPosition(lessons, current()).previous; $('lesson-next').disabled = false; syncRunButton(); }
function fail(message) { stopWorker(); actions = []; finish(); $('lesson-space').disabled = $('lesson-right').disabled = true; feedback(message, true); }
function recordPractice() {
  if (recorded) return;
  const lesson = current();
  if (!canRecordPractice(lesson, result)) return;
  recorded = true; progress.record({ skill: lesson.skill, source: 'lesson:' + lesson.id, evidence: 'practice' });
}
function send(type) {
  requestPending = true;
  timer = setTimeout(() => fail('Python took too long. Press Run to retry.'), 3000);
  worker.postMessage({ type, code: runningSource, mode: current().mode, keys: { ...keys, space: keys.space || spacePulse } });
  spacePulse = false;
}
function receive(data) {
  clearTimeout(timer); requestPending = false;
  if (data.type === 'ready') { ready = true; send('run'); return; }
  if (data.type === 'error') { fail(data.error); return; }
  if (data.error) { fail(data.error); return; }
  result = data;
  if (current().quiz?.type === 'output' && data.type !== 'step') {
    const output = data.actions.filter(a => a.kind === 'say').map(a => a.text).join('\n');
    $('quiz-feedback').textContent = `${quizAnswered ? (prediction.trim() === output ? current().quiz.match : current().quiz.different) + ' ' : ''}Python gives ${output}.`;
    if (current().quiz.only) { finish(); recordPractice(); return; }
  }
  if (data.type === 'step') {
    const mode = current().mode;
    $('lesson-loop-status').textContent = mode === 'event' ? `Space events: ${data.eventCalls} · your function waits between presses` : `update() calls: ${data.ticks} · Right is ${keys.right ? 'held' : 'released'}`;
    if (data.changed) { recordPractice(); feedback(current().feedback.triggered); }
    return;
  }
  interactive = data.interactive;
  if (interactive) {
    finish(); $('lesson-space').disabled = $('lesson-right').disabled = false;
    canvas.focus({ preventScroll: true });
    feedback(current().feedback.installed);
  } else if (current().mode === 'drawing') {
    finish(); recordPractice(); feedback(data.shapes.length ? `You drew ${data.shapes.length} ${data.shapes.length === 1 ? 'shape' : 'shapes'}. ${current().feedback.drawn}` : current().feedback.empty);
  } else {
    if (current().mode === 'style') { personal = { sky: data.world.sky, costume: data.player.costume }; persist(); }
    actions = [...data.actions]; actionStart = null;
    if (!actions.length) { finish(); recordPractice(); feedback(current().feedback.empty); }
    else feedback(`Your instructions: ${data.actions.map(action => typeof action === 'string' ? action : action.kind === 'say' ? 'say' : action.kind === 'robot' ? action.label : `${action.kind}(${action.height ?? action.distance})`).join(' → ')}.`);
  }
}
function run() {
  if (busy || (current().explanation && !current().quiz)) return;
  if (!quizAnswered && requiresQuizAnswer(current())) { feedback(current().quiz.prompt); $('lesson-quiz').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  if (!input.value.trim()) { feedback('Write an instruction first. Try the example above.', true); input.focus(); return; }
  if (current().editor?.maxLines && input.value.trim().split('\n').length > current().editor.maxLines) { feedback(`Use at most ${current().editor.maxLines} ${current().editor.maxLines === 1 ? 'line' : 'lines'} in this editor.`, true); return; }
  persist(); runningSource = input.value; recorded = false;
  if (requestPending) stopWorker();
  busy = true; input.disabled = true; $('lesson-run').disabled = true; $('lesson-back').disabled = true; $('lesson-next').disabled = true;
  $('lesson-space').disabled = $('lesson-right').disabled = true;
  $('lesson-completions').replaceChildren(); resetScene();
  feedback(ready ? 'Trying your instructions…' : 'Waking up Python…');
  if (ready) { send('run'); return; }
  stopWorker(); worker = new Worker('/lesson-worker.js', { type: 'module' }); const thisWorker = worker;
  timer = setTimeout(() => fail('Python took too long to start. Press Run to retry.'), 25000);
  worker.onerror = event => { if (worker !== thisWorker) return; event.preventDefault(); fail('Python could not start. Press Run to retry.'); };
  worker.onmessage = ({ data }) => { if (worker === thisWorker) receive(data); };
}
function drawGrid() {
  ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, 840, 480); ctx.lineWidth = 1;
  ctx.strokeStyle = '#dce4d3'; ctx.beginPath();
  for (let a = 0; a <= 840; a += 60) { ctx.moveTo(a, 0); ctx.lineTo(a, 480); }
  for (let b = 0; b <= 480; b += 60) { ctx.moveTo(0, b); ctx.lineTo(840, b); } ctx.stroke();
  ctx.fillStyle = '#6f8065'; ctx.font = '14px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('0, 0', 10, 22); ctx.fillText('x → 840', 750, 22); ctx.fillText('y ↓ 480', 10, 465);
  for (const shape of result?.shapes || []) {
    const [a, b, c, d] = shape.points; ctx.fillStyle = '#bf7649'; ctx.strokeStyle = '#315d4c'; ctx.lineWidth = 5;
    ctx.beginPath(); if (shape.kind === 'dot') { ctx.arc(a, b, 9, 0, Math.PI * 2); ctx.fill(); } else { ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  }
}
function frame(time) {
  if (document.body.dataset.mode === 'lessons' && !document.hidden && time - lastFrame >= 30) {
    lastFrame = time;
    if (interactive && ready && !requestPending && time - lastStep >= 33.33) { lastStep = time; send('step'); }
    if (actions.length) {
      if (actionStart === null) {
        actionStart = time; startX = x;
        if (actions[0].kind === 'say') {
          speech = actions[0].text;
          if (current().presentation === 'console') {
            const line = document.createElement('div'); line.textContent = speech || '“”';
            $('lesson-output').hidden = false; $('lesson-transcript').hidden = false; $('lesson-transcript').append(line);
          } else {
            $('lesson-speech').textContent = speech || 'Empty speech bubble';
          }
        }
      }
      const t = Math.min(1, (time - actionStart) / 700);
      if (actions[0].kind === 'robot') robot = robotPose(actions[0], t);
      else if (actions[0] === 'jump' || actions[0].kind === 'jump') y = 430 - Math.sin(t * Math.PI) * (actions[0].height ?? 110);
      else if (actions[0].kind !== 'say') x = Math.max(50, Math.min(790, startX + t * (actions[0].distance ?? 80)));
      if (t === 1) { if (actions[0].kind === 'robot') { robotTrail.push({ ...robot }); $('lesson-speech').textContent = `Robot at column ${robot.x + 1}, row ${robot.y + 1}, facing ${['right', 'down', 'left', 'up'][robot.turns % 4]}.`; } actions.shift(); actionStart = null; y = 430; if (!actions.length) { finish(); recordPractice(); feedback(current().feedback.success); } }
    }
    if (current().mode === 'robot') drawRobot(ctx, robot, robotTrail);
    else if (current().mode === 'drawing') drawGrid();
    else {
      scene.update({ ...initialState, stars: [], platforms: [[0, 430, 840]], world: { ...initialState.world, sky: personal.sky }, player: result?.interactive ? { ...result.player, costume: current().actor ? personal.costume : 'fox' } : { x, y, facing: 1, costume: current().actor ? personal.costume : 'fox', on_ground: y === 430 } });
      scene.draw(time);
      if (speech) {
        ctx.save(); ctx.font = '23px system-ui'; ctx.textAlign = 'left';
        const text = speech.length > 45 ? speech.slice(0, 42) + '…' : speech;
        const width = Math.min(780, ctx.measureText(text).width + 32), left = Math.max(12, Math.min(x - 45, 828 - width));
        ctx.fillStyle = '#fffef9'; ctx.strokeStyle = '#71936c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(left, y - 145, width, 54, 14); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(left + 25, y - 91); ctx.lineTo(left + 34, y - 77); ctx.lineTo(left + 44, y - 91); ctx.fill();
        ctx.fillStyle = '#284b43'; ctx.fillText(text.replace(/\n/g, ' '), left + 16, y - 110, width - 32); ctx.restore();
      }
    }
  }
  requestAnimationFrame(frame);
}
function renderMap() {
  const records = progress.get().records;
  const count = new Set(records.map(r => r.skill)).size;
  $('map-progress-note').textContent = count ? `${count} concepts explored in this browser. Choose any path; nothing is locked.` : 'Start with one instruction. Every path stays open, and your practice is remembered in this browser.';
  $('lesson-branches').replaceChildren();
  for (const branch of branches) {
    const section = document.createElement('section'); section.className = 'map-branch';
    const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = branch.eyebrow;
    const heading = document.createElement('h2'); heading.textContent = branch.title;
    const description = document.createElement('p'); description.textContent = branch.description;
    const branchLessons = lessons.filter(l => l.branch === branch.id);
    const completed = branchLessons.filter(l => records.some(r => r.source === 'lesson:' + l.id)).length;
    const summary = document.createElement('p'); summary.className = 'branch-progress';
    summary.textContent = `${completed} of ${branchLessons.length} stages completed`;
    section.append(eyebrow, heading, description, summary);
    $('lesson-branches').append(section);
    const chapters = lessonChapters(lessons, branch);
    for (const [chapterIndex, chapter] of chapters.entries()) {
      const target = document.createElement('div'); target.className = 'skill-nodes'; target.dataset.branch = branch.id;
      if (branch.chapters) {
        const group = document.createElement('details'); group.className = 'curriculum-chapter'; group.dataset.chapter = chapter.id;
        group.open = chapter.lessons.includes(current());
        const toggle = document.createElement('summary');
        const title = document.createElement('strong'); title.textContent = `${chapterIndex + 1}. ${chapter.title}`;
        const count = document.createElement('span'); count.className = 'chapter-count';
        count.textContent = `${chapter.lessons.filter(l => records.some(r => r.source === 'lesson:' + l.id)).length} / ${chapter.lessons.length} completed`;
        const description = document.createElement('p'); description.textContent = chapter.description;
        toggle.append(title, count); group.append(toggle, description, target); section.append(group);
      } else section.append(target);
      for (const lesson of chapter.lessons) {
        const practiced = records.some(r => r.source === 'lesson:' + lesson.id);
        const button = document.createElement('button'); button.className = 'skill-node';
        const title = document.createElement('strong'); title.textContent = lesson.title;
        const note = document.createElement('span'); note.textContent = skillLabels[lesson.skill];
        const status = document.createElement('span'); status.className = 'stage-status';
        status.textContent = practiced ? '✓ Completed' : 'Explore →';
        button.dataset.practiced = String(practiced); button.append(title, note, status); button.onclick = () => openLesson(lesson.id); target.append(button);
      }
    }
    for (const planned of branch.planned || []) {
      const card = document.createElement('div'); card.className = 'future-node';
      const title = document.createElement('strong'); title.textContent = planned.title;
      const note = document.createElement('span'); note.textContent = planned.description;
      card.append(title, note); section.append(card);
    }
  }
  $('game-library-cards').replaceChildren();
  for (const game of games) {
    const article = document.createElement('article'); article.className = 'library-card';
    const icon = document.createElement('span'); icon.className = 'library-mark'; icon.textContent = game.mark;
    const title = document.createElement('h3'); title.textContent = game.title;
    const description = document.createElement('p'); description.textContent = game.description;
    const concepts = document.createElement('small'); concepts.textContent = game.concepts;
    article.append(icon, title, description, concepts);
    const note = document.createElement('p'); note.className = 'library-recommendation';
    note.textContent = game.available ? movementOffer(progress.get(), game.id) ? 'Movement checked in another game. Optional controls are available for an untouched starter.' : game.recommendation : 'Planned game · not playable yet'; article.append(note);
    if (game.available) { const button = document.createElement('button'); button.className = 'primary'; button.textContent = 'Build this game →'; button.onclick = () => openWorkshop(game.id); article.append(button); }
    $('game-library-cards').append(article);
  }
}
function setMode(mode) {
  dismissEditHint();
  if (document.body.dataset.mode === 'lessons') persist();
  stopWorker(); resetScene(); finish(); window.workshop?.setKeys({});
  document.body.dataset.mode = mode;
  $('title-screen').hidden = mode !== 'home';
  $('lessons').hidden = mode !== 'lessons'; $('workshop-main').hidden = mode !== 'workshop'; $('learning-map').hidden = mode !== 'map';
  $('mode-toggle').textContent = mode === 'lessons' ? 'Open game workshop ↗' : '← First commands';
  $('map-toggle').setAttribute('aria-pressed', String(mode === 'map'));
  window.scrollTo(0, 0);
}
function openHome() {
  updateRoute('');
  setMode('home');
  $('resume-lesson').textContent = hasLastLesson ? `Last lesson: ${current().title}` : `Start with: ${lessons[0].title}. No Python experience needed.`;
  $('title-continue').textContent = hasLastLesson ? 'Continue to last lesson →' : 'Start your first lesson →';
  $('title-screen-heading').focus({ preventScroll: true });
}
function openMap() { updateRoute('#map'); setMode('map'); renderMap(); $('map-title').focus(); }
function openLesson(id) {
  const nextIndex = lessons.findIndex(l => l.id === id);
  if (nextIndex < 0) return;
  updateRoute(`#lesson/${id}`);
  hasLastLesson = true; setMode('lessons'); index = nextIndex; render(); persist(); $('lesson-title').focus();
}
let applyingRoute = false;
function updateRoute(hash) {
  if (!applyingRoute && location.hash !== hash) history.pushState(null, '', location.pathname + location.search + hash);
}
function applyRoute() {
  applyingRoute = true;
  try {
    const hash = location.hash;
    const requestedId = hash.startsWith('#lesson/') ? hash.slice(8) : '';
    const id = resolveLesson(lessons, requestedId)?.id || requestedId;
    if (requestedId !== id) history.replaceState(null, '', location.pathname + location.search + `#lesson/${id}`);
    if (lessons.some(lesson => lesson.id === id)) openLesson(id);
    else if (hash === '#map') openMap();
    else if (hash === '#workshop') openWorkshop();
    else {
      if (hash) history.replaceState(null, '', location.pathname + location.search);
      openHome();
    }
  } finally { applyingRoute = false; }
}
let opening = false;
async function openWorkshop(id) {
  if (opening) return; opening = true;
  updateRoute('#workshop');
  setMode('workshop');
  try { await startWorkshop(); if (id && window.workshop.getTemplate() !== id) await window.workshop.selectTemplate(id); }
  finally { opening = false; }
}
function edited() {
  if (!allowsLessonEdit(input.value, current())) {
    const caret = input.selectionStart;
    input.value = acceptedSource;
    const range = editableRange(input.value, current());
    input.setSelectionRange(Math.max(range.start, Math.min(caret, range.end)), Math.max(range.start, Math.min(caret, range.end)));
    return;
  }
  acceptedSource = input.value;
  if (interactive) { stopWorker(); finish(); $('lesson-space').disabled = $('lesson-right').disabled = true; feedback('Your rule changed. Run it to install this version.'); }
  persist(); suggestions();
}
$('home-link').onclick = event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openHome(); };
$('title-map').onclick = openMap;
$('title-continue').onclick = () => openLesson(current().id);
$('map-toggle').onclick = openMap;
$('mode-toggle').onclick = () => document.body.dataset.mode === 'lessons' ? openWorkshop() : openLesson(current().id);
function restoreLessonCode(source, message) {
  stopWorker(); resetScene(); finish(); recorded = false; runningSource = '';
  $('lesson-space').disabled = $('lesson-right').disabled = true;
  $('lesson-loop-status').textContent = 'Run installs your rule. Then try the control.';
  input.value = restoreProvidedLines(source, current()); acceptedSource = input.value;
  persist(); suggestions(); feedback(message); input.focus();
}
$('lesson-reset').onclick = () => {
  if (input.value !== current().code) resetBackup = input.value;
  restoreLessonCode(current().code, 'Starting code restored. Try your program and press Run.');
  $('lesson-undo-reset').hidden = resetBackup === null;
};
$('lesson-undo-reset').onclick = () => {
  if (resetBackup === null) return;
  restoreLessonCode(resetBackup, 'Your code is back. Press Run when you’re ready.');
  resetBackup = null; $('lesson-undo-reset').hidden = true;
};
$('lesson-form').onsubmit = event => { event.preventDefault(); if (interactive) stopLesson(); else run(); };
input.oninput = edited; input.onclick = suggestions;
input.onfocus = dismissEditHint;
input.onpointerdown = dismissEditHint;
$('lesson-edit-hint-close').onclick = dismissEditHint;
$('lesson-run').addEventListener('click', dismissEditHint);
input.onbeforeinput = event => {
  if (!current().editableLine || event.inputType?.startsWith('history')) return;
  const { start, end } = editableRange(input.value, current());
  const from = input.selectionStart, to = input.selectionEnd;
  if (from < start || to > end ||
      (from === to && ((event.inputType === 'deleteContentBackward' && from === start) ||
        (event.inputType === 'deleteContentForward' && to === end))) ||
      ['insertParagraph', 'insertLineBreak'].includes(event.inputType) || /[\r\n]/.test(event.data || '')) event.preventDefault();
};
input.onkeydown = event => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    if ($('lesson-completions').firstElementChild) $('lesson-completions').firstElementChild.click();
    else { input.setRangeText('    ', input.selectionStart, input.selectionEnd, 'end'); edited(); }
  }
  if (event.key === 'Escape') $('lesson-completions').replaceChildren();
  if (event.key === 'Enter') {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey || current().editor?.runOnEnter) run();
    else { const line = input.value.slice(0, input.selectionStart).split('\n').at(-1); const indent = line.match(/^ */)[0] + (line.trimEnd().endsWith(':') ? '    ' : ''); input.setRangeText('\n' + indent, input.selectionStart, input.selectionEnd, 'end'); edited(); }
  }
};
function navigate(delta) {
  const { branch, position } = lessonPosition(lessons, current());
  const next = branch[position + delta];
  if (next) openLesson(next.id); else openMap();
}
$('lesson-back').onclick = () => navigate(-1); $('lesson-next').onclick = () => navigate(1);
function renderQuiz(quiz) {
  prediction = '';
  $('quiz-choices').replaceChildren();
  if (quiz?.type === 'output') {
    const answer = document.createElement('input'); answer.type = 'text'; answer.id = 'lesson-prediction'; answer.autocomplete = 'off'; answer.placeholder = 'Your prediction'; answer.setAttribute('aria-label', quiz.title);
    answer.oninput = () => { prediction = answer.value; quizAnswered = !!prediction.trim(); $('quiz-feedback').textContent = ''; syncRunButton(); };
    $('quiz-choices').append(answer);
    if (quiz.only) {
      const check = document.createElement('button'); check.id = 'quiz-check'; check.type = 'button'; check.className = 'primary'; check.textContent = 'Check answer'; check.onclick = run;
      answer.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); run(); } };
      $('quiz-choices').append(check);
    }
  }
  $('quiz-title').textContent = quiz?.title || '';
  for (const choice of quiz?.choices || []) {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.answer = choice.id; button.textContent = choice.label; button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      quizAnswered = true;
      for (const option of $('quiz-choices').querySelectorAll('button')) option.setAttribute('aria-pressed', String(option === button));
      syncRunButton();
      const first = input.value.trim().split('\n')[0].trim();
      $('quiz-feedback').textContent = first === choice.firstLine ? quiz.match : quiz.different;
      feedback(quiz.ready);
    };
    $('quiz-choices').append(button);
  }
}
function renderPalette(palette) {
  $('lesson-palette').replaceChildren();
  if (!palette) return;
  const label = document.createElement('span'); label.textContent = palette.label;
  $('lesson-palette').append(label);
  for (const choice of palette.choices) {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.sky = choice.value; button.textContent = choice.label;
    button.onclick = () => {
      if (busy) return;
      const assignment = `world.sky = "${choice.value}"`;
      input.value = /^world\.sky\s*=.*$/m.test(input.value) ? input.value.replace(/^world\.sky\s*=.*$/m, assignment) : assignment + '\n' + input.value;
      edited(); feedback('The sky choice changed your code. Run it to see the result.');
    };
    $('lesson-palette').append(button);
  }
}
$('lesson-space').onclick = () => { spacePulse = true; };
$('lesson-right').onpointerdown = event => { event.preventDefault(); $('lesson-right').setPointerCapture(event.pointerId); keys.right = true; };
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('lesson-right').addEventListener(name, () => keys.right = false);
$('lesson-right').onkeydown = event => { if ([' ', 'Enter', 'ArrowRight'].includes(event.key)) { event.preventDefault(); keys.right = true; } };
$('lesson-right').onkeyup = () => keys.right = false;
document.addEventListener('keydown', event => {
  if (document.body.dataset.mode !== 'lessons' || document.activeElement !== canvas || !interactive) return;
  if (event.code === 'ArrowRight') { event.preventDefault(); keys.right = true; }
  if (event.code === 'Space') { event.preventDefault(); keys.space = true; }
});
document.addEventListener('keyup', event => { if (event.code === 'ArrowRight') keys.right = false; if (event.code === 'Space') keys.space = false; });
window.addEventListener('blur', clearKeys); canvas.addEventListener('blur', clearKeys); $('lesson-right').addEventListener('blur', clearKeys); document.addEventListener('visibilitychange', clearKeys);
window.addEventListener('workshop-progress', () => { if (document.body.dataset.mode === 'map') renderMap(); });
window.addEventListener('hashchange', applyRoute);
render(); applyRoute(); requestAnimationFrame(frame);
