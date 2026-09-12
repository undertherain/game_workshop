# Browser workspace

Prototype UI and original Canvas 2D artwork. `platformer.py`, `breaker.py` and
`paratroopers.py` are the learner's starter scaffolds. `templates.js` loads the
short build paths and game-specific UI from JSON content. `starter.py` retains the initial complete
platformer sample.

`runtime.py` supplies the platform game API; `arcade_runtime.py` supplies the two
arcade games and mini-exercise checks. `python-worker.js` runs real Python through
local Pyodide and isolates checks from the live game. `app.js` connects editor,
templates and helper; `scene.js` only draws snapshots.

Return to the [prototype README](../README.md).

`content/` holds lesson and catalogue data; see the [content authoring guide](content/README.md).
Each introductory lesson and each game mini-exercise has its own JSON file.
`curriculum.js` and `templates.js` load those files through `content-loader.js`,
shared with the Node tutor. `bootstrap.js` handles failed content loads with Retry. `lessons.js` handles navigation, saved lesson
drafts, focused completions, drawing/animation, and interactive lesson controls.
`lesson-worker.js` runs `lesson_runtime.py` in Pyodide: a bounded, validated subset
of real Python, with persistent event/update sessions and simulated character physics.
The full workshop starts lazily; its stepping pauses in lessons or the map.
`lessons.css` styles the responsive lesson layout, learning map and transfer invitation. Desktop
lessons keep instructions beside a scene/code stack, with scene height responsive
to the viewport; narrow screens stack the sections.

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

Both editors offer **Reset code** without running the restored source. Game reset
restores the template and first exercise with guided protection; its undo snapshot
retains the previous code, exercise and explicit unlocks. Intro reset restores only
the current lesson and offers an in-session Undo reset. Drafts are saved and
learning evidence is preserved.

The learning map marks practised introductory stages with a visible Completed
check badge and stronger green border, plus completed-stage counts per branch.
This uses existing successful-practice records, not a new mastery assessment;
completed lessons remain available to revisit.
