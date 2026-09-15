// Shared by the workshop and exported player.
export function gameKey(template, event) {
  if (['ArrowLeft', 'KeyA'].includes(event.code)) return 'left';
  if (['ArrowRight', 'KeyD'].includes(event.code)) return 'right';
  if (template === 'sokoban') {
    if (['ArrowUp', 'KeyW'].includes(event.code)) return 'up';
    if (['ArrowDown', 'KeyS'].includes(event.code)) return 'down';
    if (['Space', 'KeyU', 'KeyZ'].includes(event.code)) return 'undo';
    if (event.code === 'KeyN') return 'next';
  } else if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) return 'jump';
}
export function gameControls(template) {
  return template === 'sokoban' ? 'Arrow keys / WASD · U: undo · N: next puzzle' : '← → or A/D to move · Space: '+({platformer:'jump',breaker:'reset ball',paratroopers:'fire'}[template] || 'action');
}
