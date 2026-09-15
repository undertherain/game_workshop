# Little Makers framework

## Workshop games and standalone browser exports

`WorkshopGame` is the shared simulation for the platformer, brick breaker and
Paratroopers-style, Sokoban, Space Invaders and Asteroids workshop games. It owns the supplied objects, physics, input
edges and callback lifecycle. Each instance has independent state. It imports no
browser or raylib APIs, so ordinary Python and browser Pyodide run the same rules:

```python
from pathlib import Path
from framework import WorkshopGame

game = WorkshopGame(Path('public/starter.py').read_text(), 'platformer')
initial = game.snapshot()
next_frame = game.step({'right': True, 'jump': True})
```

The host calls `step(keys)` at 30 Hz; each call advances two fixed 60 Hz ticks.
Basic inputs are `left`, `right` and `jump` (Space); the template maps Space to
jumping, ball reset or firing. Asteroids adds `thrust` (Up/W) separately; Sokoban
adds up/down, undo and next. The return value is a detached JSON-compatible snapshot of
the playfield: 840 × 480, or 960 × 640 for Invaders. Construct a new instance to restart. Invalid source or callback
values raise Python exceptions; hosts report the original `my_game.py` line.
The host owns rendering, timing, pausing and execution isolation. Direct Python
execution is for trusted code; browser hosts run learner code in a terminable worker.

