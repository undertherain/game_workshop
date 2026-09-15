# Workshop content

Edit lesson content here. The browser and server-side tutor load the same JSON files;
no build step or JavaScript edits are needed for content changes. Reload the browser
after editing; restart the Node server to refresh its tutor metadata.

## Introductory lessons

- `lessons/index.json` lists lesson IDs in teaching order. Order within each branch
  determines Back/Next navigation.
- `lessons/<id>.json` contains one lesson: title, instructions, starter code,
  autocomplete choices, scene labels, optional quiz/palette, and feedback.
- `lesson-defaults.json` supplies shared feedback. A lesson's `feedback` object
  overrides individual messages, keeping common wording in one place.
- `catalog.json` contains skill labels, game-to-skill mappings, game catalogue cards
  and the list of available game template IDs.

Start with [event.json](lessons/event.json) for a live rule, or
[dot.json](lessons/dot.json) for drawing. Copy a similar file, give it a unique ID,
and add that ID to `lessons/index.json`. Keep existing IDs stable: saved drafts and
progress refer to them. File names must match IDs.

The lesson fields are:

| Field | Meaning |
| --- | --- |
| `id` | Stable lowercase ID, matching the file name and manifest entry |
| `branch` | A branch ID declared in `catalog.json` |
| `chapter` | A chapter ID from that branch’s `chapters`; required when the branch declares chapters |
| `title` | Label on the learning map |
| `heading`, `description` | Lesson heading and instructions; plain text |
| `starter` | Array of Python source lines; spaces preserve indentation |
| `rows` | Visible editor rows, 1–12; controls size only |
| `editor` | Optional `{runOnEnter: true, maxLines: 1}`; otherwise Enter inserts a line and Ctrl/Cmd+Enter runs, with no separate line limit |
| `editorHelp` | Optional `{text, display: "once"}` for a one-time overlay, or `"always"` for inline help; omitted help describes the editor’s capabilities generically |
| `editableLine` | Optional one-based line number; only this line is editable, with other lines restored from the starter even for saved drafts |
| `mode` | Existing Python execution mode, listed below |
| `skill` | A key from `catalog.json`'s `skillLabels` |
| `layout` | Optional `compact` for short single-column opening slides |
| `presentation` | Optional `scene` (default) or `console`; console hides the scene and shows results in Output, while scene uses speech bubbles |
| `explanation` | Optional 1–4 `{title, code, text}` cards on a compact reading slide; use an empty starter, or combine with `quiz.only` |
| `actor` | Optional `character`, used after customization; omit for early fox lessons |
| `placeholder` | Hint inside the empty editor |
| `scene` | Optional `title` (omit to hide the caption) and required accessible `label` |
| `completions` | Array of `{ "code": "character.jump()", "description": "Jump up and land" }` |
| `examples` | Optional `{label, code}` suggestions below the editor; selecting one replaces the code and clears the old output, then the learner presses Run |
| `feedback` | Optional overrides of shared messages; live modes require `triggered`, drawing requires `drawn` |
| `quiz` | Optional first-line prediction (`sequence.json`) or typed output prediction (`type: "output"`) |
| `palette` | Optional sky choices for `style`; see `customize.json` |
| `aliases` | Optional former lesson IDs; saved locations and URLs resolve to this lesson. Aliases cannot collide with active IDs or other aliases |
| `draftMigrations` | Optional array of `{from: [lines], to: [lines]}`; replaces only an exact saved source match, leaving custom drafts alone |
| `legacyActors` | Optional old Python actor names to migrate to `actor` at the start of a saved source line; does not replace text inside strings |
| `practiceFeature` | Optional runtime feature required to record practice: `expression`, `assignment`, `function`, `parameter`, `condition`, `comparison`, or `loop`; independent of the skill’s label or ID |

`lessons/index.json` is the sole source of lesson order. Reorder its entries to
change map nodes, the first lesson, and Back/Next within each branch. Lesson markers
show only the current chapter, and Back/Next continues across chapter boundaries.
File names identify content; their alphabetical filesystem order has no effect.
Presentation settings travel with each lesson, including explanation cards, console
output, scene, examples, editor behavior and help. Next-button wording follows the
actual next lesson, so consecutive explanation slides are supported.

The catalogue’s `branches` array defines map section order and each branch’s `id`,
short `label`, `eyebrow`, `title`, `description`, and optional `planned` cards
(`{title, description}`). A branch can declare `chapters` as `{id, title, description}`
entries. Each lesson then selects its chapter; chapter display order follows first
appearance in the lesson manifest. Keep a chapter’s lessons together in the route.
The map shows expandable chapters with their own completion counts. Branches without
chapters retain their simple lesson list. New branches need no HTML changes. Runtime modes and
rendering primitives remain implemented capabilities; content selects them.

