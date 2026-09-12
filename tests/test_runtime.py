import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / "public"


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.runtime = {}
        exec(compile((ROOT / "runtime.py").read_text(), "runtime.py", "exec"), self.runtime)
        self.code = (ROOT / "starter.py").read_text()

    def load(self, code=None):
        return json.loads(self.runtime["_load_game"](self.code if code is None else code))

    def step(self, **keys):
        return json.loads(self.runtime["_step_game"](json.dumps(keys)))

    def test_move_collect_and_score_customization(self):
        self.load(self.code.replace("world.score += 1", "world.score += 5"))
        for _ in range(8):
            result = self.step(right=True)
        self.assertGreater(result["state"]["player"]["x"], 130)
        self.assertEqual(result["state"]["collected"], 1)
        self.assertEqual(result["state"]["world"]["score"], 5)

    def test_jump_edit_changes_height_and_lands(self):
        heights = []
        for jump in (11, 15):
            self.load(self.code.replace("jump_height = 11", f"jump_height = {jump}"))
            states = [self.step(jump=True)["state"]]
            states.extend(self.step()["state"] for _ in range(45))
            heights.append(min(s["player"]["y"] for s in states))
            self.assertEqual(states[-1]["player"]["y"], 430)
            self.assertTrue(states[-1]["player"]["on_ground"])
        self.assertLess(heights[1], heights[0] - 80)

    def test_lands_on_platform_and_completes(self):
        self.load()
        player = self.runtime["_scope"]["player"]
        player.x, player.y, player.vy = 230, 330, 8
        result = self.step()["state"]
        self.assertEqual(result["player"]["y"], 345)
        for star in self.runtime["_stars"]:
            player.x, player.y = star.x, star.y+20
            self.step()
        self.assertTrue(self.step()["state"]["won"])

    def test_syntax_and_callback_error_lines(self):
        error = self.load(self.code.replace("def update():", "def update()"))["error"]
        self.assertEqual(error["type"], "SyntaxError")
        self.assertEqual(error["line"], 10)
        self.load(self.code.replace("player.x += player.speed", "player.x += unknown_speed"))
        error = self.step(right=True)["error"]
        self.assertEqual(error["type"], "NameError")
        self.assertEqual(error["line"], 12)

    def test_invalid_values_and_costumes(self):
        self.assertIn("error", self.load(self.code.replace("speed = 4", 'speed = "fast"')))
        self.assertIn("error", self.load(self.code.replace('"fox"', '"dragon"')))
        self.assertIn("error", self.load(self.code.replace("gravity = 0.5", 'gravity = float("nan")')))


if __name__ == "__main__":
    unittest.main()