`workshop_checks.py` creates a separate session per exercise check, leaving live
games unchanged. The browser loads the modules declared in
`public/framework-files.json`; the server serves only those framework files.
**Export playable game** bundles that same package, worker and Canvas renderer with
the current draft. See [export instructions](../docs/game-workshop.md#export-and-play-independently).

`WorkshopGame` preserves the template callback API and tick-based movement. The
`Game`/`World` primitives below are a separate top-down authoring API with movement
in pixels per second. Workshop templates have not been rewritten as top-down worlds,
and their exports use the browser host rather than raylib. This keeps the two APIs
explicit while making workshop simulations reusable outside the teaching interface.

## Sky Patrol cannon

The cannon has a fixed, read-only `x` of 420. Learner rules change `cannon.angle`
by `cannon.turn_speed` (default 2 degrees per 60 Hz tick). Angle 0 points up;
negative angles point left, positive right; the engine clamps to −75°…75°.
`cannon.fire()` emits a spark from the barrel tip at that angle, traveling seven
pixels per tick with fixed `vx`/`vy`. Space is press-triggered, with a 12-tick
cooldown. Snapshots expose position, angle and turn speed for the shared renderer.

Canopy collisions remove `target.parachute` and start accelerated falling (`vy`),
while body collisions call `on_hit(target)` immediately. A falling robot calls
`on_hit(target)` once on reaching the ground and is then removed by the engine.
This preserves the learner's scoring rule and prevents repeated landing points.
Canopy hits consume the spark without awarding points or incrementing interceptions.
Snapshots include `parachute`, `vy` and simulation-owned `canopy_sway`; the renderer
uses the same canopy position as collision detection.

## Sokoban: build a room and its rules

`WorkshopGame(source, 'sokoban')` supplies `board`, `player` and `world`.
The Python program defines `on_key(key)`, `can_push(crate, dx, dy)` and
`is_complete()`. Inputs are `left`, `right`, `up`, `down`, `undo` (also `jump`),
and `next`. A direction moves on the first press; holding repeats after ten host
frames and then every four frames. There is no movement on idle frames. Undo and
next are edge-triggered. Ticks still advance by two per host step.

`player.move(dx, dy)` attempts one orthogonal grid tile. The authored pushing
predicate returns a bool; the framework also prevents walls, bounds and other
crates from being crossed. `board.is_free(x, y)` tests the proposed destination.
`board.all_crates_on_goals()` supplies a Boolean for the authored completion rule.
Undo restores the player, crates, moves and pushes, and reevaluates completion.
Up to 1,000 successful moves are retained. Next advances after completion through
three original supplied puzzles; reconstructing the session restarts from source.

`board.level = 1` through `3` chooses a supplied room. `board.load(rows)` constructs
a custom room from equal-width strings: `#` wall, space floor, `@` player, `$` crate,
`.` goal, `*` crate on goal and `+` player on goal. Rooms need 3–8 rows, 3–12 columns,
one player and 1–8 crates with equal goals. Custom rooms disable Next. Structural
validation does not prove solvability; the test suite separately solves the supplied
rooms and replays each solution through the actual key-input runtime.

Snapshots include the board, player, crates, goal count, move/push counts and
undo/next availability. `world.sky` selects the same four palettes as other games;
the renderer is Canvas code shared with offline exports. This workshop grid API
is separate from the experimental top-down `TileMap` below.

## Space games

`space_workshop.py` supplies two additional simulations behind `WorkshopGame`.
Both expose `ship`, `world`, `keyboard`, `update()` and `on_hit(target)`. The supplied
starter helpers are ordinary Python functions called by `update()`. Numeric settings
are validated before simulation, and callbacks retain `my_game.py` error locations.

Invaders wraps the workshop's `Invaders` class from `invaders.py`. The desktop
example keeps its complete authored class in `examples/alien_invaders/game.py`.
Both use `Game`, `World`, original actor construction, stock
sprite definitions and projectile collision handling. The adapter adds two rows,
formation movement/descent, enemy shots, shields, and learner control/hit hooks.
`ship.x` and `ship.speed` control horizontal movement in the 960×640 playfield.
`keyboard.fire` is a press edge; `ship.fire()` shoots upward with a ten-tick cooldown.
`on_hit(alien)` calls `alien.hide()` and awards points. `world.alien_speed` is 0–4.
Invaders snapshots include sprite patterns for the shared browser renderer.

Asteroids uses an 840×480 wrapping field. `ship.turn(degrees)` changes heading;
`ship.thrust()` adds velocity using `ship.thrust_power` (0–0.5). `ship.turn_speed`
is 0–15 degrees per tick, and velocity is capped at six pixels per tick without drag.
`keyboard.thrust` is held Up/W, `keyboard.fire` held Space; shooting has a twelve-tick
cooldown. `on_hit(rock)` calls idempotent `rock.split()` and awards points. Rock sizes
3→2→1 produce two fragments per split; small rocks disappear. Swept shot collision
uses wrapped distances. `world.rock_speed` scales movement from 0–3. Collisions cost
a shield, reset ship position/velocity, and grant 120 ticks of protection.

Both games have three shields, explicit won/lost snapshots, and deterministic
initial worlds. Simulation freezes after a win/loss; reconstruct to restart.
`workshop_checks.py` runs isolated checks for ship controls, firing/thrust and scoring.

## Local top-down games

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

Run the [tank battle](../examples/tank_battle/README.md) from the repository root.

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

## Connected terrain edges

Use `Tile('water', 'water', blocks_actors=True, background=grass_variants,
rounded_edges=True)` to round exposed water edges over grass in the desktop host.
The map compares all eight neighbors by tile name, including cells outside the
camera view, and treats out-of-map neighbors as exposed edges. Each visible rounded
tile includes a `neighbors` bit mask, clockwise from north through northwest.
Changing a tile updates its neighbors' appearance on the next snapshot.

The raylib host clips the existing texture into cached pixel-aligned rectangles:
outer corners curve inward, exposed sides have a small inset, and missing diagonal
neighbors produce concave corners. Connected edges and interior tiles stay filled.
Provide a background asset to fill the exposed corners. Tile identity, actor
collision and projectile rules still use the full square cell.

For adjoining rounded materials, set `edge_underlay='mud'` on the water tile,
where `mud` is another registered tile name. Mud then connects through neighboring
water edges, and water draws a clipped mud underlay only in quarters touching mud.
Water retains its own rounded outline; unrelated grassy shores retain their normal
background. The underlay uses the mud tile's artwork and the current cell's stable
variant selection. Partial underlay snapshots carry `quadrants` bits in NW, NE,
SE, SW order. These layers prevent background-colored seams at shared boundaries
without changing either material's terrain rules.
