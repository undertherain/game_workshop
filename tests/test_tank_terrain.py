"""Playable random maps: substantial lakes, clear spawns and reachable land."""
from random import Random
import unittest
from unittest.mock import patch

from examples.tank_battle.game import TankBattle


def components(cells):
    remaining = set(cells)
    groups = []
    while remaining:
        group = {remaining.pop()}
        pending = list(group)
        while pending:
            x, y = pending.pop()
            for cell in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if cell in remaining:
                    remaining.remove(cell)
                    group.add(cell)
                    pending.append(cell)
        groups.append(group)
    return groups


class TankTerrainTests(unittest.TestCase):
    def test_many_seeds_have_broad_lakes_and_connected_playable_land(self):
        for seed in range(64):
            with self.subTest(seed=seed):
                game = TankBattle(seed=seed)
                terrain = game.world.map
                cells = {(x, y) for y in range(terrain.height) for x in range(terrain.width)}
                water = {cell for cell in cells if terrain[cell] == 'water'}
                lakes = components(water)
                self.assertEqual(len(lakes), 8)
                self.assertTrue(all(24 <= len(lake) <= 60 for lake in lakes))
                # Every water cell participates in a full 2×2 patch: no lone
                # puddles, one-cell strands, or thin tips, even on irregular shores.
                for x, y in water:
                    self.assertTrue(any({(ox, oy), (ox + 1, oy), (ox, oy + 1), (ox + 1, oy + 1)} <= water
                                        for ox in (x - 1, x) for oy in (y - 1, y)))
                land = {cell for cell in cells if not terrain.definition(cell).blocks_actors}
                self.assertEqual(len(components(land)), 1)
                self.assertEqual(len(game.world.actors), 13)
                for actor in game.world.actors:
                    cell = int(actor.x // 48), int(actor.y // 48)
                    self.assertIn(cell, land)
                    self.assertEqual(terrain[cell], 'grass')
                self.assertEqual(sum(terrain[cell] == 'repair' for cell in cells), 8)
                self.assertIn('mud', {terrain[cell] for cell in land})
                self.assertTrue(any(terrain[cell] == 'brick' for cell in cells))

    def test_seed_replay_and_restart_restore_original_terrain(self):
        game = TankBattle(seed=12)
        initial = [row[:] for row in game.world.map.rows]
        self.assertEqual(initial, TankBattle(seed=12).world.map.rows)
        self.assertNotEqual(initial, TankBattle(seed=13).world.map.rows)
        game.world.map[0, 0] = 'mud'
        game.step({'restart'}, 0)
        self.assertEqual(game.seed, 12)
        self.assertEqual(game.world.map.rows, initial)
        world = game.world
        game.step({'restart'}, 0)
        self.assertIs(game.world, world)

    def test_new_map_chooses_fresh_seed_once_per_key_press(self):
        game = TankBattle(seed=12)
        initial = [row[:] for row in game.world.map.rows]
        with patch('examples.tank_battle.game.Random',
                   side_effect=lambda seed=None: Random(42 if seed is None else seed)):
            game.step({'new_map'}, 0)
        self.assertNotEqual(game.seed, 12)
        self.assertNotEqual(game.world.map.rows, initial)
        world = game.world
        game.step({'new_map'}, 0)
        self.assertIs(game.world, world)
        game.step(set(), 0)
        game.step({'restart'}, 0)
        self.assertEqual(game.world.map.rows, world.map.rows)


if __name__ == '__main__':
    unittest.main()
