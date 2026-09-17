import { createScene, initialState } from '/scene.js';
import { drawRobot, robotStart, robotPose } from '/robot-scene.js';

const examples = {
  jump: 'fox.jump()', move: 'fox.move(80)', say: 'fox.say("Hello!")',
  sequence: 'fox.move(80)\nfox.jump()\nfox.say("Hello!")',
  side: 'robot.move(3)\nrobot.turn_right()',
  square: 'for side in range(4):\n    robot.move(3)\n    robot.turn_right()',
  three: 'for side in range(3):\n    robot.move(3)\n    robot.turn_right()',
  puzzle: 'for side in range(4):\n    pass\n    robot.turn_right()',
};

function tracesSquare(actions) {
  const perimeter = new Set();
  for (let tile = 1; tile <= 4; tile++) {
    for (const [x, y] of [[1, tile], [4, tile], [tile, 1], [tile, 4]]) perimeter.add(`${x},${y}`);
  }
  const visited = new Set(['1,1']);
  for (const action of actions) {
    if (action.kind !== 'robot') return false;
    const dx = action.to.x - action.from.x, dy = action.to.y - action.from.y;
    for (let step = 1; step <= Math.abs(dx) + Math.abs(dy); step++) {
      const tile = `${action.from.x + Math.sign(dx) * step},${action.from.y + Math.sign(dy) * step}`;
      if (!perimeter.has(tile)) return false;
      visited.add(tile);
    }
  }
  const end = actions.at(-1)?.to;
  return visited.size === perimeter.size && end?.x === 1 && end?.y === 1 && end.turns % 4 === 0;
}

