import test from 'node:test';
import assert from 'node:assert/strict';
import { gameKey } from '../public/game-controls.js';
import { movementOffer } from '../public/progress.js';
import { templates } from '../public/templates.js';
import { guidedExample, validateInput } from '../tutor.mjs';
import { voiceSession } from '../voice-tutor.mjs';

test('Sokoban directions and undo do not change the existing arcade bindings', () => {
  for(const template of ['platformer','breaker','paratroopers']){
    for(const code of ['ArrowUp','KeyW','Space'])assert.equal(gameKey(template,{code}),'jump');
    assert.equal(gameKey(template,{code:'ArrowDown'}),undefined);
  }
  for(const [code,key] of Object.entries({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',KeyU:'undo',KeyZ:'undo',Space:'undo',KeyN:'next'}))assert.equal(gameKey('sokoban',{code}),key);
});

test('arcade movement evidence does not supply unrelated Sokoban controls', () => {
  assert.equal(movementOffer({records:[{skill:'movement',evidence:'checked',source:'game:breaker'}]},'sokoban'),null);
});

test('Sokoban tutor and voice receive current building exercise and its API', () => {
  for(let index=0;index<4;index++){
    const input=validateInput({template:'sokoban',question:'Help me build this',code:templates.sokoban.starters[index],exercise:{index}});
    assert.equal(input.exercise.title,templates.sokoban.steps[index][0]);
    const hint=guidedExample(input);
    assert.doesNotMatch(hint.message,/paddle|cannon/);
    if(index===3)assert.match(hint.message,/board.load/);
    const voice=voiceSession({kind:'game',sdp:'v=0\r\n',context:input},'test-model');
    assert.match(voice.session.delegation.responses.instructions,/def can_push/);
    assert.ok(voice.session.delegation.responses.instructions.includes(input.exercise.title));
  }
});

test('Asteroids separates thrust from firing and uses separate rotation evidence', () => {
  for (const code of ['ArrowUp','KeyW']) assert.equal(gameKey('asteroids',{code}),'thrust');
  assert.equal(gameKey('asteroids',{code:'Space'}),'jump');
  assert.equal(gameKey('invaders',{code:'Space'}),'jump');
  assert.equal(movementOffer({records:[{skill:'movement',evidence:'checked',source:'game:breaker'}]},'asteroids'),null);
});

test('space game tutors and voice know each exercise and the selected ship API', () => {
  for (const template of ['invaders', 'asteroids']) for (let index=0; index<4; index++) {
    const input=validateInput({template,question:'Help with this rule',code:templates[template].starters[index],exercise:{index}});
    const hint=guidedExample(input);
    assert.equal(hint.message,templates[template].steps[index][2]);
    const voice=voiceSession({kind:'game',sdp:'v=0\r\n',context:input},'test-model');
    assert.match(voice.session.delegation.responses.instructions,/ship.fire/);
    assert.ok(voice.session.delegation.responses.instructions.includes(input.exercise.title));
    if(template==='asteroids')assert.match(voice.session.delegation.responses.instructions,/keyboard.thrust/);
  }
});
