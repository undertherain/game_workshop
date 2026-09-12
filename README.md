# Little Makers — browser Python game workshop

Start with short, slide-by-slide Python lessons in a meadow: type `fox.jump()`,
choose another action with autocomplete, and predict a two-command sequence. Then
open the split-screen workshop, choose a platformer, brick breaker or
Paratroopers-style game, and build its controls and rules through short Python mini-exercises. Scenery,
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

The **Learning map** connects seven foundational lessons, three optional drawing
lessons, and the three game workshops. All paths are open; the map recommends a
starting route without locking later activities. Sokoban, Xonix and a fractal lesson
are explicitly marked as planned, not playable.

The foundations begin with `fox.jump()` and build through sequence, bounded loops,
scene properties, a Space-key event and a live `update()` function. The last two
lessons show the difference between executing commands once and installing rules
that the running game calls. A visible counter shows event/update calls; buttons
and focused-canvas keyboard controls let the learner test the rule. The introductory
loop targets 30 updates per second; the full game runtime uses 60 Hz simulation.
While an event/update lesson or game is running, Run becomes a pressed **Stop**
button. Starting a live lesson or explicitly running a game focuses its canvas, so
Space goes to the game. Stop ends execution and keeps the code and last scene; Run
starts again from the code. One-shot commands and drawings keep their ordinary Run
button. Editing a live lesson stops its rule until Run is pressed again.

The drawing branch offers `dot(x, y)`, `line(x1, y1, x2, y2)`, and loops with simple
coordinate expressions on a labelled grid. It uses a small workshop-specific Python
API and Canvas renderer; pycontextfree is not integrated yet.

On desktop, lessons put instructions, quizzes and navigation on the left, with
the scene above the code cell and Run on the right. The scene adapts to viewport
height to keep the activity together; narrow screens use a stacked layout. Type `fox.` for action completions, or start a drawing
command for drawing suggestions. Tab accepts a completion or inserts indentation.
Enter runs a one-line lesson; Ctrl/Cmd+Enter runs longer programs. The introductory
Python vocabulary expands per lesson and rejects unsupported structures. Code can
use at most 1,000 characters; loops use `range(1)` through `range(6)`, with a limit of
12 animated actions or 100 drawing shapes per run.

From the customization lesson onward, the actor is named `character`, so
`character.costume = "bunny"` and `character.jump()` still make sense after a change
of species. The first lessons retain `fox`. Existing later lesson drafts migrate
line-leading `fox.` references on load; the runtime also accepts the old name for
compatibility. The customization lesson supports sky and character properties. Sky buttons edit
the visible Python; Run applies the choice. Those appearance choices carry into
other meadow lessons. Drafts, the last lesson and appearance choices are saved in
this browser, with an in-memory fallback if storage is unavailable.

Use **Open game workshop** at any point, or choose a game from the map after the
foundations. **First commands** returns to your current lesson. Workshop drafts
remain intact when switching layouts. Autocomplete currently belongs to the
introductory cells only.

In the game workshop:

1. Start with **Brick breaker**, or choose **Platformer** or **Paratroopers**. Each has its own
   Python draft and four-step path, saved in this browser.
2. In the brick breaker, **Left already works**. Read its rule, then replace `pass`
   with the matching Right-key rule. The other starters ask for both directions.
   The editor highlights the target line and dims provided code. **Write here**
   selects `pass` while keeping its indentation. In these first movement exercises,
   only the rule area is editable; **Edit whole file** opts into free editing for
   that exercise during this visit. Later steps show a function-location hint
   without locking the surrounding code. Use **Give me a hint** or
   **Show a small example** as needed.
3. Press **Run my code** and try the arrow keys; focus moves to the game. **Check my step**
   executes behavioral checks against the current editor code, in a separate Python
   namespace. It gives specific feedback without changing the live game.
4. Continue to jumping / aimed bounce / firing, then scoring, then a free variation.
   Steps are navigable; checks do not lock the learner into a curriculum.
5. Ask Pip about an error or selected line. Suggested edits only apply through
   **Try this edit**, and require a separate **Run my code** to affect the game.
6. **Reset code** restores the starter and stops playback. In a game it returns to
   the first exercise; **Undo edit** recovers the previous code and exercise. Intro
   lessons reset only their own code and offer **Undo reset**. Learning progress is
   kept. Use **Save Python** to export your work. Ctrl/Cmd+Enter runs code. On touch devices,
   on-screen controls supply the same inputs once the child has implemented them.

