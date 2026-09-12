// Art stays in rendering coordinates; platform tops are the runtime's collision y.
export function createForest(onReady) {
  const image = new Image();
  let background;
  image.onload = () => {
    background = document.createElement('canvas');
    background.width = 420; background.height = 240;
    const paint = background.getContext('2d');
    paint.imageSmoothingEnabled = false;
    paint.drawImage(image, 0, 0, 420, 240);
    onReady();
  };
  image.src = new URL('./assets/forest/background.png', import.meta.url).href;
  const noise = (x, y) => {
    let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n >>> 0) / 4294967296;
  };
  return {
    draw(ctx, state) {
      if (!background) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(background, 0, 0, 840, 480);
      const tint = {night:'#10233999',lavender:'#80578c30',mint:'#3f95651c'}[state.world.sky];
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, 840, 480); }
      for (const [x, y, width] of state.platforms) {
        const ground = y === 430, depth = ground ? 50 : 36;
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, width, depth + 12); ctx.clip();
        // Each two-pixel column has a broken underside and exposed soil strata.
        for (let i = 0; i < width; i += 2) {
          const edge = Math.min(i, width - i) / 2;
          const bottom = ground ? depth : Math.min(depth, 12 + edge) + Math.floor(noise(x+i,y)*5)*2;
          ctx.fillStyle = '#282522'; ctx.fillRect(x+i,y,2,bottom);
          for (let j = 4; j < bottom; j += 4) {
            const n = noise(x+i,y+j);
            ctx.fillStyle = (j < 16 ? ['#704e32','#8b613b','#57432e'] : ['#38302a','#49392d','#5d4430'])[Math.floor(n*3)];
            ctx.fillRect(x+i,y+j,2,4);
          }
          ctx.fillStyle = '#3e592d'; ctx.fillRect(x+i,y,2,6+Math.floor(noise(i,y)*5)*2);
          ctx.fillStyle = noise(i,y)>.5 ? '#809941' : '#657f35'; ctx.fillRect(x+i,y,2,4);
          ctx.fillStyle = '#b3bd65'; ctx.fillRect(x+i,y,2,2);
          if (noise(i,7)>.86) {ctx.fillStyle='#8b7846';ctx.fillRect(x+i,y+10,2,12);}
        }
        ctx.restore();
        for (let i=4;i<width-3;i+=6) {
          const n=noise(x+i,y);
          ctx.fillStyle=n>.5?'#8ba448':'#547334';
          ctx.fillRect(x+i,y-2-Math.floor(n*3)*2,2,4+Math.floor(n*3)*2);
          if(n>.75){ctx.fillRect(x+i-2,y-4,2,2);ctx.fillRect(x+i+2,y-6,2,2);}
        }
      }
      ctx.restore();
      return true;
    },
  };
}

const fox = [
  '...........dd.....dd...',
  '...........dad...dad...',
  '...........daadddaad...',
  '............aaaaaaa...',
  '...........ahaaaaaaa...',
  '...........haaaakaaa...',
  '...........aaaakfaaa...',
  '..ff.......aaaafffffk.',
  '.fffaa.....aaaafffff..',
  'ffffaaaadddaaaafff....',
  '.fffaaaaaaaaaaaad....',
  '..faaaaaaaaaaaaad....',
  '....ddaaaafffffad....',
  '......daaaffffad.....',
  '.......dd....dd......',
  '.......kk....kk......',
];

export function drawPixelFox(ctx, player, x, y, time, moving) {
  const running=moving&&player.on_ground, stride=running?Math.floor(time/100)%2:0;
  const colors={d:'#653b29',a:'#c47235',h:'#e99d4d',f:'#ffe4b0',k:'#252d2c'};
  ctx.save(); ctx.translate(Math.round(x/2)*2,Math.round(y/2)*2);
  ctx.scale(player.facing||1,1);
  ctx.fillStyle='#152b344d';ctx.fillRect(-18,0,36,2);
  for(let row=0;row<fox.length;row++)for(let col=0;col<fox[row].length;col++){
    const color=colors[fox[row][col]];if(!color)continue;
    const leg=row>=14?(col<10?-stride:stride)*2:0;
    ctx.fillStyle=color;ctx.fillRect((col-12)*2+leg,(row-16)*2-(running?stride*2:0),2,2);
  }
  ctx.restore();
}
