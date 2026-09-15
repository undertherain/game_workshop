"""Connected shoreline snapshots and the desktop renderer's actual clip geometry."""
import unittest

from framework import Actor, Camera, Tile, TileMap, World
from framework.raylib_host import rounded_tile_rects


class RoundedTileTests(unittest.TestCase):
    def terrain(self):
        return TileMap(6, 6, 48, [Tile('grass', ('grass_a', 'grass_b')),
                       Tile('water', 'water', blocks_actors=True,
                            background=('grass_a', 'grass_b'), rounded_edges=True, edge_underlay='mud'),
                       Tile('mud', 'mud', speed_multiplier=0.4,
                            background=('grass_a', 'grass_b'), rounded_edges=True)], 'grass')

    def water_items(self, terrain, camera=None):
        return [item for item in terrain.visible(camera or Camera(288, 288))
                if item['asset'] == 'water']

    def pixels(self, neighbors):
        return {(x, y) for left, top, width, height in rounded_tile_rects(48, neighbors)
                for y in range(top, top + height) for x in range(left, left + width)}

    def rendered_pixels(self, terrain, camera):
        result = {}
        for item in terrain.visible(camera):
            rects = (rounded_tile_rects(48, item['neighbors'], item.get('quadrants', 15))
                     if 'neighbors' in item else ((0, 0, 48, 48),))
            for left, top, width, height in rects:
                for y in range(top, top + height):
                    for x in range(left, left + width):
                        result[item['x'] + x, item['y'] + y] = item['asset']
        return result

    def test_mud_water_join_has_no_grass_seam_and_preserves_lake_shape(self):
        terrain = self.terrain()
        for cell in ((3, 1), (4, 1), (3, 2), (4, 2)):
            terrain[cell] = 'water'
        camera = Camera(192, 96, x=48, y=48)
        before = self.rendered_pixels(terrain, camera)
        for cell in ((1, 1), (2, 1), (1, 2), (2, 2)):
            terrain[cell] = 'mud'
        after = self.rendered_pixels(terrain, camera)
        self.assertEqual({cell for cell, asset in before.items() if asset == 'water'},
                         {cell for cell, asset in after.items() if asset == 'water'})
        for y in range(50, 142):
            self.assertEqual(after[143, y], 'mud')
            self.assertEqual(after[144, y], 'mud')
        self.assertEqual(after[150, 54], 'mud')  # Rounded lake corner has a muddy bank.
        self.assertTrue(after[239, 48].startswith('grass'))  # Opposite shore stays grassy.

    def test_underlay_is_local_to_touching_quarters_and_updates_offscreen(self):
        terrain = self.terrain()
        terrain[2, 2] = 'water'
        camera = Camera(48, 48, x=96, y=96)
        for cell, expected in (((1, 2), 9), ((3, 2), 6), ((2, 1), 3), ((2, 3), 12),
                               ((1, 1), 1), ((3, 1), 2), ((3, 3), 4), ((1, 3), 8)):
            with self.subTest(cell=cell):
                terrain[cell] = 'mud'
                items = list(terrain.visible(camera))
                self.assertEqual([item['asset'] for item in items][1:], ['mud', 'water'])
                bank = items[1]
                self.assertEqual(bank['quadrants'], expected)
                for left, top, width, height in rounded_tile_rects(48, bank['neighbors'], expected):
                    for y in range(top, top + height):
                        for x in range(left, left + width):
                            quadrant = (2 if x >= 24 else 3) if y >= 24 else (1 if x >= 24 else 0)
                            self.assertTrue(expected & (1 << quadrant))
                terrain[cell] = 'grass'
                self.assertEqual(len(list(terrain.visible(camera))), 2)

    def test_unknown_edge_underlay_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unknown edge underlay'):
            TileMap(2, 2, 48, [Tile('water', 'water', rounded_edges=True, edge_underlay='missing')], 'water')

    def test_two_by_two_lake_updates_from_neighbors_beyond_camera(self):
        terrain = self.terrain()
        grass = terrain.asset_at((1, 1))
        for cell in ((1, 1), (2, 1), (1, 2), (2, 2)):
            terrain[cell] = 'water'
        self.assertEqual([item['neighbors'] for item in self.water_items(terrain)], [28, 112, 7, 193])
        camera = Camera(48, 48, x=48, y=48)
        self.assertEqual(self.water_items(terrain, camera)[0]['neighbors'], 28)
        self.assertEqual(list(terrain.visible(camera))[0]['asset'], grass)
        terrain[2, 2] = 'grass'  # Only the diagonal changes: show a concave corner.
        self.assertEqual(self.water_items(terrain, camera)[0]['neighbors'], 20)
        terrain[2, 1] = terrain[1, 2] = 'grass'
        self.assertEqual(self.water_items(terrain, camera)[0]['neighbors'], 0)

    def test_map_edges_are_land_and_full_interior_keeps_texture(self):
        terrain = self.terrain()
        for y in range(6):
            for x in range(6):
                terrain[x, y] = 'water'
        items = self.water_items(terrain)
        self.assertEqual(items[0]['neighbors'], 28)
        self.assertEqual(items[7]['neighbors'], 255)
        self.assertEqual(rounded_tile_rects(48, 255), ((0, 0, 48, 48),))

    def test_lake_rounds_outer_corners_without_seams_between_tiles(self):
        lake = set()
        for ox, oy, mask in ((0, 0, 28), (48, 0, 112), (0, 48, 7), (48, 48, 193)):
            lake.update((x + ox, y + oy) for x, y in self.pixels(mask))
        for point in ((0, 0), (95, 0), (0, 95), (95, 95), (5, 5)):
            self.assertNotIn(point, lake)
        for position in range(2, 94):
            for seam in (47, 48):
                self.assertIn((seam, position), lake)
                self.assertIn((position, seam), lake)
        self.assertIn((24, 2), lake)
        self.assertNotIn((24, 0), lake)

    def test_isolated_water_and_concave_corner(self):
        pond = self.pixels(0)
        self.assertIn((24, 24), pond)
        self.assertNotIn((3, 3), pond)
        self.assertEqual(pond, {(47 - x, y) for x, y in pond})
        self.assertEqual(pond, {(y, x) for x, y in pond})
        # North and west water join around a missing northwest diagonal.
        corner = self.pixels(255 ^ 128)
        self.assertNotIn((0, 0), corner)
        self.assertIn((2, 0), corner)
        self.assertIn((0, 2), corner)

    def test_rounded_appearance_preserves_tile_collisions(self):
        terrain = self.terrain()
        terrain[1, 0] = 'water'
        world = World(terrain)
        actor = world.add(Actor(0, 0, 20, 20, 'tank'))
        actor.move(100, 0)
        self.assertEqual(actor.x, 28)
        self.assertFalse(terrain.definition((1, 0)).blocks_projectiles)


if __name__ == '__main__':
    unittest.main()
