"""Declarative image regions shared by games and rendering hosts."""
from dataclasses import dataclass


@dataclass(frozen=True)
class PixelSprite:
    """Small code-authored monochrome sprite; dots are transparent."""
    rows: tuple[str, ...]
    color: tuple[int, int, int]

    def __post_init__(self):
        if not self.rows or not self.rows[0] or any(len(row) != len(self.rows[0]) for row in self.rows):
            raise ValueError('Pixel sprites need nonempty, equal-width rows')


@dataclass(frozen=True)
class SpriteAsset:
    image: str
    source: tuple | None = None  # x, y, width, height in the source image
    color_key: tuple | None = None
