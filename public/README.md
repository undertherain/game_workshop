# Browser workspace

Prototype UI and original Canvas 2D artwork. `platformer.py`, `breaker.py` and
`paratroopers.py` are the learner's starter scaffolds. `templates.js` loads the
short build paths and game-specific UI from JSON content. `starter.py` retains the initial complete
platformer sample.

`../framework/workshop.py` supplies all six game simulations through `WorkshopGame`;
`../framework/workshop_checks.py` supplies isolated mini-exercise checks.
`runtime.py` and `arcade_runtime.py` retain compatibility entries for older local
scripts. `python-worker.js` installs the shared framework package listed in
`framework-files.json` into local Pyodide. `app.js` connects editor,
templates and helper; `scene.js` only draws snapshots. `forest.js` loads the
platformer's generated forest background, draws deterministic pixel terrain at the
runtime's platform coordinates, and animates a small pixel fox. The background is
sampled to 420×240 and drawn without smoothing. The previous scenery remains a
fallback while the image loads or if it fails. See `assets/forest/README.md` for
the asset's generation prompt and scope.

Return to the [prototype README](../README.md).

`submission-slide.html` is a static 16:9 opening slide for the submission video,
using the existing forest artwork. Open `/submission-slide.html` on the local
server, or open the file directly. Press **F** or double-click for fullscreen;
Escape exits fullscreen. It scales to fit the screen with letterboxing and uses
no external services. A checked 1920×1080 still is available at
[`docs/submission/opening-slide.png`](../docs/submission/opening-slide.png).

`ai-access.js` initializes the global **AI access** dialog before lesson routing.
It removes invite fragments from the URL, redeems a reusable invite on an explicit
activation click, and submits personal keys to `/api/access` without storing them in
browser storage. It displays remaining allowance, session expiry, and disconnect.
The dialog closes automatically after a successful **Use my key** submission;
failed connections keep it open with the error visible.
`ai-access.css` styles the dialog. All authorization and quota enforcement lives on
the server; browser state never grants shared-key access. `pip-voice.js` also ends
calls at the returned time limit and requests `/api/voice-stop`; the independently
scheduled backend callback remains the cutoff if a browser ignores that timer.
See [demo access](../docs/demo-access.md) for server configuration and limits.

`examples/breaker_framework.py` is a complete, optional framework experiment for
the existing Brick breaker editor. `framework/workshop.py` supplies `StaticScreen`,
`Brick`, `Paddle` and `Ball`; the learner can inspect `screen.width`/`height`, iterate
`bricks`, call paddle movement methods and `ball.bounce_up()`. Existing property
access and callbacks still work. See the [framework note](../docs/framework-north-star.md)
for scope and the proposed browser/standalone backend boundary.

`standalone/` contains the exported player, responsive controls and standard-library
Python launcher. **Download → Playable game** sends the selected template and exact
editor draft to `/api/export`; the server packages an allowlisted set of files,
including this same worker and scene renderer, all runtime dependencies and artwork.
The player loads `game.json` and `my_game.py` relative to its own URL, so extracted
exports also work below a static host's subpath. It retains worker timeout recovery,
error line reporting, input clearing on blur and paused stepping in hidden tabs.
The launcher requires Python 3; gameplay requires a modern browser. No workshop API
calls, lesson content, chat or credentials are included.

`content/` holds lesson and catalogue data; see the [content authoring guide](content/README.md).
Each introductory lesson and each game mini-exercise has its own JSON file.
`lesson-model.js` applies content-declared aliases, exact draft migrations, editor
help, navigation order and practice requirements without knowing lesson IDs.
Map branches are rendered from the catalogue. The lesson manifest determines
ordering; editor size and Enter/line-limit behavior are separate settings.
`curriculum.js` and `templates.js` load those files through `content-loader.js`,
shared with the Node tutor. `bootstrap.js` handles failed content loads with Retry. `lessons.js` handles navigation, saved lesson
drafts, focused completions, drawing/animation, and interactive lesson controls.
The logo opens the title screen; its Study map and Continue buttons use the same
navigation and saved lesson ID. The base URL opens the title screen; `/#lesson/<id>`
opens that lesson directly and survives refresh, with browser Back/Forward navigation.
`lesson-worker.js` runs `lesson_runtime.py` in Pyodide: a bounded, validated subset
of real Python, with persistent event/update sessions and simulated character physics.
The full workshop starts lazily; its stepping pauses in lessons or the map.
`lessons.css` styles the responsive lesson layout, learning map and transfer invitation. Desktop
later lessons keep instructions beside a scene/code stack, with scene height responsive
to the viewport; narrow screens stack the sections. Eleven short opening slides combine readable explanations with code practice and use
a single column, with an early bounded jump-height design and play-test activity, a move-then-jump sequence, calculator, speech bubble and screen-reader speech announcements. Vocabulary is introduced with its first use; the variable explanation includes joining a greeting. Only calculator slides show the Output panel beneath the code. `fox.say(value)` actions animate in order alongside movement.

