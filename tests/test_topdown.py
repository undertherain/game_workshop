import json
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from framework import Actor, Camera, Tile, TileMap, World
from examples.tank_battle.game import TankBattle


class TopDownTests(unittest.TestCase):
    def terrain(self):
        return TileMap(7, 3, 64, [Tile('grass', 'grass'), Tile('stone', 'stone')], 'grass')

    def test_rectangular_map_and_strict_edges(self):
        world = self.terrain()
        world[6, 2] = 'stone'
        self.assertEqual(world.rows[2][6], 'stone')
        self.assertEqual((world.width_pixels, world.height_pixels), (448, 192))
        for position in [(-1, 0), (0, -1), (7, 0), (0, 3)]:
            with self.assertRaises(IndexError):
                world[position]
        with self.assertRaises(KeyError):
            world[0, 0] = 'unknown'

    def test_motion_normalized_and_bounded(self):
        world = self.terrain()
        player = World(world).add(Actor(0, 0, 64, 64, 'tank'))
        player.walk(1, 1, 100, 1)
        self.assertAlmostEqual(math.hypot(player.x, player.y), 100)
        player.move(10000, 10000)
        self.assertEqual((player.x, player.y), (384, 128))
        player.move(-10000, -10000)
        self.assertEqual((player.x, player.y), (0, 0))

    def test_camera_resize_and_visible_tiles(self):
        world = self.terrain()
        camera = Camera(64, 64)
        camera.pan(10000, 10000, world)
        self.assertEqual((camera.x, camera.y), (384, 128))
        self.assertEqual(len(list(world.visible(camera))), 1)
        camera.width = camera.height = 1000
        camera.pan(0, 0, world)
        self.assertEqual((camera.x, camera.y), (0, 0))
        self.assertEqual(len(list(world.visible(camera))), 21)

    def test_battle_generation_is_repeatable(self):
        game = TankBattle(seed=12)
        other = TankBattle(seed=12)
        self.assertEqual(game.world.map.rows, other.world.map.rows)
        terrain = game.world.map
        self.assertEqual((terrain.width, terrain.height), (64, 40))
        for y in range(terrain.height):
            for x in range(terrain.width):
                self.assertEqual(terrain.asset_at((x, y)), other.world.map.asset_at((x, y)))

    def test_game_timing_and_snapshot(self):
        game = TankBattle(seed=12)
        start_y = game.player.y
        for _ in range(60):
            game.step({'up'}, 1 / 60)
        self.assertAlmostEqual(game.player.y, start_y - 130)
        game.step({'up'}, 50)
        self.assertAlmostEqual(game.player.y, start_y - 143)
        state = game.step(set(), 0, viewport=(480, 300))
        self.assertEqual(state['camera']['x'], 0)
        self.assertGreater(state['camera']['y'], 0)
        self.assertGreater(len(state['tiles']), 0)
        self.assertLess(len(state['tiles']), 200)
        json.dumps(state)


if __name__ == '__main__':
    unittest.main()
