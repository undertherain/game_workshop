// Shared by the workshop and exported player.
export function gameKey(template, event) {
  if (['ArrowLeft', 'KeyA'].includes(event.code)) return 'left';
  if (['ArrowRight', 'KeyD'].includes(event.code)) return 'right';
  if (template === 'asteroids') {
    if (['ArrowUp', 'KeyW'].includes(event.code)) return 'thrust';
    if (event.code === 'Space') return 'jump';
  } else if (template === 'sokoban') {
    if (['ArrowUp', 'KeyW'].includes(event.code)) return 'up';
    if (['ArrowDown', 'KeyS'].includes(event.code)) return 'down';
    if (['Space', 'KeyU', 'KeyZ'].includes(event.code)) return 'undo';
    if (event.code === 'KeyN') return 'next';
  } else if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) return 'jump';
}
export function gameControls(template) {
  if (template === 'asteroids') return '← → / A D: turn · ↑ / W: thrust · Space: fire';
  return template === 'sokoban' ? 'Arrow keys / WASD · U: undo · N: next puzzle' : '← → or A/D to move · Space: '+({platformer:'jump',breaker:'reset ball',paratroopers:'fire',invaders:'fire'}[template] || 'action');
}

export function configureGameControls(template, root = document) {
  for (const button of root.querySelectorAll('[data-grid-control]')) button.hidden = template !== 'sokoban';
  for (const button of root.querySelectorAll('[data-flight-control]')) button.hidden = template !== 'asteroids';
  for (const direction of ['left', 'right']) for (const button of root.querySelectorAll(`[data-key="${direction}"]`)) {
    button.setAttribute('aria-label', `${template === 'asteroids' ? 'Turn' : 'Move'} ${direction}`);
  }
}
