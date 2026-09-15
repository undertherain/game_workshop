// The game supplies tiles and positions. Drawing has no puzzle rules.
export function drawSokoban(ctx, state) {
  const {board, items, player} = state;
  const dark = state.world.sky === 'night';
  const colors = {mint:'#e0e8d6',peach:'#f2dfc7',lavender:'#e6dfec',night:'#253e43'};
  ctx.fillStyle=colors[state.world.sky] || colors.mint;ctx.fillRect(0,0,840,480);
  const size=Math.min(62,700/board.width,376/board.height), left=(840-size*board.width)/2, top=65+(376-size*board.height)/2;
  const walls=new Set(board.walls.map(([x,y])=>`${x},${y}`));
  ctx.textAlign='center';ctx.fillStyle=dark?'#eee6cc':'#34594c';ctx.font='24px Georgia';
  ctx.fillText(board.title,420,34);ctx.font='12px system-ui';
  ctx.fillText(board.custom?'A room made from your code':`PUZZLE ${board.level} OF ${board.levels}`,420,53);
  const rect=(x,y,w,h,color,r=4)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
  rect(left-9,top-7,board.width*size+18,board.height*size+21,dark?'#152b31':'#a0ae94',12);
  for(let y=0;y<board.height;y++)for(let x=0;x<board.width;x++){
    const px=left+x*size,py=top+y*size;
    if(walls.has(`${x},${y}`)){
      rect(px+1,py+5,size-2,size-2,dark?'#30494c':'#768e79');
      rect(px+1,py+1,size-2,size-6,dark?'#52696b':'#a6b89a');
      ctx.strokeStyle=dark?'#687b79':'#c7d3b6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px+7,py+9);ctx.lineTo(px+size-7,py+9);ctx.stroke();
    }else{
      rect(px+1,py+1,size-2,size-2,(x+y)%2?(dark?'#576058':'#ede6cf'):(dark?'#60685c':'#f6efdc'),2);
      ctx.fillStyle=dark?'#7b8068':'#ded5ba';ctx.fillRect(px+8,py+size-9,4,2);
    }
  }
  for(const [x,y] of board.goals){
    const px=left+(x+.5)*size,py=top+(y+.5)*size;
    ctx.strokeStyle='#b69458';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,size*.27,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#c9a562';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
  }
  for(const crate of items){
    const px=left+crate.x*size+7,py=top+crate.y*size+6,w=size-14;
    rect(px,py+4,w,w,crate.on_goal?'#4b7e65':'#9f6d42',5);
    rect(px,py,w,w,crate.on_goal?'#85b48a':'#d5a66b',5);
    ctx.strokeStyle=crate.on_goal?'#cde3ac':'#f4d39c';ctx.lineWidth=3;
    ctx.strokeRect(px+5,py+5,w-10,w-10);ctx.beginPath();ctx.moveTo(px+6,py+6);ctx.lineTo(px+w-6,py+w-6);ctx.moveTo(px+w-6,py+6);ctx.lineTo(px+6,py+w-6);ctx.stroke();
    if(crate.on_goal){ctx.fillStyle='#284d40';ctx.font=`bold ${size*.32}px system-ui`;ctx.fillText('✓',px+w/2,py+w*.67);}
  }
  const x=left+(player.x+.5)*size,y=top+(player.y+.5)*size;
  ctx.fillStyle='#243d3325';ctx.beginPath();ctx.ellipse(x,y+size*.29,size*.28,size*.12,0,0,Math.PI*2);ctx.fill();
  rect(x-size*.19,y-size*.06,size*.38,size*.4,'#668ab0',7);
  rect(x-size*.15,y+size*.25,size*.11,size*.11,'#465954',2);rect(x+size*.04,y+size*.25,size*.11,size*.11,'#465954',2);
  ctx.fillStyle='#f1c6a0';ctx.beginPath();ctx.arc(x,y-size*.13,size*.22,0,Math.PI*2);ctx.fill();
  rect(x-size*.25,y-size*.35,size*.5,size*.13,'#c27d50',5);
  ctx.fillStyle='#384b46';for(const eye of [-.08,.08]){ctx.beginPath();ctx.arc(x+size*eye,y-size*.12,1.8,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=dark?'#d7dfc5':'#536c57';ctx.font='12px system-ui';ctx.fillText('Push onto the rings. A green crate is home. Undo lets you try another idea.',420,468);
}
