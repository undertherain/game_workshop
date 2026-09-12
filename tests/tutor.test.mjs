import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReply, validateInput, guidedExample } from '../tutor.mjs';
import { createServer } from '../server.mjs';

const code=await readFile(new URL('../public/starter.py',import.meta.url),'utf8');
test('proposed changes must match exactly one place in current code',()=>{
  assert.equal(validateReply({message:'Try this',before:'absent',after:'x'},code).before,null);
  assert.equal(validateReply({message:'Try this',before:'player',after:'cat'},code).before,null);
  const result=validateReply({message:'Try this',before:'player.speed = 4',after:'player.speed = 6',line:99},code);
  assert.equal(result.line,3);assert.equal(result.after,'player.speed = 6');
});
test('guided examples point into changed code and unsupported questions are honest',()=>{
  const result=guidedExample({question:'jump higher',code:code.replace('jump_height = 11','jump_height = 13')});
  assert.equal(result.before,'player.jump_height = 13');assert.equal(result.after,'player.jump_height = 15');
  assert.match(guidedExample({question:'add a dragon',code}).message,/not connected/);
  assert.throws(()=>validateInput({question:'x',code:'x'.repeat(20001)}));
});
test('server serves local Python, isolates secrets, and sends contextual structured AI requests',async()=>{
  let captured;
  const server=createServer({apiKey:'test-secret',fetchImpl:async(url,options)=>{
    captured=JSON.parse(options.body);
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({message:'A bigger number gives a stronger jump.',line:4,before:'player.jump_height = 11',after:'player.jump_height = 15',experiment:'Try jumping again.'})}]}]}));
  }});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(base+'/starter.py')).status,200);
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/server.mjs')).status,404);
    assert.deepEqual(await(await fetch(base+'/api/status')).json(),{mode:'ai'});
    const reply=await(await fetch(base+'/api/help',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'jump higher',code})})).json();
    assert.equal(reply.mode,'ai');assert.equal(reply.line,4);
    assert.equal(captured.store,false);assert.equal(captured.text.format.strict,true);
    assert.equal(JSON.parse(captured.input).code,code);
    const hint=await(await fetch(base+'/api/help',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Just a hint',code,mode:'hint',template:'breaker'})})).json();
    assert.equal(hint.before,null);assert.equal(hint.after,null);
    assert.equal(JSON.parse(captured.input).template,'breaker');
    assert.match(captured.instructions,/Left is ALREADY implemented/);
    assert.equal((await fetch(base+'/api/help',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{}'})).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('upstream failures do not masquerade as AI guidance',async()=>{
  const server=createServer({apiKey:'test-secret',fetchImpl:async()=>new Response('private upstream error',{status:401})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/help`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'jump',code})});
    assert.equal(response.status,502);assert.match((await response.json()).error,/401/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