export function createLessonDemos() {
  const demos = new Map();
  for (const name of ['fox', 'robot', 'puzzles']) {
    const element = document.getElementById(name);
    const canvas = document.getElementById(name + '-canvas');
    const demo = { name, isRobot: name !== 'fox', element, canvas, ctx: canvas.getContext('2d'),
      input: document.getElementById(name + '-code'), status: document.getElementById(name + '-status'),
      runButton: element.querySelector('[data-lesson-run]'), worker: null, ready: false, pending: false,
      timer: null, actions: [], elapsed: 0, lastFrame: null, running: false, completed: 0, total: 0,
      x: 250, y: 430, startX: 250, speech: '', pose: robotStart(), trail: [robotStart()] };
    if (name === 'fox') demo.scene = createScene(canvas, () => draw(demo, 0));
    demos.set(name, demo);
    demo.runButton.onclick = () => run(demo);
    element.querySelector('[data-lesson-reset]').onclick = () => reset(demo);
    for (const button of element.querySelectorAll('[data-example]')) button.onclick = () => {
      cancel(demo);
      resetScene(demo);
      demo.input.value = examples[button.dataset.example];
      status(demo, 'Example loaded. Press Run Python.');
    };
    demo.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(demo); }
      if (event.key === 'Escape') { event.preventDefault(); demo.input.blur(); }
      // Use spaces for Python indentation. Shift+Tab retains normal focus navigation.
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        demo.input.setRangeText('    ', demo.input.selectionStart, demo.input.selectionEnd, 'end');
        demo.input.dispatchEvent(new Event('input'));
      }
    });
    demo.input.addEventListener('input', () => {
      cancel(demo);
      status(demo, 'Code changed. Press Run Python.');
    });
    resetScene(demo);
  }
  const hintToggle = document.getElementById('puzzle-hint-toggle');
  hintToggle.onclick = () => {
    const hint = document.getElementById('puzzle-hint');
    hint.hidden = !hint.hidden;
    hintToggle.setAttribute('aria-expanded', String(!hint.hidden));
  };

  function status(demo, text, error = false) {
    demo.status.textContent = text;
    demo.status.dataset.error = String(error);
  }
  function cancel(demo) {
    clearTimeout(demo.timer);
    if (demo.pending) { demo.worker?.terminate(); demo.worker = null; demo.ready = false; }
    demo.pending = demo.running = false;
    demo.actions = []; demo.lastFrame = null;
    demo.runButton.disabled = false;
  }
  function resetScene(demo) {
    demo.x = demo.startX = 250; demo.y = 430; demo.speech = '';
    demo.pose = robotStart(); demo.trail = [robotStart()];
    demo.actions = []; demo.elapsed = demo.completed = demo.total = 0; demo.lastFrame = null;
    if (demo.name === 'fox') document.getElementById('fox-speech').textContent = '';
    draw(demo, 0);
  }
  function reset(demo) {
    cancel(demo); resetScene(demo);
    demo.input.value = examples[demo.name === 'fox' ? 'jump' : demo.name === 'puzzles' ? 'puzzle' : 'square'];
    if (demo.name === 'puzzles') {
      document.getElementById('puzzle-hint').hidden = true;
      hintToggle.setAttribute('aria-expanded', 'false');
    }
    status(demo, 'Reset. Press Run Python.');
  }
  function fail(demo, message) {
    demo.worker?.terminate(); demo.worker = null; demo.ready = false;
    cancel(demo);
    status(demo, message, true);
  }
  function send(demo) {
    demo.pending = true;
    demo.timer = setTimeout(() => fail(demo, 'Python took too long. Press Run Python to retry.'), 3000);
    demo.worker.postMessage({ type: 'run', code: demo.input.value, mode: demo.name === 'fox' ? 'basics' : 'robot' });
  }
  function run(demo) {
    cancel(demo); resetScene(demo);
    if (!demo.input.value.trim()) { status(demo, 'Write a Python command first.', true); demo.input.focus(); return; }
    demo.runButton.disabled = true;
    if (demo.ready) { status(demo, 'Running Python…'); send(demo); return; }
    status(demo, 'Loading Python…');
    demo.pending = true;
    demo.worker = new Worker('/lesson-worker.js', { type: 'module' });
    const current = demo.worker;
    demo.timer = setTimeout(() => fail(demo, 'Python could not start. Press Run Python to retry.'), 45000);
    current.onerror = event => { if (demo.worker !== current) return; event.preventDefault(); fail(demo, 'Python could not start. Press Run Python to retry.'); };
    current.onmessage = ({ data }) => {
      if (demo.worker !== current) return;
      clearTimeout(demo.timer); demo.pending = false;
      if (data.type === 'ready') { demo.ready = true; send(demo); return; }
      if (data.error) { fail(demo, data.error); return; }
      demo.actions = [...data.actions]; demo.total = demo.actions.length;
      demo.solved = demo.name === 'puzzles' && tracesSquare(data.actions);
      demo.running = demo.actions.length > 0;
      demo.runButton.disabled = false;
      demo.lastFrame = null;
      if (demo.running) beginAction(demo);
      else status(demo, 'Python finished. No visible actions in this program.');
    };
  }
  function beginAction(demo) {
    const action = demo.actions[0];
    demo.elapsed = 0; demo.startX = demo.x;
    const label = typeof action === 'string' ? action + '()' : action.kind === 'robot' ? action.label : action.kind === 'say' ? 'say()' : `move(${action.distance})`;
    status(demo, `Action ${demo.completed + 1} of ${demo.total}: ${label}`);
    if (action.kind === 'say') {
      demo.speech = action.text;
      document.getElementById('fox-speech').textContent = demo.speech.slice(0, 100);
    }
  }
  function draw(demo, time) {
    if (demo.isRobot) { drawRobot(demo.ctx, demo.pose, demo.trail); return; }
    demo.scene.update({ ...initialState, stars: [], platforms: [[0, 430, 840]],
      player: { x: demo.x, y: demo.y, facing: 1, costume: 'fox', on_ground: demo.y === 430 } });
    demo.scene.draw(time);
    if (demo.speech) {
      const ctx = demo.ctx, text = demo.speech.replace(/\n/g, ' ').slice(0, 45);
      ctx.save(); ctx.font = '23px system-ui'; ctx.textAlign = 'left';
      const width = Math.min(790, ctx.measureText(text).width + 32);
      const left = Math.max(12, Math.min(demo.x - 45, 828 - width));
      ctx.fillStyle = '#fffef9'; ctx.strokeStyle = '#71936c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(left, demo.y - 145, width, 54, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#284b43'; ctx.fillText(text, left + 16, demo.y - 110, width - 32); ctx.restore();
    }
  }
  function frame(time) {
    for (const demo of demos.values()) {
      if (demo.element.hidden || document.hidden) { demo.lastFrame = null; continue; }
      const delta = demo.lastFrame === null ? 0 : Math.min(100, time - demo.lastFrame);
      demo.lastFrame = time;
      if (demo.actions.length) {
        const action = demo.actions[0];
        demo.elapsed += delta;
        const fraction = Math.min(1, demo.elapsed / 750);
        if (action.kind === 'robot') demo.pose = robotPose(action, fraction);
        else if (action === 'jump' || action.kind === 'jump') demo.y = 430 - Math.sin(fraction * Math.PI) * (action.height ?? 110);
        else if (action.kind !== 'say') demo.x = Math.max(50, Math.min(790, demo.startX + fraction * (action.distance ?? 80)));
        if (fraction === 1) {
          if (action.kind === 'robot') demo.trail.push({ ...demo.pose });
          demo.actions.shift(); demo.completed++; demo.y = 430;
          if (demo.actions.length) beginAction(demo);
          else {
            demo.running = false;
            const location = demo.isRobot ? ` Column ${demo.pose.x + 1}, row ${demo.pose.y + 1}, facing ${['right', 'down', 'left', 'up'][demo.pose.turns % 4]}.` : '';
            const message = demo.name === 'puzzles'
              ? demo.solved ? 'Solved — all four sides traced, back at the start facing right.' : 'Not solved yet. Follow all four dotted sides and return facing right.'
              : `Finished ${demo.total} ${demo.total === 1 ? 'action' : 'actions'}.${location}`;
            status(demo, message);
          }
        }
      }
      draw(demo, time);
    }
  }
  window.addEventListener('pagehide', () => {
    for (const demo of demos.values()) { cancel(demo); demo.worker?.terminate(); demo.worker = null; demo.ready = false; }
  });
  return { frame, resetCurrent() { const demo = [...demos.values()].find(item => !item.element.hidden); if (demo) reset(demo); } };
}
