"""Tank battle authors rules; the framework owns collision and interactions."""
from random import Random
from framework import Actor, Camera, SpriteAsset, Tile, TileMap, World
from .terrain import ENEMY_CELLS, PLAYER_CELL, populate


class Brick(Tile):
    def on_projectile_hit(self, projectile, world, cell):
        world.map[cell] = 'ground'


class Repair(Tile):
    def on_enter(self, actor, world, cell):
        if actor.team == 'player':
            actor.health = min(5, actor.health + 2)
            world.map[cell] = 'grass'


DIRECTIONS = {'up': (0, -1), 'right': (1, 0), 'down': (0, 1), 'left': (-1, 0)}
# The generated atlas is kept intact; the renderer samples named regions.
def sprite(col, row):
    edges = (0, 314, 627, 941, 1254)
    return SpriteAsset('tank-atlas.png',
                       (edges[col] + 1, edges[row] + 1,
                        edges[col + 1] - edges[col] - 2, edges[row + 1] - edges[row] - 2))


ASSETS = {f'{team}_{direction}': sprite(col, row)
          for row, team in enumerate(('player', 'enemy'))
          for col, direction in enumerate(DIRECTIONS)}
ASSETS.update({name: sprite(col, row) for name, col, row in (
    ('grass', 0, 2), ('water', 1, 2), ('mud', 2, 2), ('ground', 3, 2),
    ('brick', 0, 3), ('repair', 1, 3), ('bullet', 2, 3), ('explosion', 3, 3))})
ASSETS['bullet'] = SpriteAsset('tank-atlas.png', (754, 1031, 62, 112))
GRASS_VARIANTS = tuple(f'grass_{index}' for index in range(4))
for index, name in enumerate(GRASS_VARIANTS):
    ASSETS[name] = SpriteAsset('grass-variants.png',
                              ((index % 2) * 627, (index // 2) * 627, 627, 627))


class Tank(Actor):
    def __init__(self, x, y, team, rng=None):
        super().__init__(x, y, 38, 38, f'{team}_up', health=5 if team == 'player' else 2, team=team)
        self.direction = 'up'
        self.controls = set()
        self.cooldown = 0
        self.rng = rng
        self.turn_in = 0

    def update(self, dt):
        self.cooldown = max(0, self.cooldown - dt)
        moving = False
        shooting = 'fire' in self.controls
        if self.rng is not None:
            self.turn_in -= dt
            if self.turn_in <= 0:
                self.direction = self.rng.choice(list(DIRECTIONS))
                self.turn_in = self.rng.uniform(0.5, 1.5)
            moving, shooting = True, True
        else:
            for direction in DIRECTIONS:
                if direction in self.controls:
                    self.direction, moving = direction, True
                    break
        self.asset = f'{self.team}_{self.direction}'
        dx, dy = DIRECTIONS[self.direction]
        before = self.x, self.y
        if moving:
            self.walk(dx, dy, 130 if self.team == 'player' else 65, dt)
        if self.rng is not None and before == (self.x, self.y):
            self.turn_in = 0
        if shooting and self.cooldown <= 0:
            self.fire(dx, dy, render_size=(5, 12), trail_length=7, muzzle_offset=3)
            self.cooldown = 0.3 if self.team == 'player' else 1.25


class TankBattle:
    controls_hint = 'Arrows: drive   Space: fire   R: restart   N: new map   Esc: quit'
    asset_definitions = ASSETS

    def __init__(self, seed=None):
        self.seed = seed = Random().getrandbits(32) if seed is None else seed
        tiles = [Tile('ground', 'ground'), Tile('grass', GRASS_VARIANTS),
                 Tile('water', 'water', blocks_actors=True,
                      background=GRASS_VARIANTS, rounded_edges=True, edge_underlay='mud'),
                 Tile('mud', 'mud', speed_multiplier=0.4,
                      background=GRASS_VARIANTS, rounded_edges=True),
                 Brick('brick', 'brick', blocks_actors=True, blocks_projectiles=True),
                 Repair('repair', 'repair', background=GRASS_VARIANTS)]
        terrain = TileMap(64, 40, 48, tiles, 'grass', seed=seed)
        populate(terrain, seed)
        self.world = World(terrain, impact_asset='explosion')
        self.player = self.world.add(Tank(PLAYER_CELL[0] * 48 + 5, PLAYER_CELL[1] * 48 + 5, 'player'))
        rng = Random(seed)
        # Twelve clear starting cells spread across the whole scrolling arena.
        for x, y in ENEMY_CELLS:
            self.world.add(Tank(x * 48 + 5, y * 48 + 5, 'enemy', rng))
        self.camera = Camera(960, 600, zoom=2)
        self.camera.follow(self.player, smoothing=4)
        self._first_frame = True
        self.restart_held = False
        self.new_map_held = False

    def step(self, keys, dt, pan=(0, 0), viewport=(960, 600), center=False):
        if 'new_map' in keys and not self.new_map_held:
            self.__init__()
        elif 'restart' in keys and not self.restart_held:
            self.__init__(self.seed)
        self.restart_held = 'restart' in keys
        self.new_map_held = 'new_map' in keys
        self.player.controls = keys
        enemies = sum(actor.team == 'enemy' for actor in self.world.actors)
        if self.player.alive and enemies:
            self.world.step(dt)
        if self._first_frame:
            self.camera.width, self.camera.height = viewport
            self.camera.center_on(self.player, self.world.map)
            self._first_frame = False
        self.camera.update(dt, viewport)
        state = self.world.snapshot(self.camera)
        enemies = sum(actor.team == 'enemy' for actor in self.world.actors)
        result = 'Tank destroyed - R to retry' if not self.player.alive else 'Area cleared - R to replay' if not enemies else ''
        state['hud'] = [self.controls_hint, f'Armor: {max(0, self.player.health):g} / 5    Enemies: {enemies}    {result}',
                        'Bricks break under fire. Water blocks tanks. Brown mud slows. Crates repair armor.']
        return state
