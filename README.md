# Little Makers — browser Python game workshop

Start with short, slide-by-slide Python lessons in a meadow: type `fox.jump()`, meet Python and expressions, try a tiny calculator, and use `fox.say()`
with text, numbers and a named greeting. The first jump leads to a game-design experiment: choose a jump height and test it with Run, then try a move-then-jump sequence and comments. Then
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

The title screen pairs a forest-game illustration with two starting paths: learning
Python and exploring the game gallery. Returning learners see their saved lesson
and Continue to last lesson; new learners see Start your first lesson. The learning
map is a secondary link below those paths. Clicking
the Little Makers logo returns here from any activity. Returning keeps lesson
drafts and the last visited lesson. Each lesson has a shareable URL such as
`/#lesson/greeting`; refreshing keeps that lesson open. Browser Back/Forward follows
lesson navigation. The progress markers at the top are clickable shortcuts within the current chapter,
with lesson names on hover and keyboard support. Foundations has seven chapters:
First Python, Words and names, Numbers and variables, Repetition, Decisions, Reusable
code, and Live game rules. The map groups lessons into expandable chapters; Back/Next
continues across chapter boundaries. The base URL opens the title screen.

The **Learning map** connects thirty-three foundational lessons, three optional drawing
lessons, and the six game workshops. All paths are open; the map recommends a
starting route without locking later activities. Xonix and a fractal lesson
are explicitly marked as planned, not playable.

The foundations open with eleven compact, single-column slides. The first jump leads to “Make the jump yours”: edit `fox.jump(100)` and press Run
for an immediate jump. Whole-number heights from 40 to 180 keep the fox in view;
invalid values receive a hint. The next activity connects Python to the game’s controls
and rules through a move-then-jump prediction that introduces line-by-line execution,
then editing # comments to learn which lines Python skips. Short explanations and code practice follow: Python →
calculator, strings → fox speech, integer addition versus string joining →
variables and a personal greeting. Vocabulary appears with the activity that uses it.
In the greeting exercise, only the variable assignment
line is editable; the supplied `fox.say(...)` line stays fixed. A one-time overlay
explains this when the editor first appears and dismisses on focus or Run.
Explanation slides
use large examples and short, separate text blocks with no editor or scene;
“Try it in code” opens the next activity.
Reading an explanation does not record code practice.
The calculator echoes a top-level expression in the Output panel; `fox.say(value)`
shows a speech bubble in the scene, with no duplicate Output panel. The Meet Python
slide introduces Python as the language used to build things and explains 2 + 3
as an expression. The calculator starts with
10 - 3.
The text/number lesson runs one line at a time: calculate
3 + 4, then compare with "3" + "4" to see integer addition versus string joining.
The variable explanation uses `fox.say(username)` to read a stored value, then
joins it to a greeting; the next slide lets the learner personalize it. `print()`
is introduced later where console output is used in the guessing game. The route then builds
through sequence, numeric arguments,
expressions, variables, a grid-robot square patrol, bounded loops, comparisons,
booleans and guessing-game decisions, reusable functions, parameters, scene
properties, a Space-key event and a live `update()` function. The movement
lessons add signed distances, calculated arguments and reuse of one variable across
two trips. After the guided robot loop and guessing-game examples, learners write
their own fox loop and conditional jump rule. These apply earlier ideas without
repeating the introductory explanations. Functions are called by the learner before event callbacks are introduced.
The routine exercise reuses a dance between different walks; there is no code-space
penalty and loops remain available. These are practice activities, not mastery checks. The last two
lessons show the difference between executing commands once and installing rules
that the running game calls. A visible counter shows event/update calls; buttons
and focused-canvas keyboard controls let the learner test the rule. The introductory
loop targets 30 updates per second; the full game runtime uses 60 Hz simulation.
While an event/update lesson or game is running, Run becomes a pressed **Stop**
button. Starting a live lesson or explicitly running a game focuses its canvas, so
Space goes to the game. Stop ends execution and keeps the code and last scene; Run
starts again from the code. One-shot commands and drawings keep their ordinary Run
button. Editing a live lesson stops its rule until Run is pressed again.

