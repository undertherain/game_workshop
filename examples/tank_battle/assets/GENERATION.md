# Tank atlas

Generated with the built-in image_gen tool on 2026-09-13. Saved as
`tank-atlas.png` (1254 × 1254 RGBA). The original generated file is preserved
unchanged; SpriteAsset rectangles select its cells at render time. Transparency
comes from the generated alpha channel. The requested resolution was 1024 square;
the renderer uses the actual output dimensions. Adjacent cell edges are inset by
one pixel to avoid sampling neighboring sprites.

## Prompt

Use case: stylized-concept
Asset type: production pixel-art sprite atlas for a top-down tank game.
Create ONE square 1024x1024 PNG sprite sheet, an EXACT 4 columns by 4 rows grid of 256x256 cells, with no gutters, no lines, no labels, no text. Every asset must be confined to its cell. Crisp designed pixel art, attractive readable silhouettes, coherent restrained colors and strong material separation, like a polished small indie arcade game. Orthographic overhead view, absolutely no isometric perspective. No blurry texture noise or gradients. Each cell looks like carefully authored 32x32 pixel art enlarged 8 times nearest-neighbor.
Row 1: the SAME friendly green tank facing UP, RIGHT, DOWN, LEFT respectively. Short chunky tracks, distinct central turret, long visible cannon, warm highlights, dark outlines. Tank fully fits centered within each cell occupying about 80 percent of cell. Transparent background around each tank.
Row 2: the SAME rust-red enemy tank facing UP, RIGHT, DOWN, LEFT. Angular silhouette visibly distinct from green friendly tank. Same scale and pixel density. Transparent backgrounds.
Row 3: FOUR full-bleed square repeating terrain textures, each reaching every edge of its cell: muted moss-green short grass, deep blue water with restrained horizontal wave accents, dark brown muddy tracks, warm tan compacted earth. Low visual noise, enough contrast for actors. Tile edges should repeat smoothly. Do not frame terrain tiles.
Row 4: (1) full-bleed terracotta brick masonry wall tile with staggered bricks, viewed overhead as a flat solid obstacle, no grass edge or border; (2) small repair crate with a clearly readable wrench emblem, centered on transparent background; (3) bright golden projectile, small centered on transparent background; (4) compact yellow-orange pixel explosion, centered on transparent background.
All non-terrain sprites have actual alpha transparency, not checkerboard or flat color. No drop shadows outside sprites. Exact grid alignment is essential for direct game-engine cropping. Original artwork; do not replicate the crude recovered artwork.
