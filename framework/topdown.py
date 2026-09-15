"""Rendering-independent top-down simulation. Distances are pixels, time seconds."""
from dataclasses import dataclass, field
from math import atan2, ceil, degrees, exp, hypot
from random import Random


def clamp(value, low, high):
    return max(low, min(value, high))


@dataclass(frozen=True)
class Tile:
    name: str
    asset: str | tuple[str, ...]
    blocks_actors: bool = False
    blocks_projectiles: bool = False
    speed_multiplier: float = 1.0
    background: str | tuple[str, ...] | None = None
    rounded_edges: bool = False
    edge_underlay: str | None = None

    def __post_init__(self):
        if not 0 < self.speed_multiplier <= 10:
            raise ValueError('Tile speed multiplier must be in (0, 10]')
        for assets, optional in ((self.asset, False), (self.background, True)):
            if assets is None and optional:
                continue
            if not (isinstance(assets, str) and assets or isinstance(assets, tuple)
                    and assets and all(isinstance(name, str) and name for name in assets)):
                raise ValueError('Tile artwork must be an asset name or nonempty tuple of asset names')

    @property
    def asset_names(self):
        """All images a host needs, including variants and optional underlay."""
        names = set()
        for assets in (self.asset, self.background):
            if assets is not None:
                names.update((assets,) if isinstance(assets, str) else assets)
        return names

    def on_enter(self, actor, world, cell):
        """Called once when an actor begins overlapping this cell."""

    def on_leave(self, actor, world, cell):
        """Called once when an actor stops overlapping this cell."""

    def on_stay(self, actor, world, cell, dt):
        """Called each simulation tick while overlapping (including at rest)."""

    def on_projectile_hit(self, projectile, world, cell):
        """Called on entry, even for tiles that let the projectile pass."""


