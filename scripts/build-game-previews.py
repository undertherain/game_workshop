"""Record short gallery demos from the complete games: python3 scripts/build-game-previews.py."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from framework import WorkshopGame

previews = {}
catalog = json.loads((ROOT / 'public/content/catalog.json').read_text())
for kind in catalog['templates']:
    content = json.loads((ROOT / f'public/content/games/{kind}.json').read_text())
    game = WorkshopGame('\n'.join(content['complete']), kind)
    if kind == 'paratroopers':
        for _ in range(240):
            game.step({})
    frames = [game.snapshot()]
    for tick in range(120):
        if kind == 'breaker':
            state = game.snapshot()
            delta = state['ball']['x'] - state['paddle']['x']
            keys = {'right': delta > 6, 'left': delta < -6}
        elif kind == 'platformer':
            keys = {'right': tick < 80, 'jump': 12 < tick < 65 or tick > 90}
        elif kind == 'paratroopers':
            keys = {'right': tick < 35, 'left': 35 <= tick < 95, 'jump': tick % 8 == 0}
        elif kind == 'invaders':
            keys = {'right': tick < 25, 'left': 25 <= tick < 75, 'jump': tick % 12 == 0}
        elif kind == 'asteroids':
            keys = {'right': tick < 45, 'thrust': tick < 80, 'jump': True}
        else:
            keys = {('right', 'up', 'left', 'down')[(tick // 30) % 4]: tick % 30 < 3}
        game.step(keys)
        if tick % 3 == 2:
            frames.append(game.snapshot())
    previews[kind] = frames
(ROOT / 'public/content/game-previews.json').write_text(json.dumps(previews, separators=(',', ':')) + '\n')
