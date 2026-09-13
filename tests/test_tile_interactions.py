"""Behavior checks for the framework contract, independent of rendering."""
import unittest
from framework import Actor, Tile, TileMap, World
from examples.tank_battle.game import Brick, Repair, TankBattle


def make_world(tiles=()):
    return World(TileMap(12, 6, 40, [Tile('floor', 'floor'), *tiles], 'floor'))


class FrameworkInteractions(unittest.TestCase):
    def test_spawn_and_movement_enforce_world_bounds(self):
        world = make_world()
        actor = world.add(Actor(-80, 1000, 20, 20, 'actor'))
        self.assertEqual((actor.x, actor.y), (0, 220))
        actor.move(1000, -1000)
        self.assertEqual((actor.x, actor.y), (460, 0))
        with self.assertRaises(ValueError):
            world.add(Actor(0, 0, 500, 20, 'oversized'))

    def test_wall_collision_does_not_tunnel_and_slides(self):
        world = make_world([Tile('wall', 'wall', blocks_actors=True)])
        for y in range(6):
            world.map[3, y] = 'wall'
        actor = world.add(Actor(20, 20, 20, 20, 'actor'))
        actor.move(400, 100)
        self.assertAlmostEqual(actor.x, 100)
        self.assertAlmostEqual(actor.y, 120)
        actor.move(-20, 0)  # Can move away from a touching boundary.
        self.assertAlmostEqual(actor.x, 80)
        with self.assertRaises(ValueError):
            world.add(Actor(120, 10, 20, 20, 'actor'))

    def test_actor_collision(self):
        world = make_world()
        first = world.add(Actor(20, 20, 20, 20, 'actor'))
        world.add(Actor(100, 20, 20, 20, 'actor'))
        first.move(400, 0)
        self.assertAlmostEqual(first.x, 80)

    def test_slow_terrain_is_applied_while_crossing(self):
        world = make_world([Tile('mud', 'mud', speed_multiplier=0.5)])
        for x in range(1, 12):
            world.map[x, 0] = 'mud'
        actor = world.add(Actor(0, 0, 20, 20, 'actor'))
        actor.walk(1, 0, 100, 1)
        self.assertGreater(actor.x, 55)
        self.assertLess(actor.x, 65)

    def test_contact_entry_exit_and_stationary_ticks(self):
        calls = []
        class Trigger(Tile):
            def on_enter(self, actor, world, cell): calls.append(('enter', cell))
            def on_leave(self, actor, world, cell): calls.append(('leave', cell))
            def on_stay(self, actor, world, cell, dt): calls.append(('stay', cell))
        world = make_world([Trigger('trigger', 'trigger')])
        world.map[2, 0] = 'trigger'
        actor = world.add(Actor(0, 0, 20, 20, 'actor'))
        actor.move(85, 0)
        world.step(1 / 120)
        world.step(1 / 120)
        actor.move(100, 0)
        self.assertEqual([c[0] for c in calls], ['enter', 'stay', 'stay', 'leave'])
        calls.clear()
        actor.move(-185, 0)  # Large displacement must still visit the trigger.
        self.assertEqual([c[0] for c in calls], ['enter', 'leave'])

    def test_water_blocks_actor_but_shot_hits_enemy_beyond_it(self):
        world = make_world([Tile('water', 'water', blocks_actors=True)])
        world.map[2, 0] = 'water'
        actor = world.add(Actor(0, 0, 20, 20, 'actor', team='player'))
        enemy = world.add(Actor(150, 0, 20, 20, 'enemy', team='enemy'))
        actor.move(150, 0)
        self.assertEqual(actor.x, 60)
        actor.fire(1, 0, speed=20000)
        world.step(1 / 120)
        self.assertFalse(enemy.alive)
        self.assertNotIn(enemy, world.actors)
        self.assertFalse(world.projectiles)

    def test_fast_shot_breaks_first_brick_only(self):
        world = make_world([Tile('ground', 'floor'), Brick('brick', 'brick', True, True)])
        world.map[2, 0] = world.map[3, 0] = 'brick'
        actor = world.add(Actor(0, 0, 20, 20, 'actor'))
        actor.fire(1, 0, speed=50000)
        world.step(1 / 120)
        self.assertEqual(world.map[2, 0], 'ground')
        self.assertEqual(world.map[3, 0], 'brick')
        self.assertFalse(world.projectiles)
        self.assertTrue(world.effects)

    def test_projectile_hook_can_change_damage_on_passable_tile(self):
        class Boost(Tile):
            def on_projectile_hit(self, projectile, world, cell):
                projectile.damage += 2
        world = make_world([Boost('boost', 'boost')])
        world.map[1, 0] = 'boost'
        actor = world.add(Actor(0, 0, 20, 20, 'actor', team='player'))
        enemy = world.add(Actor(150, 0, 20, 20, 'enemy', health=5, team='enemy'))
        actor.fire(1, 0, speed=100)
        for _ in range(20): world.step(0.1)
        self.assertEqual(enemy.health, 2)

    def test_friendly_fire_and_projectile_expiry(self):
        world = make_world()
        actor = world.add(Actor(0, 0, 20, 20, 'actor', team='friend'))
        friend = world.add(Actor(60, 0, 20, 20, 'actor', team='friend'))
        actor.fire(1, 0, speed=5000)
        world.step(0.1)
        self.assertTrue(friend.alive)
        self.assertFalse(world.projectiles)
        actor.fire(1, 0, speed=1, lifetime=0.01)
        world.step(0.1)
        self.assertFalse(world.projectiles)

    def test_repair_is_consumed_and_does_not_retrigger(self):
        world = make_world([Tile('grass', 'grass'), Repair('repair', 'repair')])
        world.map[1, 0] = 'repair'
        actor = world.add(Actor(0, 0, 20, 20, 'actor', health=1, team='player'))
        actor.move(40, 0)
        self.assertEqual(actor.health, 3)
        self.assertEqual(world.map[1, 0], 'grass')
        world.step(0.1)
        self.assertEqual(actor.health, 3)

    def test_battle_runs_and_restart_restores_world(self):
        game = TankBattle()
        initial = (game.player.x, game.player.y)
        for _ in range(90):
            game.step({'up', 'fire'}, 1 / 60)
        self.assertNotEqual((game.player.x, game.player.y), initial)
        game.player.health = 0
        state = game.step(set(), 0.1)
        self.assertIn('destroyed', state['hud'][1])
        game.step({'restart'}, 0)
        self.assertTrue(game.player.alive)
        self.assertEqual((game.player.x, game.player.y), initial)
        self.assertEqual(len(game.world.actors), 5)


