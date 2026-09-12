# Little Makers — browser Python game workshop

Choose a platformer, brick breaker or Paratroopers-style
game, then build its controls and rules through short Python mini-exercises. Scenery,
physics and moving game objects are provided; the child writes small behaviors.
A live AI companion gives hints, explains selected code and, when requested, proposes
small edits for the learner to review. The workshop is a working prototype for learning through making.

## Run

Requires Node 22+; the test suite also requires Python 3.
Run these commands from this directory:

```sh
npm ci
npm start
```

Open <http://localhost:4179>. Python runs locally in a browser worker using the
installed Pyodide distribution. The server binds to localhost. No CDN is required.

For optional live AI, copy `.env.example` to `.env` and set your API key.
No configuration from the original project is required.

The server discovers the nearest `.env` by walking up from this folder, matching
`load_dotenv`'s usual project discovery. Existing environment variables take priority.
Set `WORKSHOP_LOAD_DOTENV=0` to disable discovery. For live AI, set `OPENAI_API_KEY`.
Optionally set
`OPENAI_MODEL` (default `gpt-5.4-mini`) or load an existing environment file with
`node --env-file=/absolute/path/to/file server.mjs`. Keys stay on the server.
Without a key the interface explicitly offers built-in guided examples, not AI chat.

## Try

1. Start with **Brick breaker**, or choose **Platformer** or **Paratroopers**. Each has its own
   Python draft and four-step path, saved in this browser.
2. In the brick breaker, **Left already works**. Read its rule, then replace `pass`
   with the matching Right-key rule. The other starters ask for both directions.
   Use **Give me a hint** or **Show a small example** as needed.
3. Press **Run my code**, click the game, and try the arrow keys. **Check my step**
   executes behavioral checks against the current editor code, in a separate Python
   namespace. It gives specific feedback without changing the live game.
4. Continue to jumping / aimed bounce / firing, then scoring, then a free variation.
   Steps are navigable; checks do not lock the learner into a curriculum.
5. Ask Pip about an error or selected line. Suggested edits only apply through
   **Try this edit**, and require a separate **Run my code** to affect the game.
6. Use **Save Python** or **Undo edit**. Ctrl/Cmd+Enter runs code. On touch devices,
   on-screen controls supply the same inputs once the child has implemented them.

The brick breaker starts with only Left implemented; the other starters have no arrow
controls until the exercise is written.
They are small scaffolds, not fully authored games. `public/starter.py` retains the
original complete platformer sample. Exported Python uses this workshop's game API;
it is not a standalone desktop game.

## Implementation

- `public/`: browser UI, Canvas 2D art, Python worker and game runtime.
- `server.mjs`: static server and OpenAI Responses API helper endpoint.
- `tutor.mjs`: tutor instructions, response validation, built-in guided examples.
- `tests/`: runtime and server/tutor checks.

Python owns movement rules, gravity, collisions, callbacks and score. JavaScript draws
state snapshots at 30 fps and pauses work in hidden tabs. A stalled worker is terminated
so an infinite loop does not lock the page. The supported API is deliberately small;
arbitrary new assets, scrolling levels, multiplayer, voice and a general scene editor
are outside this prototype. Artwork is original Canvas 2D, with no Pyxel dependency.

AI receives the selected template and exercise, check feedback, question, current code,
selected line, recent conversation, error and a compact game snapshot. It has no tools
and cannot edit files or execute code. It
returns an explanation, line reference and optional replacement; suggestions never
apply automatically. The local server does not record conversations.

## Verification

`npm test` covers movement, collisions, scoring, exercise feedback, error line mapping,
AI edit validation and HTTP behavior with a fake upstream (no API spend).
Browser checks additionally exercise real Pyodide, template switching and draft
retention, live AI hints and edits, narrow-screen layout and infinite-loop recovery.

API reference: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
Runtime reference: [Pyodide](https://pyodide.org/en/stable/usage/quickstart.html).

Learning-path proposals and historical context are linked from the workspace
[AGENTS.md](../AGENTS.md). They are not prerequisites for running the workshop.
