# Tank battle

A local tank game built to exercise the [top-down framework](../../framework/README.md).

From the repository root (Python 3 with `raylib==5.5.0.4`):

```sh
python3 -m examples.tank_battle
# Optional resizable window:
python3 -m examples.tank_battle --windowed
# Reproduce a particular map:
python3 -m examples.tank_battle --seed 12
```

Arrows drive; Space fires; R restarts the current map; N creates a new map.
Escape exits. Defeat twelve roaming enemy tanks
that start on clear terrain across the full width and height of the world;
armor reaching zero ends the round. Enemy AI is deliberately simple wandering and
firing. This is a framework exercise, not a complete Battle City remake.

The map is 64 × 40 tiles, with room to scroll. Fullscreen uses the entire monitor
at 2× world scale, regardless of aspect ratio. The framework camera smoothly
recenters as you move, continues easing when you stop, and clamps at map edges.
Controls and status overlay the world without an opaque bar.

Each launch generates fresh terrain. Lakes grow from overlapping 2 × 2 water
patches into irregular connected bodies, with enclosed holes filled and separate
lakes kept apart. Water is spread across eight map regions; there are no isolated
one-tile puddles or one-tile-wide strands. Brick cover, mud patches and repair
crates also vary. Tank starts have clear space, and obstacle placements are checked
so all open land stays connected, including the paths to enemies and repairs.
R reconstructs the original terrain and actors from the current seed; N chooses a
fresh seed. `--seed` makes terrain and initial behavior reproducible.

- Bricks block tanks and projectiles; a shot destroys the impacted brick.
- Water blocks tanks while letting projectiles cross.
- Brown mud reduces walking speed to 40%.
- Repair crates restore two armor points, up to five, when the player enters,
  leaving the cell's normal grass variant behind.
- Actors block one another; projectiles damage opponents and make short explosions.

Water artwork follows the eight surrounding cells: connected tiles join, exposed
sides pull back slightly, and outer corners round off over the cell's normal grass.
A 2 × 2 patch forms a small lake with rounded corners; isolated tiles, narrow
channels and inward land corners also adapt automatically when the map changes.
The renderer clips the existing water texture, so no extra atlas is needed.
This is visual shaping; water still blocks tanks across its full tile cell.
Brown mud patches use the same connected rounded edges over grass, while retaining
their 40% walking speed across the full tile cell.
Where mud touches water, it extends beneath the rounded shore. Only the touching
quarters receive that mud underlay, so grassy shores stay grassy and shared
mud–water edges have no artificial green gaps. Water declares mud as its
`edge_underlay`; this affects artwork only.

`game.py` defines these tile types and Tank.update behavior; `terrain.py` builds
the seeded map and reserves the tank starts. The framework handles
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
