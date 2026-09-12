# Forest artwork

`background.png` is original artwork generated with the built-in imagegen tool on 2026-09-12. The supplied forest picture informed the visual direction; it is not shipped or modified here.

Final generation prompt:

```text
Use case: stylized-concept
Asset type: production background for a side-view pixel-art forest platformer, landscape 7:4 aspect ratio.
Primary request: Original lush atmospheric woodland in detailed classic pixel art. Large oak trees frame left and right edges, warm russet trunks, clustered yellow-green foliage lit from upper left, deep teal shadows. Middle third has airy readable negative space with pale blue mountain spires, layered misty forest silhouettes and slate blue sky with cream pixel clouds. Tree roots end at the very bottom edge. Entire image is BACKGROUND scenery; no foreground ground strip, no soil cross-section, no floating platforms, no characters, no collectibles. We will draw playable terrain separately. Mature beautiful pixel clusters, restrained palette, crisp stepped edges, no smooth vector shapes, no blur. Composition suited to an 840x480 game view, gameplay ground will be overlaid at y430, platforms at y265 and y345. Large trees mostly toward edges to preserve middle jumping route. No text, logos, watermark, UI, borders. Generate one finished background image.
```

The shipped first pass uses one flattened background, not separate parallax layers. `forest.js` draws terrain and the fox in code; collision surfaces and Python behavior remain owned by the runtime. Bunny and cat retain their original Canvas costumes. Sky variants are overlays on the background. No external image service is needed at runtime.

