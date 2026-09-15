import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// Run the browser controller with controlled media/transport promises and a tiny DOM.
const source = (await readFile(new URL('../public/pip-voice.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const avatarSource = (await readFile(new URL('../public/pip-avatar.js', import.meta.url), 'utf8')).replace(/^export /gm, '');
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness() {
  class Element extends EventTarget {
    dataset = {}; style = { setProperty() {} };
    children = new Map(); disabled = false; hidden = false; srcObject = null;
    append() {} setAttribute() {} pause() { this.paused = true; } play() { return Promise.resolve(); }
    querySelector(key) { if (!this.children.has(key)) this.children.set(key, new Element()); return this.children.get(key); }
    click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
  }
  const document = new Element(), window = new Element();
  const panels = [], peers = [], tracks = [], requests = [], timers = new Map();
  let timerId = 0, mediaWait, fetchWait, offerWait, failure;
  document.createElement = () => { const node = new Element(); panels.push(node); return node; };
  document.getElementById = () => null;
  const makeStream = () => { const track = new Element(); track.enabled = true; track.stop = () => { track.stopped = true; }; tracks.push(track); return { getTracks: () => [track], getAudioTracks: () => [track] }; };
  class Peer extends EventTarget {
    iceGatheringState = 'complete'; connectionState = 'new';
    constructor() { super(); peers.push(this); }
    addTrack() {} createOffer() { return offerWait?.promise || Promise.resolve({ type: 'offer', sdp: 'v=0' }); }
    setLocalDescription(offer) { this.localDescription = offer; return Promise.resolve(); }
    setRemoteDescription() { this.remoteSet = true; this.emit({ type: 'session.started' }); return Promise.resolve(); }
    createDataChannel() { return this.channel = { readyState: 'open', sent: [], send(event) { this.sent.push(JSON.parse(event)); }, close() { this.closed = true; this.onclose?.(); } }; }
    emit(event) { this.channel.onmessage?.({ data: JSON.stringify(event) }); }
    close() { this.closed = true; this.onconnectionstatechange?.(); }
  }
  const context = vm.createContext({ document, window, navigator: { mediaDevices: { getUserMedia: async () => {
    if (failure) throw failure;
    if (mediaWait) return mediaWait.promise;
    return makeStream();
  } } }, RTCPeerConnection: Peer, AbortController, Event, console,
  setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout: id => timers.delete(id),
  setInterval: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearInterval: id => timers.delete(id),
  createVoiceCaptions: () => () => {}, createCodePointer: () => assert.fail('No visible editor in this fixture'),
  fetch: async (url, options) => { requests.push(options); return fetchWait ? fetchWait.promise : { ok: true, json: async () => ({ transport: { sdp: 'answer' } }) }; },
  });
  vm.runInContext(avatarSource + '\n' + source, context);
  const makePanel = () => {
    const startIndex = panels.length;
    const activity = { lessonId: 'sequence', code: 'fox.jump()' };
    const container = new Element();
    const control = context.createPipVoice(container, 'lesson', () => activity, () => () => {});
    const panel = panels[startIndex];
    return { control, activity, avatar: container.querySelector('.pip-avatar'), talk: panel.querySelector('.pip-talk'), mute: panel.querySelector('.pip-mute'), audio: panel.querySelector('audio') };
  };
  const panel = makePanel();
  return { ...panel, makePanel, context, document, window, peers, tracks, requests, timers, makeStream,
    waitMedia: () => mediaWait = deferred(), waitFetch: () => fetchWait = deferred(), waitOffer: () => offerWait = deferred(),
    readyMedia: () => { mediaWait = null; }, failMedia: value => { failure = value; },
    start: async () => { panel.talk.click(); await settle(); },
  };
}
function released(h, peer = h.peers.at(-1)) {
  assert.ok(h.tracks.every(track => track.stopped));
  if (peer) { assert.equal(peer.closed, true); assert.equal(peer.channel.closed, true); }
  assert.equal(h.audio.srcObject, null);
  assert.equal(h.talk.textContent, 'Talk to Pip'); assert.equal(h.talk.disabled, false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.avatar.dataset.state, 'idle');
}

test('Pip follows connecting, listening, mute, typed thinking and cancellation', async () => {
  const h = harness(), pending = h.waitMedia();
  await h.start(); assert.equal(h.avatar.dataset.state, 'thinking');
  pending.resolve(h.makeStream()); await settle();
  assert.equal(h.avatar.dataset.state, 'listening');
  h.mute.click(); assert.equal(h.avatar.dataset.state, 'idle');
  h.mute.click(); assert.equal(h.avatar.dataset.state, 'listening');
  h.control.stop(); released(h);
  h.control.setThinking(true); assert.equal(h.avatar.dataset.state, 'thinking');
  h.control.setThinking(false); assert.equal(h.avatar.dataset.state, 'idle');
});

test('voice opens only on Talk, navigation closes immediately and Talk opens a fresh call', async () => {
  const h = harness(); assert.equal(h.tracks.length, 0);
  await h.start(); assert.equal(h.tracks.length, 1); assert.equal(h.talk.textContent, 'End voice');
  h.control.stop(); released(h);
  await h.start(); assert.equal(h.tracks.length, 2); assert.equal(h.peers.length, 2); assert.equal(h.tracks[1].stopped, undefined);
  h.control.stop(); released(h);
});

test('pagehide and hidden tabs force close even during graceful shutdown; returning never auto-opens', async () => {
  for (const event of ['pagehide', 'visibilitychange']) {
    const h = harness(); await h.start();
    h.talk.click(); assert.equal(h.talk.disabled, true); assert.equal(h.tracks[0].stopped, true);
    if (event === 'visibilitychange') { h.document.hidden = true; h.document.dispatchEvent(new Event(event)); }
    else h.window.dispatchEvent(new Event(event));
    released(h);
    h.document.hidden = false; h.window.dispatchEvent(new Event('pageshow')); h.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(h.tracks.length, 1);
    await h.start(); assert.equal(h.tracks.length, 2); h.control.stop(); released(h);
  }
});

test('late microphone permission cannot revive a cancelled call or interfere with its replacement', async () => {
  const h = harness(), pending = h.waitMedia(); await h.start();
  h.control.stop(); released(h); h.readyMedia(); await h.start();
  const newTrack = h.tracks[0]; pending.resolve(h.makeStream()); await settle();
  assert.equal(h.tracks[1].stopped, true); assert.equal(newTrack.stopped, undefined);
  assert.equal(h.peers.length, 1); assert.equal(h.talk.textContent, 'End voice');
  h.control.stop(); released(h);
});

test('cancelled offers and pending requests cannot install a late connection', async () => {
  for (const phase of ['offer', 'fetch']) {
    const h = harness(), pending = phase === 'offer' ? h.waitOffer() : h.waitFetch();
    await h.start(); h.control.stop(); released(h);
    if (phase === 'fetch') assert.equal(h.requests[0].signal.aborted, true);
    pending.resolve(phase === 'offer' ? { type: 'offer', sdp: 'v=0' } : { ok: true, json: async () => ({ transport: { sdp: 'late' } }) });
    await settle(); assert.equal(h.peers[0].remoteSet, undefined); released(h);
  }
});

test('switching Pip panels closes the old connection before requesting another microphone', async () => {
  const h = harness(); await h.start(); h.talk.click();
  const other = h.makePanel(); other.talk.click(); await settle();
  assert.equal(h.peers[0].closed, true); assert.equal(h.tracks[0].stopped, true);
  assert.equal(h.tracks[1].stopped, undefined); assert.equal(other.talk.textContent, 'End voice');
  other.control.stop(); released(h);
});

test('End voice releases microphone and remote audio, then finishes on acknowledgement, channel close or timeout', async () => {
  for (const ending of ['ack', 'close', 'timeout']) {
    const h = harness(); await h.start();
    const remote = h.makeStream(); h.peers[0].ontrack({ streams: [remote], track: remote.getTracks()[0] });
    h.talk.click(); assert.ok(h.tracks.every(track => track.stopped)); assert.equal(h.audio.srcObject, null);
    assert.equal(h.peers[0].channel.sent[0].type, 'session.close');
    if (ending === 'ack') h.peers[0].emit({ type: 'session.closed' });
    else if (ending === 'close') h.peers[0].channel.onclose();
    else [...h.timers.values()].find(timer => timer.ms === 5000).fn();
    released(h);
  }
});

test('connection failures and denied permissions release resources and allow retry', async () => {
  for (const failure of ['channel', 'peer', 'permission']) {
    const h = harness();
    if (failure === 'permission') h.failMedia({ name: 'NotAllowedError' });
    await h.start();
    if (failure === 'channel') h.peers[0].channel.onerror();
    if (failure === 'peer') { h.peers[0].connectionState = 'failed'; h.peers[0].onconnectionstatechange(); }
    released(h); h.failMedia(null); await h.start(); assert.equal(h.talk.textContent, 'End voice'); h.control.stop(); released(h);
  }
});
