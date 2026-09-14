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
| `practiceFeature` | Optional runtime feature required to record practice: `expression`, `assignment`, `function`, `parameter`, `condition`, or `loop`; independent of the skill’s label or ID |

`lessons/index.json` is the sole source of lesson order. Reorder its entries to
change map nodes, progress dots, the first lesson, and Back/Next within each branch.
File names identify content; their alphabetical filesystem order has no effect.
Presentation settings travel with each lesson, including explanation cards, console
output, scene, examples, editor behavior and help. Next-button wording follows the
actual next lesson, so consecutive explanation slides are supported.

The catalogue’s `branches` array defines map section order and each branch’s `id`,
short `label`, `eyebrow`, `title`, `description`, and optional `planned` cards
(`{title, description}`). New branches need no HTML changes. Runtime modes and
rendering primitives remain implemented capabilities; content selects them.

Supported modes are `commands`, `loop`, `style`, `event`, `update`, `drawing`, and `basics`.
The `basics` mode supports numeric and text assignments, arithmetic including division,
comparison values, `str(value)`, `fox.say(value)`, top-level expression output, `fox.move(distance)`,
`fox.jump()`, bounded loops, top-level named functions with up to two parameters,
and numeric comparisons in `if`/`else`. Functions use parameters and local values
and can call earlier helpers; recursion, defaults, and return values are not supported.
Movement results include distances for animation. See `functions.json` and
`parameters.json` for examples.

These select existing runtime behavior. A JSON edit does not introduce a new Python
API or algorithm: new execution capabilities still require runtime/engine work.
The live modes call `on_space_pressed()` or `update()`. A prediction quiz compares
the current first code line with the chosen answer's `firstLine`; it invites an
experiment rather than blocking progress for a wrong answer. With `quiz.type: "output"`,
omit choices: the learner types a prediction, which is compared to the actual output
after Run. Set `quiz.only: true` for a standalone quiz: the editor and scene are
hidden, Check answer runs the fixed starter, and saved code drafts do not change
the question. Multiple output values are joined with newlines. Set `presentation: "console"`
to show results in Output without a scene. Omit it or use `"scene"` to keep the scene
and speech bubbles. This choice is independent of the lesson ID and layout.

## Game workshops

- `games/<game>.json` holds the game's display metadata, introduction, idea prompts,
  pocket guide and ordered `lessons` IDs.
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
- The existing `.py` files remain the game's editable starter programs.

The game runtime currently expects four exercises in order: movement, a second
mechanic, scoring, variation. Text and hints are editable here; changing that
structure requires corresponding behavior checks and progress mappings. Listing a
new game in the catalogue does not implement it; use `available: false` for planned
entries.

## Validation

Run `npm test` from the project root. Checks load all files, validate their structure,
run nonempty introductory starters through the real Python lesson runtime, and
check game starters through their runtime. Loading failures identify the offending
file in the browser console; the UI offers Retry instead of a half-loaded lesson.
Content is rendered as text, not HTML or executable JavaScript.

Return to [browser implementation](../README.md).