The robot sequence introduces a forward move and a right turn, an explicitly written
square, then a four-repeat loop. A six-by-six board shows the dotted target route,
the robot’s heading and its animated trail. `robot.move(3)` moves three tiles;
`robot.turn_right()` turns in place. Each run resets the robot to the same start.
Robot moves accept whole numbers from 1 to 5 and reject moves off the board.

The console guessing sequence builds the referee for a 1–100 number game: compare
an attempt with a visible secret, name True/False as booleans, store a comparison,
use `if`, add `else`, then use `elif` for low/high/correct messages. A final exercise
asks learners to write and test their own rules. An endpoint activity introduces
inclusive comparisons. Input, random secrets and a repeat-until-correct loop are
future additions; these lessons test visible assignments one run at a time.
As with the other foundations, completion records practice, not correctness or mastery.

The drawing branch offers `dot(x, y)`, `line(x1, y1, x2, y2)`, and loops with simple
coordinate expressions on a labelled grid. It uses a small workshop-specific Python
API and Canvas renderer; pycontextfree is not integrated yet.

Quiz configuration controls whether an answer is required. The sequence lesson
asks the learner to choose an answer before Run becomes enabled. Other predictions
can be optional; standalone quizzes require an answer by default.
The opening slides stack short instructions, an optional prediction, a compact
scene and code cell, then navigation. Calculator slides show output without a scene.
On desktop, later lessons put instructions, quizzes and navigation on the left, with
the scene above the code cell and Run on the right. The scene adapts to viewport
height to keep the activity together; narrow screens use a stacked layout. Type `fox.` for action completions, or start a drawing
command for drawing suggestions. Tab accepts a completion or inserts indentation.
Enter runs a one-line lesson; Ctrl/Cmd+Enter runs longer programs. The introductory
Python vocabulary expands per lesson and rejects unsupported structures. Code can
use at most 1,000 characters; loops use `range(1)` through `range(6)`, with a limit of
12 animated actions or 100 drawing shapes per run. Basics movement accepts distances
from -300 to 300 pixels and stops at the scene edges. Arithmetic supports `+`, `-`,
`*`, `/` and parentheses. Basics also supports strings, booleans, comparison values,
and `str(value)` for joining text with numbers. Missing quotes, mixed text/number
addition and division by zero receive specific hints. String repetition is excluded;
computed text is limited to 1,000 characters and numeric results to magnitude 1,000,000. Helpers have up to two parameters and their own numeric locals;
they may call previously defined helpers, but not recurse. Conditions support comparison expressions, boolean literals and named values,
with `elif` and `else`. Returns and general Python remain for later work.

From the customization lesson onward, the actor is named `character`, so
`character.costume = "bunny"` and `character.jump()` still make sense after a change
of species. The first lessons retain `fox`. Existing later lesson drafts migrate
line-leading `fox.` references on load; the runtime also accepts the old name for
compatibility. The customization lesson supports sky and character properties. Sky buttons edit
the visible Python; Run applies the choice. Those appearance choices carry into
other meadow lessons. Drafts, the last lesson and appearance choices are saved in
this browser, with an in-memory fallback if storage is unavailable.

Use **Game workshop** at any point, or choose a game from the map after the
foundations. **First commands** returns to your current lesson. Workshop drafts
remain intact when switching layouts. Autocomplete currently belongs to the
introductory cells only.

In the game workshop:

**Game workshop** opens a gallery of six playable games: Space Invaders, Brick breaker,
Platformer, Sky Patrol, Sokoban and Asteroids. Each card previews the actual
game artwork. Xonix appears in a small coming-later note. Selecting a card zooms into its game
and offers three paths:

- **Learn the story** reveals a short history of the game or game type, with dates,
  named originals and source links, alongside Pip’s typed and optional voice guide.
  Platformer covers early examples of the genre; workshop versions are distinguished
  from their historical references.
- **Try exercises** opens the existing four-step Python build path.
- **Try customizing** opens the complete game, ready to play and edit.

Pip stays out of the gallery and path chooser. The selected-game preview has an
optional animation button for a short recorded gameplay loop, independent of Python
startup. Reduced-motion preferences disable preview animation and zoom transitions.
The gallery becomes a vertical card list on narrow screens.

