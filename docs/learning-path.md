# Python foundations

The introductory lessons teach Python in a meadow scene before the game workshop.
This document describes the current behavior. Lesson content itself lives in JSON
under `public/content/`; see the [content authoring guide](../public/content/README.md).

## Title screen and navigation

The title screen pairs a forest-game illustration with two starting paths: learning
Python and exploring the game gallery. Returning learners see their saved lesson and
**Continue to last lesson**; new learners see **Start your first lesson**. The
learning map is a secondary link below those paths. Clicking the Little Makers logo
returns to the title screen from any activity.

Each lesson has a shareable URL such as `/#lesson/greeting`; refreshing keeps that
lesson open and browser Back/Forward follows lesson navigation. The progress markers
at the top are clickable shortcuts within the current chapter, with lesson names on
hover and keyboard support.

Foundations has seven chapters: First Python, Words and names, Numbers and variables,
Repetition, Decisions, Reusable code, and Live game rules. The **Learning map** groups
lessons into expandable chapters and connects thirty-three foundational lessons,
nine optional computer graphics lessons and the six game workshops. Back/Next continues
across chapter boundaries. All paths are open; the map recommends a starting route
without locking later activities. Xonix and a fractal lesson are explicitly marked as
planned, not playable.

## First chapters

The foundations open with eleven compact, single-column slides: the first jump, a
“make the jump yours” edit with an immediate Run, a move-then-jump prediction that
introduces line-by-line execution, `#` comments, a calculator, strings and fox
speech, integer addition versus string joining, then variables and a personal
greeting. Vocabulary appears with the activity that uses it; `print()` is
introduced later, where console output is used in the guessing game.

Explanation slides use large examples and short text blocks with no editor or
scene; **Try it in code** opens the next activity. Reading an explanation does not
record code practice. Some practice slides make only one line editable and explain
this with a one-time overlay that dismisses on focus or Run. Calculator slides echo
a top-level expression in the Output panel; `fox.say(value)` shows a speech bubble
in the scene instead.

## Later chapters

The route builds through sequence, numeric arguments, expressions, variables, a
grid-robot square patrol, bounded loops, comparisons, booleans and guessing-game
decisions, reusable functions, parameters, scene properties, a Space-key event and a
live `update()` function. The movement lessons add signed distances, calculated
arguments and reuse of one variable across two trips. After the guided robot loop
and guessing-game examples, learners write their own fox loop and conditional jump
rule without repeating the introductory explanations. Functions are called by the
learner before event callbacks are introduced. The routine exercise reuses a dance
between different walks; there is no code-space penalty and loops remain available.
These are practice activities, not mastery checks.

The last two lessons show the difference between executing commands once and
installing rules that the running game calls. A visible counter shows event/update
calls; buttons and focused-canvas keyboard controls let the learner test the rule.
The introductory loop targets 30 updates per second; the full game runtime uses
60 Hz simulation. While an event/update lesson is running, Run becomes a pressed
**Stop** button and the canvas takes focus so Space goes to the game. Stop ends
execution and keeps the code and last scene; Run starts again from the code.
Editing a live lesson stops its rule until Run is pressed again. One-shot commands
and drawings keep their ordinary Run button.

### Robot patrol

The robot sequence introduces a forward move and a right turn, an explicitly written
square, then a four-repeat loop. A six-by-six board shows the dotted target route,
the robot’s heading and its animated trail. `robot.move(n)` moves n tiles;
`robot.turn_right()` turns in place. Each run resets the robot to the same start,
and moves off the board are rejected with a hint.

### Guessing game

The console guessing sequence builds the referee for a 1–100 number game: compare an
attempt with a visible secret, name True/False as booleans, store a comparison, use
`if`, add `else`, then use `elif` for low/high/correct messages. A final exercise asks
learners to write and test their own rules; an endpoint activity introduces inclusive
comparisons. Input, random secrets and a repeat-until-correct loop are future
additions; these lessons test visible assignments one run at a time.

### Drawing branch

The Computer graphics branch opens with two visual slides: a geometric point at a
grid intersection beside a whole shaded pixel cell, then an enlarged 8 × 5 pixel
grid with keyboard-accessible x/y sliders. Columns and rows count from zero at the
top left; increasing y moves down, unlike the usual upward y axis on a maths graph.
These illustrations do not record code practice. Python practice continues on the
same 8 × 5 grid: `pixel(x, y)` colours one whole cell. Coordinates must be whole
numbers, with x from 0 to 7 and y from 0 to 4.

