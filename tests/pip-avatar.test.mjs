import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../public/pip-avatar.js', import.meta.url), 'utf8')).replace(/^export /gm, '');
function harness({ delayed = false, fail = false } = {}) {
  const frames = new Map(), contexts = [];
  let id = 0, volume = 0, resume;
  const node = { dataset: {}, style: { setProperty() {} }, setAttribute() {} };
  class AudioContext {
    constructor() { contexts.push(this); }
    createMediaStreamSource() {
      if (fail) throw Error('Unavailable audio analysis');
      return this.source = { connect() {}, disconnect() { this.disconnected = true; } };
    }
    createAnalyser() { return this.analyser = { getFloatTimeDomainData(samples) { samples.fill(volume); }, disconnect() { this.disconnected = true; } }; }
    resume() { return delayed ? new Promise(resolve => { resume = resolve; }) : Promise.resolve(); }
    close() { this.closed = true; return Promise.resolve(); }
  }
  const context = vm.createContext({ AudioContext, Float32Array,
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id),
  });
  vm.runInContext(source, context);
  const avatar = context.createPipAvatar({ querySelector: () => node });
  return { avatar, node, contexts, frames, resume: () => resume(),
    sample(value, now) { volume = value; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); },
  };
}

test('outgoing audio opens Pip’s mouth; silence restores listening and stop releases analysis', async () => {
  const h = harness(); h.avatar.setVoiceState('listening');
  const stop = h.avatar.watchAudio({}); await Promise.resolve();
  h.sample(0, 0); assert.equal(h.node.dataset.state, 'listening');
  h.sample(.1, 100); assert.equal(h.node.dataset.state, 'speaking');
  h.sample(0, 150); assert.equal(h.node.dataset.state, 'speaking');
  h.sample(0, 300); assert.equal(h.node.dataset.state, 'listening');
  stop(); stop();
  assert.equal(h.frames.size, 0); assert.equal(h.contexts[0].closed, true);
  assert.equal(h.contexts[0].source.disconnected, true); assert.equal(h.contexts[0].analyser.disconnected, true);
});

test('stopping while audio resumes cannot start a late animation loop', async () => {
  const h = harness({ delayed: true }); const stop = h.avatar.watchAudio({});
  stop(); h.resume(); await Promise.resolve();
  assert.equal(h.frames.size, 0); assert.equal(h.contexts[0].closed, true);
});

test('unavailable audio analysis leaves Pip usable and closes its context', () => {
  const h = harness({ fail: true }); h.avatar.setVoiceState('listening');
  h.avatar.watchAudio({})();
  assert.equal(h.node.dataset.state, 'listening'); assert.equal(h.contexts[0].closed, true);
  assert.equal(h.frames.size, 0);
});