Complete-game drafts remain separate from exercise drafts; reset restores the complete
program and Undo recovers edits. Download → Playable game includes the current draft.
**Back to game** returns to the selected game’s three paths; **All games** returns to
the gallery. Routes retain `/#museum`, `/#museum/breaker` and
`/#workshop/breaker/complete`, including refresh and browser Back/Forward support.

**Expand game**, beside Play again, fills the browser page with the live game,
score and controls. **Back to workshop** or Escape restores the editor view without
restarting play or changing the draft. Keyboard focus stays within the expanded
view; touch controls remain available on touch devices. Opening it ends any active
Pip voice call. A Python error returns to the editor with the error visible.

Pip's workshop greeting follows the selected exercise, including a restored fourth
exercise. Changing exercise clears the previous conversation and edit suggestion.
Typed and voice context distinguish museum browsing, exercises and complete games.
The workshop has one toolbar, with an **Exercises** menu beside **Download**.
Pip introduces the selected exercise in the conversation; Check, Next and the
editable-line controls stay beside the code. Repeated instruction banners above
and below the editor are omitted. The game and editor retain their full sizes.

Brick breaker uses a prepared program for each exercise, with only that exercise’s
rule missing. Aimed bounce includes both arrow controls; scoring includes controls
and aiming; variation starts with a complete game. Each exercise saves its own
draft. Reset code restores the current paddle exercise, and Undo recovers your edit.
Older shared paddle drafts remain stored separately.

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
6. **Reset code** restores the starter and stops playback. In Platformer and Paratroopers it returns to
   the first exercise; **Undo edit** recovers the previous code and exercise. Intro
   lessons reset only their own code and offer **Undo reset**. Learning progress is
   kept. Use **Download → Playable game** for a complete offline game ZIP,
   including the Python source. **Python code only** is a secondary download option. Ctrl/Cmd+Enter runs code. On touch devices,
   on-screen controls supply the same inputs once the child has implemented them.

### Build a crate puzzle with Sokoban

Sokoban adds a grid-based building path. First connect Right in `on_key(key)`;
Left, Up and Down are worked examples. Next implement `can_push(crate, dx, dy)`
by checking the tile beyond the crate, then `is_complete()` to recognize a solved
board. The fourth exercise constructs a custom room with `board.load([...])`:
edit rows of walls, floor, player, crates and goals in Python, then Run to test it.
Each exercise has its own draft and prepared surrounding code. This is an initial
scaffold toward building games through code; play is the test of the authored rules.

The complete version supplies controls and rules for three original small puzzles.
Arrow keys or WASD move; U/Z/Space undoes a move; N opens the next supplied puzzle
after a win. The visible controls also support touch and keyboard activation.
Restart reloads the current source's initial room. Crates cannot be pulled or pushed
two at once. Moves, pushes, goals and undo history belong to the shared framework.
Custom rooms validate dimensions and tile counts; they are not automatically checked
for solvability. Complete versions and custom puzzle drafts export with the same
renderer, controls and runtime as the workshop.

### Space Invaders and Asteroids

**Space Invaders** adapts the existing Alien invaders example: the same `Game`,
ship/alien sprites and projectile collision engine, with three moving rows of seven
aliens. The formation reverses and descends at the edges, and aliens fire back.
Left/Right or A/D moves; Space (also Up/W) fires once per press. Clear all 21 aliens
to win. Three shields and brief protection after a hit give room to recover; losing
all shields or letting the formation reach the ship ends the game.

**Asteroids** separates turning from movement: Left/Right or A/D turns, Up/W thrusts,
and held Space fires. Releasing thrust preserves velocity. The ship, rocks and
shots wrap across screen edges. Four large rocks split into medium and then small
fragments; clear all 28 targets to finish. A collision costs a shield and resets the
ship with two seconds of protection. Losing all three shields ends the game.

Each game has four prepared exercises with independent drafts. Invaders teaches
horizontal movement, firing, scoring and variation. Asteroids teaches rotation,
thrust, scoring and variation; horizontal movement evidence does not count as
rotation practice. Invaders can offer previously checked horizontal controls.
Complete versions, keyboard/touch controls, Pip guidance and downloaded ZIPs are
available through the same museum paths. **Play again** restarts from the last-run
program; **Run my code** applies edits.

