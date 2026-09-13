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

Common cases should be easy, and unusual ideas should have a clear extension point.
A learner should be able to start with an existing actor or projectile class,
customize properties, then override behavior or write a custom implementation.
They should not have to rebuild rendering, collision handling and object lifecycle
just to invent a new attack.

One suggested design is shallow inheritance for clear types, with independently
replaceable behaviors for combinations such as movement, health and weapons.
A moving curved projectile and a continuous curved beam may need different
abstractions; avoid forcing every attack into one projectile model.

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

The existing Python simulation and browser snapshot renderer provide a starting
boundary. The local top-down experiment below adds a standalone runner and desktop
renderer. A shared contract with the browser runtime remains proposed; neither
slice verifies cross-backend portability.
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
