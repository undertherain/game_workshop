import { stopPipVoice } from './pip-voice.js';

export async function initializeAIAccess() {
  const dialog = document.getElementById('ai-access-dialog');
  const status = document.getElementById('ai-access-status');
  const summary = document.getElementById('ai-access-summary');
  const form = document.getElementById('ai-key-form');
  const input = document.getElementById('ai-personal-key');
  const disconnect = document.getElementById('ai-disconnect');
  const inviteButton = document.getElementById('ai-activate-invite');
  let invite = null, busy = false;
  if (location.hash.startsWith('#invite/')) {
    invite = location.hash.slice('#invite/'.length);
    // Fragments never enter HTTP access logs; discard before lesson routing starts.
    history.replaceState(null, '', location.pathname + location.search);
    inviteButton.hidden = false;
    status.textContent = 'Anyone with this link can activate demo AI until it expires. You can reopen it later; everyone using this link shares its allowance.';
    dialog.showModal();
  }
  function setBusy(value) {
    busy = value;
    for (const button of dialog.querySelectorAll('button:not([data-close])')) button.disabled = value;
    input.disabled = value;
  }
  async function refresh() {
    const response = await fetch('/api/status', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error('AI access is temporarily unavailable.');
    const state = await response.json();
    const label = state.access === 'byok' ? 'Your key connected' : state.mode === 'ai' ? 'Demo AI enabled' : 'Built-in guide';
    summary.textContent = label + (state.usageLimited === false
      ? `. No app request limits for local AI. Voice calls last up to ${state.voiceSeconds} seconds.`
      : state.remaining ? ` · ${state.remaining.chats} chats and ${state.remaining.voiceCalls} voice calls remaining${state.access === 'byok' ? ' today (UTC)' : ''}. Voice calls last up to ${state.voiceSeconds} seconds.` : '. Games and lessons are available without an API key.');
    if (state.expiresAt) summary.textContent += ` Access ends ${new Date(state.expiresAt).toLocaleString()}.`;
    if (state.access === 'invite') summary.textContent += ' This allowance is shared by everyone using your invite link.';
    if (state.mode === 'ai' && !state.voiceAvailable) summary.textContent += ' Voice is unavailable for this connection; typed AI is available.';
    if (state.error) summary.textContent += ` ${state.error}`;
    if (!state.byokAvailable) summary.textContent += ' Personal-key connections are not configured on this server yet.';
    disconnect.hidden = !state.canDisconnect;
    form.querySelector('button').disabled = !state.byokAvailable || busy;
    for (const id of ['lesson-tutor-mode', 'museum-pip-mode', 'helper-mode']) {
      const element = document.getElementById(id);
      if (element) element.textContent = state.mode === 'ai' ? `${label} · Pip is here to help` : 'Built-in guide · AI offline';
    }
    document.dispatchEvent(new CustomEvent('ai-access-changed', { detail: state }));
    return state;
  }
  async function change(body, method = 'POST') {
    if (busy) return;
    setBusy(true); status.textContent = 'Connecting…'; stopPipVoice();
    try {
      const response = await fetch('/api/access', { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Could not update AI access.');
      if (body?.type === 'invite') { invite = null; inviteButton.hidden = true; }
      status.textContent = method === 'DELETE' ? 'Disconnected. Your games and lesson drafts are still here.' : 'Connected. You can ask Pip a question.';
      if (body?.type === 'byok') dialog.close();
    } catch (error) { status.textContent = error.message; }
    finally { setBusy(false); await refresh().catch(error => { status.textContent = error.message; }); }
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); const key = input.value.trim(); input.value = '';
    change({ type: 'byok', key });
  });
  inviteButton.addEventListener('click', () => change({ type: 'invite', token: invite }));
  disconnect.addEventListener('click', () => change(null, 'DELETE'));
  const open = () => { if (!dialog.open) dialog.showModal(); refresh().catch(error => { status.textContent = error.message; }); };
  document.getElementById('ai-access-open').addEventListener('click', open);
  document.addEventListener('open-ai-access', open);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { input.value = ''; });
  await refresh().catch(error => { summary.textContent = error.message; });
}
