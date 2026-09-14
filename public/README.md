# Browser workspace

Prototype UI and original Canvas 2D artwork. `platformer.py`, `breaker.py` and
`paratroopers.py` are the learner's starter scaffolds. `templates.js` loads the
short build paths and game-specific UI from JSON content. `starter.py` retains the initial complete
platformer sample.

`runtime.py` supplies the platform game API; `arcade_runtime.py` supplies the two
arcade games and mini-exercise checks. `python-worker.js` runs real Python through
local Pyodide and isolates checks from the live game. `app.js` connects editor,
templates and helper; `scene.js` only draws snapshots. `forest.js` loads the
platformer's generated forest background, draws deterministic pixel terrain at the
runtime's platform coordinates, and animates a small pixel fox. The background is
sampled to 420×240 and drawn without smoothing. The previous scenery remains a
fallback while the image loads or if it fails. See `assets/forest/README.md` for
the asset's generation prompt and scope.

Return to the [prototype README](../README.md).

`examples/breaker_framework.py` is a complete, optional framework experiment for
the existing Brick breaker editor. `arcade_runtime.py` supplies `StaticScreen`,
`Brick`, `Paddle` and `Ball`; the learner can inspect `screen.width`/`height`, iterate
`bricks`, call paddle movement methods and `ball.bounce_up()`. Existing property
access and callbacks still work. See the [framework note](../docs/framework-north-star.md)
for scope and the proposed browser/standalone backend boundary.

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
to the viewport; narrow screens stack the sections. Twelve short opening slides combine readable explanations with code practice and use
a single column, with an early move-then-jump sequence, a Python building-block overview, calculator, speech bubble and screen-reader speech announcements. Only calculator slides show the Output panel beneath the code. `fox.say(value)` actions animate in order alongside movement.

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

Both editors offer **Reset code** without running the restored source. Game reset
restores the template and first exercise with guided protection; its undo snapshot
retains the previous code, exercise and explicit unlocks. Intro reset restores only
the current lesson and offers an in-session Undo reset. Drafts are saved and
learning evidence is preserved.

The learning map marks practised introductory stages with a visible Completed
check badge and stronger green border, plus completed-stage counts per branch.
This uses existing successful-practice records, not a new mastery assessment;
completed lessons remain available to revisit.