class TileMap:
    """Named tiles indexed as [x, y]. Out-of-map queries never wrap."""
    def __init__(self, width, height, tile_size, tiles, fill, *, seed=0):
        if any(type(n) is not int or n <= 0 for n in (width, height, tile_size)):
            raise ValueError('Map dimensions and tile size must be positive integers')
        self.width, self.height, self.tile_size = width, height, tile_size
        self.tiles = {tile.name: tile for tile in tiles}
        for tile in self.tiles.values():
            if tile.edge_underlay is not None and tile.edge_underlay not in self.tiles:
                raise ValueError(f'Unknown edge underlay: {tile.edge_underlay}')
        if fill not in self.tiles:
            raise KeyError(fill)
        self.rows = [[fill for _ in range(width)] for _ in range(height)]
        # A separate RNG keeps cosmetic variation independent of gameplay randomness.
        rng = Random(seed)
        self._variation = [[rng.getrandbits(64) for _ in range(width)] for _ in range(height)]

    @property
    def width_pixels(self):
        return self.width * self.tile_size

    @property
    def height_pixels(self):
        return self.height * self.tile_size

    def _check(self, position):
        x, y = position
        if type(x) is not int or type(y) is not int or not (0 <= x < self.width and 0 <= y < self.height):
            raise IndexError(position)
        return x, y

    def __getitem__(self, position):
        x, y = self._check(position)
        return self.rows[y][x]

    def __setitem__(self, position, name):
        x, y = self._check(position)
        if name not in self.tiles:
            raise KeyError(name)
        self.rows[y][x] = name

    def cells_in(self, x, y, width, height):
        size = self.tile_size
        for row in range(max(0, int(y // size)), min(self.height, ceil((y + height) / size))):
            for col in range(max(0, int(x // size)), min(self.width, ceil((x + width) / size))):
                yield col, row

    def definition(self, cell):
        return self.tiles[self[cell]]

    def asset_at(self, cell, *, background=False):
        tile = self.definition(cell)
        assets = tile.background if background else tile.asset
        return self._variant_at(cell, assets)

    def _variant_at(self, cell, assets):
        if isinstance(assets, tuple):
            x, y = cell
            return assets[self._variation[y][x] % len(assets)]
        return assets

    def visible(self, camera):
        size = self.tile_size
        for x, y in self.cells_in(camera.x, camera.y, camera.width, camera.height):
            background = self.asset_at((x, y), background=True)
            if background:
                yield {'asset': background, 'x': x * size,
                       'y': y * size, 'width': size, 'height': size}
            item = {'asset': self.asset_at((x, y)), 'x': x * size,
                    'y': y * size, 'width': size, 'height': size}
            tile = self.definition((x, y))
            if tile.rounded_edges:
                # Clockwise from north, including diagonals. Query the whole map
                # so shorelines do not change at the camera's visible boundary.
                neighbors = tuple(self[x + dx, y + dy]
                    if 0 <= x + dx < self.width and 0 <= y + dy < self.height else None
                    for dx, dy in
                    ((0, -1), (1, -1), (1, 0), (1, 1),
                     (0, 1), (-1, 1), (-1, 0), (-1, -1)))
                item['neighbors'] = sum(1 << index for index, name in enumerate(neighbors)
                    if name == tile.name or name is not None
                    and self.tiles[name].edge_underlay == tile.name)
                if tile.edge_underlay is not None:
                    underlay_mask = sum(1 << index for index, name in enumerate(neighbors)
                                        if name == tile.edge_underlay)
                    if underlay_mask:
                        # Continue the bank beneath only the quarters touching it.
                        # Other shores keep their normal grass background.
                        # The masks cover the three neighbors of NW, NE, SE, SW.
                        quadrants = sum(1 << index for index, mask in enumerate((193, 7, 28, 112))
                                        if underlay_mask & mask)
                        yield {**item,
                               'asset': self._variant_at((x, y), self.tiles[tile.edge_underlay].asset),
                               'neighbors': item['neighbors'] | underlay_mask,
                               'quadrants': quadrants}
            yield item


def overlaps(a, b):
    return (a.x < b.x + b.width and a.x + a.width > b.x
            and a.y < b.y + b.height and a.y + a.height > b.y)


@dataclass(eq=False)
class Actor:
    x: float
    y: float
    width: float
    height: float
    asset: str
    health: float = 1
    team: str = ''
    solid: bool = True
    world: object = field(default=None, init=False, repr=False)
    _contacts: dict = field(default_factory=dict, init=False, repr=False)

    @property
    def alive(self):
        return self.health > 0

    def move(self, dx, dy):
        if self.world is None:
            raise RuntimeError('Add the actor to a World before moving it')
        return self.world.move_actor(self, dx, dy)

    def walk(self, horizontal, vertical, speed, dt):
        length = hypot(horizontal, vertical)
        if length and dt > 0:
            # Integrate terrain changes along the path, not just at the destination.
            count = max(1, ceil(abs(speed * dt) * 10 / self.world.map.tile_size * 4))
            for _ in range(count):
                multiplier = min((tile.speed_multiplier for tile in self._contacts.values()), default=1)
                self.move(horizontal / length * speed * dt / count * multiplier,
                          vertical / length * speed * dt / count * multiplier)
                if not self.alive:
                    break

    def update(self, dt):
        """Override to author controls or AI; called by World.step."""

    def on_projectile_hit(self, projectile):
        self.health -= projectile.damage

    def fire(self, dx, dy, *, speed=420, damage=1, asset='bullet', size=8, lifetime=3,
             render_size=None, trail_length=0, muzzle_offset=0):
        length = hypot(dx, dy)
        if not length or not self.alive:
            return None
        if speed <= 0 or size <= 0 or lifetime <= 0 or muzzle_offset < 0:
            raise ValueError('Shot speed, size and lifetime must be positive; muzzle offset nonnegative')
        nx, ny = dx / length, dy / length
        shot = Projectile(self.x + self.width / 2 - size / 2,
                          self.y + self.height / 2 - size / 2, size, size, asset,
                          vx=nx * speed, vy=ny * speed,
                          damage=damage, lifetime=lifetime, owner=self, team=self.team,
                          render_size=render_size, trail_length=trail_length)
        # Clear the forward edge before displaying the shot. Sweep this launch
        # segment too: an adjacent wall must not be skipped by the muzzle offset.
        edge = min(self.width / 2 / abs(nx) if nx else float('inf'),
                   self.height / 2 / abs(ny) if ny else float('inf'))
        clearance = size / 2 / max(abs(nx), abs(ny))
        self.world._projectile_step(shot, (edge + clearance + muzzle_offset) / speed,
                                    launch=True)
        if shot.alive:
            self.world.projectiles.append(shot)
        return shot

    def snapshot(self):
        return {key: getattr(self, key) for key in ('x', 'y', 'width', 'height', 'asset')}


@dataclass(eq=False)
class Projectile:
    x: float
    y: float
    width: float
    height: float
    asset: str
    vx: float
    vy: float
    damage: float = 1
    lifetime: float = 3
    owner: object = None
    team: str = ''
    alive: bool = True
    render_size: tuple | None = None
    trail_length: float = 0
    _contacts: set = field(default_factory=set, repr=False)

    def snapshot(self):
        width, height = self.render_size or (self.width, self.height)
        cx, cy = self.x + self.width / 2, self.y + self.height / 2
        return {'x': cx - width / 2, 'y': cy - height / 2, 'width': width, 'height': height,
                'asset': self.asset, 'rotation': degrees(atan2(self.vy, self.vx)) + 90,
                'trail_length': self.trail_length}


@dataclass
class Camera:
    width: float
    height: float
    x: float = 0
    y: float = 0
    zoom: float = 1
    _target: object = field(default=None, init=False, repr=False)
    _map: object = field(default=None, init=False, repr=False)
    _smoothing: float = field(default=0, init=False, repr=False)

    def viewport_for(self, screen_width, screen_height):
        """Use all screen space at a chosen pixels-per-world-pixel scale."""
        if self.zoom <= 0:
            raise ValueError('Camera zoom must be positive')
        return screen_width / self.zoom, screen_height / self.zoom

    def follow(self, actor, *, smoothing=4):
        """Follow an actor; None disables follow, 0 snaps, larger values catch up faster.

        With smoothing=4, about 98% of the gap closes in one second. This continues
        while the actor rests. Limits are applied to the target before easing.
        """
        if smoothing < 0:
            raise ValueError('Camera smoothing must be nonnegative')
        if actor is not None and actor.world is None:
            raise ValueError('Follow an actor that has been added to a World')
        self._target = actor
        if actor is not None:
            self._map = actor.world.map
        self._smoothing = smoothing

    def update(self, dt, viewport=None):
        if viewport is not None:
            self.width, self.height = viewport
        if self._map is None:
            return
        self.pan(0, 0, self._map)
        if self._target is None:
            return
        actor = self._target
        target_x = clamp(actor.x + actor.width / 2 - self.width / 2,
                         0, max(0, self._map.width_pixels - self.width))
        target_y = clamp(actor.y + actor.height / 2 - self.height / 2,
                         0, max(0, self._map.height_pixels - self.height))
        blend = 1 if self._smoothing == 0 else 1 - exp(-self._smoothing * max(0, dt))
        self.pan((target_x - self.x) * blend, (target_y - self.y) * blend, self._map)
        # Finish subpixel settling instead of approaching the target forever.
        threshold = 0.5 / self.zoom
        if abs(target_x - self.x) < threshold:
            self.x = target_x
        if abs(target_y - self.y) < threshold:
            self.y = target_y

    def snapshot(self):
        return {key: getattr(self, key) for key in ('x', 'y', 'width', 'height')}

    def pan(self, dx, dy, world):
        self.x = clamp(self.x + dx, 0, max(0, world.width_pixels - self.width))
        self.y = clamp(self.y + dy, 0, max(0, world.height_pixels - self.height))

    def center_on(self, actor, world):
        self.pan(actor.x + actor.width / 2 - self.width / 2 - self.x,
                 actor.y + actor.height / 2 - self.height / 2 - self.y, world)


def sweep(a, dx, dy, x, y, width, height):
    """Time of swept AABB impact in [0, 1], or None. Touching while leaving misses."""
    enter, leave = float('-inf'), float('inf')
    for pos, extent, delta, low, high in (
        (a.x, a.width, dx, x, x + width), (a.y, a.height, dy, y, y + height)
    ):
        if delta == 0:
            if pos + extent <= low or pos >= high:
                return None
        else:
            first, last = (low - pos - extent) / delta, (high - pos) / delta
            enter, leave = max(enter, min(first, last)), min(leave, max(first, last))
    return max(0, enter) if enter <= leave and leave > 0 and enter <= 1 else None


class World:
    """Owns spawning, collision, boundaries, tile contacts and projectile lifecycle."""
    def __init__(self, tile_map, impact_asset=None):
        self.map = tile_map
        self.actors = []
        self.projectiles = []
        self.effects = []
        self.impact_asset = impact_asset

    def add(self, actor):
        if actor.world is not None:
            raise ValueError('Actor already belongs to a world')
        if not (0 < actor.width <= self.map.width_pixels and 0 < actor.height <= self.map.height_pixels):
            raise ValueError('Actor dimensions must fit in the world')
        actor.x = clamp(actor.x, 0, self.map.width_pixels - actor.width)
        actor.y = clamp(actor.y, 0, self.map.height_pixels - actor.height)
        if any(self.map.definition(c).blocks_actors for c in self.map.cells_in(actor.x, actor.y, actor.width, actor.height)):
            raise ValueError('Actor spawn overlaps blocking terrain')
        if actor.solid and any(other.solid and other.alive and overlaps(actor, other) for other in self.actors):
            raise ValueError('Actor spawn overlaps another actor')
        actor.world = self
        self.actors.append(actor)
        self._contacts(actor)
        return actor

    def _contacts(self, actor):
        current = {c: self.map.definition(c) for c in self.map.cells_in(actor.x, actor.y, actor.width, actor.height)}
        previous = actor._contacts
        actor._contacts = current
        for cell, tile in previous.items():
            if current.get(cell) is not tile:
                tile.on_leave(actor, self, cell)
        for cell, tile in current.items():
            if previous.get(cell) is not tile:
                tile.on_enter(actor, self, cell)

    def move_actor(self, actor, dx, dy):
        old = actor.x, actor.y
        # Small segments deliver tile entry hooks even when crossing a whole tile.
        count = max(1, ceil(max(abs(dx), abs(dy)) / (self.map.tile_size / 4)))
        for _ in range(count):
            if not actor.alive:
                break
            for axis, distance in (('x', dx / count), ('y', dy / count)):
                if not distance:
                    continue
                extent = actor.width if axis == 'x' else actor.height
                limit = self.map.width_pixels if axis == 'x' else self.map.height_pixels
                distance = clamp(getattr(actor, axis) + distance, 0, limit - extent) - getattr(actor, axis)
                sx, sy = (distance, 0) if axis == 'x' else (0, distance)
                fraction = 1.0
                for cell in self.map.cells_in(min(actor.x, actor.x + sx), min(actor.y, actor.y + sy),
                                              actor.width + abs(sx), actor.height + abs(sy)):
                    if self.map.definition(cell).blocks_actors:
                        size = self.map.tile_size
                        hit = sweep(actor, sx, sy, cell[0] * size, cell[1] * size, size, size)
                        if hit is not None:
                            fraction = min(fraction, hit)
                if actor.solid:
                    for other in self.actors:
                        if other is actor or not other.alive or not other.solid:
                            continue
                        hit = sweep(actor, sx, sy, other.x, other.y, other.width, other.height)
                        if hit is not None:
                            fraction = min(fraction, hit)
                setattr(actor, axis, getattr(actor, axis) + distance * fraction)
            self._contacts(actor)
        return actor.x - old[0], actor.y - old[1]

    def impact(self, x, y, size=24):
        self.effects.append({'x': x, 'y': y, 'size': size, 'remaining': 0.25,
                             'asset': self.impact_asset})

    def _projectile_step(self, shot, dt, launch=False):
        if not launch:
            dt = min(dt, shot.lifetime)
            shot.lifetime -= dt
        dx, dy = shot.vx * dt, shot.vy * dt
        hits = []
        size = self.map.tile_size
        for cell in self.map.cells_in(min(shot.x, shot.x + dx), min(shot.y, shot.y + dy),
                                      shot.width + abs(dx), shot.height + abs(dy)):
            hit = sweep(shot, dx, dy, cell[0] * size, cell[1] * size, size, size)
            if hit is not None:
                hits.append((hit, 'tile', cell))
        for actor in self.actors:
            if not actor.alive or actor is shot.owner or (shot.team and actor.team == shot.team):
                continue
            hit = sweep(shot, dx, dy, actor.x, actor.y, actor.width, actor.height)
            if hit is not None:
                hits.append((hit, 'actor', actor))
        start_x, start_y = shot.x, shot.y
        for hit, kind, target in sorted(hits, key=lambda value: value[0]):
            shot.x, shot.y = start_x + dx * hit, start_y + dy * hit
            if kind == 'tile':
                tile = self.map.definition(target)
                if target not in shot._contacts:
                    tile.on_projectile_hit(shot, self, target)
                # Use the impacted definition even if its callback replaced the cell.
                if tile.blocks_projectiles:
                    shot.alive = False
            else:
                target.on_projectile_hit(shot)
                shot.alive = False
            if not shot.alive:
                self.impact(shot.x + shot.width / 2, shot.y + shot.height / 2)
                break
        if shot.alive:
            shot.x, shot.y = start_x + dx, start_y + dy
        shot._contacts = set(self.map.cells_in(shot.x, shot.y, shot.width, shot.height))
        if (shot.lifetime <= 0 or shot.x < 0 or shot.y < 0
                or shot.x + shot.width > self.map.width_pixels or shot.y + shot.height > self.map.height_pixels):
            shot.alive = False

    def step(self, dt):
        # Bound pauses and use small simulation ticks, independently of the host.
        dt = max(0, min(dt, 0.1))
        count = max(1, ceil(dt * 120))
        for _ in range(count):
            tick = dt / count
            for effect in self.effects:
                effect['remaining'] -= tick
            self.effects = [effect for effect in self.effects if effect['remaining'] > 0]
            for actor in list(self.actors):
                if actor.alive:
                    self._contacts(actor)
                    actor.update(tick)
                    for cell, tile in list(actor._contacts.items()):
                        tile.on_stay(actor, self, cell, tick)
            for shot in list(self.projectiles):
                if shot.alive:
                    self._projectile_step(shot, tick)
            self.projectiles = [shot for shot in self.projectiles if shot.alive]
            for actor in list(self.actors):
                if not actor.alive:
                    for cell, tile in actor._contacts.items():
                        tile.on_leave(actor, self, cell)
                    actor._contacts.clear()
                    self.actors.remove(actor)
                    actor.world = None

    def snapshot(self, camera):
        actors = [actor.snapshot() for actor in self.actors + self.projectiles if overlaps(actor, camera)]
        return {'camera': camera.snapshot(), 'tiles': list(self.map.visible(camera)),
                'actors': actors, 'effects': [effect.copy() for effect in self.effects]}
