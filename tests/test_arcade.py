import json
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
        right = f"    if keyboard.right:\n        {who}.x += {who}.speed"
        left = "" if kind == "breaker" else f"\n    if keyboard.left:\n        {who}.x -= {who}.speed"
        return source.replace("    pass", right + left)

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
