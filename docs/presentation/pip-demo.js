import { createPipVoice } from '/pip-voice.js';
import { initializeAIAccess } from '/ai-access.js';

const examples = {
  mixed: { code: '3 + "4"', question: 'Why doesn\'t 3 + "4" work?' },
  numbers: { code: '3 + 4', question: 'Why does this give 7?' },
  strings: { code: '"3" + "4"', question: 'Why does this give 34 instead of 7?' },
};

export function createPipDemo() {
  const $ = id => document.getElementById(id);
  const slide = $('pip'), editor = $('lesson-code'), output = $('pip-output');
  let worker, ready = false, pending = false, timer, runningCode = '', feedback = '';
  let chatController, generation = 0, started = false;
  const history = [];
  const context = () => ({ lessonId: 'text-numbers', code: editor.value, runningCode, feedback,
    history: history.slice(-6).map(entry => ({ ...entry })), visited: [] });
  function message(role, content = '') {
    const entry = { role, content };
    history.push(entry); if (history.length > 20) history.shift();
    const node = document.createElement('p'); node.className = `pip-message ${role}`;
    $('pip-messages').append(node);
    while ($('pip-messages').children.length > 20) $('pip-messages').firstElementChild.remove();
    const update = text => { entry.content = text; node.textContent = text; $('pip-messages').scrollTop = $('pip-messages').scrollHeight; };
    update(content); return update;
  }
  const voice = createPipVoice($('presentation-pip'), 'lesson', context, role => message(role));
  $('presentation-pip').querySelector('.pip-talk').addEventListener('click', cancelChat);
  document.addEventListener('ai-access-changed', ({ detail }) => {
    $('presentation-pip-mode').textContent = detail.mode === 'ai'
      ? detail.voiceAvailable ? 'AI tutor · text and live voice' : 'AI tutor · text available'
      : 'Built-in guide · connect AI for voice';
    cancelChat();
  });
  // Also handles invite fragments before deck navigation reads the hash.
  initializeAIAccess().catch(() => { $('presentation-pip-mode').textContent = 'Use AI access to check the connection.'; });

  function cancelChat() {
    generation++; chatController?.abort(); chatController = null;
    $('pip-send').disabled = false; voice.setThinking(false);
    $('pip-messages').setAttribute('aria-busy', 'false');
    $('pip-chat-status').textContent = '';
  }
  function contextChanged(reason) { voice.stop(reason); cancelChat(); }
  function stopPython() {
    clearTimeout(timer); worker?.terminate(); worker = null;
    ready = pending = false; $('pip-run').disabled = false;
  }
  function result(text, error = false) {
    feedback = text; output.textContent = text; output.dataset.error = String(error);
    $('pip-run').disabled = false;
  }
  function send() {
    pending = true;
    timer = setTimeout(() => { stopPython(); result('Python took too long. Press Run Python to retry.', true); }, 3000);
    worker.postMessage({ type: 'run', code: runningCode, mode: 'basics' });
  }
  function run() {
    contextChanged('Code is running. Start voice again to discuss the result.');
    if (pending) stopPython();
    if (!editor.value.trim()) { result('Write a Python expression first.', true); return; }
    if (editor.value.trim().split('\n').length > 1) { result('Try one expression at a time in this demo.', true); return; }
    runningCode = editor.value;
    result(ready ? 'Running Python…' : 'Loading Python…');
    $('pip-run').disabled = true;
    if (ready) { send(); return; }
    worker = new Worker('/lesson-worker.js', { type: 'module' });
    const current = worker; pending = true;
    timer = setTimeout(() => { stopPython(); result('Python could not start. Press Run Python to retry.', true); }, 45000);
    worker.onerror = event => { if (worker !== current) return; event.preventDefault(); stopPython(); result('Python could not start. Press Run Python to retry.', true); };
    worker.onmessage = ({ data }) => {
      if (worker !== current) return;
      clearTimeout(timer); pending = false;
      if (data.type === 'ready') { ready = true; send(); return; }
      // A voice call begun during loading must not retain obsolete run feedback.
      voice.stop('Python finished. Start voice to discuss the result.');
      if (data.error) {
        // Keep the real error explanation; omit the lesson's unrelated fox.say hint.
        const message = data.error.startsWith('Text and numbers are different kinds of value.')
          ? 'Text and numbers are different kinds of value.' : data.error;
        result(message, true); return;
      }
      const values = (data.actions || []).filter(action => action.kind === 'say').map(action => action.text);
      result(values.join('\n') || 'Python finished with no output.');
    };
  }
  function selectExample(name) {
    contextChanged('Example changed. Start voice again for this code.');
    if (pending) stopPython();
    const example = examples[name];
    editor.value = example.code; $('pip-question').value = example.question;
    runningCode = ''; result('Press Run Python to try the example.');
  }
  editor.addEventListener('input', () => {
    contextChanged('Code changed. Start voice again to share the updated code.');
    if (pending) stopPython();
    result('Code changed. Press Run Python.');
  });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
    if (event.key === 'Escape') { event.preventDefault(); editor.blur(); }
  });
  $('pip-run').onclick = run;
  $('pip-reset').onclick = () => selectExample('mixed');
  for (const button of slide.querySelectorAll('[data-pip-example]')) button.onclick = () => selectExample(button.dataset.pipExample);
  $('pip-question').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); $('pip-question').blur(); } });

  $('pip-form').addEventListener('submit', async event => {
    event.preventDefault();
    const question = $('pip-question').value.trim();
    if (!question || chatController || slide.hidden) return;
    voice.stop('Continuing in chat. Microphone off.');
    const payload = { ...context(), question };
    message('user', question);
    const controller = new AbortController(), requestGeneration = generation;
    chatController = controller;
    const timeout = setTimeout(() => controller.abort(), 35000);
    $('pip-send').disabled = true; voice.setThinking(true);
    $('pip-messages').setAttribute('aria-busy', 'true');
    $('pip-chat-status').textContent = 'Pip is thinking…';
    try {
      const response = await fetch('/api/lesson-help', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: controller.signal, body: JSON.stringify(payload) });
      const reply = await response.json();
      if (!response.ok) throw Error(reply.error || 'Pip could not answer. Try again.');
      if (requestGeneration !== generation) return;
      message('assistant', [reply.message, reply.experiment].filter(Boolean).join('\n\n'));
      $('presentation-pip-mode').textContent = reply.mode === 'ai' ? 'AI tutor' : 'Built-in guide · AI offline';
      $('pip-chat-status').textContent = '';
    } catch (error) {
      if (requestGeneration === generation) $('pip-chat-status').textContent = error.name === 'AbortError' ? 'Pip took too long. Try again.' : error.message;
    } finally {
      clearTimeout(timeout);
      if (requestGeneration === generation) {
        chatController = null; $('pip-send').disabled = false; voice.setThinking(false);
        $('pip-messages').setAttribute('aria-busy', 'false');
      }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) contextChanged('Presentation hidden. Microphone off.'); });
  window.addEventListener('pagehide', () => { contextChanged('Presentation closed. Microphone off.'); stopPython(); });
  return {
    show() {
      if (slide.hidden) { contextChanged('Slide changed. Microphone off.'); if (pending) stopPython(); }
      else if (!started) { started = true; run(); }
    },
    reset() { if (!slide.hidden) selectExample('mixed'); },
  };
}
