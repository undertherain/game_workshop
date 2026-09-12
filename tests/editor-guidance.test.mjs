import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { templates } from '../public/templates.js';
import { findGuidance, findEditableRegion, protectRegion, acceptsEdit } from '../public/editor-guidance.js';
const source=await readFile(new URL('../public/breaker.py',import.meta.url),'utf8');
const guide=templates.breaker.guides[0];
test('guidance follows the scoped placeholder when line numbers shift',()=>{
  const found=findGuidance('# my note\n'+source,guide);
  assert.equal(found.line,13);
  assert.equal(('# my note\n'+source).slice(found.from,found.to),'pass');
  assert.equal(findGuidance(source.replace('    pass','    if keyboard.right:\n        paddle.x += paddle.speed'),guide).replacement,false);
  assert.equal(findGuidance('def different():\n    pass',guide),null);
  assert.equal(findGuidance(source+'\ndef update():\n    pass',guide),null);
});
test('guided edits preserve indentation, existing Left controls and other callbacks',()=>{
  const region=findEditableRegion(source,guide), protection=protectRegion(source,region);
  assert.equal(source.slice(region.from,region.to),'pass');
  const changed=protection.prefix+'if keyboard.right:\n        paddle.x += paddle.speed'+protection.suffix;
  assert.equal(acceptsEdit(protection,changed),true);
  assert.equal(acceptsEdit(protection,changed.replace('paddle.x -= paddle.speed','paddle.x += paddle.speed')),false);
  assert.equal(acceptsEdit(protection,changed.replace('brick.hide()','pass')),false);
  assert.deepEqual(findEditableRegion(changed,guide),{from:region.from,to:changed.length-protection.suffix.length});
  const empty=protection.prefix+protection.suffix;
  assert.ok(findEditableRegion(empty,guide));
});
test('all starter control exercises identify exactly their own pass region',async()=>{
  for(const [id,template] of Object.entries(templates)){
    const code=await readFile(new URL('../public/'+template.file,import.meta.url),'utf8');
    const region=findEditableRegion(code,template.guides[0]);
    assert.equal(code.slice(region.from,region.to),'pass',id);
    assert.equal(findEditableRegion(code,template.guides[1]),null);
  }
});