The brick breaker starts with only Left implemented; the other starters have no arrow
controls until the exercise is written.
The exercise starters are small scaffolds; the customization path supplies complete games. `public/starter.py` retains the
original complete platformer sample.

## Export and play independently

In any of the six game workshops, choose **Download → Playable game** beside
the game title. The menu also offers **Python code only** for a source-only file.
Extract the ZIP, then run `python3 play.py` from that folder (Windows: `py play.py`).
The launcher opens the game in your browser. Keep its terminal open while playing;
Ctrl+C stops the local server. Python 3 must already be installed, but no Node,
workshop server, API key or internet connection is needed to play.

The ZIP includes the exact current editor draft as `my_game.py`, a versioned
`game.json`, the shared Python framework, browser player, artwork and local Pyodide.
Edits you have not run yet are included; missing exercise rules remain missing.
The player displays Python errors and supports keyboard/touch controls and Restart.
Edit `my_game.py` and reload to try a new version. To share online, serve the extracted
folder with any static HTTP host; subfolder hosting is supported. Opening `index.html`
directly with `file://` does not work.

These are standalone browser bundles. Native desktop executable packaging is not
implemented. **Download → Python code only** downloads source only. Introductory lesson programs
are not game exports.

## Slide tutor

**Ask Pip** sits beside each lesson on desktop and below it on narrow screens.
Ask a question about Python, your code or game making, or choose **Explain this** /
**What’s next?**. Pip answers general Python questions directly. It distinguishes
language features from editor conveniences and the subset the current activity can
run; the lesson does not limit which concepts can be discussed. Pip receives the current
slide’s instructions and examples, editor code and last-run feedback, the ordered
lesson route with exact slide distances, visited/practised lesson evidence, and a
high-level outline of other chapters, drawing and games, including planned activities.
It also receives explicit supported commands, syntax, runtime limits and editor
restrictions, separately from the current lesson’s teaching focus.
It can explain that a topic is two slides ahead without assuming skipped slides were studied.
Visited slides are stored locally from this version onward; opening a slide does not
record practice or mastery. Each slide’s recent chat stays in memory during this visit;
reloading clears conversations. Navigating to another slide cancels its pending reply.

This uses the existing server-side AI configuration. Without an API key, the panel
explicitly shows a built-in slide guide. Replies are explanations only; they do not
change or run code. Restart the server after updating tutor code or lesson content.

## Voice with Pip

Both Pip panels offer **Talk to Pip**, **Mute mic** and **End voice**. Spoken messages
stream into the same chat as typed messages. Voice uses `gpt-live-1` with the Marin voice; coding questions delegate to
the existing `OPENAI_MODEL` tutor (default `gpt-5.4-mini`). The server needs
`OPENAI_API_KEY` with access to GPT-Live. Restart the server and reload the page
after updating. Use localhost or HTTPS and allow microphone access when prompted.

The live voice prompt contains the learning-through-games goal, conversation guidance,
current activity focus and runtime capabilities, and a compact curriculum outline.
The backend tutor holds the current lesson details, code, progress and ordered lesson
summaries with exact slide distances. It answers programming and curriculum questions
in spoken prose; typed chat keeps its separate structured response format. Full content
for every lesson is not packed into the live prompt, and no curriculum search tool is
currently installed.

Audio travels directly between the browser and OpenAI over WebRTC; the API key
stays on the server. The UI identifies Pip as an AI voice. Sessions request
`store: false`; the app does not record audio. Spoken messages remain in the current
chat's in-memory history, including across voice calls, and clear on reload.
Nearby speech fragments are grouped for display; these are not authoritative turn boundaries.

As Pip names an editor line aloud, a purple sparkle and soft highlight point to it
in either editor. The pointer follows arriving captions, so timing is approximate.
It leaves focus, selection and code untouched, and scrolls within the editor when
the named line is out of view. It clears on learner speech captions, code or activity
changes, voice ending, or eight seconds without output captions. Reading slides
have no editor pointer. Restart the server and reload after updating this feature.

