import { gameKey, gameControls, configureGameControls } from './game-controls.js';
import { findGuidance, findEditableRegion, protectRegion, acceptsEdit } from './editor-guidance.js';
import { createPipVoice, stopPipVoice } from './pip-voice.js';
import { createScene, initialState } from './scene.js';
import { templates } from './templates.js';
import { progress, movementOffer, movementStarter } from './progress.js';
import { gameSkills, games } from './curriculum.js';

const $ = id => document.getElementById(id);
const editor = $('editor'), canvas = $('game'), scene = createScene(canvas);
let code = '', starter = '', runningCode = '', gameState = initialState, currentError = null;
let worker, ready = false, pending = null, requestId = 0, requestTimer, bootTimer, playing = false;
let focusedLine = null, proposal = null, proposalSource = '', history = [], snapshots = [], asking = false;
let keys = { left: false, right: false, jump: false }, lastStep = 0, lastDraw = 0;
let protection = null, questionController = null;
const unlockedExercises = new Set();
let assisted = false, suppliedControls = false;
let templateId='breaker', stepIndex=0, sourceCache={}, exerciseFeedback=null, completeMode=false, conversationActivity=null;
let renderedTemplate = null;
const gameStorageKey = () => 'little-makers-exercises-'+(templateId==='paratroopers'?'v2-':'v1-')+templateId;
const hasStepStarter = () => completeMode || !!templates[templateId].starters?.[stepIndex];
const storageKey = () => completeMode ? gameStorageKey()+'-complete' : hasStepStarter() ? gameStorageKey()+'-exercise-'+stepIndex : gameStorageKey();
const stepDrafts = new Map();
const pipVoice = createPipVoice($('ask-form').parentElement, 'game', () => ({
  code: editor.value, runningCode, template: templateId, error: currentError,
  selected: editor.value.slice(editor.selectionStart, editor.selectionEnd),
  selectedLine: editor.value.slice(0, editor.selectionStart).split('\n').length,
  activity: completeMode ? 'complete' : 'lesson', exercise: { index: stepIndex, feedback: exerciseFeedback }, progress: progress.get(), history,
  state: { ship: gameState.ship, lives: gameState.lives, lost: gameState.lost, board: gameState.board, items: gameState.items, moves: gameState.moves, player: gameState.player, paddle: gameState.paddle, ball: gameState.ball, cannon: gameState.cannon, world: gameState.world },
}), role => {
  const entry = { role, content: '' };
  const node = appendMessage(role, '').querySelector('p');
  history.push(entry); history = history.slice(-6);
  return content => {
    entry.content = content; node.textContent = content;
    $('conversation').scrollTop = $('conversation').scrollHeight;
  };
});
function readDraft(){try{return localStorage.getItem(storageKey()) ?? stepDrafts.get(storageKey());}catch{return stepDrafts.get(storageKey());}}
const escape = text => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

