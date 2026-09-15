import { drawSpace } from './space-scene.js';
import { drawSokoban } from './sokoban-scene.js';
import { createForest, drawPixelFox } from './forest.js';

const palettes = {
  peach: ['#efd6bc','#f8e8ce','#efc99f','#c1c6a0','#8cae90','#497c65','#e9b986'],
  lavender: ['#d2cce6','#eee4ed','#e9c9de','#b9bdd3','#8faaa9','#526f70','#c8b4d6'],
  mint: ['#cce1d4','#f1efce','#f0dab0','#b2cbb1','#83b299','#497d67','#c6dbbd'],
  night: ['#233744','#546074','#e4d6a9','#526775','#405f63','#2e514e','#9aa29c'],
};
export const initialState = { player: { x:80,y:430,facing:1,costume:'fox',on_ground:true },world:{sky:'peach',score:0},stars:[[145,400],[230,312],[292,312],[435,232],[498,232],[655,312],[715,312]].map(([x,y])=>({x,y,visible:true})),platforms:[[0,430,840],[195,345,125],[400,265,130],[620,345,125]],collected:0,won:false,ticks:0 };

export function createScene(canvas, onInvalidate = () => {}) {
  const ctx = canvas.getContext('2d');
  let previous = initialState, state = initialState, changedAt = 0, lastCollected = 0;
  let particles = [], backgroundKey, background;
  const forest = createForest(() => { backgroundKey = null; onInvalidate(); });
  const ellipse = (x,y,rx,ry,color) => { ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill(); };
  const shape = (points,color) => {ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  function star(x,y,r,color,rotation=0){const pts=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2+rotation;pts.push([x+Math.cos(a)*(i%2?r*.45:r),y+Math.sin(a)*(i%2?r*.45:r)]);}shape(pts,color);}
  function tree(x,y,s,color) {ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#6b7960';ctx.fillRect(-5,-93,10,96);ellipse(0,-101,40,47,color);ellipse(-24,-76,30,37,color);ellipse(26,-78,31,36,color);ctx.strokeStyle='#ffffff14';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1,-126);ctx.lineTo(1,-18);ctx.moveTo(1,-65);ctx.lineTo(-20,-86);ctx.moveTo(1,-93);ctx.lineTo(20,-109);ctx.stroke();ctx.restore();}
  function drawBackground(){
    const p=palettes[state.world.sky]||palettes.peach;
    const gradient=ctx.createLinearGradient(0,0,0,480);gradient.addColorStop(0,p[0]);gradient.addColorStop(1,p[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,840,480);
    if(state.kind){drawArcadeBackground(p);return;}
    if(forest.draw(ctx,state))return;
    ellipse(671,94,39,39,p[2]);ellipse(671,94,48,48,p[2]+'33');
    if(state.world.sky==='night')for(let i=0;i<42;i++)ellipse((i*127+31)%840,(i*63+17)%220,1.3,1.3,'#efe8c699');
    for(const [x,y,s] of [[107,99,1],[368,66,.7],[780,158,.8]]){ellipse(x,y,44*s,9*s,'#fff8eb80');ellipse(x-15*s,y-7*s,18*s,14*s,'#fff8eb80');ellipse(x+11*s,y-12*s,22*s,19*s,'#fff8eb80');}
    ctx.fillStyle=p[3];ctx.beginPath();ctx.moveTo(0,285);ctx.bezierCurveTo(130,110,209,230,341,195);ctx.bezierCurveTo(459,145,523,228,608,185);ctx.bezierCurveTo(721,128,772,205,840,202);ctx.lineTo(840,480);ctx.lineTo(0,480);ctx.fill();
    ctx.fillStyle=p[4];ctx.beginPath();ctx.moveTo(0,304);ctx.bezierCurveTo(179,191,250,335,379,284);ctx.bezierCurveTo(560,208,655,278,840,246);ctx.lineTo(840,480);ctx.lineTo(0,480);ctx.fill();
    for(const [x,y,s] of [[28,392,1.55],[98,404,.86],[351,404,.68],[579,386,1.13],[806,411,1.6]])tree(x,y,s,p[5]);
    ctx.fillStyle=p[4];ctx.beginPath();ctx.moveTo(0,421);ctx.quadraticCurveTo(300,371,485,413);ctx.quadraticCurveTo(688,379,840,417);ctx.lineTo(840,480);ctx.lineTo(0,480);ctx.fill();
    // A tiny empty home makes the starting point feel like a place.
    ctx.fillStyle='#e3c9a0';ctx.fillRect(49,369,58,61);shape([[39,373],[78,340],[118,373]],'#926f56');ctx.fillStyle='#657767';ctx.beginPath();ctx.roundRect(68,395,19,35,[10,10,0,0]);ctx.fill();ctx.fillStyle='#f9dc9a';ctx.fillRect(91,385,9,10);
    for(const [x,y,w] of state.platforms){
      if(y===430){ctx.fillStyle='#769568';ctx.fillRect(0,430,840,50);ctx.fillStyle='#b6c691';ctx.fillRect(0,428,840,7);}
      else {ctx.fillStyle='#a89a79';ctx.beginPath();ctx.roundRect(x,y,w,25,9);ctx.fill();shape([[x+10,y+19],[x+w-11,y+19],[x+w-24,y+37],[x+28,y+31]],'#938b6c');ctx.fillStyle='#b6c691';ctx.beginPath();ctx.roundRect(x-4,y-4,w+8,13,7);ctx.fill();for(let i=0;i<5;i++){ctx.strokeStyle='#83976c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14+i*23,y+8);ctx.quadraticCurveTo(x+12+i*23,y+21,x+16+i*23,y+25);ctx.stroke();}}
      for(let i=0;i<w/15;i++){const px=x+8+i*15;ctx.strokeStyle=i%2?'#cad4a0':'#9caf7b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,y+1);ctx.lineTo(px-3,y-5-(i%3)*2);ctx.moveTo(px,y+1);ctx.lineTo(px+3,y-4);ctx.stroke();}
    }
    for(let i=0;i<25;i++){const x=(i*131+13)%840;const y=441+(i*17)%35;ellipse(x,y,2,1,'#a0b17f');if(i%3===0){ctx.strokeStyle='#547a56';ctx.beginPath();ctx.moveTo(x,430);ctx.lineTo(x,419);ctx.stroke();ellipse(x,416,3,3,i%2?'#eed4a0':'#ddac8c');}}
    // Hand-drawn sign and foreground details.
    ctx.fillStyle='#8d805d';ctx.fillRect(151,407,4,23);ctx.save();ctx.translate(154,402);ctx.rotate(-.07);ctx.fillStyle='#d4bc8d';ctx.beginPath();ctx.roundRect(-20,-10,41,18,3);ctx.fill();ctx.fillStyle='#7f8057';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('✦ →',0,3);ctx.restore();
    for(const x of [16,378,768]){ellipse(x,429,20,8,'#60875e');ellipse(x+9,423,12,12,'#729769');ellipse(x-8,422,11,10,'#789f6e');}
  }
  function drawArcadeBackground(p){
    if(state.kind==='breaker'){
      for(let i=0;i<50;i++)ellipse((i*157+11)%840,(i*73+13)%410,1,1,'#fff8d866');
      ctx.strokeStyle='#fff7d514';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(12,30,816,416,14);ctx.stroke();
      ctx.fillStyle='#fff8e840';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('THE MOON BRICK COMPANY',420,56);
      ellipse(100,410,115,65,p[4]+'55');ellipse(738,436,135,70,p[5]+'55');
    }else{
      ellipse(693,77,35,35,p[2]);
      for(const [x,y,s] of [[110,85,1.1],[360,145,.8],[730,176,.65]]){ellipse(x,y,46*s,12*s,'#fff8e9aa');ellipse(x-12*s,y-10*s,22*s,22*s,'#fff8e9aa');ellipse(x+16*s,y-9*s,26*s,18*s,'#fff8e9aa');}
      shape([[0,345],[110,291],[241,363],[390,299],[550,368],[720,287],[840,341],[840,480],[0,480]],p[3]);
      shape([[0,383],[185,346],[360,399],[595,331],[840,383],[840,480],[0,480]],p[4]);
      ctx.fillStyle=p[5];ctx.fillRect(0,432,840,48);ctx.fillStyle='#b1c695';ctx.fillRect(0,430,840,6);
      for(let i=0;i<18;i++){ctx.fillStyle='#a9ba8a';ctx.fillRect(i*49+11,442+(i%3)*9,8,2);}
      ctx.fillStyle='#648075';ctx.fillRect(48,389,49,40);shape([[41,391],[72,368],[105,391]],'#456d65');ctx.fillStyle='#edd8a1';ctx.fillRect(57,399,10,11);ctx.fillRect(78,399,10,11);
    }
  }
  function drawArcade(time){
    if(state.kind==='breaker'){
      const colors=['#b5c8aa','#d3bd9f','#baafca','#9ebfc2'];
      for(const brick of state.items)if(brick.visible){ctx.fillStyle='#122b3522';ctx.beginPath();ctx.roundRect(brick.x,brick.y+4,brick.width,brick.height,5);ctx.fill();ctx.fillStyle=colors[brick.row];ctx.beginPath();ctx.roundRect(brick.x,brick.y,brick.width,brick.height,5);ctx.fill();ctx.fillStyle='#ffffff33';ctx.fillRect(brick.x+6,brick.y+3,brick.width-12,2);}
      const paddle=state.paddle;ctx.fillStyle='#1d333b50';ctx.beginPath();ctx.roundRect(paddle.x-paddle.width/2,416,paddle.width,13,7);ctx.fill();ctx.fillStyle='#e6d2a4';ctx.beginPath();ctx.roundRect(paddle.x-paddle.width/2,411,paddle.width,12,6);ctx.fill();ctx.fillStyle='#fff2ce';ctx.fillRect(paddle.x-paddle.width/2+10,413,paddle.width-20,2);
      ellipse(state.ball.x,state.ball.y,15,15,'#f4e5a520');ellipse(state.ball.x,state.ball.y,8,8,'#f5e7b5');ellipse(state.ball.x-2,state.ball.y-2,3,3,'#fff8dc');
      ctx.fillStyle='#e7e8d680';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('Every bounce is a new chance.',420,462);
    }else{
      for(const [index,target] of state.items.entries())if(target.visible){
        const {x,y}=target,sway=target.canopy_sway??0;
        ctx.save();ctx.translate(x,y);
        if(target.parachute!==false){ctx.strokeStyle='#6b897c';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-23+sway,-28);ctx.lineTo(-7,0);ctx.moveTo(23+sway,-28);ctx.lineTo(7,0);ctx.moveTo(sway,-29);ctx.lineTo(0,0);ctx.stroke();
        ctx.fillStyle=index%2?'#e2b791':'#adc7b0';ctx.beginPath();ctx.arc(sway,-28,24,Math.PI,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff7e54d';ctx.beginPath();ctx.ellipse(sway,-28,10,24,0,Math.PI,0);ctx.stroke();}
        if(target.parachute===false){ctx.strokeStyle='#fff7e580';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,-18);ctx.lineTo(-7,-31);ctx.moveTo(7,-23);ctx.lineTo(7,-38);ctx.stroke();}
        ctx.fillStyle='#627f7a';ctx.beginPath();ctx.roundRect(-13,-6,26,20,5);ctx.fill();ctx.fillStyle='#dbe3bd';ctx.beginPath();ctx.roundRect(-9,-2,18,8,3);ctx.fill();ellipse(-4,2,2,2,'#496b68');ellipse(4,2,2,2,'#496b68');ctx.fillStyle='#6b8980';ctx.fillRect(-9,14,5,6);ctx.fillRect(4,14,5,6);ctx.restore();
      }
      for(const spark of state.sparks){ctx.save();ctx.translate(spark.x,spark.y);ctx.rotate(Math.atan2(spark.vx??0,-(spark.vy??-7)));ellipse(0,0,7,12,'#ffe8a433');ellipse(0,0,3,7,'#fff0b3');ctx.restore();}
      const x=state.cannon.x;ellipse(x,431,26,5,'#1e473033');ctx.fillStyle='#527c72';ctx.beginPath();ctx.roundRect(x-22,415,44,14,7);ctx.fill();ellipse(x-13,427,7,7,'#395c54');ellipse(x+13,427,7,7,'#395c54');ctx.fillStyle='#749d8c';ctx.beginPath();ctx.roundRect(x-15,405,30,15,6);ctx.fill();ctx.fillStyle='#486e65';ctx.beginPath();ctx.save();ctx.translate(x,410);ctx.rotate((state.cannon.angle??0)*Math.PI/180);ctx.roundRect(-5,-28,10,30,3);ctx.fill();ctx.fillStyle='#d9c596';ctx.fillRect(-5,-26,10,4);ctx.restore();ellipse(x,410,7,7,'#749d8c');
    }
  }
  function character(x,y,t){
    const p=state.player, moving=Math.abs(p.x-previous.player.x)>.1, bounce=moving&&p.on_ground?Math.sin(t*.017)*1.7:Math.sin(t*.003)*.65;
    if(p.costume==='fox'){drawPixelFox(ctx,p,x,y,t,moving);return;}
    ctx.save();ctx.translate(x,y+bounce);ctx.scale(p.facing||1,1);
    const fox=p.costume==='fox',bunny=p.costume==='bunny',color=fox?'#ca7848':bunny?'#eee6d3':'#687784',dark=fox?'#945737':bunny?'#b4a58e':'#495d67';
    ellipse(-3,1,21,4,'#25443820');
    if(fox){ctx.save();ctx.translate(-9,-12);ctx.rotate(-.35+Math.sin(t*.005)*.07);ellipse(-13,0,18,8,color);shape([[-30,-3],[-24,6],[-20,-6]],'#f6dfb5');ctx.restore();}else if(bunny)ellipse(-15,-12,7,7,'#f8f0dc');else{ctx.strokeStyle=color;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-12,-10);ctx.quadraticCurveTo(-33,-13,-26,-29);ctx.stroke();}
    ellipse(-2,-13,16,12,color);ctx.fillStyle=dark;ctx.fillRect(-10,-5,6,7);ctx.fillRect(5,-5,6,7);ellipse(4,-12,8,7,fox?'#efd4ac':bunny?'#fff5df':'#bac5c7');
    ellipse(8,-29,14,13,color);
    if(bunny){ellipse(2,-47,4,15,color);ellipse(14,-48,4,15,color);ellipse(2,-48,2,10,'#d3aba5');ellipse(14,-49,2,10,'#d3aba5');}else{shape([[-5,-35],[-5,-51],[7,-39]],color);shape([[10,-39],[20,-50],[22,-32]],color);shape([[-2,-39],[-2,-47],[4,-39]],dark);shape([[14,-39],[19,-46],[19,-35]],dark);}
    ellipse(14,-23,10,6,fox?'#f5e1bd':bunny?'#fff2dc':'#d1d7ce');ellipse(14,-32,2,2.8,'#303c36');ellipse(23,-25,2.4,2,'#303c36');ellipse(15,-33,0.65,.8,'#fff');ctx.restore();
  }
  return {
    update(next){if(next.kind!==state.kind){backgroundKey=null;particles=[];previous=next;}else previous=state;state=next;changedAt=performance.now();if(next.player&&next.collected>lastCollected){for(let i=0;i<12;i++)particles.push({x:next.player.x,y:next.player.y-30,vx:Math.cos(i)*1.9,vy:-2-Math.sin(i)*1.8,life:1});}lastCollected=next.collected;},
    draw(time){
      if(state.kind==='invaders'||state.kind==='asteroids'){drawSpace(ctx,state);return;}
      if(state.kind==='sokoban'){drawSokoban(ctx,state);return;}
      const key=state.world.sky+state.kind+JSON.stringify(state.platforms);
      if(backgroundKey!==key){drawBackground();background=ctx.getImageData(0,0,840,480);backgroundKey=key;}else ctx.putImageData(background,0,0);
      if(state.kind){drawArcade(time);return;}
      for(const [i,s] of state.stars.entries())if(s.visible){const y=s.y+Math.sin(time*.002+i)*3;ellipse(s.x,y,16,16,'#fff0b02e');star(s.x,y,10,'#fff0b5',Math.sin(time*.001+i)*.12);star(s.x-1,y-1,6,'#f7d77b');}
      const blend=Math.min(1,(time-changedAt)/33.33),distance=Math.abs(state.player.x-previous.player.x)+Math.abs(state.player.y-previous.player.y);
      const x=distance>100?state.player.x:previous.player.x+(state.player.x-previous.player.x)*blend;
      const y=distance>100?state.player.y:previous.player.y+(state.player.y-previous.player.y)*blend;
      character(x,y,time);
      particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.07;p.life-=.03;ctx.globalAlpha=p.life;star(p.x,p.y,3,'#fff0b5');}ctx.globalAlpha=1;
      for(let i=0;i<4;i++){const x=410+Math.sin(time*.0005+i*2)*290,y=150+Math.cos(time*.0007+i)*25;ctx.strokeStyle='#586e5e66';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-5,y-2);ctx.lineTo(x,y);ctx.lineTo(x+5,y-2);ctx.stroke();}
    },
  };
}