Pip receives a snapshot of the current lesson or game, code, feedback, progress and
recent typed and spoken conversation. Voice offers explanations only. Changing activity,
changing code or run feedback, or leaving the tab ends voice; start it again to share
the new context. Mute disables microphone transmission while keeping Pip audible.
End voice releases the microphone immediately and waits up to five seconds for
session-close confirmation. Moving between slides, opening the map or another game,
hiding the tab, and leaving the page close the microphone, audio playback and voice
connection immediately, including a call already waiting for confirmation. Returning
never restarts capture: press Talk to Pip to open a fresh call. Cancelling while
connecting aborts setup; a microphone stream granted after cancellation is stopped
as soon as it arrives. The server also cancels pending voice setup when the browser
disconnects, so an abandoned request does not hold up the next Talk attempt.
Sending a typed question ends voice and continues the
same chat. Lesson conversations, including spoken messages, remain available when
returning to that slide during the current visit. Pip is given explicit facts about
the supplied character and lesson runtime so it can explain where `fox` comes from.

Adapted from the existing [Voice playground GPT-Live trial](/home/blackbird/Projects/AI/Voice/docs/gpt-live.md).
Protocol: [OpenAI Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).

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
introductory manifest, `public/content/lessons/index.json`, controls lesson order.
Reordering it updates the first lesson, map nodes and Back/Next within each branch.
Presentation, editor behavior, hints, practice features and saved-draft migrations
are declared with the lesson; branch labels and sections live in the catalogue. The
[content authoring guide](public/content/README.md) explains ordering, shared defaults,
supported runtime modes and validation. Reload the browser for content changes;
restart the server to refresh the tutor’s game metadata. Existing lesson IDs retain
saved drafts and progress.

## Implementation

Framework exploration: [north star and current slice](docs/framework-north-star.md).
The [Alien invaders example](examples/alien_invaders/README.md) is a minimal
standalone game: move a ship, shoot stationary aliens and clear the row. Its
shared program in `framework/invaders.py` uses the experimental `Game` defaults
and explicitly imported stock sprites. The desktop example imports that class; the
browser workshop reuses it with a larger moving formation and learner callbacks.
Run `python3 -m examples.alien_invaders` (requires `raylib`); add `--windowed`
for a resizable window instead of fullscreen.
The [brick-breaker framework example](public/examples/breaker_framework.py) adds
explicit screen/brick context and paddle/ball methods; paste it into Brick breaker
after choosing **Edit whole file**. Existing beginner exercises are unchanged.
The [local tank-world example](examples/tank_world/README.md) ports `test_pyray`
using new top-down Python primitives and a standalone raylib host. Run it with
`python3 -m examples.tank_world` (requires `raylib`). The separate [tank battle](examples/tank_battle/README.md) runs with
`python3 -m examples.tank_battle` and demonstrates framework-owned tile interactions,
projectiles and a smooth following camera. See the [local framework API](framework/README.md).
The six workshop games use `framework.WorkshopGame` in both the workshop and
exported browser player. The same simulation also runs under ordinary Python for
headless testing. The separate `Game`/top-down raylib examples retain their own
renderer; workshop exports do not yet target that native desktop host.

- `public/`: browser UI, Canvas 2D art, Python worker and game runtime.
- `server.mjs`: static server and OpenAI Responses API helper endpoint.
- `tutor.mjs`: tutor instructions, response validation, built-in guided examples.
- `tests/`: runtime and server/tutor checks.

`framework/workshop.py` owns game objects, gravity, collisions, callback execution
and score state; `framework/workshop_checks.py` runs isolated teaching checks.
The browser worker installs the framework package from an explicit module list.
`export-game.mjs` bundles those same files with the draft and the small player in
`public/standalone/`. Export packages source without executing it on the server.
The old `public/runtime.py` and `public/arcade_runtime.py` are compatibility adapters
for existing scripts, with no duplicated simulation.

Python owns movement rules, gravity, collisions, callbacks and score. JavaScript draws
state snapshots at 30 fps and pauses work in hidden tabs. A stalled worker is terminated
so an infinite loop does not lock the page. The supported API is deliberately small;
arbitrary learner-supplied assets, scrolling levels, multiplayer and a general scene editor
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