function colorize(line) {
  const regex = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|if|and|or|not|else|elif|return|for|in|while|True|False|None|import|from)\b|\b(\d+(?:\.\d+)?)\b/g;
  let html = '', offset = 0;
  for (const match of line.matchAll(regex)) {
    html += escape(line.slice(offset, match.index));
    const type = match[1] ? 'comment' : match[2] ? 'string' : match[3] ? 'keyword' : 'number';
    html += `<span class="token-${type}">${escape(match[0])}</span>`; offset = match.index + match[0].length;
  }
  return html + escape(line.slice(offset));
}
function currentGuidance(){
  if(completeMode)return null;
  const guide=findGuidance(editor.value,templates[templateId]?.guides?.[stepIndex]);
  if(guide&&protection&&!guide.replacement)guide.line=protection.prefix.split('\n').length;
  return guide;
}
function paintEditor() {
  const editableFrom = protection ? protection.prefix.split('\n').length : null;
  const editableTo = protection ? editor.value.slice(0,editor.value.length-protection.suffix.length).split('\n').length : null;
  const guide = currentGuidance();
  $('editor-guide').hidden = !guide;
  if(guide){
    $('editor-guide-message').textContent=guide.message+(protection?' The surrounding code is provided; only your rule is editable.':'');
    $('editor-guide-unlock').hidden=!protection;
    $('editor-guide-focus').textContent=`${guide.replacement?'Write here':protection?'Edit your rule':'Find this rule'} · line ${guide.line} ↗`;
  }
  const lines = editor.value.split('\n');
  $('syntax').innerHTML = lines.map((line,i) => `<span class="syntax-line${protection?(i+1>=editableFrom&&i+1<=editableTo?' editable-line':' provided-line'):''}${i+1===focusedLine?' active':''}${i+1===guide?.line?(guide.replacement?' write-target':' rule-target'):''}">${colorize(line)||' '}</span>`).join('\n');
  $('line-numbers').innerHTML = lines.map((_,i) => `<div class="number-line${protection?(i+1>=editableFrom&&i+1<=editableTo?' editable-line':' provided-line'):''}${i+1===focusedLine?' active':''}${i+1===guide?.line?(guide.replacement?' write-target':' rule-target'):''}">${i+1}</div>`).join('');
  syncScroll();
}
$('editor-guide-focus').onclick=()=>{
  const guide=currentGuidance();
  if(!guide)return;
  locate(guide.line,guide.message);
  if(guide.replacement)editor.setSelectionRange(guide.from,guide.to);
  else if(protection)editor.setSelectionRange(protection.prefix.length,editor.value.length-protection.suffix.length);
  editor.scrollIntoView({behavior:'smooth',block:'nearest'});
};
$('editor-guide-unlock').onclick=()=>{
  unlockedExercises.add(templateId+':'+stepIndex);protection=null;paintEditor();
  $('line-note').textContent='The whole file is editable. Undo is available for your changes.';
};
function scrollToGuidance(){
  const guide=currentGuidance();
  if(!guide)return;
  editor.scrollTop=Math.max(0,(guide.line-5)*parseFloat(getComputedStyle(editor).lineHeight));syncScroll();
}
function syncScroll() { $('syntax').scrollTop=editor.scrollTop; $('syntax').scrollLeft=editor.scrollLeft; $('line-numbers').scrollTop=editor.scrollTop; }
function save() {
  if(protection){
    if(!acceptsEdit(protection,editor.value)){
      editor.value=protection.source;
      editor.setSelectionRange(protection.prefix.length,protection.prefix.length);
      $('line-note').textContent='The surrounding code is provided. Use Write here to edit your rule.';
    }else protection.source=editor.value;
  }
  if(editor.value!==code){
    focusedLine=null;proposal=null;proposalSource='';$('suggestion').hidden=true;
    currentError=null;$('error-box').hidden=true;
    $('line-note').textContent='Code changed · highlights follow your current exercise.';
    exerciseFeedback=null;$('exercise-result').textContent='';
  }
  code=editor.value;
  stepDrafts.set(storageKey(),code);
  try { localStorage.setItem(storageKey(),code); $('save-status').textContent='Saved in this browser'; }
  catch { $('save-status').textContent='Use Save Python to keep your work'; }
  $('code-state').textContent=code===runningCode?'Running this version':'Changes to try';
  paintEditor();
}
function checkpoint() { if (snapshots.at(-1)!==editor.value) snapshots.push(editor.value); if(snapshots.length>30)snapshots.shift(); $('undo').disabled=!snapshots.length; }
function locate(line, message='This is the line Pip is talking about.', focus=true) {
  if (!Number.isInteger(line) || line<1 || line>editor.value.split('\n').length) return;
  focusedLine=line; paintEditor();
  const lines=editor.value.split('\n'), start=lines.slice(0,line-1).reduce((n,s)=>n+s.length+1,0);
  if(focus){editor.focus({preventScroll:true});editor.setSelectionRange(start,start+lines[line-1].length);}
  const height=parseFloat(getComputedStyle(editor).lineHeight);
  editor.scrollTop=Math.max(0,(line-5)*height);syncScroll();
  $('line-note').textContent=`Line ${line} · ${message}`;
}
function clearKeys(){keys={left:false,right:false,jump:false};}
let gameHome, gameNext;
function closeExpandedGame({ restoreFocus = true } = {}) {
  const dialog = $('expanded-game');
  if (!dialog.open) return;
  clearKeys();
  gameHome.insertBefore($('game-card'), gameNext);
  dialog.close();
  document.body.classList.remove('game-expanded');
  $('expand-game').textContent = '⛶ Expand game';
  $('expand-game').setAttribute('aria-expanded', 'false');
  if (restoreFocus) $('expand-game').focus({ preventScroll: true });
}
$('expand-game').onclick = () => {
  const dialog = $('expanded-game');
  if (dialog.open) return closeExpandedGame();
  const card = $('game-card');
  gameHome = card.parentElement; gameNext = card.nextSibling;
  clearKeys(); stopPipVoice('Voice ended for expanded play.');
  $('game-downloads').open = false;
  dialog.append(card);
  document.body.classList.add('game-expanded');
  $('expand-game').textContent = '↙ Back to workshop';
  $('expand-game').setAttribute('aria-expanded', 'true');
  dialog.showModal();
  canvas.focus({ preventScroll: true });
};
$('expanded-game').addEventListener('cancel', event => {
  event.preventDefault(); closeExpandedGame();
});
$('expanded-game').addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...$('expanded-game').querySelectorAll('button:not(:disabled), [tabindex="0"]')]
    .filter(node => node.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
window.addEventListener('hashchange', () => closeExpandedGame({ restoreFocus: false }));
function setPlaying(value){
  playing=value;
  $('run').textContent=value?'■ Stop':'▶ Run';
  $('run').setAttribute('aria-pressed',String(value));
}
function stopPlayback(){
  setPlaying(false);clearKeys();worker?.terminate();ready=false;pending=null;
  clearTimeout(requestTimer);clearTimeout(bootTimer);
  $('run').disabled=false;$('check-step').disabled=false;$('boot-overlay').hidden=true;
  $('run-status').textContent='Stopped · Run my code starts the game again';
  $('code-state').textContent=editor.value===runningCode?'Stopped':'Changes to try';
}
function showError(error) {
  closeExpandedGame();
  $('boot-overlay').hidden=true;
  currentError=error;setPlaying(false);clearKeys();
  $('error-box').hidden=false;$('error-title').textContent=error.line?`Let’s look at line ${error.line}`:'Something needs a little attention';
  const friendly={SyntaxError:'Python could not read this rule yet. Check its punctuation.',IndentationError:'The spaces at the start of a line show which rule it belongs to.',NameError:'Python found a name it does not know. Check its spelling.',TypeError:'These pieces do not fit together yet. Check the values on this line.'};
  $('error-message').textContent=`${friendly[error.type]||'Your editor is still here. You can change the code and try again.'}\n${error.message}`;
  $('run-status').textContent='Paused · edit and run to try again';
  if(error.line)locate(error.line,'Something on this line needs attention.',false);
}
function displayState(state){
  gameState=state;scene.update(state);
  renderedTemplate=templateId;canvas.style.visibility='visible';
  const total=state.stars?.length??state.items?.length??0;
  const noun=state.kind==='invaders'?'aliens':state.kind==='asteroids'?'rocks':state.kind==='breaker'?'bricks':state.kind==='paratroopers'?'robots':state.kind==='sokoban'?'crates on goals':'stars';
  $('score').textContent=`${state.collected}/${total} ${noun} · ${state.kind==='sokoban'?state.moves+' moves':state.world.score+' pts'}`;
  if (state.kind === 'asteroids') $('score').textContent = `${total-state.collected} rocks left · ${state.world.score} pts`;
  if (state.lives !== undefined) $('score').textContent += ` · ${state.lives} shields`;
  $('win-banner').hidden=!(state.won || state.lost);$('win-banner').replaceChildren();
  const win=document.createTextNode(state.lost?'Game over':state.kind==='sokoban'?'Puzzle solved!':'You got them all!');
  const small=document.createElement('small');small.textContent=state.lost?'Choose Play again to restart.':state.kind==='sokoban'?(state.can_next?'Press N or Next puzzle to continue.':'Try building a puzzle of your own.'):'Now give your game a new twist.';
  $('win-banner').append(win,small);
  for(const button of document.querySelectorAll('[data-key="next"]'))button.disabled=!state.can_next;
}
function send(type, payload={}) {
  if(!ready||pending)return false;
  const id=++requestId;pending={id,type,template:templateId,...payload};
  requestTimer=setTimeout(()=>{
    if(pending?.id!==id)return;
    worker.terminate();ready=false;pending=null;setPlaying(false);$('run').disabled=false;$('check-step').disabled=false;
    showError({type:'TimeoutError',line:null,message:'That code kept running without giving the game a turn. Check for a loop that never ends, then press Run my code.'});
  },type==='load'?1800:1200);
  worker.postMessage({id,type,template:templateId,...payload});return true;
}
function boot(source) {
  worker?.terminate();clearTimeout(requestTimer);clearTimeout(bootTimer);pending=null;ready=false;setPlaying(false);
  $('boot-overlay').hidden=false;$('run').disabled=true;
  worker=new Worker('/python-worker.js',{type:'module'});
  const thisWorker=worker;
  function fail(message){if(worker!==thisWorker)return;clearTimeout(bootTimer);thisWorker.terminate();ready=false;pending=null;$('boot-overlay').hidden=true;$('run').disabled=false;showError({type:'StartupError',message,line:null});}
  bootTimer=setTimeout(()=>fail('Python took too long to start. Press Run my code to retry.'),25000);
  worker.onerror=event=>{event.preventDefault();fail('Python could not start. Press Run my code to try again.');};
  worker.onmessage=({data})=>{
    if(worker!==thisWorker)return;
    if(data.type==='boot-error'){fail(data.message);return;}
    if(data.type==='ready'){clearTimeout(bootTimer);ready=true;$('run').disabled=false;send('load',{code:source});return;}
    if(data.id!==pending?.id)return;
    const request=pending;clearTimeout(requestTimer);pending=null;
    if(data.type==='check'){
      $('check-step').disabled=false;
      exerciseFeedback=data.check||{passed:false,message:data.error?.message||'Could not check this rule.'};
      if(editor.value!==request.code){exerciseFeedback={passed:null,message:'You edited the code during the check. Check your new version when ready.'};}
      if(exerciseFeedback.passed===true && request.step < 3){
        progress.record({skill:gameSkills[request.template][request.step],source:'game:'+request.template,evidence:(assisted||(request.step===0&&suppliedControls))?'assisted':'checked'});
      }
      $('exercise-result').textContent=exerciseFeedback.message;$('exercise-result').dataset.pass=String(exerciseFeedback.passed);
      return;
    }
    if(data.type==='step'&&!playing)return;
    if(data.error){$('run').disabled=false;showError(data.error);return;}
    if(data.state)displayState(data.state);
    if(data.type==='load'){
      $('boot-overlay').hidden=true;
      runningCode=request.code;currentError=null;setPlaying(true);focusedLine=null;
      $('error-box').hidden=true;$('run').disabled=false;$('code-state').textContent=editor.value===runningCode?'Running this version':'Changes to try';
      $('run-status').textContent='Your Python is running';$('line-note').textContent='✧ Click the game and try your rules.';paintEditor();
    }
  };
}
async function run(source=editor.value) {
  if(!source.trim()){showError({type:'ValueError',line:null,message:'Your game needs a few rules. Undo your edit or paste your saved Python.'});return;}
  if(source.length>20000){showError({type:'ValueError',line:null,message:'This little workshop can run up to 20,000 characters of Python.'});return;}
  clearKeys();setPlaying(false);$('run-status').textContent='Trying your code…';
  if(!ready){boot(source);return;}
  // Finish an in-flight frame before loading a new version.
  if(pending){await new Promise(resolve=>setTimeout(resolve,40));if(pending){setTimeout(()=>run(source),80);return;}}
  $('run').disabled=true;send('load',{code:source});
}

function appendMessage(role,text,experiment=''){
  const element=document.createElement('div');element.className=`message ${role}`;
  const paragraph=document.createElement('p');paragraph.textContent=text;element.append(paragraph);
  if(experiment){const extra=document.createElement('p');extra.className='experiment';extra.textContent=experiment;element.append(extra);}
  $('conversation').append(element);$('conversation').scrollTop=$('conversation').scrollHeight;return element;
}
function setAsking(value){asking=value;pipVoice.setThinking(value);$('ask').disabled=value;$('guide-step').disabled=value;document.querySelectorAll('.ideas button,.template-choice').forEach(b=>b.disabled=value);$('ask').textContent=value?'…':'↑';}
function cancelQuestion(){questionController?.abort();questionController=null;setAsking(false);}
async function ask(question,mode='chat') {
  if(asking||!question.trim())return;
  stopPipVoice('Continuing in chat. Microphone off.');
  setAsking(true);proposal=null;$('suggestion').hidden=true;
  const requestController=new AbortController();questionController=requestController;
  const requestedCode=editor.value;
  const selected=editor.value.slice(editor.selectionStart,editor.selectionEnd);
  const selectedLine=editor.value.slice(0,editor.selectionStart).split('\n').length;
  const requestHistory = history.slice();
  history.push({role:'user',content:question}); history=history.slice(-6);
  appendMessage('user',question);const waiting=appendMessage('assistant','Pip is looking at your code…');
  $('question').value='';
  try {
    const response=await fetch('/api/help',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([requestController.signal,AbortSignal.timeout(35000)]),
      body:JSON.stringify({question,mode,code:requestedCode,runningCode,selected,selectedLine,error:currentError,template:templateId,
        activity:completeMode?'complete':'lesson',exercise:{index:stepIndex,title:templates[templateId].steps[stepIndex][0],description:templates[templateId].steps[stepIndex][1],feedback:exerciseFeedback},
        progress:progress.get(),
        state:{ship:gameState.ship,lives:gameState.lives,lost:gameState.lost,board:gameState.board,items:gameState.items,moves:gameState.moves,player:gameState.player,paddle:gameState.paddle,ball:gameState.ball,cannon:gameState.cannon,world:gameState.world,collected:gameState.collected,won:gameState.won},history:requestHistory})});
    const reply=await response.json();if(questionController!==requestController)return;if(!response.ok)throw new Error(reply.error||'Pip could not answer just now.');
    waiting.remove();appendMessage('assistant',reply.message,reply.experiment);
    history.push({role:'assistant',content:reply.message});history=history.slice(-6);
    if(editor.value===requestedCode){
      if(reply.line)locate(reply.line,'Pip found a place to start.',false);
      if(reply.before!==null&&typeof reply.before==='string'&&typeof reply.after==='string'){
        proposal=reply;proposalSource=requestedCode;$('suggestion').hidden=false;
        $('before-code').textContent=reply.before;$('after-code').textContent=reply.after;
      }
    }else appendMessage('assistant','You changed your code while I was thinking. My answer refers to the earlier version; ask again if you want me to look at the new one.');
  }catch(error){if(questionController!==requestController)return;waiting.remove();appendMessage('error',error.name==='TimeoutError'?'Pip took too long. Please try again.':error.message);}
  finally{if(questionController===requestController){questionController=null;setAsking(false);}}
}

