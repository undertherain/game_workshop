# North star: learn toward a code-first game framework

Date: 2026-09-12
Status: long-term direction from discussion; proposed, not implemented or committed scope.
This idea stands independently of the hackathon.

## Destination

As kids learn programming, they should learn toward a system they can continue
using to build complete, original games. The learning environment should lead into
a practical game-authoring framework, with continuity in concepts and interfaces
as responsibility grows. “Production system” here means a useful destination for
making and finishing their own games; it does not claim that the current prototype
is production-ready.

Provide higher-level building blocks than a low-level graphics/game library:
choose a top-down view, a square grid, and named tile types; build a map in an
editor; write actors and game rules in code. An editor is welcome for spatial and
visual authoring. The desired programming experience is code-first, rather than
a primarily visual way of defining behavior.

## Building blocks discussed

- World setup: view, grid, tile size and map loading.
- Named tiles: define tile types and their properties once; use those same names
  in the editor palette and in code for queries and changes.
- Actors: a common interface to inherit from, useful existing classes for common
  cases, and methods for actions such as firing a projectile.
- Custom behavior: write code for unusual mechanics, including a curved shot or
  curved beam, while retaining useful framework services.
- Shared editor/code definitions: a proposed integration is for code-defined
  actor types to be available for placement in the map editor.

These are requirements to explore, not a settled API. The Python examples in the
discussion illustrated the shape of the experience; they are not existing methods.

## Extensibility principle

Architectural analogy: our framework should bring the PyTorch Lightning approach
to game programming. The author writes the interesting behavior; the framework
owns the recurring execution machinery. Actor and tile hooks play a role like
model hooks, while the world drives simulation and object lifecycle. This is a
design principle, not a claim of equivalent maturity or features. Raylib currently
provides the desktop backend; the simulation is independent of it, so the analogy
does not imply a permanent dependency on raylib.

Common cases should be easy, and unusual ideas should have a clear extension point.
A learner should be able to start with an existing actor or projectile class,
customize properties, then override behavior or write a custom implementation.
They should not have to rebuild rendering, collision handling and object lifecycle
just to invent a new attack.

One suggested design is shallow inheritance for clear types, with independently
replaceable behaviors for combinations such as movement, health and weapons.
A moving curved projectile and a continuous curved beam may need different
abstractions; avoid forcing every attack into one projectile model.

### A game in about ten lines

Proposed authoring target: “look — ten lines of code and you have a game.” Count
the complete learner-authored program, including imports and startup. Useful
defaults and reusable actors should make this possible while leaving meaningful
game rules visible and editable. Loading a complete preset with one call would
not by itself demonstrate this goal.

The desired first step is Pygame Zero-style low ceremony: importing and
instantiating `Game()` without custom settings should already provide fullscreen
graphics on desktop. The first experiment now separates construction (`Game()`)
from opening the fullscreen window (`game.run()`), keeping imports and simulation
usable without a display. Window setup, asset plumbing and the main loop should
not be prerequisites for the first visible result.

Implemented experiment, 2026-09-14: [Alien invaders](../examples/alien_invaders/README.md)
expresses a moving ship, shooting and a stationary row of aliens in 13 nonblank
lines, including imports, completion feedback and guarded startup. It subclasses
`Game`, creating actors in `setup()` and defining rules in `update(dt)`. The reusable
`Game` wrapper supplies a default screen and held/pressed input; artwork is explicitly imported from `framework.stock`;
the existing World handles bounds, projectile hits and cleanup. Its README walks
from an empty screen to this first playable step. Moving aliens, enemy shots and
a loss condition remain future tutorial steps; this is not a full Space Invaders
implementation or a settled authoring API.

A mini tutorial should grow from an empty screen to a controllable character,
then an interaction and a small playable objective. A tiny top-down adventure
is a candidate: move a character, collect a key, reach a door. This offers an
RPG-like starting point that can grow room by room and rule by rule. Pong is
another candidate for the shortest complete game, though it overlaps with the
existing brick-breaker example. Choose the first demonstration by how clearly
its few lines express the game, rather than by how many engine features it tests.

### Classics to play, understand and rebuild

A separate portal idea is an “encyclopedia of classics you have to know”: games
learners can encounter, play and learn to build. This is a proposed collection,
not an implemented portal feature or a fixed curriculum. Asteroids belongs here
even if it is not the shortest first program. The ten-line demonstration, gradual
tutorial and classics collection can share framework building blocks without
having to use the same first game.

Proposed, not implemented: a small Asteroids-style game could demonstrate this
separation clearly. Start with one ship, turn/thrust controls, wrapping edges,
shooting and a few drifting rocks. Leave rock splitting, levels, menus and visual
effects out of the first version. The game defines steering, rock motion and hit
consequences; the framework should provide timing, input actions, collision
dispatch, spawning/removal and rendering through a host.

Asteroids exercises independent actors, projectiles and lifecycle hooks without
needing a tile map. That makes it
a useful test of whether the abstractions extend beyond the current tank game.
Wrapping movement and collisions across screen edges would require new support:
the existing top-down world uses bounded movement and removes out-of-map shots.
Keep those policies explicit rather than adding Asteroids rules to every world.
A custom curved shot would be a later extension test: changing shot behavior
should not require reimplementing collision or lifecycle management.

## Implications for learning

Start with a small action, then parameters and state, events and functions,
custom behaviors, and eventually original actors, maps and game rules. Reveal
more of the underlying program as the learner becomes ready. Keep early concepts
and interfaces connected to the eventual authoring framework, instead of making
the lessons a disposable exercise language.