Supported modes are `commands`, `loop`, `style`, `event`, `update`, `drawing`, `basics`, `robot`, and `jump-design`.
The `basics` mode supports numeric and text assignments, arithmetic including division,
comparison values, `str(value)`, `fox.say(value)`, top-level expression output, `fox.move(distance)`,
`fox.jump()`, bounded loops, top-level named functions with up to two parameters,
and comparisons or named values in `if`/`elif`/`else`. Functions use parameters and local values
and can call earlier helpers; recursion, defaults, and return values are not supported.
Movement results include distances for animation. See `functions.json` and
`parameters.json` for examples.

The `robot` mode uses a six-by-six board with a dotted square target. It accepts
`robot.move(steps)` (whole numbers 1–5), `robot.turn_right()`, and bounded `for`
loops using `i`, `step` or `side`. The robot starts at tile (1, 1), facing right;
coordinates here are zero-based. Each run resets the scene. Off-board moves and
more than 12 instructions fail with feedback. `robot-scene.js` draws the action
snapshots and interpolates movement and quarter turns. See `robot-side.json`,
`robot-square.json` and `robot-repeat.json` for the progression.

The guessing lessons use console presentation with `print(value)` and ordinary
visible assignments. They do not yet use input, randomness or unbounded loops.
Use `practiceFeature: "comparison"` to require a comparison in the source.

These select existing runtime behavior. A JSON edit does not introduce a new Python
API or algorithm: new execution capabilities still require runtime/engine work.
The live modes call `on_space_pressed()` or `update()`. A prediction quiz compares
the current first code line with the chosen answer's `firstLine`; it invites an
experiment. Set `quiz.required: true` to disable Run until an answer is selected or
typed. The keyboard shortcut uses the same requirement. Set it to `false` to allow
running without an answer. When omitted, predictions beside code are optional and
standalone quizzes (`quiz.only`) require an answer. With `quiz.type: "output"`,
omit choices: the learner types a prediction, which is compared to the actual output
after Run. Set `quiz.only: true` for a standalone quiz: the editor and scene are
hidden, Check answer runs the fixed starter, and saved code drafts do not change
the question. Multiple output values are joined with newlines. Set `presentation: "console"`
to show results in Output without a scene. Omit it or use `"scene"` to keep the scene
and speech bubbles. This choice is independent of the lesson ID and layout.

## Game workshops

- `games/<game>.json` holds the game's display metadata, introduction, idea prompts,
  pocket guide and ordered `lessons` IDs. `museumIntro` introduces its goal, controls
  and rules; `complete` is an array of Python lines for its finished playable version.
  Complete versions must pass all three game behavior checks.
- `game-lessons/<id>.json` holds **one** exercise: `id`, `title`, `description`, `hint`.
- An optional `guide` object provides editor guidance: `function` names the Python
  function, `replace` optionally identifies an exact placeholder line, `instruction`
  explains the edit, and `review` is shown once that placeholder is gone. Locations
  are resolved against the current draft rather than fixed line numbers.
- `guide.editAfter` optionally names an exact comment line inside that function.
  The first movement tutorials use it to mark the editable rule area: code after
  that comment through the last body line is editable; the surrounding source is
  protected. Keep this marker aligned with the `.py` starter. Missing or ambiguous
  anchors leave the draft unrestricted rather than guessing a location.
- An optional `starter` array supplies a complete prepared Python program for that
  exercise. Brick breaker uses this for every step, with only the target rule
  missing and a separate saved draft per exercise. Reset restores that step.
  Games without exercise starters continue to use their shared `.py` starter.

The game runtime currently expects four exercises in order: movement, a second
mechanic, scoring or completion, variation. Text and hints are editable here; changing that
structure requires corresponding behavior checks and progress mappings. Listing a
new game in the catalogue does not implement it; use `available: false` for planned
entries.

## Validation

Run `npm test` from the project root. Checks load all files, validate their structure,
run nonempty introductory starters through the real Python lesson runtime, and
check game starters through their runtime. Loading failures identify the offending
file in the browser console; the UI offers Retry instead of a half-loaded lesson.
Content is rendered as text, not HTML or executable JavaScript.

## Curriculum consolidation

Foundations has 33 slides. Each later visit to a concept should add a new task:
signed movement, reusing one variable, or writing a rule without a supplied solution.
Keep an explanation and its practice adjacent where possible.

Three former reading slides are folded into the route: `before-games` into
`sequence`, `python-pieces` into `sum` (with vocabulary taught at its point of use),
and `addition-intro` into `names-intro`. Aliases preserve their old URLs and saved
locations. The text/number experiment owns the addition-versus-joining comparison;
the variable explanation applies joining to a greeting.

The fox loop and conditional movement lessons now ask learners to write rules after
the guided robot and guessing-game examples. Exact old starters migrate to the new
prompts; custom drafts keep their code. These activities still record practice,
not correctness or mastery.

Return to [browser implementation](../README.md).

`jump-design` accepts one `fox.jump(N)` call, where N is a whole-number literal
from 40 to 180. Run animates one jump at that height; invalid values receive a
range hint. See `jump-design.json`.
