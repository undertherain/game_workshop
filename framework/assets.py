"""Declarative image regions shared by games and rendering hosts."""
from dataclasses import dataclass


@dataclass(frozen=True)
class SpriteAsset:
    image: str
    source: tuple | None = None  # x, y, width, height in the source image
    color_key: tuple | None = None
