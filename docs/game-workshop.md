# Game workshop

The workshop is a split-screen editor beside a running game. Six games share one
Python framework: Space Invaders, Brick breaker, Platformer, Sky Patrol
(Paratroopers-style), Sokoban and Asteroids. Scenery, physics and moving objects are
provided; the learner writes controls and rules in short Python exercises. This
document describes current behavior; the exercise content lives under
`public/content/game-lessons/`.

## Gallery and paths

**Game workshop** opens a gallery of the six playable games. Each card previews the
actual game artwork; Xonix appears in a small coming-later note. Selecting a card
zooms into its game and offers three paths:

- **Learn the story** reveals a short history of the game or game type, with dates,
  named originals and source links, alongside Pip’s typed and optional voice guide.
  Platformer covers early examples of the genre; workshop versions are distinguished
  from their historical references.
- **Try exercises** opens the four-step Python build path.
- **Try customizing** opens the complete game, ready to play and edit.

Pip stays out of the gallery and path chooser. The selected-game preview has an
optional animation button for a short recorded gameplay loop, independent of Python
startup. Reduced-motion preferences disable preview animation and zoom transitions.
The gallery becomes a vertical card list on narrow screens.

Complete-game drafts remain separate from exercise drafts; reset restores the
complete program and Undo recovers edits. **Back to game** returns to the selected
game’s three paths; **All games** returns to the gallery. Routes such as `/#museum`,
`/#museum/breaker` and `/#workshop/breaker/complete` survive refresh and browser
Back/Forward.

## Exercise path

Each game has four prepared exercises with independent drafts, saved in this
browser. The workshop has one toolbar, with an **Exercises** menu beside
**Download**. Pip introduces the selected exercise in the conversation; Check, Next
and the editable-line controls stay beside the code.

1. Choose a game. In the brick breaker, **Left already works**: read its rule, then
   replace `pass` with the matching Right-key rule. The other starters have no arrow
   controls until the exercise is written and ask for both directions.
2. The editor highlights the target line and dims provided code. **Write here**
   selects `pass` while keeping its indentation. In the first movement exercises
   only the rule area is editable; **Edit whole file** opts into free editing for
   that exercise during this visit. Later steps show a function-location hint
   without locking the surrounding code. Use **Hint** or **Show a small example**
   as needed.
3. Press **Run** and try the arrow keys; focus moves to the game. **Check** executes
   behavioral checks against the current editor code in a separate Python
   namespace. It gives specific feedback without changing the live game.
4. Use the **Exercises** menu to continue to the game's second mechanic (jumping,
   aimed bounce, firing, rotation, pushing), then scoring, then a free variation.
   The inline Next button is hidden for now, pending better completion detection.
   Checks do not lock the learner into a curriculum.
5. Ask Pip about an error or selected line. Suggested edits only apply through
   **Try this edit** and require a separate **Run** to affect the game.
6. **Reset** restores the starter and stops playback; in most games it returns to
   the first exercise. **Undo** recovers the previous code and exercise. Undo,
   Reset, Hint, Check and Run/Stop share one compact row above the editor.
   Learning progress is kept.

Ctrl/Cmd+Enter runs code. On touch devices, on-screen controls supply the same
inputs once the child has implemented them. **Play again** restarts from the
last-run program; **Run** applies edits. Changing exercise clears the previous Pip
conversation and edit suggestion.

The exercise starters are small scaffolds; the customization path supplies complete
games. `public/starter.py` retains the original complete platformer sample.

## Expanded play view

**Expand game**, beside Play again, fills the browser page with the live game, score
and controls. **Back to workshop** or Escape restores the editor view without
restarting play or changing the draft. Keyboard focus stays within the expanded view;
touch controls remain available on touch devices. Opening it ends any active Pip
voice call. A Python error returns to the editor with the error visible.

## Games

### Brick breaker

Each exercise uses a prepared program with only that exercise’s rule missing. Aimed
bounce includes both arrow controls; scoring includes controls and aiming; variation
starts with a complete game. Each exercise saves its own draft. Reset code restores
the current exercise, and Undo recovers the edit. The
[brick-breaker framework example](../public/examples/breaker_framework.py) adds
explicit screen/brick context and paddle/ball methods; paste it into Brick breaker
after choosing **Edit whole file**.