`progress.js` stores bounded concept evidence and constructs optional movement
starters. `app.js` records behavior checks, tracks assistance, presents the transfer
preview and sends progress to Pip. Supplied movement does not prevent independent
checks of later mechanics; accepted AI edits conservatively mark that draft assisted.
`gameSkills` maps each game's first three exercises to shared or specific concepts.

`editor-guidance.js` resolves exercise anchors and protected edit regions. `app.js`
paints the target and provided lines, focuses/selects the editable placeholder on
request, and guards typed, pasted and programmatic edits against the protected
prefix/suffix. Guided control exercises can be explicitly unlocked; later exercises
use location hints without edit restrictions. AI edits outside a protected region
require choosing Edit whole file before applying.
Code changes clear previous helper highlights and suggestions, including edits made
with Enter and Tab. Exercise targets are resolved again against the current draft;
switching exercises also clears the previous line selection highlight.
The game editor uses cream for editable code and gray for supplied code. Selections
starting in the first editable line's indentation preserve those supplied spaces
when typing, pasting or deleting the selected rule.

Both editors offer **Reset code** without running the restored source. Game reset
restores the current prepared exercise in Brick breaker, or the template and first
exercise in the other games, with guided protection; its undo snapshot
retains the previous code, exercise and explicit unlocks. Intro reset restores only
the current lesson and offers an in-session Undo reset. Drafts are saved and
learning evidence is preserved.

The learning map marks practised introductory stages with a visible Completed
check badge and stronger green border, plus completed-stage counts per branch.
This uses existing successful-practice records, not a new mastery assessment;
completed lessons remain available to revisit.

`robot-scene.js` draws the introductory grid robot, its heading, dotted square route
and animated trail. The robot lessons build from a side to a square to a counted
loop. Console lessons then introduce comparisons, boolean values, and the low/high/
correct branches of a guessing-game referee before named functions. Their outputs
use the same local Python worker and saved-draft system as the existing lessons.

`graphics-diagrams.js` supplies SVG illustrations for the Computer graphics branch:
a geometric point versus a filled pixel cell, and an enlarged pixel grid with x/y
sliders. Python drawing uses the same 8 × 5 coordinate grid and fills whole cells
with `pixel(...)` and `line(...)`. `bresenham-diagrams.js` illustrates the ideal line,
pixel staircase and a step-by-step integer decision trace; `lesson_runtime.py`
produces the actual cells with Bresenham for all line directions. Illustration
controls do not run Python or record practice.
`pixel-fan.js` supplies the final Pixel fingerprint illustration: Bresenham fans on
a 192 × 144 bitmap, with edge spacing, one-pixel phase shift and corner controls.
Canvas enlargement keeps the original two colours and visible square pixels.

Foundations are grouped into seven content-defined chapters. The lesson header and
markers describe the current chapter; the map uses expandable chapter groups with
completion counts. Back/Next still follows the complete branch route.

`lesson-tutor.js` manages the slide sidebar, per-slide session chats, locally saved
visited slide IDs and cancellation when navigating. `lesson-tutor.mjs` at the project
root builds canonical curriculum context for `/api/lesson-help`; the existing server
provides the AI transport and offline slide guide. The sidebar stacks below slides
on narrow screens.

The shared `tutor-principles.mjs` policy frames Pip as a Python tutor whose examples
come from making games. General questions get language-level answers; local limits
matter when proposing code to run here. `lesson-capabilities.mjs` describes each
runtime mode, separately from the current lesson’s title/instructions, and includes
editor limits such as a protected line or a single-line cell. Keep it aligned with
`lesson_runtime.py` when adding capabilities. Completions are suggestions, not an
exhaustive list of accepted Python.

