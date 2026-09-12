import { createScene, initialState } from './scene.js';
import { startWorkshop } from './app.js';
import { lessons, games, skillLabels } from './curriculum.js';
import { progress, movementOffer } from './progress.js';
const $ = id => document.getElementById(id);
const input = $('lesson-code'), canvas = $('lesson-game'), scene = createScene(canvas), ctx = canvas.getContext('2d');
const foundation = lessons.filter(l => l.branch === 'foundations');
let index = 0, drafts = {}, worker, ready = false, busy = false, timer, requestPending = false;
let actions = [], actionStart = null, startX = 250, x = 250, y = 430, quizAnswered = false;
let interactive = false, lastStep = 0, lastFrame = 0, keys = { right: false, space: false }, spacePulse = false;
let result = null, recorded = false, runningSource = '', personal = { sky: 'peach', costume: 'fox' };
try {
  const saved = JSON.parse(localStorage.getItem('little-makers-lessons-v2') || '{}');
  for (const lesson of lessons) if (typeof saved.drafts?.[lesson.id] === 'string' && saved.drafts[lesson.id].length <= 1000) drafts[lesson.id] = saved.drafts[lesson.id];
  const savedIndex = lessons.findIndex(l => l.id === saved.lesson); if (savedIndex >= 0) index = savedIndex;
  if (['peach', 'lavender', 'mint', 'night'].includes(saved.personal?.sky)) personal.sky = saved.personal.sky;
  if (['fox', 'cat', 'bunny'].includes(saved.personal?.costume)) personal.costume = saved.personal.costume;
} catch { /* Lessons also work without browser storage. */ }
const current = () => lessons[index];
function persist() {
  drafts[current().id] = input.value;
  try { localStorage.setItem('little-makers-lessons-v2', JSON.stringify({ drafts, lesson: current().id, personal })); } catch { /* Keep the current draft in memory. */ }
}
function feedback(message, error = false) { if ($('lesson-feedback').textContent !== message) $('lesson-feedback').textContent = message; $('lesson-feedback').dataset.error = String(error); }
function clearKeys() { keys = { right: false, space: false }; spacePulse = false; }
function resetScene() { actions = []; actionStart = null; x = startX = 250; y = 430; result = null; interactive = false; clearKeys(); }
function suggestions() {
  const line = input.value.slice(0, input.selectionStart).split('\n').at(-1).trim();
  $('lesson-completions').replaceChildren();
  if (!line) return;
  const options = current().mode === 'drawing' ? [['dot(420, 240)', 'Place a point at x, y'], ['line(220, 300, 620, 300)', 'Connect two endpoints']]
    : [['fox.jump()', 'Jump up and land'], ['fox.move()', 'Move right'], ...(current().mode === 'style' ? [['world.sky = "night"', 'Change the sky'], ['fox.costume = "bunny"', 'Choose a character']] : [])];
  for (const [command, description] of options) {
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
  const lesson = current(), branch = lessons.filter(l => l.branch === lesson.branch), position = branch.indexOf(lesson);
  $('lesson-title').textContent = lesson.heading; $('lesson-description').textContent = lesson.description;
  $('lesson-progress').textContent = `${lesson.branch === 'drawing' ? 'Drawing' : 'Foundations'} · ${position + 1} / ${branch.length}`;
  $('lesson-dots').replaceChildren(...branch.map((_, i) => { const dot = document.createElement('span'); dot.className = i <= position ? 'active' : ''; return dot; }));
  input.value = drafts[lesson.id] ?? lesson.code; input.rows = lesson.rows; input.disabled = false;
  input.placeholder = lesson.mode === 'drawing' ? 'Type dot or line' : 'Type fox. to discover its actions';
  $('lesson-back').disabled = position === 0;
  $('lesson-next').textContent = position === branch.length - 1 ? 'Choose a game or another path →' : 'Next little step →';
  $('lesson-quiz').hidden = !lesson.quiz; quizAnswered = !lesson.quiz;
  $('quiz-feedback').textContent = ''; resetScene(); recorded = false; suggestions();
  const live = ['event', 'update'].includes(lesson.mode);
  $('lesson-live').hidden = !live; $('lesson-space').hidden = lesson.mode !== 'event'; $('lesson-right').hidden = lesson.mode !== 'update';
  $('lesson-space').disabled = true; $('lesson-right').disabled = true;
  $('lesson-loop-status').textContent = 'Run installs your rule. Then try the control.';
  $('lesson-palette').hidden = lesson.mode !== 'style';
  $('lesson-scene-title').textContent = lesson.mode === 'drawing' ? 'Your drawing. Your coordinates.' : 'A little meadow. Your instructions.';
  canvas.dataset.drawing = String(lesson.mode === 'drawing');
  canvas.setAttribute('aria-label', lesson.mode === 'drawing' ? 'Drawing grid: 840 pixels across, 480 down.' : live ? 'Your game. Click here, then use Space or Right to try your rule.' : 'Your character in a meadow. Run your instructions to make it act.');
  $('lesson-input-help').textContent = lesson.rows === 1 ? 'Tab completes a suggestion. Enter runs your instruction.' : 'Tab completes a suggestion or indents. Ctrl / ⌘ + Enter runs your program.';
  feedback(lesson.quiz ? 'Make a prediction below, then try the program.' : 'Try it, change it, and see what happens.');
}
function stopWorker() { worker?.terminate(); worker = null; ready = false; requestPending = false; interactive = false; clearTimeout(timer); clearKeys(); }
function finish() { busy = false; input.disabled = false; $('lesson-run').disabled = false; $('lesson-back').disabled = lessons.filter(l => l.branch === current().branch).indexOf(current()) === 0; $('lesson-next').disabled = false; }
function fail(message) { stopWorker(); actions = []; finish(); $('lesson-space').disabled = $('lesson-right').disabled = true; feedback(message, true); }
function recordPractice() {
  if (recorded) return;
  const lesson = current();
  const meaningful = result && (lesson.mode === 'loop' ? result.features.loop && result.actions.length > 0 : lesson.mode === 'style' ? result.features.assignment : lesson.mode === 'drawing' ? result.shapes.length > 0 : result.interactive ? result.changed : result.actions.length > 0);
  if (!meaningful) return;
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
  if (data.error) { interactive = false; finish(); feedback(data.error, true); return; }
  result = data;
  if (data.type === 'step') {
    const mode = current().mode;
    $('lesson-loop-status').textContent = mode === 'event' ? `Space events: ${data.eventCalls} · your function waits between presses` : `update() calls: ${data.ticks} · Right is ${keys.right ? 'held' : 'released'}`;
    if (data.changed) { recordPractice(); feedback(mode === 'event' ? 'Your function ran because you pressed Space. Run installed the rule; the event triggered it.' : 'Your movement instruction is inside the game loop now. Release Right and watch the rule keep checking.'); }
    return;
  }
  interactive = data.interactive;
  if (interactive) {
    finish(); $('lesson-space').disabled = $('lesson-right').disabled = false;
    feedback('Your rule is installed. Try the control below the scene, or click the scene and use your keyboard.');
  } else if (current().mode === 'drawing') {
    finish(); recordPractice(); feedback(data.shapes.length ? `You drew ${data.shapes.length} ${data.shapes.length === 1 ? 'shape' : 'shapes'}. Change a number and run it again.` : 'Your program ran. Add dot(...) or line(...) to draw something.');
  } else {
    if (current().mode === 'style') { personal = { sky: data.world.sky, costume: data.player.costume }; persist(); }
    actions = [...data.actions]; actionStart = null;
    if (!actions.length) { finish(); recordPractice(); feedback(current().mode === 'style' ? 'You changed the scene with code. Try another choice.' : 'Your program ran. Replace pass with an action to make something happen.'); }
    else feedback(`Your instructions: ${data.actions.join(' → ')}.`);
  }
}
function run() {
  if (busy) return;
  if (!quizAnswered) { feedback('Choose what you think happens first below. It’s okay to guess.'); $('lesson-quiz').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  if (!input.value.trim()) { feedback('Write an instruction first. Try the example above.', true); input.focus(); return; }
  if (current().rows === 1 && input.value.trim().split('\n').length > 1) { feedback('For this step, try just one command. We’ll combine commands next.', true); return; }
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
      if (actionStart === null) { actionStart = time; startX = x; }
      const t = Math.min(1, (time - actionStart) / 700);
      if (actions[0] === 'jump') y = 430 - Math.sin(t * Math.PI) * 110;
      else x = Math.min(790, startX + t * 80);
      if (t === 1) { actions.shift(); actionStart = null; y = 430; if (!actions.length) { finish(); recordPractice(); feedback('You made that happen! Change your instructions and try again, or take the next step.'); } }
    }
    if (current().mode === 'drawing') drawGrid();
    else {
      scene.update({ ...initialState, stars: [], platforms: [[0, 430, 840]], world: { ...initialState.world, sky: personal.sky }, player: interactive && result ? { ...result.player, costume: personal.costume } : { x, y, facing: 1, costume: personal.costume, on_ground: y === 430 } });
      scene.draw(time);
    }
  }
  requestAnimationFrame(frame);
}
function renderMap() {
  const records = progress.get().records;
  const count = new Set(records.map(r => r.skill)).size;
  $('map-progress-note').textContent = count ? `${count} concepts explored in this browser. Choose any path; nothing is locked.` : 'Start with one instruction. Every path stays open, and your practice is remembered in this browser.';
  for (const [branch, target] of [['foundations', 'foundation-nodes'], ['drawing', 'drawing-nodes']]) {
    $(target).replaceChildren();
    for (const lesson of lessons.filter(l => l.branch === branch)) {
      const practiced = records.some(r => r.source === 'lesson:' + lesson.id);
      const button = document.createElement('button'); button.className = 'skill-node';
      const title = document.createElement('strong'); title.textContent = lesson.title;
      const note = document.createElement('span'); note.textContent = `${skillLabels[lesson.skill]} · ${practiced ? 'practised' : 'explore'}`;
      button.dataset.practiced = String(practiced); button.append(title, note); button.onclick = () => openLesson(lesson.id); $(target).append(button);
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
  if (document.body.dataset.mode === 'lessons') persist();
  stopWorker(); resetScene(); finish(); window.workshop?.setKeys({});
  document.body.dataset.mode = mode;
  $('lessons').hidden = mode !== 'lessons'; $('workshop-main').hidden = mode !== 'workshop'; $('learning-map').hidden = mode !== 'map';
  $('mode-toggle').textContent = mode === 'lessons' ? 'Open game workshop ↗' : '← First commands';
  $('map-toggle').setAttribute('aria-pressed', String(mode === 'map'));
  window.scrollTo(0, 0);
}
function openMap() { setMode('map'); renderMap(); $('map-title').focus(); }
function openLesson(id) { setMode('lessons'); index = lessons.findIndex(l => l.id === id); render(); persist(); $('lesson-title').focus(); }
let opening = false;
async function openWorkshop(id) {
  if (opening) return; opening = true;
  setMode('workshop');
  try { await startWorkshop(); if (id && window.workshop.getTemplate() !== id) await window.workshop.selectTemplate(id); }
  finally { opening = false; }
}
function edited() {
  if (interactive) { stopWorker(); $('lesson-space').disabled = $('lesson-right').disabled = true; feedback('Your rule changed. Run it to install this version.'); }
  persist(); suggestions();
}
$('map-toggle').onclick = openMap;
$('mode-toggle').onclick = () => document.body.dataset.mode === 'lessons' ? openWorkshop() : openLesson(current().id);
$('lesson-form').onsubmit = event => { event.preventDefault(); run(); };
input.oninput = edited; input.onclick = suggestions;
input.onkeydown = event => {
  if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault();
    if ($('lesson-completions').firstElementChild) $('lesson-completions').firstElementChild.click();
    else { input.setRangeText('    ', input.selectionStart, input.selectionEnd, 'end'); edited(); }
  }
  if (event.key === 'Escape') $('lesson-completions').replaceChildren();
  if (event.key === 'Enter') {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey || current().rows === 1) run();
    else { const line = input.value.slice(0, input.selectionStart).split('\n').at(-1); const indent = line.match(/^ */)[0] + (line.trimEnd().endsWith(':') ? '    ' : ''); input.setRangeText('\n' + indent, input.selectionStart, input.selectionEnd, 'end'); edited(); }
  }
};
function navigate(delta) {
  const branch = lessons.filter(l => l.branch === current().branch), next = branch[branch.indexOf(current()) + delta];
  if (next) openLesson(next.id); else openMap();
}
$('lesson-back').onclick = () => navigate(-1); $('lesson-next').onclick = () => navigate(1);
document.querySelectorAll('[data-answer]').forEach(button => button.onclick = () => {
  quizAnswered = true;
  const first = input.value.trim().split('\n')[0].trim();
  $('quiz-feedback').textContent = first === `fox.${button.dataset.answer}()` ? 'That matches the first line. Run it and see!' : 'Let’s test your prediction. Run the program and watch which line happens first.';
  feedback('Prediction made. Press Run to see what happens.');
});
document.querySelectorAll('[data-sky]').forEach(button => button.onclick = () => {
  if (busy) return;
  const assignment = `world.sky = "${button.dataset.sky}"`;
  input.value = /^world\.sky\s*=.*$/m.test(input.value) ? input.value.replace(/^world\.sky\s*=.*$/m, assignment) : assignment + '\n' + input.value;
  edited(); feedback('The sky choice changed your code. Run it to see the result.');
});
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
render(); requestAnimationFrame(frame);