### Platformer

The platformer combines an original generated pixel-art forest background with
Canvas grass-and-earth platforms and an animated pixel fox. Sky choices from the
lessons tint the forest; bunny and cat retain their drawn costumes. Exercises cover
horizontal movement, jumping, scoring and a free variation.

### Sky Patrol (Paratroopers)

The cannon stays fixed at the center. Left/Right or A/D tilts its barrel; Space
fires along that angle. `cannon.angle` is measured in degrees from straight up, with
negative angles pointing left and positive angles right, limited to −75°…75°.
`cannon.turn_speed` sets degrees per simulation tick (default 2). Shots keep their
firing direction. The first exercise teaches aiming and records rotation practice;
horizontal movement from another game is not offered as cannon controls.

Hitting a parachute tears it away: the robot stays visible and accelerates downward.
It counts as intercepted when it reaches the ground, using the same scoring rule as
a direct robot hit. The falling robot can also be shot before it lands. Robots with
intact parachutes return from the top when missed.

### Sokoban

Sokoban adds a grid-based building path. First connect Right in `on_key(key)`;
Left, Up and Down are worked examples. Next implement `can_push(crate, dx, dy)` by
checking the tile beyond the crate, then `is_complete()` to recognize a solved board.
The fourth exercise constructs a custom room with `board.load([...])`: edit rows of
walls, floor, player, crates and goals in Python, then Run to test it. Play is the
test of the authored rules.

The complete version supplies controls and rules for three original small puzzles.
Arrow keys or WASD move; U/Z/Space undoes a move; N opens the next puzzle after a
win. The visible controls also support touch and keyboard activation. Restart
reloads the current source's initial room. Crates cannot be pulled or pushed two at
once. Moves, pushes, goals and undo history belong to the shared framework. Custom
rooms validate dimensions and tile counts; they are not automatically checked for
solvability.

### Space Invaders

Space Invaders adapts the [Alien invaders example](../examples/alien_invaders/README.md):
the same `Game`, ship/alien sprites and projectile collision engine, with three
moving rows of seven aliens. The formation reverses and descends at the edges, and
aliens fire back. Left/Right or A/D moves; Space (also Up/W) fires once per press.
Clear all 21 aliens to win. Three shields and brief protection after a hit give room
to recover; losing all shields or letting the formation reach the ship ends the game.
Exercises teach horizontal movement, firing, scoring and variation. Invaders can
offer previously checked horizontal controls from another game (see
[learning progress](pip-tutor.md#learning-progress)).

### Asteroids

Asteroids separates turning from movement: Left/Right or A/D turns, Up/W thrusts,
and held Space fires. Releasing thrust preserves velocity. The ship, rocks and shots
wrap across screen edges. Four large rocks split into medium and then small
fragments; clear all 28 targets to finish. A collision costs a shield and resets the
ship with two seconds of protection. Losing all three shields ends the game.
Exercises teach rotation, thrust, scoring and variation; horizontal movement evidence
does not count as rotation practice.

## Export and play independently

In any of the six game workshops, choose **Download → Playable game** beside the
game title. The menu also offers **Python code only** for a source-only file.

Extract the ZIP, then run `python3 play.py` from that folder (Windows: `py play.py`).
The launcher opens the game in your browser. Keep its terminal open while playing;
Ctrl+C stops the local server. Python 3 must already be installed, but no Node,
workshop server, API key or internet connection is needed to play.

The ZIP includes the exact current editor draft as `my_game.py`, a versioned
`game.json`, the shared Python framework, browser player, artwork and local Pyodide.
Edits you have not run yet are included; missing exercise rules remain missing. The
player displays Python errors and supports keyboard/touch controls and Restart. Edit
`my_game.py` and reload to try a new version. To share online, serve the extracted
folder with any static HTTP host; subfolder hosting is supported. Opening
`index.html` directly with `file://` does not work.

Exports are standalone browser bundles built by `export-game.mjs`, which packages
source without executing it on the server. Complete versions and custom Sokoban
drafts export with the same renderer, controls and runtime as the workshop. Native
desktop executable packaging is not implemented, and introductory lesson programs
are not game exports.
