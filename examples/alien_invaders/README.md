# Alien invaders — first playable step

A ship, seven stationary aliens and one shot per Space press. Left/Right moves;
clear the row to see “All clear!”. Escape exits; rerun to play again. There are
no enemy shots, moving formations or loss condition yet.

From the repository root, with Python 3 and `raylib==5.5.0.4` installed:

```sh
python3 -m examples.alien_invaders
python3 -m examples.alien_invaders --windowed
```

The authored game class now lives in [framework/invaders.py](../../framework/invaders.py),
shared with the browser workshop. [game.py](game.py) imports it and retains the
guarded desktop entry point. Movement, shooting and the completion message are
visible there. The CLI wrapper only adds `--windowed`; it contains no game rules.
`Invaders` inherits `Game`: `setup()` creates its actors once during construction,
and `update(dt)` defines its rules. Each instance owns its ship and aliens.

`Game()` supplies a 960 × 640 playfield,
keyboard state and the existing World simulation. `game.run()` opens fullscreen
by default; the playfield fits the display without stretching, with margins when
aspect ratios differ. Construction does not open a window, so game rules can be
imported and tested without a display. No external artwork or asset setup is needed.

Inside the subclass, `self.keys` contains held actions; `self.pressed` contains
newly pressed actions. `update(dt)` receives elapsed seconds, capped at 0.1 after a long frame.
The framework owns movement bounds, projectile travel, collision, damage and
cleanup. Aliens use Actor's default one health point; different teams let shots
hit aliens without hitting the ship. The example adds no custom collision code.

The artwork is explicitly imported from the optional [framework.stock](../../framework/stock.py) library:
`from framework.stock import ship, alien, bullet`. These are sprite objects,
passed to `self.actor(ship, ...)` and `projectile=bullet`, not reserved string names.
An empty `Game()` has no registered artwork. Repeated sprites share a registration.
You can also pass your own `PixelSprite` using the same API. Choose artwork in
`setup()` so it is registered before the desktop host loads textures.

The stock library contains
small `PixelSprite` text patterns, with dots for transparent pixels and `#` for
colored pixels. The raylib host creates textures from these patterns in memory.
The ship and alien are 9 × 6 pixels, drawn at 4× size; the bullet is 1 × 3.
There are no image files or generated AI assets in this example.

## Grow it from nothing

1. Start with `from framework import Game`, `game = Game()`, `game.run()`:
   an empty fullscreen playfield, with Escape to quit.
2. Define `class Invaders(Game)` with a `setup(self)` method that creates
   `self.ship`, and start with `Invaders().run()`: the ship is now visible.
3. Add `update(self, dt)` and its `self.ship.walk(...)` line: steer it.
4. Add the fire rule: press Space to shoot.
5. Import `alien` from `framework.stock` and in `setup` add
   `self.actor(alien, 462, 140, team='aliens')`:
   shooting it already works through the framework.
6. Replace that alien with the row in the example and add the completion message.

Moving formations, descending at edges, enemy shots and restarting are possible
next tutorial steps, not implemented features of this example. This is an initial
API experiment toward the [short-game authoring target](../../docs/framework-north-star.md).


The museum’s Space Invaders version adapts this class with three moving alien rows,
edge descent, enemy shots, shields and workshop exercise callbacks. These additions
belong to `framework/space_workshop.py`; this desktop example keeps its original
stationary row and short controls. Both share actor creation, stock sprites and the
Game/World projectile engine.
