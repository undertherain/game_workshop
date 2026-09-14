"""Optional retro artwork. Import the sprites you want; Game loads none by default."""
from .assets import PixelSprite

ship = PixelSprite(('....#....', '....#....', '...###...',
                    '...###...', '.#######.', '#########'), (100, 230, 255))
alien = PixelSprite(('..#...#..', '...#.#...', '..#####..',
                     '.##.#.##.', '#########', '#.#...#.#'), (156, 245, 110))
bullet = PixelSprite(('#', '#', '#'), (255, 242, 166))