function prepareRuleEdit(event){
  if(protection){
    const start=protection.prefix.length,end=editor.value.length-protection.suffix.length;
    const lineStart=protection.prefix.lastIndexOf('\n')+1;
    // The first rule's indentation is supplied, but selecting from its left edge
    // should still replace the rule. Keep those spaces outside the replacement.
    if(editor.selectionStart>=lineStart&&editor.selectionStart<start&&editor.selectionEnd<=end){
      editor.setSelectionRange(start,Math.max(start,editor.selectionEnd));
    }
    const collapsed=editor.selectionStart===editor.selectionEnd;
    if(editor.selectionStart<start||editor.selectionEnd>end||
      (collapsed&&event.inputType==='deleteContentBackward'&&editor.selectionStart===start)||
      (collapsed&&event.inputType==='deleteContentForward'&&editor.selectionEnd===end)){
      event.preventDefault();$('line-note').textContent='That code is provided. Choose Write here to edit your rule.';return false;
    }
  }
  return true;
}
editor.addEventListener('beforeinput',event=>{
  if(!prepareRuleEdit(event))return;
  checkpoint();
});
editor.addEventListener('input',()=>{focusedLine=null;exerciseFeedback=null;$('exercise-result').textContent='';$('transfer-offer').hidden=true;save();});editor.addEventListener('scroll',syncScroll);
editor.addEventListener('keydown',event=>{
  if(protection&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){
    event.preventDefault();editor.setSelectionRange(protection.prefix.length,editor.value.length-protection.suffix.length);return;
  }
  if((event.key==='Tab'||(event.key==='Enter'&&!event.ctrlKey&&!event.metaKey))&&!prepareRuleEdit(event))return;
  if(event.key==='Tab'){event.preventDefault();const start=editor.selectionStart,end=editor.selectionEnd;checkpoint();editor.setRangeText('    ',start,end,'end');save();}
  if(event.key==='Enter'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();const start=editor.selectionStart;const line=editor.value.slice(0,start).split('\n').at(-1);const indent=line.match(/^ */)[0]+(line.trimEnd().endsWith(':')?'    ':'');checkpoint();editor.setRangeText('\n'+indent,start,editor.selectionEnd,'end');save();}
});
editor.addEventListener('focus',clearKeys);
$('run').onclick=()=>{if(playing){stopPlayback();return;}run();canvas.focus({preventScroll:true});};
$('restart').onclick=()=>{run(runningCode||starter);canvas.focus({preventScroll:true});};
$('undo').onclick=()=>{
  if(!snapshots.length)return;
  const snapshot=snapshots.pop();
  if(typeof snapshot==='string')editor.value=snapshot;
  else {
    protection=null;editor.value=snapshot.code;stepIndex=snapshot.step;
    for(const key of [...unlockedExercises])if(key.startsWith(templateId+':'))unlockedExercises.delete(key);
    for(const key of snapshot.unlocked)unlockedExercises.add(key);
    renderStep();
  }
  $('undo').disabled=!snapshots.length;focusedLine=null;save();
  $('line-note').textContent='Edit undone. Run your code when you’re ready.';
};
$('reset-code').onclick=()=>{
  snapshots.push({code:editor.value,step:stepIndex,unlocked:[...unlockedExercises].filter(key=>key.startsWith(templateId+':'))});
  if(snapshots.length>30)snapshots.shift();$('undo').disabled=false;
  stopPlayback();protection=null;editor.value=starter;if(!hasStepStarter())stepIndex=0;runningCode='';
  for(const key of [...unlockedExercises])if(key.startsWith(templateId+':'))unlockedExercises.delete(key);
  currentError=null;proposal=null;proposalSource='';focusedLine=null;exerciseFeedback=null;
  $('error-box').hidden=true;$('suggestion').hidden=true;$('transfer-offer').hidden=true;
  save();renderStep();
  $('run-status').textContent='Starting code ready · press Run my code';
  $('editor-guide-focus').click();
  $('line-note').textContent='Starting code restored. Undo brings your previous code back.';
};
function closeDownloads(restoreFocus = false) {
  $('game-downloads').open = false;
  if (restoreFocus) $('game-download-toggle').focus();
}
$('game-downloads').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeDownloads(true); }
});
$('game-downloads').addEventListener('focusout', event => {
  if (event.relatedTarget && !$('game-downloads').contains(event.relatedTarget)) closeDownloads();
});
document.addEventListener('pointerdown', event => {
  if ($('game-downloads').open && !$('game-downloads').contains(event.target)) closeDownloads();
  if ($('build-path').open && !$('build-path').contains(event.target)) $('build-path').open=false;
});
$('build-path').addEventListener('keydown', event => {
  if (event.key==='Escape') { event.preventDefault();$('build-path').open=false;$('build-path').querySelector('summary').focus(); }
});
$('build-path').addEventListener('focusout', event => {
  if (event.relatedTarget && !$('build-path').contains(event.relatedTarget)) $('build-path').open=false;
});
$('download').onclick=()=>{closeDownloads(true);$('export-status').textContent='Python code downloaded as my_game.py.';const url=URL.createObjectURL(new Blob([editor.value],{type:'text/x-python'}));const a=document.createElement('a');a.href=url;a.download='my_game.py';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('export-game').onclick=async()=>{
  closeDownloads(true);
  const button=$('export-game'),status=$('export-status');
  const template=templateId,source=editor.value;
  button.disabled=true;status.textContent='Packing your game…';
  try{
    const response=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template,code:source})});
    if(!response.ok)throw Error((await response.json()).error||'Could not export your game.');
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.download=`little-makers-${template}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='ZIP downloaded. Extract it, then run play.py with Python 3. Instructions are inside.';
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;}
};
$('ask-form').onsubmit=event=>{event.preventDefault();ask($('question').value);};
document.querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>ask(button.dataset.question));
$('explain').onclick=()=>{const selected=editor.value.slice(editor.selectionStart,editor.selectionEnd);const line=editor.value.slice(0,editor.selectionStart).split('\n').length;ask(selected?`Please explain this selected code: ${selected}`:`Please explain line ${line} in my game. Show how it affects what happens when I play.`,'explain');};
$('explain-error').onclick=()=>ask('Help me understand the error in my game. Show me where to look and how to fix it.');
$('show-line').onclick=()=>proposal&&editor.value===proposalSource&&locate(proposal.line);
$('apply').onclick=()=>{
  if(!proposal)return;
  if(editor.value!==proposalSource){$('suggestion').hidden=true;appendMessage('assistant','Your code has changed since this suggestion. Ask me again so I can suggest an edit for this version.');proposal=null;return;}
  const proposedCode=editor.value.replace(proposal.before,()=>proposal.after);
  if(protection&&!acceptsEdit(protection,proposedCode)){
    appendMessage('assistant','This edit changes provided code outside your exercise. Choose Edit whole file first if you want to explore that change.');return;
  }
  assisted=true;try{localStorage.setItem(storageKey()+'-assisted','true');}catch{}
  const editLine=proposal.line;
  checkpoint();editor.value=proposedCode;save();locate(editLine,'Your suggested edit is ready. Run it to see what happens.');
  $('suggestion').hidden=true;proposal=null;$('run-status').textContent='Edit ready · press Run my code';
};
function keyName(event){return gameKey(templateId,event);}
document.addEventListener('keydown',event=>{
  if(document.body.dataset.mode!=='workshop')return;
  if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run();canvas.focus({preventScroll:true});return;}
  if(document.activeElement!==canvas)return;const name=keyName(event);if(name){event.preventDefault();keys[name]=true;}
});
document.addEventListener('keyup',event=>{const name=keyName(event);if(name)keys[name]=false;});
window.addEventListener('blur',clearKeys);canvas.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
document.querySelectorAll('[data-key]').forEach(button=>{
  for(const type of ['keydown','keyup'])button.addEventListener(type,event=>{
    if(['Enter',' '].includes(event.key)){event.preventDefault();keys[button.dataset.key]=type==='keydown';}
  });
  button.addEventListener('blur',()=>{keys[button.dataset.key]=false;});
  button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys[button.dataset.key]=true;};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>keys[button.dataset.key]=false);
});
function frame(time){
  if(!document.hidden&&document.body.dataset.mode==='workshop'){
    if(time-lastStep>=33.33){lastStep=time;if(playing&&ready&&!pending)send('step',{keys:{...keys}});}
    if(time-lastDraw>=32&&renderedTemplate===templateId){lastDraw=time;scene.draw(time);}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
function renderTransfer(){
  const evidence=movementOffer(progress.get(),templateId);
  const visible=!!evidence&&stepIndex===0&&editor.value===starter;
  $('transfer-offer').hidden=!visible;
  if(!visible)return;
  const from=games.find(game=>'game:'+game.id===evidence.source)?.title||'another game';
  $('transfer-message').textContent=`Your movement rules passed a check in ${from}. Try this game's controls yourself, or include both arrow-key rules and start with ${templates[templateId].steps[1][0].toLowerCase()}.`;
  const controlsFunction=templates[templateId].guides?.[0]?.function||'update';
  $('transfer-preview').textContent=movementStarter(starter,templateId).split(`def ${controlsFunction}():`)[1].split(/\n(?:def |#)/)[0].trimEnd();
}
$('transfer-use').onclick=()=>{
  if(editor.value!==starter){$('transfer-offer').hidden=true;return;}
  if(hasStepStarter()){selectStep(1);$('transfer-offer').hidden=true;return;}
  checkpoint();protection=null;editor.value=movementStarter(starter,templateId);suppliedControls=true;
  try{localStorage.setItem(storageKey()+'-controls-supplied','true');}catch{}
  progress.record({skill:'movement',source:'game:'+templateId,evidence:'supplied'});
  stepIndex=1;save();renderStep();$('transfer-offer').hidden=true;
  $('line-note').textContent='Both controls are included. Read them, then run your code and build the next mechanic.';
};
$('transfer-practice').onclick=()=>{$('transfer-offer').hidden=true;stepIndex=0;renderStep();};
function selectStep(index){
  if(completeMode||asking||index===stepIndex||!Number.isInteger(index)||index<0||index>3)return;
  save();
  const prepared=!!templates[templateId].starters?.[index];
  if(prepared){
    stopPlayback();protection=null;stepIndex=index;
    starter=templates[templateId].starters[index];editor.value=readDraft()??starter;
    assisted=false;suppliedControls=index>0;
    try{assisted=localStorage.getItem(storageKey()+'-assisted')==='true';}catch{}
    runningCode='';snapshots=[];history=[];proposal=null;proposalSource='';currentError=null;
    $('undo').disabled=true;$('suggestion').hidden=true;$('error-box').hidden=true;
    $('transfer-offer').hidden=true;
    save();
    $('run-status').textContent='Exercise ready · press Run my code';
  }else stepIndex=index;
  exerciseFeedback=null;renderStep();
}
function renderStep(){
  stopPipVoice('Activity changed. Start voice again for the updated context.');
  focusedLine=null;
  const template=templates[templateId];
  const activity=templateId+':'+(completeMode?'complete':stepIndex);
  if(conversationActivity!==activity){
    conversationActivity=activity;history=[];proposal=null;proposalSource='';$('suggestion').hidden=true;
    $('conversation').replaceChildren();
    appendMessage('assistant',completeMode ? 'The complete game is ready to play. Change a rule to make it yours, or export it to keep a playable copy.' : stepIndex===0 ? template.intro : template.steps[stepIndex][0]+'. '+template.steps[stepIndex][1]);
  }
  $('build-path').hidden=completeMode;
  $('exercise-actions').hidden=completeMode;
  const region=completeMode||unlockedExercises.has(templateId+':'+stepIndex)?null:findEditableRegion(editor.value,template.guides?.[stepIndex]);
  protection=region?protectRegion(editor.value,region):null;
  $('build-steps').replaceChildren();
  template.steps.forEach((step,i)=>{const button=document.createElement('button');button.innerHTML=`<span>${i+1}</span>${escape(step[0])}`;if(i===stepIndex)button.setAttribute('aria-current','step');button.onclick=()=>{selectStep(i);$('build-path').open=false;$('build-path').querySelector('summary').focus();};$('build-steps').append(button);});
  $('exercise-result').textContent='';
  paintEditor();scrollToGuidance();
  try{if(!completeMode)localStorage.setItem(gameStorageKey()+'-step',String(stepIndex));}catch{}
}
async function selectTemplate(id,complete=false){
  if(!templates[id])return;
  cancelQuestion();
  $('export-status').textContent='';
  $('selected-game').textContent=templates[id].genre+(complete?' · Complete game':'');
  if(editor.value)save();
  protection=null;completeMode=complete;conversationActivity=null;templateId=id;const template=templates[id];starter=sourceCache[id];
  renderedTemplate=null;canvas.style.visibility='hidden';$('win-banner').hidden=true;
  try{stepIndex=Math.max(0,Math.min(3,Number(localStorage.getItem(gameStorageKey()+'-step'))||0));localStorage.setItem('little-makers-active-template',id);}catch{stepIndex=0;}
  if(completeMode)stepIndex=3;
  starter=completeMode?templates[id].completeCode:templates[id].starters?.[stepIndex]??sourceCache[id];
  const saved=readDraft();
  assisted=false;suppliedControls=false;try{assisted=localStorage.getItem(storageKey()+'-assisted')==='true';suppliedControls=completeMode||localStorage.getItem(storageKey()+'-controls-supplied')==='true';}catch{}
  editor.value=saved??starter;runningCode='';history=[];snapshots=[];currentError=null;proposal=null;exerciseFeedback=null;focusedLine=null;
  $('reset-code').disabled=false;$('undo').disabled=true;$('suggestion').hidden=true;$('error-box').hidden=true;$('check-step').disabled=false;
  $('game-title').textContent=template.title;canvas.setAttribute('aria-label',`${template.title}. Click to play. Arrow keys move; Space ${template.controls}.`);
  $('workshop-main').dataset.game=id;
  $('game-controls').textContent=gameControls(id);
  canvas.setAttribute('aria-label',template.title+'. '+gameControls(id));
  configureGameControls(id);
  $('action-label').textContent=template.controls;document.querySelector('[data-key="jump"]').textContent=template.action;
  $('question').placeholder=template.placeholder;
  $('template-ideas').replaceChildren();
  const example=document.createElement('button');example.textContent='Show a small example';example.onclick=()=>ask(completeMode?'Show one small variation I can make to this complete game and explain what it changes.':`For my current mini-exercise, show one small code edit I can try and explain what it does. Stay on this step.`);$('template-ideas').append(example);
  for(const [label,question] of template.ideas){const button=document.createElement('button');button.textContent=label;button.onclick=()=>ask(question);$('template-ideas').append(button);}
  const guide=document.querySelector('.pocket-guide dl');guide.replaceChildren();for(const [name,description] of template.guide){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=description;guide.append(dt,dd);}
  document.querySelectorAll('.template-choice').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.template===id)));
  clearKeys();save();renderStep();renderTransfer();boot(editor.value);
}
$('guide-step').onclick=()=>{ask(templates[templateId].steps[stepIndex][2]+' Give a hint first, without a replacement edit unless I ask for one.','hint');$('helper-title').scrollIntoView({behavior:'smooth',block:'center'});};
$('next-step').onclick=()=>selectStep(Math.min(3,stepIndex+1));
async function checkStep(){
  if(completeMode)return;
  if(!ready){$('exercise-result').textContent='Run your code to start Python, then check this step.';return;}
  if(pending){setTimeout(checkStep,60);return;}
  exerciseFeedback=null;$('check-step').disabled=true;$('exercise-result').textContent='Trying your rule with a few key presses…';send('check',{code:editor.value,step:stepIndex});
}
$('check-step').onclick=checkStep;
let started = false;
export async function startWorkshop(){
  if(started)return;
  started=true;
try {
  await Promise.all(Object.entries(templates).map(async([id,template])=>{const response=await fetch('/'+template.file);if(!response.ok)throw Error('Could not load the '+template.genre+' starter.');sourceCache[id]=await response.text();}));
  let initial='breaker';try{initial=localStorage.getItem('little-makers-active-template')||initial;}catch{}
  await selectTemplate(templates[initial]?initial:'breaker');
  $('export-game').disabled=false;
  $('download').disabled=false;
  const status=await(await fetch('/api/status')).json();
  $('helper-mode').textContent=status.mode==='ai'?'Your AI coding companion · you make the changes':'Built-in examples · live AI is not connected';
  $('helper-badge').textContent=status.mode==='ai'?'AI helper':'Examples';
}catch(error){showError({type:'StartupError',message:error.message,line:null});$('boot-overlay').hidden=true;}

}

// Small inspection surface for smoke checks. Python remains the source of game behavior.
window.workshop={getState:()=>gameState,getError:()=>currentError,isReady:()=>ready&&!pending,
  getCode:()=>editor.value,setCode(value){checkpoint();editor.value=value;exerciseFeedback=null;save();},run,ask,
  getRunningCode:()=>runningCode,setKeys(value){keys={left:false,right:false,jump:false,...value};},
  pause(){setPlaying(false);clearKeys();},resume(){setPlaying(true);},starter:()=>starter,
  selectTemplate,cancelQuestion,getTemplate:()=>templateId,isComplete:()=>completeMode,checkStep,setStep:selectStep,getExerciseFeedback:()=>exerciseFeedback};