Next, a `for` loop builds a horizontal line by colouring neighbouring pixels.
Vertical and 45-degree diagonal examples vary y alone or x and y together. These
early activities introduce only `pixel(...)`; `line(...)` comes after the algorithm.

Three line explanations then introduce raster staircases, an interactive Bresenham
walkthrough from (0, 0) to (7, 3), and the midpoint derivation with shallow-line
pseudocode. The walkthrough has Previous/Next/Start again controls, outlined next
candidates, an ideal centre-to-centre line, decision arithmetic and a full trace table.
Its D ≥ 0 tie rule chooses the next row down in this shallow, rightward example.
The integer decision recurrence follows [Bresenham’s original paper](https://janmr.com/files/papers/bresenham65.pdf), adapted to screen coordinates and filled cells.

The next code activity introduces the `line(x1, y1, x2, y2)` primitive as a command
that packages the algorithm: the Python runtime implements
Bresenham in all directions and returns whole pixel cells, including both endpoints.
Examples cover steep, upward and reversed lines. The reading pseudocode uses `while`; the practice runtime
retains bounded `for` loops and supplies `line(...)` instead. It uses a small
workshop-specific Python API and Canvas renderer; pycontextfree is not integrated.

The final **Pixel fingerprint** slide draws a fan from a corner to every second
pixel on the opposite two edges of a larger 192 × 144 image. Controls change edge
spacing, shift endpoints by one pixel, and mirror the starting corner. Each line
uses Bresenham and whole filled cells, with nearest-neighbour enlargement. It is
an interactive illustration, separate from the 8 × 5 Python editor. The resulting
moiré-like bands illustrate how fine repeated lines interact with a pixel grid;
see the [UMBC line-rasterization lecture](https://courses.cs.umbc.edu/undergraduate/435/Spring16/lectures_post/06_pipeline.pdf)
for a related line-fan example.

The existing `dot`, `line` and `pattern` lesson IDs remain stable. Exact old prepared
drafts migrate to pixel examples; custom drafts remain unchanged, with Reset code
and Undo reset available. Old `dot()` code receives a migration hint when run.

## Quizzes and layout

Quiz configuration controls whether an answer is required. The sequence lesson asks
the learner to choose an answer before Run becomes enabled; other predictions can be
optional, and standalone quizzes require an answer by default.

The opening slides stack short instructions, an optional prediction, a compact scene
and code cell, then navigation. Calculator slides show output without a scene. On
desktop, later lessons put instructions, quizzes and navigation on the left, with
the scene above the code cell and Run on the right. The scene adapts to viewport
height; narrow screens use a stacked layout.

## Editor and runtime limits

Type `fox.` for action completions, or start a drawing command for drawing
suggestions. Tab accepts a completion or inserts indentation. Enter runs a one-line
lesson; Ctrl/Cmd+Enter runs longer programs. Autocomplete belongs to the introductory
cells only.

The introductory Python vocabulary expands per lesson and rejects unsupported
structures:

- Code can use at most 1,000 characters.
- Loops use `range(1)` through `range(6)`, with a limit of 12 animated actions or
  100 drawing shapes per run.
- Movement accepts distances from -300 to 300 pixels and stops at the scene edges.
- Arithmetic supports `+`, `-`, `*`, `/` and parentheses. Strings, booleans,
  comparison values and `str(value)` are supported; string repetition is excluded.
  Computed text is limited to 1,000 characters and numeric results to a magnitude
  of 1,000,000.
- Missing quotes, mixed text/number addition and division by zero receive specific
  hints.
- Helpers have up to two parameters and their own numeric locals; they may call
  previously defined helpers, but not recurse.
- Conditions support comparison expressions, boolean literals and named values, with
  `elif` and `else`. Returns and general Python remain for later work.

## Character customization and saved state

From the customization lesson onward, the actor is named `character`, so
`character.costume = "bunny"` and `character.jump()` still make sense after a change
of species. The first lessons retain `fox`; later lesson drafts migrate line-leading
`fox.` references on load, and the runtime accepts the old name for compatibility.
The customization lesson supports sky and character properties: sky buttons edit the
visible Python and Run applies the choice. Those appearance choices carry into other
meadow lessons.

Drafts, the last visited lesson, visited slides and appearance choices are saved in
this browser, with an in-memory fallback if storage is unavailable. Intro lessons
reset only their own code and offer **Undo reset**.

## Moving to the workshop

Use **Game workshop** at any point, or choose a game from the map after the
foundations. **First commands** returns to the current lesson. Workshop drafts remain
intact when switching layouts. See the [game workshop](game-workshop.md).
