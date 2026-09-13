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
| `branch` | `foundations` or `drawing` |
| `title` | Label on the learning map |
| `heading`, `description` | Lesson heading and instructions; plain text |
| `starter` | Array of Python source lines; spaces preserve indentation |
| `rows` | Visible editor rows, 1–12; one-row lessons run on Enter |
| `mode` | Existing Python execution mode, listed below |
| `skill` | A key from `catalog.json`'s `skillLabels` |
| `actor` | Optional `character`, used after customization; omit for early fox lessons |
| `placeholder` | Hint inside the empty editor |
| `scene` | `title` and accessible `label` for the scene |
| `completions` | Array of `{ "code": "character.jump()", "description": "Jump up and land" }` |
| `feedback` | Optional overrides of shared messages; live modes require `triggered`, drawing requires `drawn` |
| `quiz` | Optional first-line prediction question; see `sequence.json` |
| `palette` | Optional sky choices for `style`; see `customize.json` |

Supported modes are `commands`, `loop`, `style`, `event`, `update`, `drawing`, and `basics`.
The `basics` mode supports numeric assignments and expressions, `fox.move(distance)`,
`fox.jump()`, bounded loops, top-level named functions with up to two parameters,
and numeric comparisons in `if`/`else`. Functions use parameters and local values
and can call earlier helpers; recursion, defaults, and return values are not supported.
Movement results include distances for animation. See `functions.json` and
`parameters.json` for examples.

These select existing runtime behavior. A JSON edit does not introduce a new Python
API or algorithm: new execution capabilities still require runtime/engine work.
The live modes call `on_space_pressed()` or `update()`. A prediction quiz compares
the current first code line with the chosen answer's `firstLine`; it invites an
experiment rather than blocking progress for a wrong answer.

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
