# Browser workspace

Prototype UI and original Canvas 2D artwork. `platformer.py`, `breaker.py` and
`paratroopers.py` are the learner's starter scaffolds. `templates.js` loads the
short build paths and game-specific UI from JSON content. `starter.py` retains the initial complete
platformer sample.

`../framework/workshop.py` supplies all four game simulations through `WorkshopGame`;
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
each panel updates its shared in-memory history as speech arrives. `voice-tutor.mjs` builds the server-owned GPT-Live
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
the backend receives the complete program as context, while museum guidance explains
play and rules without code line references. Navigation cancels pending chat and voice.
Game content supplies `museumIntro` and `complete`; `app.js` saves complete programs
under separate `-complete` keys and identifies them as `complete` activity. Workshop
exercise greetings and conversation resets follow the current template and exercise.


`framework/sokoban.py` owns grid movement, crate collisions, undo and original puzzle
layouts. `sokoban-scene.js` draws its snapshots without implementing puzzle rules.
`game-controls.js` maps input for both the workshop and exported player; Sokoban
uses four directions, Undo and Next puzzle. Its lesson starters and complete source
live in the same content structure as the other games. Grid movement has separate
progress evidence; paddle/launcher movement is not automatically supplied to it.


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
