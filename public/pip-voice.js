// Adapted from Projects/AI/Voice/demos/web: Live WebRTC, captions and graceful close.
import { createVoiceCaptions } from './voice-captions.js';
import { createCodePointer, createSpokenPointer } from './pip-pointer.js';
let activeCall;
export function stopPipVoice(reason = 'Voice ended. Microphone off.') { activeCall?.stop(reason); }

export function createPipVoice(container, kind, getContext, createMessage) {
  const panel = document.createElement('div');
  panel.className = 'pip-voice';
  panel.innerHTML = `<div class="pip-voice-controls"><button type="button" class="pip-talk" aria-pressed="false">Talk to Pip</button><button type="button" class="pip-mute" hidden aria-pressed="false">Mute mic</button></div><p class="pip-voice-status" role="status">AI voice · your microphone is off.</p><audio autoplay></audio>`;
  container.append(panel);
  const talk = panel.querySelector('.pip-talk'), mute = panel.querySelector('.pip-mute');
  const status = panel.querySelector('.pip-voice-status');
  const audio = panel.querySelector('audio');
  const form = container.querySelector('form');
  const actions = document.createElement('div');
  actions.className = 'pip-compose-actions';
  actions.append(form.querySelector('button[type="submit"]'), panel.querySelector('.pip-voice-controls'));
  form.append(actions);
  let call;

  function finish(current, message) {
    if (current.finished) return;
    current.finished = true;
    current.closing = true;
    current.spokenPointer?.clear(); current.pointer?.destroy();
    clearTimeout(current.timer); clearTimeout(current.closeTimer);
    clearInterval(current.contextTimer);
    current.controller.abort();
    current.stream?.getTracks().forEach(track => track.stop());
    current.remoteStream?.getTracks().forEach(track => track.stop());
    if (current.channel) {
      current.channel.onmessage = current.channel.onclose = current.channel.onerror = null;
      current.channel.close();
    }
    if (current.peer) {
      current.peer.ontrack = current.peer.onconnectionstatechange = null;
      current.peer.close();
    }
    if (call !== current) return;
    audio.pause(); audio.srcObject = null;
    call = null;
    if (activeCall === current) activeCall = null;
    talk.disabled = false; talk.textContent = 'Talk to Pip'; talk.setAttribute('aria-pressed', 'false');
    mute.hidden = true; mute.setAttribute('aria-pressed', 'false'); mute.textContent = 'Mute mic';
    status.textContent = message;
  }
  function stop(current, message, waitForConfirmation = false) {
    if (current.finished || call !== current) return;
    if (current.closing) {
      if (!waitForConfirmation) finish(current, message);
      return;
    }
    current.closing = true;
    current.spokenPointer?.clear(); current.pointer?.destroy();
    current.stream?.getTracks().forEach(track => track.stop());
    current.remoteStream?.getTracks().forEach(track => track.stop());
    audio.pause(); audio.srcObject = null;
    clearTimeout(current.timer);
    clearInterval(current.contextTimer);
    current.controller.abort();
    if (current.ready && current.channel?.readyState === 'open') {
      if (waitForConfirmation) {
        talk.disabled = true; mute.hidden = true; status.textContent = 'Ending voice · microphone off…';
        current.endMessage = message;
        current.closeTimer = setTimeout(() => finish(current, 'Microphone off. Voice connection closed without final confirmation.'), 5000);
      }
      try {
        current.channel.send(JSON.stringify({ type: 'session.close' }));
        if (waitForConfirmation) return;
      } catch { /* Release failed transport below. */ }
    }
    finish(current, message);
  }
  async function start() {
    stopPipVoice();
    if (document.hidden) return;
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.RTCPeerConnection) {
      status.textContent = 'Voice needs a microphone-capable browser on localhost or HTTPS.'; return;
    }
    const current = { controller: new AbortController(), caption: createVoiceCaptions(createMessage) };
    current.stop = message => stop(current, message);
    call = activeCall = current;
    talk.textContent = 'Cancel voice'; talk.setAttribute('aria-pressed', 'true');
    status.textContent = 'Connecting · allow microphone access to talk to Pip.';
    current.timer = setTimeout(() => stop(current, 'Voice took too long to connect. Try again.'), 55000);
    const alive = () => call === current && !current.closing;
    try {
      const context = getContext();
      const editor = document.getElementById(kind === 'lesson' ? 'lesson-code' : 'editor');
      if (editor?.getClientRects().length && context.code?.trim()) {
        current.pointer = createCodePointer(editor);
        current.spokenPointer = createSpokenPointer(context.code, line => current.pointer.show(line), () => current.pointer.clear());
      }
      const contextVersion = value => JSON.stringify([value.lessonId, value.template, value.exercise?.index, value.code, value.runningCode, value.feedback, value.error]);
      const version = contextVersion(context);
      current.contextTimer = setInterval(() => {
        if (alive() && version !== contextVersion(getContext())) stop(current, 'Activity changed. Start voice again to share the updated code and feedback.');
      }, 500);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!alive()) { stream.getTracks().forEach(track => track.stop()); return; }
      current.stream = stream;
      const peer = current.peer = new RTCPeerConnection();
      for (const track of stream.getAudioTracks()) {
        peer.addTrack(track, stream);
        track.addEventListener('ended', () => { if (alive()) stop(current, 'Microphone disconnected. Try connecting again.'); });
      }
      peer.ontrack = event => {
        if (!alive()) { event.track.stop(); return; }
        current.remoteStream = event.streams[0] || new MediaStream([event.track]);
        audio.srcObject = current.remoteStream;
        audio.play().catch(() => { if (alive()) stop(current, 'Audio playback was blocked. Press Talk to Pip to try again.'); });
      };
      peer.onconnectionstatechange = () => {
        if (alive() && ['failed', 'disconnected'].includes(peer.connectionState)) stop(current, 'Voice disconnected. Microphone off; you can reconnect.');
      };
      const channel = current.channel = peer.createDataChannel('oai-events');
      channel.onmessage = ({ data }) => {
        if (call !== current) return;
        let event; try { event = JSON.parse(data); } catch { return; }
        if (event.type === 'session.closed') { finish(current, current.endMessage || 'Voice ended. Microphone off.'); return; }
        if (!alive()) return;
        if (event.type === 'session.started') {
          current.ready = true; clearTimeout(current.timer);
          talk.textContent = 'End voice'; mute.hidden = false;
          status.textContent = 'Listening · speak to Pip. You can interrupt.';
        } else if (event.type === 'error') stop(current, 'Pip’s voice encountered a problem. Please reconnect.');
        else {
          if (version !== contextVersion(getContext())) { stop(current, 'Activity changed. Start voice again to share the updated code and feedback.'); return; }
          current.spokenPointer?.receive(event);
          current.caption(event);
        }
      };
      channel.onclose = () => { if (call === current) finish(current, current.endMessage || 'Voice connection closed. Microphone off.'); };
      channel.onerror = () => { if (call === current) finish(current, 'Voice connection failed. Microphone off; you can reconnect.'); };
      const offer = await peer.createOffer();
      if (!alive()) return;
      await peer.setLocalDescription(offer);
      if (!alive()) return;
      await waitForIce(peer, current.controller.signal);
      if (!alive()) return;
      const response = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: current.controller.signal, body: JSON.stringify({ kind, context, sdp: peer.localDescription.sdp }) });
      const result = await response.json();
      if (!alive()) return;
      if (!response.ok) throw Error(result.error || 'Pip could not connect.');
      await peer.setRemoteDescription({ type: 'answer', sdp: result.transport.sdp });
    } catch (error) {
      if (alive()) finish(current, error.name === 'NotAllowedError' ? 'Microphone access was not allowed. You can still type to Pip.' : error.name === 'NotFoundError' ? 'No microphone found. Connect one or type to Pip.' : error.message);
    }
  }
  talk.addEventListener('click', () => call ? stop(call, 'Voice ended. Microphone off.', true) : start());
  mute.addEventListener('click', () => {
    if (!call?.ready || call.closing) return;
    call.muted = !call.muted;
    call.stream.getAudioTracks().forEach(track => { track.enabled = !call.muted; });
    mute.setAttribute('aria-pressed', String(call.muted)); mute.textContent = call.muted ? 'Unmute mic' : 'Mute mic';
    status.textContent = call.muted ? 'Microphone muted · Pip can still speak.' : 'Listening · speak to Pip. You can interrupt.';
  });
  return { stop: reason => { if (call) stop(call, reason || 'Activity changed. Start voice again for the updated context.'); } };
}

function waitForIce(peer, signal) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(Error('Voice network setup timed out. Try again.')), 10000);
    const check = () => { if (peer.iceGatheringState === 'complete') done(); };
    const abort = () => done(Error('Voice cancelled.'));
    function done(error) {
      clearTimeout(timer); peer.removeEventListener('icegatheringstatechange', check); signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    }
    peer.addEventListener('icegatheringstatechange', check); signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else check();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => stopPipVoice());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPipVoice('Voice ended while the tab was away. Microphone off.'); });
  document.addEventListener('input', event => { if (['editor', 'lesson-code'].includes(event.target.id)) stopPipVoice('Code changed. Start voice again to share the updated code.'); });
}