The brick breaker starts with only Left implemented; the other starters have no arrow
controls until the exercise is written.
They are small scaffolds, not fully authored games. `public/starter.py` retains the
original complete platformer sample. Exported Python uses this workshop's game API;
it is not a standalone desktop game.

## Learning progress

Progress is local to this browser. Running a meaningful lesson example records
**practice**, not mastery. A successful game behavior check records **checked**
evidence for movement, the game's second mechanic, or scoring. Accepted AI edits
mark subsequent checks in that draft as **assisted**; this deliberately conservative
classification is not a judgement of the learner's ability.

When movement has passed a check in one game without recorded assistance, another
game can offer its controls already included. This is optional and available only
when the target editor exactly matches its starter: existing custom drafts are not
replaced. The learner can preview both rules, include them and move to exercise two,
or practise controls again. Inclusion is undoable and requires Run to affect play.
Those controls are recorded as **supplied**, so checking them does not establish
independent movement evidence. Later mechanics written by the learner can still
receive their own checked evidence.

Pip receives the bounded progress records alongside the current game context and
can refer to earlier practice when helping. Recommendations and transfer eligibility
currently use explicit local rules; AI does not autonomously grade mastery or change
the learner's curriculum. There are no accounts or cross-device progress sync.

## Editing lessons

Each lesson lives in its own JSON file under `public/content/lessons/`; game
mini-exercises live under `public/content/game-lessons/`. Edit instructions,
Python starter lines, completion choices, quizzes and feedback as data. The
[content authoring guide](public/content/README.md) explains ordering, shared defaults,
supported runtime modes and validation. Reload the browser for content changes;
restart the server to refresh the tutor’s game metadata. Existing lesson IDs retain
saved drafts and progress.

## Implementation

Framework exploration: [north star and current slice](docs/framework-north-star.md).
The [brick-breaker framework example](public/examples/breaker_framework.py) adds
explicit screen/brick context and paddle/ball methods; paste it into Brick breaker
after choosing **Edit whole file**. Existing beginner exercises are unchanged.
The longer-term direction includes browser and standalone rendering backends;
only the browser host exists today.

- `public/`: browser UI, Canvas 2D art, Python worker and game runtime.
- `server.mjs`: static server and OpenAI Responses API helper endpoint.
- `tutor.mjs`: tutor instructions, response validation, built-in guided examples.
- `tests/`: runtime and server/tutor checks.

Python owns movement rules, gravity, collisions, callbacks and score. JavaScript draws
state snapshots at 30 fps and pauses work in hidden tabs. A stalled worker is terminated
so an infinite loop does not lock the page. The supported API is deliberately small;
arbitrary learner-supplied assets, scrolling levels, multiplayer, voice and a general scene editor
are outside this prototype. The platformer combines an original generated pixel-art
forest background with Canvas grass-and-earth platforms and an animated pixel fox.
Sky choices tint the forest; bunny and cat retain their existing drawn costumes.
Other scenes use original Canvas 2D artwork, with no Pyxel dependency.

AI receives the selected template and exercise, check feedback, local learning-progress
evidence, question, current code,
selected line, recent conversation, error and a compact game snapshot. It has no tools
and cannot edit files or execute code. It
returns an explanation, line reference and optional replacement; suggestions never
apply automatically. The local server does not record conversations.

## Verification

`npm test` covers movement, collisions, scoring, exercise feedback, error line mapping,
introductory commands, bounded loops, drawing, event/update behavior, persistent progress,
transfer provenance, generated movement starters, AI edit validation and HTTP behavior with a fake upstream (no API spend).
Browser checks additionally exercise real Pyodide, template switching and draft
retention, hints and edits, narrow-screen layout and infinite-loop recovery. The
expanded-map browser check covers lesson completions, loop/customization execution,
event/update controls, drawing, progress transfer, reload persistence and mobile width;
it makes no live AI requests.

API reference: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
Runtime reference: [Pyodide](https://pyodide.org/en/stable/usage/quickstart.html).

Learning-path proposals and historical context are linked from the workspace
[AGENTS.md](../AGENTS.md). They are not prerequisites for running the workshop.
