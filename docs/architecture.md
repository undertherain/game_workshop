# Architecture

## Layout

- `public/`: browser UI, Canvas 2D art, Python worker and game runtime. See the
  [browser workspace notes](../public/README.md).
- `public/content/`: lessons and game exercises as JSON. See the
  [content authoring guide](../public/content/README.md).
- `framework/`: the shared Python game framework. See the
  [framework API](../framework/README.md).
- `server.mjs`: static server and OpenAI Responses API helper endpoint; also the
  default request handler on Vercel.
- `tutor.mjs`, `lesson-tutor.mjs`, `lesson-capabilities.mjs`, `tutor-principles.mjs`:
  tutor instructions, response validation and built-in guided examples.
- `ai-access.mjs`, `access-store.mjs`: sessions, invites, personal keys and shared
  request limits. See [demo access](demo-access.md).
- `export-game.mjs`: playable game ZIP export.
- `examples/`: standalone raylib examples outside the browser.
- `tests/`: runtime, server and tutor checks. See the [test notes](../tests/README.md).
- `docs/`: this documentation, plus the [framework north star](framework-north-star.md)
  for long-term direction.

## Runtime split

Python owns movement rules, gravity, collisions, callbacks and score. JavaScript
draws state snapshots at 30 fps and pauses work in hidden tabs. A stalled worker is
terminated so an infinite loop does not lock the page. Python runs in a browser
worker using the installed Pyodide distribution; no CDN is required.

`framework/workshop.py` owns game objects, gravity, collisions, callback execution
and score state for the six workshop games through `framework.WorkshopGame`;
`framework/workshop_checks.py` runs isolated teaching checks in a separate Python
namespace. The browser worker installs the framework package from the explicit
module list in `public/framework-files.json`, and the server serves only those
files. The same simulation runs under ordinary Python for headless testing.
`export-game.mjs` bundles those same files with the draft and the small player in
`public/standalone/`. The old `public/runtime.py` and `public/arcade_runtime.py` are
compatibility adapters for existing scripts, with no duplicated simulation.

The supported API is deliberately small. Arbitrary learner-supplied assets,
scrolling levels, multiplayer and a general scene editor are outside this prototype.
Scenes use original Canvas 2D artwork, with no Pyxel dependency; the platformer
background is generated pixel art (see `public/assets/forest/README.md`).

## Standalone examples

The [Alien invaders example](../examples/alien_invaders/README.md) is a minimal
standalone game: move a ship, shoot stationary aliens and clear the row. Its
program in `examples/alien_invaders/game.py` uses the experimental `Game` defaults
and explicitly imported stock sprites. The browser workshop uses its own copy in
`framework/invaders.py` with a larger moving formation and learner callbacks.

The [tank battle](../examples/tank_battle/README.md) demonstrates framework-owned
tile interactions, projectiles and a smooth following camera using the top-down
primitives and a standalone raylib host. Both run with `python3 -m examples.<name>`
and require `raylib`; add `--windowed` for a resizable window.

The `Game`/top-down raylib examples retain their own renderer; workshop exports
target the browser player, not that native desktop host.

## AI boundary

AI is optional. Keys stay on the server; the browser never receives them. Every
paid request resolves an authenticated session (a demo invite or a personal key)
before selecting a key and reserving allowance. Setting the shared key alone never
enables it for public visitors. The tutor has no tools and cannot edit files or
execute code; it returns structured explanations with optional replacements that
the learner applies explicitly. The server does not record conversations. Voice
audio travels directly between the browser and OpenAI over WebRTC.

References: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Pyodide](https://pyodide.org/en/stable/usage/quickstart.html).

## Verification

`npm test` runs the Node and Python suites. They cover movement, collisions,
scoring, exercise feedback, error line mapping, introductory commands, bounded
loops, drawing, event/update behavior, persistent progress, transfer provenance,
generated movement starters, AI edit validation, access control and HTTP behavior
with a fake upstream. No API credits are spent.

Browser checks, performed separately against the running local prototype,
additionally exercise real Pyodide, template switching and draft retention, hints
and edits, narrow-screen layout, infinite-loop recovery, lesson completions,
loop/customization execution, event/update controls, drawing, progress transfer,
reload persistence and mobile width. They make no live AI requests. See the
[test notes](../tests/README.md).
