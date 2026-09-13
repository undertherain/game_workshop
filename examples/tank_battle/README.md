# Tank battle

A local tank game built to exercise the [top-down framework](../../framework/README.md).
The pine-tree explorer remains separately available as `examples.tank_world`.

From the repository root (Python 3 with `raylib==5.5.0.4`):

```sh
python3 -m examples.tank_battle
# Optional resizable window:
python3 -m examples.tank_battle --windowed
```

Arrows drive; Space fires; R restarts. Escape exits. Defeat four roaming enemy tanks;
armor reaching zero ends the round. Enemy AI is deliberately simple wandering and
firing. This is a framework exercise, not a complete Battle City remake.

The map is 64 × 40 tiles, with room to scroll. Fullscreen uses the entire monitor
at 2× world scale, regardless of aspect ratio. The framework camera smoothly
recenters as you move, continues easing when you stop, and clamps at map edges.
Controls and status overlay the world without an opaque bar.

- Bricks block tanks and projectiles; a shot destroys the impacted brick.
- Water blocks tanks while letting projectiles cross.
- Brown mud reduces walking speed to 40%.
- Repair crates restore two armor points, up to five, when the player enters,
  leaving the cell's normal grass variant behind.
- Actors block one another; projectiles damage opponents and make short explosions.

`game.py` defines these tile types and Tank.update behavior. The framework handles
bounds, collision, contact callbacks, projectile motion/damage delivery and cleanup.
No map-edge checks are present in the game's movement rules.

The new generated pixel-art atlas is `assets/tank-atlas.png`. Its full prompt and
provenance are in [GENERATION.md](assets/GENERATION.md). The renderer uses regions
of the unchanged atlas with alpha transparency. Projectiles use a tighter region,
a slim shell, directional rotation and a short bright tracer for readability.
Shots leave the muzzle; the framework checks point-blank obstructions.
Original recovered images remain in `assets/` as earlier references and in
`recovered/game1/`; they are no longer the default graphics. The recovered audio
has not been integrated.

Grass now uses four muted pixel-noise regions from `assets/grass-variants.png`,
replacing the upright grass motifs. The map seed controls framework-selected
variants without changing terrain rules. Repair underlays share the same grass
selection. See [grass generation prompt](assets/GRASS-GENERATION.md).
