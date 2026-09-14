// A six-by-six board. Robot coordinates denote tile centres, not screen pixels.
export const robotStart = () => ({ x: 1, y: 1, turns: 0 });

export function robotPose(action, fraction) {
  return Object.fromEntries(['x', 'y', 'turns'].map(key =>
    [key, action.from[key] + (action.to[key] - action.from[key]) * fraction]));
}

export function drawRobot(ctx, pose, trail) {
  const tile = 60, left = 60, top = 55;
  const px = x => left + x * tile + tile / 2;
  const py = y => top + y * tile + tile / 2;
  ctx.save();
  ctx.fillStyle = '#f6f4e9'; ctx.fillRect(0, 0, 480, 480);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#e6ecdf' : '#fdfcf5';
    ctx.fillRect(left + x * tile + 1, top + y * tile + 1, tile - 2, tile - 2);
  }
  ctx.strokeStyle = '#96aa91'; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
  ctx.strokeRect(px(1), py(1), tile * 3, tile * 3); ctx.setLineDash([]);
  ctx.lineWidth = 6; ctx.strokeStyle = '#35857c'; ctx.lineJoin = 'round'; ctx.beginPath();
  trail.forEach((point, i) => i ? ctx.lineTo(px(point.x), py(point.y)) : ctx.moveTo(px(point.x), py(point.y)));
  ctx.lineTo(px(pose.x), py(pose.y)); ctx.stroke();
  ctx.font = 'bold 18px system-ui'; ctx.fillStyle = '#315a50'; ctx.textAlign = 'center';
  ctx.fillText('START', px(1), py(1) - 37);
  ctx.font = '18px system-ui';
  ctx.fillText('Patrol the square. Return facing right.', 240, 30);
  const directions = ['right', 'down', 'left', 'up'];
  ctx.fillText(`Facing ${directions[Math.round(pose.turns) % 4]} · Moves count tiles`, 240, 451);
  ctx.translate(px(pose.x), py(pose.y)); ctx.rotate(pose.turns * Math.PI / 2);
  ctx.fillStyle = '#294d56';
  ctx.fillRect(-16, -25, 29, 8); ctx.fillRect(-16, 17, 29, 8);
  ctx.fillStyle = '#eab756'; ctx.strokeStyle = '#294d56'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-22, -18, 44, 36, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#294d56'; ctx.beginPath();
  ctx.moveTo(8, -9); ctx.lineTo(18, 0); ctx.lineTo(8, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffdf1'; ctx.beginPath(); ctx.arc(-8, -6, 4, 0, Math.PI * 2); ctx.arc(-8, 6, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