class FollowingCameraTests(unittest.TestCase):
    def setup_camera(self, smoothing=4):
        from framework import Camera
        world = World(TileMap(100, 80, 40, [Tile('floor', 'floor')], 'floor'))
        actor = world.add(Actor(1800, 1000, 40, 40, 'actor'))
        camera = Camera(800, 600)
        camera.follow(actor, smoothing=smoothing)
        return world, actor, camera

    def test_eases_toward_stationary_actor_without_overshooting(self):
        _, _, camera = self.setup_camera()
        camera.update(0.1)
        self.assertGreater(camera.x, 0)
        self.assertLess(camera.x, 1420)
        before = camera.x
        camera.update(0.1)
        self.assertGreater(camera.x, before)
        for _ in range(100): camera.update(0.1)
        self.assertAlmostEqual(camera.x, 1420)

    def test_follow_is_independent_of_render_frame_rate(self):
        _, _, first = self.setup_camera()
        _, _, second = self.setup_camera()
        for _ in range(30): first.update(1 / 30)
        for _ in range(144): second.update(1 / 144)
        self.assertAlmostEqual(first.x, second.x)
        self.assertAlmostEqual(first.y, second.y)

    def test_follow_can_snap_disable_and_resize_larger_than_map(self):
        world, actor, camera = self.setup_camera(smoothing=0)
        camera.update(0)
        self.assertEqual(camera.x, 1420)
        actor.move(10000, 10000)
        camera.update(0)
        self.assertEqual((camera.x, camera.y), (3200, 2600))
        camera.follow(None)
        actor.move(-1000, -1000)
        camera.update(1)
        self.assertEqual((camera.x, camera.y), (3200, 2600))
        camera.update(1, (5000, 5000))
        self.assertEqual((camera.x, camera.y), (0, 0))
        import json
        json.dumps(world.snapshot(camera))


class PresentationAndMuzzleTests(unittest.TestCase):
    def test_camera_settles_exactly_and_uses_full_window_at_zoom(self):
        from framework import Camera
        world = make_world()
        actor = world.add(Actor(200, 100, 20, 20, 'actor'))
        camera = Camera(100, 100, zoom=2)
        self.assertEqual(camera.viewport_for(2560, 1440), (1280, 720))
        camera.follow(actor)
        for _ in range(300): camera.update(1 / 60)
        self.assertEqual((camera.x, camera.y), (160, 60))
        for _ in range(20): camera.update(1 / 60)
        self.assertEqual((camera.x, camera.y), (160, 60))

    def test_pixel_alignment_at_two_times_zoom(self):
        from framework.raylib_host import pixel_position
        positions = [pixel_position(100.3, offset, 2) for offset in (10.0, 10.3, 10.6, 10.9)]
        self.assertEqual(positions, [90.5, 90.0, 90.0, 89.5])
        for camera in (10.1, 10.4, 10.7):
            self.assertEqual(pixel_position(140.3, camera, 2) - pixel_position(100.3, camera, 2), 40)

    def test_projectiles_start_beyond_forward_edge_in_all_directions(self):
        world = make_world()
        actor = world.add(Actor(200, 100, 20, 20, 'actor'))
        right = actor.fire(1, 0)
        left = actor.fire(-1, 0)
        down = actor.fire(0, 1)
        up = actor.fire(0, -1)
        self.assertGreaterEqual(right.x, actor.x + actor.width)
        self.assertLessEqual(left.x + left.width, actor.x)
        self.assertGreaterEqual(down.y, actor.y + actor.height)
        self.assertLessEqual(up.y + up.height, actor.y)

    def test_muzzle_does_not_skip_adjacent_wall(self):
        world = make_world([Tile('wall', 'wall', blocks_actors=True, blocks_projectiles=True)])
        world.map[2, 0] = 'wall'
        actor = world.add(Actor(60, 0, 20, 20, 'actor'))
        shot = actor.fire(1, 0, muzzle_offset=50)
        self.assertFalse(shot.alive)
        self.assertEqual(world.projectiles, [])
        self.assertTrue(world.effects)


if __name__ == '__main__':
    unittest.main()
