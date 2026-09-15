import { games } from './curriculum.js';
import { templates } from './templates.js';
import { createPipVoice } from './pip-voice.js';
const $ = id => document.getElementById(id);

export function createMuseum(openGame) {
  let selected = 'breaker', history = [], controller, generation = 0;
  function message(role, content) {
    const node = document.createElement('p'); node.className = `message ${role}`; node.textContent = content;
    $('museum-messages').append(node); return node;
  }
  const context = () => ({ template: selected, activity: 'museum', exercise: { index: 3 }, code: templates[selected].completeCode, history: history.slice(-6) });
  const voice = createPipVoice($('museum-pip'), 'game', context, role => {
    const entry = { role, content: '' }, node = message(role, ''); history.push(entry);
    return content => { entry.content = content; node.textContent = content; };
  });
  function cancel() { generation++; controller?.abort(); controller = null; voice.stop(); $('museum-form').querySelector('button').disabled = false; $('museum-status').textContent = ''; }
  function select(id) {
    cancel(); selected = id;
    if(document.body.dataset.mode==='museum')window.history.replaceState(null,'',location.pathname+location.search+'#museum/'+id); history = []; $('museum-messages').replaceChildren(); $('museum-question').value = '';
    $('museum-pip-title').textContent = 'Pip · '+templates[id].genre;
    const intro = templates[id].museumIntro;
    message('assistant', intro); history.push({ role: 'assistant', content: intro });
    for (const button of document.querySelectorAll('[data-exhibit]')) button.setAttribute('aria-pressed', String(button.dataset.exhibit === id));
    $('museum-learn').onclick = () => openGame(id, false);
    $('museum-complete').onclick = () => openGame(id, true);
  }
  async function ask(question) {
    if (controller || !question.trim()) return;
    voice.stop(); const requestGeneration = generation, snapshot = context();
    const pending = new AbortController(); controller = pending;
    const timeout = setTimeout(() => pending.abort(), 35000);
    message('user', question); history.push({ role: 'user', content: question });
    $('museum-form').querySelector('button').disabled = true; $('museum-status').textContent = 'Pip is thinking…';
    try {
      const response = await fetch('/api/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: pending.signal, body: JSON.stringify({ ...snapshot, history: snapshot.history, question, mode: 'explain' }) });
      const reply = await response.json(); if (!response.ok) throw Error(reply.error || 'Pip could not answer.');
      if (generation !== requestGeneration) return;
      message('assistant', reply.message); history.push({ role: 'assistant', content: reply.message }); history = history.slice(-12);
      $('museum-question').value = ''; $('museum-status').textContent = '';
      $('museum-pip-mode').textContent = reply.mode === 'ai' ? 'AI museum guide' : 'Built-in museum guide · AI offline';
    } catch (error) { if (generation === requestGeneration) $('museum-status').textContent = error.name === 'AbortError' ? 'Pip took too long. Try again.' : error.message; }
    finally { clearTimeout(timeout); if (generation === requestGeneration) { controller = null; $('museum-form').querySelector('button').disabled = false; } }
  }
  $('museum-form').onsubmit = event => { event.preventDefault(); ask($('museum-question').value); };
  $('museum-explain').onclick = () => ask('Explain the goal, controls and the rules that make this game interesting.');
  $('museum-variation').onclick = () => ask('Suggest two small variations I could make to this complete game.');
  for (const game of games) {
    const card = document.createElement(game.available ? 'button' : 'article'); card.className = 'museum-card';
    const mark = document.createElement('span'); mark.className = 'museum-mark'; mark.textContent = game.mark;
    const title = document.createElement('h3'); title.textContent = game.title;
    const description = document.createElement('p'); description.textContent = game.description;
    const concepts = document.createElement('small'); concepts.textContent = game.concepts;
    const status = document.createElement('strong'); status.textContent = game.available ? 'Meet the game →' : 'Planned exhibit · not playable yet';
    card.append(mark, title, description, concepts, status);
    if (game.available) { card.type = 'button'; card.dataset.exhibit = game.id; card.onclick = () => select(game.id); }
    $('museum-cards').append(card);
  }
  fetch('/api/status').then(response => response.json()).then(status => { $('museum-pip-mode').textContent = status.mode === 'ai' ? 'AI museum guide' : 'Built-in museum guide · AI offline'; }).catch(() => {});
  return { show(id) { select(templates[id] ? id : selected); }, hide: cancel };
}
