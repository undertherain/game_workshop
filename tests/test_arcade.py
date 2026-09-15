import json
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "public"


class ArcadeTests(unittest.TestCase):
    def setUp(self):
        self.runtime = {}
        for file in ("runtime.py", "arcade_runtime.py"):
            exec(compile((ROOT / file).read_text(), file, "exec"), self.runtime)

    def source(self, kind):
        return (ROOT / f"{kind}.py").read_text()

    def check(self, source, kind, step):
        return json.loads(self.runtime["_check_exercise"](source, kind, step))

    def movement(self, source, kind):
        who = {"platformer": "player", "breaker": "paddle", "paratroopers": "cannon"}[kind]
        position, speed = ("angle", "turn_speed") if kind == "paratroopers" else ("x", "speed")
        right = f"    if keyboard.right:\n        {who}.{position} += {who}.{speed}"
        left = "" if kind == "breaker" else f"\n    if keyboard.left:\n        {who}.{position} -= {who}.{speed}"
        return source.replace("    pass", right + left)

    def test_prepared_breaker_exercises_only_omit_the_target_mechanic(self):
        for index, name in enumerate(("controls", "mechanic", "score", "variation")):
            lesson = json.loads((ROOT / "content" / "game-lessons" / f"breaker-{name}.json").read_text())
            source = "\n".join(lesson["starter"])
            for mechanic in range(3):
                with self.subTest(exercise=name, mechanic=mechanic):
                    self.assertEqual(self.check(source, "breaker", mechanic)["passed"], mechanic != index)

    def test_breaker_has_left_as_a_working_example(self):
        self.runtime["_load_selected"](self.source("breaker"), "breaker")
        game = self.runtime["_arcade"]
        start = game.paddle.x
        game.step({"left": True})
        self.assertLess(game.paddle.x, start)
        start = game.paddle.x
        game.step({"right": True})
        self.assertEqual(game.paddle.x, start)

    def test_starters_run_but_require_controls(self):
        for kind in ("platformer", "breaker", "paratroopers"):
            source = self.source(kind)
            self.assertIn("state", json.loads(self.runtime["_load_selected"](source, kind)))
            self.assertFalse(self.check(source, kind, 0)["passed"])
            self.assertTrue(self.check(self.movement(source, kind), kind, 0)["passed"])

    def test_partial_movement_gets_specific_feedback(self):
        source = self.source("platformer").replace("    pass", "    if keyboard.right:\n        player.x += 4")
        result = self.check(source, "platformer", 0)
        self.assertFalse(result["passed"])
        self.assertIn("Right works!", result["message"])

    def test_platform_jump_guard_and_scoring_exercises(self):
        source = self.movement(self.source("platformer"), "platformer")
        self.assertFalse(self.check(source, "platformer", 1)["passed"])
        source = source.replace("        player.x -= player.speed", "        player.x -= player.speed\n    if keyboard.jump and player.on_ground:\n        player.vy = -player.jump_height")
        self.assertTrue(self.check(source, "platformer", 1)["passed"])
        self.assertFalse(self.check(source.replace(" and player.on_ground", ""), "platformer", 1)["passed"])
        self.assertFalse(self.check(source, "platformer", 2)["passed"])
        self.assertTrue(self.check(source.replace("    star.hide()", "    world.score += 3\n    star.hide()"), "platformer", 2)["passed"])

    def test_brick_breaker_physics_aim_and_score(self):
        source = self.source("breaker")
        self.runtime["_load_selected"](source, "breaker")
        game = self.runtime["_arcade"]
        game.ball.x, game.ball.y, game.ball.vx, game.ball.vy = 420, 399, 0, 4
        game.step({})
        self.assertLess(game.ball.vy, 0)
        self.assertFalse(self.check(source, "breaker", 1)["passed"])
        source = source.replace("    ball.vy = -abs(ball.vy)", "    ball.vy = -abs(ball.vy)\n    ball.vx = (ball.x - paddle.x) / 12")
        self.assertTrue(self.check(source, "breaker", 1)["passed"])
        source = source.replace("    brick.hide()", "    world.score += 10\n    brick.hide()")
        self.assertTrue(self.check(source, "breaker", 2)["passed"])

    def test_patrol_firing_hit_and_score(self):
        source = self.source("paratroopers")
        self.assertFalse(self.check(source, "paratroopers", 1)["passed"])
        source = source.replace("    pass", "    if keyboard.fire:\n        cannon.fire()")
        self.assertTrue(self.check(source, "paratroopers", 1)["passed"])
        source = source.replace("    target.hide()", "    world.score += 5\n    target.hide()")
        self.assertTrue(self.check(source, "paratroopers", 2)["passed"])
        self.runtime["_load_selected"](source, "paratroopers")
        game = self.runtime["_arcade"]
        game.items[0].x, game.items[0].y = game.cannon.x, 370
        game.step({"jump": True})
        self.assertEqual(game.world.score, 5)
        self.assertFalse(game.items[0].visible)

    def patrol(self):
        source = "\n".join(json.loads((ROOT / "content/games/paratroopers.json").read_text())["complete"])
        self.runtime["_load_selected"](source, "paratroopers")
        return self.runtime["_arcade"]

    def test_patrol_fixed_base_tilt_limits_release_and_restart(self):
        game = self.patrol()
        for direction, limit in (("right", 75), ("left", -75)):
            for _ in range(80):
                game.step({direction: True})
                self.assertEqual(game.cannon.x, 420)
            self.assertEqual(game.cannon.angle, limit)
            game.step({})
            self.assertEqual(game.cannon.angle, limit)
        self.assertEqual(self.patrol().cannon.angle, 0)

    def test_patrol_angled_shots_hit_and_keep_their_original_direction(self):
        for angle in (-55, 0, 55):
            game = self.patrol()
            game.cannon.angle = angle
            dx, dy = math.sin(math.radians(angle)), -math.cos(math.radians(angle))
            target = game.items[0]
            target.x, target.y, target.drift = 420 + dx * 105, 410 + dy * 105, 0
            game.step({"jump": True})
            shot = game.sparks[0]
            self.assertAlmostEqual(shot["x"], 420 + dx * 42)
            self.assertAlmostEqual(shot["y"], 410 + dy * 42)
            self.assertAlmostEqual(math.hypot(shot["vx"], shot["vy"]), 7)
            game.cannon.angle = -angle
            for _ in range(6):
                game.step({"jump": True})
            self.assertFalse(target.visible)
            self.assertEqual(game.world.score, 10)
            self.assertEqual(game.hits, 1)
            self.assertFalse(game.sparks)  # Holding fire does not emit more shots.

    def test_patrol_missed_shots_leave_screen_and_invalid_angles_fail(self):
        game = self.patrol()
        game.cannon.angle = 75
        for target in game.items:
            target.hide()
        game.step({"jump": True})
        for _ in range(80):
            game.step({})
        self.assertFalse(game.sparks)
        game.cannon.angle = float("nan")
        with self.assertRaisesRegex(ValueError, "cannon.angle"):
            game.cannon.fire()

    def cut_parachute(self, game):
        target = game.items[0]
        target.x, target.y, target.drift = 300, 200, 0
        # A shot from the side reaches the canopy without crossing the robot.
        game.sparks.append({"x": 273, "y": 165, "vx": 7, "vy": 0})
        game.step({})
        return target

    def test_patrol_canopy_hit_falls_then_scores_once_at_ground(self):
        game = self.patrol()
        target = self.cut_parachute(game)
        self.assertFalse(target.parachute)
        self.assertTrue(target.visible)
        self.assertFalse(game.sparks)
        self.assertEqual((game.world.score, game.hits, game.misses), (0, 0, 0))
        before_y, before_vy = target.y, target.vy
        game.step({})
        self.assertGreater(target.vy, before_vy)
        self.assertGreater(target.y - before_y, 2 * game.world.fall_speed)
        snapshot = game.snapshot()["items"][0]
        self.assertFalse(snapshot["parachute"])
        for _ in range(80):
            game.step({})
        self.assertFalse(target.visible)
        self.assertEqual((game.world.score, game.hits, game.misses), (10, 1, 0))
        self.assertEqual(game.snapshot()["collected"], 1)

    def test_patrol_falling_body_can_be_hit_without_double_scoring(self):
        game = self.patrol()
        target = self.cut_parachute(game)
        game.sparks.append({"x": target.x, "y": target.y + 8, "vx": 0, "vy": -7})
        game.step({})
        self.assertFalse(target.visible)
        for _ in range(80):
            game.step({})
        self.assertEqual((game.world.score, game.hits), (10, 1))

    def test_patrol_shots_miss_ropes_and_removed_canopies(self):
        game = self.patrol()
        target = game.items[0]
        target.x, target.y, target.drift = 300, 200, 0
        # Between the body and canopy: ropes are not a hit zone.
        game.sparks.append({"x": 300, "y": 183, "vx": 0, "vy": 0})
        game.step({})
        self.assertTrue(target.parachute)
        self.assertTrue(target.visible)
        self.assertEqual(len(game.sparks), 1)
        game.sparks.clear()
        self.cut_parachute(game)
        game.sparks.append({"x": target.x, "y": target.y - 40, "vx": 0, "vy": 0})
        game.step({})
        self.assertEqual(len(game.sparks), 1)
        self.assertEqual(game.world.score, 0)

    def test_patrol_intact_misses_recycle_and_last_crash_wins(self):
        game = self.patrol()
        target = game.items[0]
        target.y = 416
        game.step({})
        self.assertTrue(target.visible and target.parachute)
        self.assertLess(target.y, 0)
        self.assertEqual((game.misses, game.world.score), (1, 0))
        for other in game.items[1:]:
            other.hide()
        target.parachute, target.y, target.vy = False, 412, 8
        game.step({})
        self.assertTrue(game.snapshot()["won"])
        self.assertEqual(game.world.score, 10)
        restarted = self.patrol()
        self.assertTrue(all(item.parachute and item.visible for item in restarted.items))

    def test_framework_example_passes_existing_behavior_checks(self):
        source = (ROOT / "examples/breaker_framework.py").read_text()
        for step in range(3):
            with self.subTest(step=step):
                self.assertTrue(self.check(source, "breaker", step)["passed"])

    def test_framework_objects_use_live_collisions_and_screen_bounds(self):
        source = (ROOT / "examples/breaker_framework.py").read_text()
        loaded = json.loads(self.runtime["_load_selected"](source, "breaker"))
        self.assertIn("state", loaded)
        game = self.runtime["_arcade"]
        positions = [(brick.x, brick.y) for brick in game.items]
        game.paddle.x = game.screen.width
        game.step({"right": True})
        self.assertEqual(game.paddle.x, game.screen.width - 12 - game.paddle.width / 2)
        game.paddle.x = 0
        game.step({"left": True})
        self.assertEqual(game.paddle.x, 12 + game.paddle.width / 2)
        self.assertEqual(positions, [(brick.x, brick.y) for brick in game.items])
        brick = game.items[-1]
        game.ball.x, game.ball.y = brick.x + brick.width / 2, brick.y + brick.height + 9
        game.ball.vx, game.ball.vy = 0, -4
        game.step({})
        self.assertFalse(brick.visible)
        self.assertEqual(game.world.score, brick.points)
        self.assertGreater(game.ball.vy, 0)
        # New object methods must not break the JSON contract used by the renderer.
        snapshot = json.loads(json.dumps(game.snapshot()))
        self.assertEqual(snapshot["collected"], 1)


if __name__ == "__main__":
    unittest.main()