`voice-tutor.mjs` gives the live model that current scope plus a compact chapter/game
outline. The backend receives the ordered route summaries and full current lesson;
it does not receive every other lesson’s full contents. No curriculum retrieval tool
is needed for this small route. A future lookup tool would belong to the backend if
questions require detailed content from other lessons. This follows the
[OpenAI voice prompting guidance](https://developers.openai.com/api/docs/guides/live-prompting)
to keep the live conversation prompt compact and put detailed work in the backend.
Voice and typed chat share teaching rules but have separate response-format instructions;
game tutors receive only the selected game’s API. Voice history goes through session
input; the backend snapshot omits the placeholder question and duplicate history,
leaving the spoken conversation to supply the actual request.

`pip-voice.js` supplies shared opt-in WebRTC controls, mute and graceful shutdown.
`pip-avatar.js` and `pip-avatar.css` provide Pip's original SVG forest sprite in
the lesson, workshop and museum tutor headings. Pip blinks at rest, looks upward
while a typed reply or voice connection is pending, and tilts toward the learner
when voice is listening. A local Web Audio analyser measures outgoing voice for
mouth movement; the existing audio element remains the only playback path. Analysis
stops and its AudioContext closes when voice ends, including cancellation and
navigation. If analysis is unavailable, voice still works. Reduced-motion settings
disable blinking, wing motion and transitions and use a fixed speaking mouth.
Only the Talk button requests microphone access. Navigation and page lifecycle stops
release tracks, audio, the data channel, peer connection, request and timers immediately;
only the explicit End voice action waits briefly for a close acknowledgement. A later
navigation stop also finishes that wait immediately. Cleanup is idempotent, and late
permission results or transport callbacks cannot revive a cancelled call or change a
new call. `server.mjs` aborts upstream voice setup when its browser response closes
before completion. Page departure uses `pagehide` plus `visibilitychange`, following
the [browser lifecycle guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event);
no unload handler or automatic voice restart is installed.
`voice-captions.js` groups independent speaker streams into the existing chat bubbles;
it also displays completed delegated answers containing backtick-delimited code
in a separate plain-text Written answer message, keeping the surrounding explanation. It preserves Python punctuation
without guessing from speech. Only `response.output_text.done` is allowed through
the data channel for backend replies; reasoning, tools and other backend events are excluded. Examples
share the existing conversation history and never edit or run code.
Each panel updates its shared in-memory history as speech arrives. `voice-tutor.mjs` builds the server-owned GPT-Live
configuration and delegates coding questions to the existing tutor with canonical
activity context. `/api/voice` exchanges SDP without exposing the API key.

`pip-pointer.js` reads explicit spoken line references from assistant captions and
draws a separate overlay in the active editor. The voice tutor receives canonical
numbered editor lines, including blank lines; only existing nonblank targets can
be highlighted. English number words through 99 and digits are supported after
“line”; digits also work after “ligne”, “línea”, “linha”, “lijn”, “Zeile” and
“wiersz”. Other phrasings may produce no pointer. References split across captions
are buffered, and learner captions clear the pointer without moving it. Timing
follows caption arrival rather than a word-level audio clock. A hidden text mirror
measures wrapping and responsive fonts; the overlay never changes code or selection.
`pip-pointer.css` provides the sparkle and respects reduced-motion preferences.

Introductory editors use a cream background for editable code, including fully
editable early cells. Guided cells retain grey supplied lines and a cream editable
line. A subtle green focus cue replaces the browser’s default textarea outline.


`museum.js` renders the Game workshop gallery, selected-game path chooser and
expandable story/Pip panel; `museum.css` owns this responsive layout. It shares the
existing game tutor and opt-in voice transport with an explicit `museum` activity;
the backend receives the complete program and canonical `museumStory` as context.
Museum guidance covers history, play and rules without code line references; the
voice activity also includes the history. Story source links are rendered as text
labels with validated HTTPS URLs. The offline guide answers history questions from
the same content. Navigation cancels pending chat and voice.
Game content supplies `museumIntro` and `complete`; `app.js` saves complete programs
under separate `-complete` keys and identifies them as `complete` activity. Workshop
exercise greetings and conversation resets follow the current template and exercise.


`framework/sokoban.py` owns grid movement, crate collisions, undo and original puzzle
layouts. `sokoban-scene.js` draws its snapshots without implementing puzzle rules.
`game-controls.js` maps input for both the workshop and exported player; Sokoban
uses four directions, Undo and Next puzzle. Its lesson starters and complete source
live in the same content structure as the other games. Grid movement has separate
progress evidence; horizontal movement is not automatically supplied to it.


`game-previews.js` draws gallery and selected-game previews through `scene.js`.
`content/game-previews.json` contains short recordings of the complete programs,
generated with `python3 scripts/build-game-previews.py` from the project root.
Regenerate after changing complete programs, initial worlds or snapshot formats.
Animation is opt-in, respects reduced motion, and stops outside the museum or while
the tab is hidden. No Python worker is needed for browsing. Card selection has a
short zoom transition; the existing museum routes now distinguish gallery and detail.


`title-screen.css` styles the home introduction, forest illustration, two starting
paths and secondary map link. `lessons.js` draws the illustration once through the
shared scene renderer and redraws when forest artwork arrives; it starts no game
worker or animation for the title screen. The Python card adapts to the saved lesson,
using the existing navigation and draft storage. Each starting panel is a single
native button, with whole-card hover/focus feedback and Enter/Space activation.
The layout stacks on small screens.


The game heading has one **Download** menu, with the complete playable ZIP first
and **Python code only** as a secondary option. Download feedback appears below the
heading when needed. The menu supports keyboard use, Escape, outside clicks and
focus leaving the menu; navigation closes it. The editor has no separate export row.


Space Invaders and Asteroids use `framework/space_workshop.py` through the shared
worker. The Invaders adapter uses `framework/invaders.py` and the existing
Game/World collision engine and stock pixel sprites. The desktop tutorial keeps
its complete game rules in `examples/alien_invaders/game.py` for learners to edit.
Asteroids owns rotation, acceleration, wrapped movement, swept shot hits, splitting,
shields and respawn. `space-scene.js` draws both snapshots; all three modules plus
`stock.py` are included in the framework/renderer export lists. No remote assets or
separate Python environment are needed.

Space controls are shared with the exported player: Asteroids uses a separate
`thrust` action (Up/W and touch), and Space fires. Invaders retains one shot per
press; Asteroids allows held fire with a cooldown. `game-controls.js` also updates
touch visibility and rotation labels when switching games. Win/loss overlays and
shield counts use Python state. Each space exercise has its own prepared starter,
and both text and voice tutors receive the selected ship API and current exercise.


Expanded play moves the existing `#game-card` into the full-page `#expanded-game`
native dialog, preserving the canvas, simulation, controls and draft. `app.js`
restores the card on the return button, Escape, hash navigation or Python errors,
clears held inputs on transitions, ends voice on entry and keeps Tab focus within
the dialog. `style.css` fits the canvas proportionally inside the remaining viewport
height, with controls and score outside the scene. This fills the browser page;
it does not request browser/OS fullscreen.

The workshop toolbar lives in the shared header and replaces its general navigation
while a game is open. `#build-path` is an exercise menu beside Download; selecting
an exercise closes it and restores focus to its summary. Pip's opening message
carries the exercise instructions, before the suggested questions. The editor keeps
line-location/unlock controls without the repeated Your turn banner; routine line
and runtime status updates remain available to screen readers. `templates.css`
styles the toolbar and menu without resizing the game canvas or code editor.

The game editor places Undo, Reset, Hint, Check and Run/Stop in one compact toolbar,
using the same controls and handlers across workshop games. Check feedback appears
directly below the toolbar. Complete-game editing shows Undo, Reset and Run/Stop.
The inline Next step button is hidden pending better completion detection; the
Exercises menu still lets learners choose any exercise.

`app.js` keeps a newly selected game's canvas hidden until its own Python state
arrives. Python readiness alone does not dismiss the loading overlay, and the draw
loop skips the default or previous game's scene during selection and startup.

Sky Patrol draws a fixed cannon with a barrel rotated by `cannon.angle`, and sparks
rotated to their velocity. Aiming uses rotation evidence and separate v2 draft keys;
older sliding-launcher drafts remain stored. Keyboard/touch labels and the recorded
preview use the same aiming controls as the exported game.

Sky Patrol snapshots distinguish intact parachutes from falling robots. The canopy
and ropes disappear after a canopy hit, with fall streaks behind the dropping robot.
Canopy sway comes from Python so its collision shape matches the drawing.
