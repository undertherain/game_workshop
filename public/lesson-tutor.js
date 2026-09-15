import { createPipVoice } from './pip-voice.js';
const $ = id => document.getElementById(id);

export function createLessonTutor(getContext) {
  const conversations = new Map();
  let activeId, controller, generation = 0;
  let visited;
  try { visited = new Set(JSON.parse(localStorage.getItem('little-makers-visited-v1') || '[]')); }
  catch { visited = new Set(); }
  const voice = createPipVoice($('lesson-tutor'), 'lesson', () => ({ ...getContext(), history: conversations.get(activeId) || [], visited: [...visited] }), role => {
    const entry = { role, content: '' };
    const node = message(role, '');
    conversations.set(activeId, [...(conversations.get(activeId) || []), entry].slice(-20));
    return content => {
      entry.content = content; node.textContent = content;
      $('lesson-tutor-messages').scrollTop = $('lesson-tutor-messages').scrollHeight;
    };
  });

  function message(role, content) {
    const entry = document.createElement('p');
    entry.className = `lesson-tutor-message ${role}`;
    entry.textContent = content;
    $('lesson-tutor-messages').append(entry);
    const log = $('lesson-tutor-messages');
    log.scrollTop = log.scrollHeight;
    return entry;
  }
  function setBusy(busy) {
    $('lesson-tutor-form').querySelector('button').disabled = busy;
    for (const button of document.querySelectorAll('[data-lesson-question]')) button.disabled = busy;
    $('lesson-tutor-messages').setAttribute('aria-busy', String(busy));
  }
  async function ask(question) {
    question = question.trim();
    if (!question || controller) return;
    const context = getContext();
    const history = conversations.get(activeId) || [];
    voice.stop('Continuing in chat. Microphone off.');
    conversations.set(activeId, [...history, { role: 'user', content: question }].slice(-20));
    const requestGeneration = generation;
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(), 35000);
    setBusy(true);
    message('user', question);
    $('lesson-tutor-status').textContent = 'Pip is thinking…';
    try {
      const response = await fetch('/api/lesson-help', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: requestController.signal, body: JSON.stringify({ ...context, question, history: history.slice(-6), visited: [...visited] }) });
      const reply = await response.json();
      if (!response.ok) throw Error(reply.error || 'Pip could not answer. Please try again.');
      if (generation !== requestGeneration) return;
      const answer = [reply.message, reply.experiment].filter(Boolean).join('\n\n');
      message('assistant', answer);
      conversations.set(activeId, [...(conversations.get(activeId) || []), { role: 'assistant', content: answer }].slice(-20));
      $('lesson-tutor-mode').textContent = reply.mode === 'ai' ? 'AI tutor · here to help' : 'Built-in slide guide · AI offline';
      $('lesson-tutor-status').textContent = '';
      if ($('lesson-tutor-question').value.trim() === question) $('lesson-tutor-question').value = '';
    } catch (error) {
      if (generation === requestGeneration) $('lesson-tutor-status').textContent = error.name === 'AbortError'
        ? 'Pip took too long. Your question is still here; try again.' : error.message;
    } finally {
      clearTimeout(timeout);
      if (generation === requestGeneration) { controller = null; setBusy(false); }
    }
  }
  $('lesson-tutor-form').addEventListener('submit', event => { event.preventDefault(); ask($('lesson-tutor-question').value); });
  for (const button of document.querySelectorAll('[data-lesson-question]')) button.addEventListener('click', () => {
    $('lesson-tutor-question').value = button.dataset.lessonQuestion;
    ask(button.dataset.lessonQuestion);
  });
  fetch('/api/status').then(response => { if (!response.ok) throw Error(); return response.json(); }).then(status => {
    $('lesson-tutor-mode').textContent = status.mode === 'ai' ? 'AI tutor · here to help' : 'Built-in slide guide · AI offline';
  }).catch(() => { $('lesson-tutor-mode').textContent = 'Connection unavailable · try a question to reconnect'; });

  return { show(lesson) {
    visited.add(lesson.id);
    try { localStorage.setItem('little-makers-visited-v1', JSON.stringify([...visited])); } catch { /* Session tracking still works. */ }
    if (activeId === lesson.id) return;
    voice.stop();
    generation++;
    controller?.abort(); controller = null;
    activeId = lesson.id;
    setBusy(false);
    $('lesson-tutor-status').textContent = '';
    $('lesson-tutor-question').value = '';
    $('lesson-tutor-context').textContent = `Studying: ${lesson.title}`;
    $('lesson-tutor-messages').replaceChildren();
    const history = conversations.get(activeId);
    if (history?.length) for (const entry of history) message(entry.role, entry.content);
    else message('assistant', 'Ask me about Python, your code, or what you’d like to make. We can take it one idea at a time.');
  } };
}
