import { createGamePreviews } from './game-previews.js';
import { games } from './curriculum.js';
import { templates } from './templates.js';
import { createPipVoice } from './pip-voice.js';
const $ = id => document.getElementById(id);

export function createMuseum(openGame, navigate) {
  const previews = createGamePreviews();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let returnTo;
  previews.add($('museum-preview'), 'breaker');
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
    history = []; $('museum-messages').replaceChildren(); $('museum-question').value = '';
    $('museum-pip-title').textContent = 'Pip · '+templates[id].genre;
    const intro = templates[id].museumIntro;
    message('assistant', intro); history.push({ role: 'assistant', content: intro });
    const game = games.find(game => game.id === id);
    $('museum-game-title').textContent = game.title;
    $('museum-game-genre').textContent = templates[id].title;
    $('museum-game-description').textContent = game.description;
    $('museum-game-concepts').replaceChildren(...game.concepts.split(' · ').map(concept => {
      const tag = document.createElement('span'); tag.textContent = concept; return tag;
    }));
    $('museum-story-title').textContent = templates[id].museumStory?.title || 'The idea behind ' + game.title;
    $('museum-story-text').textContent = templates[id].museumStory?.text || intro;
    $('museum-story-prompt').textContent = templates[id].museumStory?.prompt || 'What small rule would you change first?';
    $('museum-preview').setAttribute('aria-label', game.title + '. ' + game.description);
    previews.select($('museum-preview'), id);
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
  function resetStory() {
    $('museum-story-panel').hidden = true;
    $('museum-story').setAttribute('aria-expanded', 'false');
  }
  $('museum-story').onclick = () => {
    const open = $('museum-story-panel').hidden;
    $('museum-story-panel').hidden = !open;
    $('museum-story').setAttribute('aria-expanded', String(open));
    if (open) {
      $('museum-story-title').focus({ preventScroll: true });
      $('museum-story-panel').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    } else cancel();
  };
  $('museum-back').onclick = () => { returnTo = selected; navigate(); };
  $('museum-preview-play').onclick = () => {
    const play = $('museum-preview-play').getAttribute('aria-pressed') !== 'true';
    previews.play(play);
    $('museum-preview-play').setAttribute('aria-pressed', String(play));
    $('museum-preview-play').textContent = play ? 'Ⅱ Pause preview' : '▶ Animate preview';
  };
  const available = games.filter(game => game.available);
  $('museum-count').textContent = `${available.length} games · endless little experiments`;
  $('museum-coming').textContent = 'On the horizon: ' + games.filter(game => !game.available).map(game => game.title).join(' & ') + ' · coming later';
  for (const [index, game] of available.entries()) {
    const card = document.createElement('button'); card.className = 'museum-card';
    card.type = 'button'; card.dataset.exhibit = game.id;
    card.setAttribute('aria-label', 'Explore ' + game.title);
    const preview = document.createElement('span'); preview.className = 'game-preview';
    const canvas = document.createElement('canvas'); canvas.width = 840; canvas.height = 480; canvas.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'preview-label'; label.textContent = '0' + (index + 1) + ' / ' + templates[game.id].title;
    const badge = document.createElement('span'); badge.className = 'preview-open'; badge.textContent = '↗'; badge.setAttribute('aria-hidden', 'true');
    preview.append(canvas, label, badge);
    const copy = document.createElement('span'); copy.className = 'museum-card-copy';
    const title = document.createElement('strong'); title.textContent = game.title;
    const description = document.createElement('span'); description.textContent = game.description;
    const footer = document.createElement('span'); footer.className = 'museum-card-footer';
    const concepts = document.createElement('span'); concepts.textContent = game.concepts;
    const status = document.createElement('b'); status.textContent = 'Explore game ↗';
    footer.append(concepts, status); copy.append(title, description, footer); card.append(preview, copy);
    card.onclick = () => {
      const from = preview.getBoundingClientRect();
      navigate(game.id);
      const target = document.querySelector('.detail-preview');
      const to = target.getBoundingClientRect();
      if (!reducedMotion.matches) target.animate([
        { transformOrigin: 'top left', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: .7 },
        { transformOrigin: 'top left', transform: 'none', opacity: 1 },
      ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
    $('museum-cards').append(card); previews.add(canvas, game.id);
  }
  fetch('/api/status').then(response => response.json()).then(status => { $('museum-pip-mode').textContent = status.mode === 'ai' ? 'AI museum guide' : 'Built-in museum guide · AI offline'; }).catch(() => {});
  return {
    show(id) {
      const detail = available.some(game => game.id === id);
      $('museum-gallery').hidden = detail;
      $('museum-detail').hidden = !detail;
      resetStory();
      previews.play(false);
      $('museum-preview-play').setAttribute('aria-pressed', 'false');
      $('museum-preview-play').textContent = '▶ Animate preview';
      $('museum-preview-play').hidden = reducedMotion.matches;
      if (detail) { select(id); $('museum-game-title').focus({ preventScroll: true }); }
      else {
        cancel();
        const previous = returnTo && document.querySelector(`[data-exhibit="${returnTo}"]`);
        (previous || $('museum-title')).focus({ preventScroll: true });
        if (previous) previous.scrollIntoView({ block: 'nearest' });
        returnTo = null;
      }
      previews.show();
    },
    hide() { cancel(); previews.hide(); },
  };
}
