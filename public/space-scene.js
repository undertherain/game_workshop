// Shared Canvas rendering for workshop, museum previews and exported space games.
export function drawSpace(ctx, state) {
  const palettes = {
    night: ['#080e20', '#15243a', '#8ceaf2'], mint: ['#10292a', '#204442', '#a4f0c3'],
    lavender: ['#171129', '#342645', '#d8bdff'], peach: ['#241b25', '#443038', '#ffd4a1'],
  };
  const [background, haze, accent] = palettes[state.world.sky] || palettes.night;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 840, 480);
  const nebula = ctx.createRadialGradient(590, 190, 10, 590, 190, 430);
  nebula.addColorStop(0, haze); nebula.addColorStop(1, background);
  ctx.fillStyle = nebula; ctx.fillRect(0, 0, 840, 480);
  for (let i = 0; i < 95; i++) {
    const x = (i * 137 + 19) % 840, y = (i * 83 + 29) % 480;
    ctx.fillStyle = i % 5 ? '#b2cbe855' : '#e7eddfa0';
    ctx.fillRect(x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2);
  }
  ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = accent + 'aa';
  ctx.fillText(state.kind === 'invaders' ? 'SECTOR 01 / ALIEN FORMATION' : 'SECTOR 02 / ASTEROID FIELD', 24, 28);
  ctx.textAlign = 'right'; ctx.fillText('SHIELDS', 747, 28);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.lives ? accent : '#ffffff20'; ctx.fillRect(760 + i * 17, 19, 11, 10);
  }
  if (state.kind === 'invaders') drawInvaders(ctx, state, accent);
  else drawAsteroids(ctx, state, accent);
}

function drawInvaders(ctx, state, accent) {
  ctx.save(); ctx.scale(840 / state.width, 480 / state.height);
  // Ground reference makes the advancing formation and ship lane easy to read.
  ctx.strokeStyle = accent + '25'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, 608); ctx.lineTo(940, 608); ctx.stroke();
  const sprite = (actor, color) => {
    const pattern = state.sprites[actor.asset];
    if (!pattern) return;
    const cellX = actor.width / pattern.rows[0].length, cellY = actor.height / pattern.rows.length;
    ctx.fillStyle = color || `rgb(${pattern.color.join(',')})`;
    for (const [row, pixels] of pattern.rows.entries()) for (const [column, pixel] of [...pixels].entries()) {
      if (pixel !== '.') ctx.fillRect(actor.x + column * cellX, actor.y + row * cellY, cellX, cellY);
    }
  };
  for (const [i, alien] of state.items.entries()) if (alien.visible) {
    sprite(alien, ['#bce990', '#93dce0', '#ceaff1'][Math.floor(i / 7) % 3]);
  }
  for (const shot of state.shots) {
    ctx.fillStyle = shot.enemy ? '#ffad91' : '#fff4b5';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 9;
    ctx.fillRect(shot.x, shot.y, shot.width, shot.height); ctx.shadowBlur = 0;
  }
  if (!state.lost) {
    sprite(state.ship);
    if (state.ship.invulnerable) {
      ctx.strokeStyle = accent + '99'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(state.ship.x + 18, state.ship.y + 10, 29, 25, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAsteroids(ctx, state, accent) {
  const wrapped = (x, y, radius, draw) => {
    const xs = [x], ys = [y];
    if (x < radius) xs.push(x + 840); if (x > 840 - radius) xs.push(x - 840);
    if (y < radius) ys.push(y + 480); if (y > 480 - radius) ys.push(y - 480);
    for (const px of xs) for (const py of ys) { ctx.save(); ctx.translate(px, py); draw(); ctx.restore(); }
  };
  for (const rock of state.items) if (rock.visible) wrapped(rock.x, rock.y, rock.radius, () => {
    ctx.rotate((rock.id * 31 + state.ticks * .13) * Math.PI / 180);
    ctx.beginPath();
    for (let i = 0; i < 11; i++) {
      const angle = i * Math.PI * 2 / 11, radius = rock.radius * (.76 + ((i * 7 + rock.id * 3) % 11) / 44);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = '#1b2739'; ctx.fill(); ctx.strokeStyle = '#d3c7a4'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-rock.radius * .3, -rock.radius * .4); ctx.lineTo(rock.radius * .1, -rock.radius * .15); ctx.lineTo(-rock.radius * .1, rock.radius * .2);
    ctx.strokeStyle = '#d3c7a444'; ctx.lineWidth = 1; ctx.stroke();
  });
  for (const shot of state.shots) {
    ctx.fillStyle = '#fff1b9'; ctx.shadowColor = '#ffe296'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(shot.x, shot.y, 2.3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (state.lost) return;
  const ship = state.ship;
  wrapped(ship.x, ship.y, 26, () => {
    ctx.rotate(ship.angle * Math.PI / 180);
    if (ship.thrusting) {
      ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-23 - (state.ticks % 6), 0); ctx.lineTo(-9, 5);
      ctx.strokeStyle = '#ffc487'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-11, -10); ctx.lineTo(-6, 0); ctx.lineTo(-11, 10); ctx.closePath();
    ctx.fillStyle = '#a4edf21a'; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    if (ship.invulnerable) {
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.strokeStyle = accent + '60'; ctx.lineWidth = 1; ctx.stroke();
    }
  });
}
