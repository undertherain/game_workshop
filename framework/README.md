# Local top-down framework

For a smaller starting point, [Alien invaders](../examples/alien_invaders/README.md)
uses the new experimental `Game` wrapper: a default screen, explicitly imported pixel sprites,
`actor(...)`, held/pressed input and subclass `setup()` / `update(dt)` hooks. `Game()` constructs
the simulation; `run()` opens fullscreen with no required settings. It fits a fixed
960 × 640 playfield to the display. This screen-based wrapper reuses the World
below; the tank examples continue using their own world and camera setup.

`from framework.stock import ship, alien, bullet` selects optional retro artwork.
Pass these `PixelSprite` objects to `self.actor(ship, x, y, projectile=bullet)`
in `setup()`. Custom `PixelSprite` objects use the same API; `Game()` preloads no
artwork and actor creation does not accept magic sprite names. The framework
registers the selected sprites for the host, including projectile artwork.

The framework owns movement, map boundaries, collision, tile contacts, projectiles
and cameras. Games define tile types and actor behavior. `topdown.py` has no raylib
imports; `raylib_host.py` translates input and draws snapshots.

Run the [tank battle](../examples/tank_battle/README.md) or the preserved
[pine-tree explorer](../examples/tank_world/README.md) from the repository root.

## Tiles and interactions

```python
from framework import Tile, TileMap, World, Actor

class Brick(Tile):
    def on_projectile_hit(self, projectile, world, cell):
        world.map[cell] = 'ground'

tiles = [
    Tile('ground', 'earth'),
    Tile('water', 'water', blocks_actors=True),
    Tile('mud', 'mud', speed_multiplier=0.4),
    Brick('brick', 'brick', blocks_actors=True, blocks_projectiles=True),
]
world = World(TileMap(64, 40, 48, tiles, 'ground'))
player = world.add(Actor(100, 100, 38, 38, 'tank'))
player.walk(1, 0, 130, 1 / 60)
player.fire(1, 0)
world.step(1 / 60)
```

Actor blocking and projectile blocking are independent. Tile definitions are
shared immutable values. Replace a cell by assigning a registered tile name;
store any future per-cell mutable state separately from shared definitions.

Override `on_enter(actor, world, cell)`, `on_leave(...)`, or
`on_stay(actor, world, cell, dt)` for actor interactions. Entry and exit refer to
an actor's rectangular footprint overlapping a cell; stay runs even at rest.
The slowest overlapped tile sets walking speed. Movement is subdivided to observe
terrain transitions and swept against obstacles, so a large displacement cannot
skip a wall. Solid actors also block each other.

`on_projectile_hit(projectile, world, cell)` is delivered when a projectile enters
a tile, including passable tiles. A hook can change damage, remove the shot or
replace the tile. The impacted tile's original `blocks_projectiles` flag decides
whether that shot stops, even after replacement. Fast projectiles sweep the whole
path and resolve impacts in order. Same-team shots pass through allied actors;
empty team names do not imply an alliance. Default actor hits subtract health.

`World.add()` clamps out-of-bounds spawns and rejects oversized actors or spawns
inside blockers. Use `Actor.move()` and `Actor.walk()` for movement: they delegate
to the owning world, including edge bounds. Direct coordinate assignment is a
low-level escape hatch and bypasses collision. No game-specific boundary checks
are needed. Subclass `Actor.update(dt)` for controls/AI and call `World.step(dt)`;
it caps long frames at 0.1 seconds and subdivides to at most 1/120 second per tick.
Dead actors and expired, impacted or out-of-map projectiles are removed by World.
Shots spawn beyond the forward edge with an optional `muzzle_offset`. The launch
segment is swept too, so an adjacent obstacle cannot be bypassed.

## Camera and presentation

```python
from framework import Camera
camera = Camera(960, 600, zoom=2)
camera.follow(player, smoothing=4)   # Eases toward centering the player.
camera.update(dt, camera.viewport_for(screen_width, screen_height))
camera.follow(player, smoothing=0)   # Immediate tracking.
camera.follow(None)                 # Manual camera; use pan().
```

Following is optional. Exponential smoothing is frame-rate independent for a
stationary target and continues catching up after movement stops. A larger
smoothing value catches up faster. Camera goals and positions stay within map
bounds; when the map is smaller than the viewport, that axis remains at zero.
The camera settles exactly within half a display pixel. Rendering aligns world
positions and the camera to a shared physical-pixel grid, avoiding double-sized
rounding jumps at 2× zoom. Zoom controls display scale and uses the full available window with no fixed
aspect ratio or letterboxing. The tank example starts at 2× and fullscreen;
`--windowed` opens a resizable window instead.

`SpriteAsset` declares an image, optional source rectangle and optional legacy
color key. The host caches shared atlas textures and preserves alpha. Atlas
regions are sampled at draw time; no image preprocessing is required. Snapshots
contain explicit serializable presentation fields, not live actor/world references.
Projectiles can set `render_size` and `trail_length` separately from collision
size, so visual readability does not enlarge hitboxes. The raylib host renders
rotation, bright trails and short impact effects.

This is an experimental API. Navigation/pathfinding, moving platforms, general
physics, a map editor and browser integration are not implemented.

## Stable tile artwork variants

Give a tile a tuple of asset names instead of a single name:

```python
Tile('grass', ('grass_a', 'grass_b', 'grass_c', 'grass_d'))
# TileMap(..., seed=12) controls the appearance layout.
```

TileMap chooses per-cell artwork using its own seeded RNG, independent of game
randomness. Selection stays fixed across rendering, camera movement and tile
replacement. A tile remains named `grass` with the same collision and interaction
rules regardless of its appearance. `background` accepts the same variant tuple;
this lets a pickup use the grass that belongs beneath that cell. `asset_at(cell)`
returns the selected image name, while `definition(cell)` returns the tile type.
`Tile.asset_names` exposes every foreground/background variant for host loading.