Scaffolding should gradually shrink while the learner's ownership grows. Success
means a child can express an unexpected game idea, implement and debug it, and
finish a playable game using the same underlying system. Choosing settings in
fixed templates alone would not meet that north star.

## Language remains open

Alex questioned whether Python is the right choice for this longer-term system.
Python is the current prototype language, not a commitment for the eventual
framework. Preserve the code-first authoring and learning-continuity goals while
evaluating language choices against runtime and sharing targets, editor integration,
tooling, and the experience of writing custom game behavior. No replacement
language was selected in this discussion.

Open design questions include the first supported game family, the editor/code
data contract, extension interfaces, and how complete games are packaged and shared.
No engine choice, compatibility guarantee, or delivery schedule was decided.

## First framework slice: brick breaker

Implemented experiment, 2026-09-12: the existing browser runtime now uses explicit
`StaticScreen`, `Brick`, `Paddle` and `Ball` types. Learner code receives `screen`
and `bricks` alongside the existing objects. `paddle.move_left()`,
`paddle.move_right()`, `paddle.move(distance)` and `ball.bounce_up()` add a small
behavior vocabulary while keeping coordinates and velocities accessible.

The [complete example](../public/examples/breaker_framework.py) works in the
existing Brick breaker workshop: choose **Edit whole file**, paste it, and Run.
It exposes controls, aimed bouncing and per-row scoring as code. Bricks remain
stationary unless code explicitly changes their positions; the simulation handles
ball motion, collision detection, paddle boundaries and ball reset after a miss.
Movement uses pixels per 60 Hz simulation tick. The screen is currently fixed at
840 × 480; changing screen dimensions is not supported by the browser renderer.

This is an additive experiment, not a general engine: existing lesson snippets
remain as they were. There is no scene-construction API or learner-facing class
registration yet. Assess this vocabulary before integrating it into lessons.

## One game, multiple backends

Direction added in discussion: the same authored game should run in the online
workshop and in a standalone desktop application. Keep game objects, rules and
simulation independent of the rendering backend. Hosts should translate input
into shared actions, drive the same simulation timing, and render its state using
shared asset identifiers. Display, asset loading, audio and packaging belong behind
explicit backend interfaces rather than in learner game rules.

Implemented 2026-09-15: all three workshop templates now run through
`framework.WorkshopGame`, independent of the teaching UI. **Export playable game**
packages the exact draft, versioned game manifest, framework, Canvas renderer,
Pyodide and artwork into an offline ZIP with a Python 3 local web launcher.
The workshop and exported browser player use the same runtime and rendering files.
Isolated ordinary-Python replay tests verify that bundled simulations produce the
same snapshots as the repository version. The exported player retains keyboard and
touch controls, restart, source errors and worker timeout recovery.

This delivers standalone browser play. The local top-down experiment below still
uses a separate raylib host; porting workshop scenes to that renderer and building
native desktop executables remain future work. `WorkshopGame` preserves the
existing callback scaffolds rather than converting them to the top-down `Game` API.
The choice of language remains open and should account for both targets.

## Local framework slice: tank world

Implemented experiment, 2026-09-13: [Tank world](../examples/tank_world/README.md)
reimplements the local `test_pyray` terrain explorer with raylib rendering through
`pyray`. Current development focus is the standalone version.

`framework/topdown.py` provides named `Tile` definitions, a rectangular `TileMap`
indexed by `(x, y)`, bounded `Actor` movement, a clamped `Camera` and `World`
snapshots containing only visible tiles and actors. `examples/tank_world/game.py`
owns seeded terrain generation and movement rules. It has no graphics dependency;
`framework/raylib_host.py` owns windowing, input, textures and drawing.
Movement uses pixels per second and elapsed time capped at 0.1 seconds per frame.

This preserves the original arrow-key tank movement and right-drag camera, with
Space to recenter. It fixes rectangular indexing, tree-generation edge errors,
unbounded motion and unnecessary offscreen rendering. Tiles in the pine-tree example remain decorative. The separate
[tank battle](../examples/tank_battle/README.md) now demonstrates actor/projectile
blocking, slowing terrain, tile contact hooks, destructible bricks, repairs and
framework-owned spawning, movement bounds and projectile lifecycle. It uses a new
generated sprite atlas; recovered artwork remains available as reference.

The [framework API](../framework/README.md) also provides optional smooth camera
following, clamped to map bounds, and full-window zoom independent of aspect ratio.
The tank game uses 2× zoom and a larger scrolling map; the explorer retains manual
panning. A map editor, dynamic asset registration and browser integration remain
future work.

## Further horizon: publish games from the platform

Idea added 2026-09-12: learners could eventually publish their games directly from
the platform so other people can play them. The longer-term journey becomes
learn → build an original game → finish it → publish and share it.

Alex described the aspiration as “like Roblox — but honest”: a shorthand for a
creation-and-publishing platform, with the meaning of “honest” still to be worked
out rather than a decided business model or policy. Keep this possibility in mind
when designing portable game projects and the browser/standalone backend boundary.

This is explicitly outside hackathon scope, not an implementation task or delivery
commitment. Hosting, discovery, accounts and any commercial model remain undecided.

Historical [learning-path proposal](/home/blackbird/Projects/Coaching/professional_projects/hackathon_projects/2026-09-11_openai_100h_game_builder/notes/gameplay/game_workshop_learning_path.md).
This project now holds the working framework direction; the original discussion
copy remains in the historical planning notes.
Return to the [project README](../README.md).
