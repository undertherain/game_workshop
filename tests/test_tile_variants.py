import unittest
from framework import Actor, Camera, Tile, TileMap, World


class TileVariantTests(unittest.TestCase):
    variants = ('grass_a', 'grass_b', 'grass_c', 'grass_d')

    def terrain(self, seed=7):
        return TileMap(12, 8, 40,
                       [Tile('grass', self.variants, speed_multiplier=0.5),
                        Tile('repair', 'crate', background=self.variants)],
                       'grass', seed=seed)

    def test_seeded_variants_are_stable_and_diverse(self):
        terrain = self.terrain()
        camera = Camera(480, 320)
        first = list(terrain.visible(camera))
        self.assertEqual(first, list(self.terrain().visible(camera)))
        self.assertEqual({item['asset'] for item in first}, set(self.variants))
        self.assertNotEqual(first, list(self.terrain(seed=8).visible(camera)))
        camera.pan(120, 80, terrain)
        list(terrain.visible(camera))
        self.assertEqual(first, list(terrain.visible(Camera(480, 320))))

    def test_background_uses_same_cell_variant_and_replacement_is_stable(self):
        terrain = self.terrain()
        original = terrain.asset_at((3, 4))
        terrain[3, 4] = 'repair'
        self.assertEqual(terrain.asset_at((3, 4)), 'crate')
        self.assertEqual(terrain.asset_at((3, 4), background=True), original)
        terrain[3, 4] = 'grass'
        self.assertEqual(terrain.asset_at((3, 4)), original)
        self.assertEqual(terrain.tiles['repair'].asset_names, {'crate', *self.variants})

    def test_appearance_does_not_change_tile_identity_or_behavior(self):
        terrain = self.terrain()
        actor = World(terrain).add(Actor(0, 0, 20, 20, 'actor'))
        actor.walk(1, 0, 100, 1)
        self.assertAlmostEqual(actor.x, 50)
        self.assertEqual(terrain[1, 0], 'grass')
        self.assertIs(terrain.definition((1, 0)), terrain.definition((2, 0)))

    def test_invalid_variants_are_rejected(self):
        for value in ((), ('grass', ''), ['grass'], None):
            with self.assertRaises(ValueError):
                Tile('grass', value)


if __name__ == '__main__':
    unittest.main()
