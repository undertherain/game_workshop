# Grass variations

Generated with built-in image_gen on 2026-09-13; saved unchanged as
`grass-variants.png` (1254 × 1254). Four 627 × 627 quadrant regions provide
the variants. The framework selects a stable variant per cell from the map seed.
The original atlas grass is retained in its source image but replaced in the game.

## Prompt

Create a production game terrain texture atlas: one square PNG divided into an exact 2x2 grid of four equal square variants. No borders, no gutters, no labels. Each quadrant is an opaque seamless top-down grass-ground tile, consisting ONLY of understated irregular pixel noise in a narrow range of muted olive/moss greens. Absolutely NO visible grass blades, tufts, sprouts, plants, flowers, stones, symbols, vertical forms, perspective, vector shapes, illustrative motifs, shading gradients or lighting directions. Think 1990s overhead strategy-game grass represented by simple tiny colored square pixels, not a drawing of grass. Each quadrant should look like a 48x48 pixel texture enlarged with nearest-neighbor: scattered single pixels and occasional 2-pixel clusters, only subtle contrast. All four quadrants must share exactly the same average color and palette, with different arrangements of the noise. They must fit next to one another without obvious blocks of different colors, visible seams or repeating motifs. Full bleed opaque moss-green ground across the entire canvas. These will be drawn at 48x48 world pixels in a tank game; tanks and walls should remain much more prominent than this deliberately quiet background. Output 1024x1024 if possible.
