"""Check real Python command execution and the beginner vocabulary boundary."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('lesson_runtime', Path(__file__).parents[1] / 'public' / 'lesson_runtime.py')
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LessonTests(unittest.TestCase):
    def test_commands_keep_order(self):
        for source, expected in [('fox.jump()', ['jump']), ('fox.move()\nfox.jump()', ['move', 'jump']), ('fox.jump()\nfox.jump()', ['jump', 'jump'])]:
            self.assertEqual(json.loads(runtime.run_lesson(source))['actions'], expected)

    def test_rejects_unknown_or_unbounded_code(self):
        for source in ['', 'fox.jump', 'fox.fly()', 'fox.jump(3)', 'while True: fox.jump()', '__import__("os")', 'fox.__class__()', 'fox.jump()\nfox.move()\nfox.jump()', 'fox.jump(']:
            with self.subTest(source=source):
                self.assertIn('error', json.loads(runtime.run_lesson(source)))

    def test_loop_executes_body_and_is_bounded(self):
        data = json.loads(runtime.run_lesson('for step in range(3):\n    fox.jump()', 'loop'))
        self.assertEqual(data['actions'], ['jump'] * 3)
        self.assertTrue(data['features']['loop'])
        for source in ['for i in range(100):\n    fox.jump()', 'for i in range(6):\n    for step in range(6):\n        fox.jump()', 'while True:\n    fox.jump()']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'loop')))

    def test_properties_change_scene_and_reject_unknown_values(self):
        data = json.loads(runtime.run_lesson('world.sky = "night"\nfox.costume = "bunny"\nfox.jump()', 'style'))
        self.assertEqual(data['world']['sky'], 'night')
        self.assertEqual(data['player']['costume'], 'bunny')
        self.assertEqual(data['actions'], ['jump'])
        self.assertIn('error', json.loads(runtime.run_lesson('world.sky = "unknown"', 'style')))

    def test_event_waits_for_press_and_fires_once_per_press(self):
        data = json.loads(runtime.run_lesson('def on_space_pressed():\n    fox.jump()', 'event'))
        self.assertNotIn('error', data)
        self.assertEqual(data['player']['y'], 430)
        idle = json.loads(runtime.step_lesson('{}'))
        self.assertEqual(idle['player']['y'], 430)
        jumped = json.loads(runtime.step_lesson('{"space":true}'))
        self.assertLess(jumped['player']['y'], 430)
        self.assertEqual(jumped['eventCalls'], 1)
        held = json.loads(runtime.step_lesson('{"space":true}'))
        self.assertEqual(held['eventCalls'], 1)
        for _ in range(40):
            landed = json.loads(runtime.step_lesson('{}'))
        self.assertEqual(landed['player']['y'], 430)
        self.assertTrue(json.loads(runtime.step_lesson('{"space":true}'))['changed'])

    def test_update_runs_repeatedly_but_movement_requires_right(self):
        data = json.loads(runtime.run_lesson('def update():\n    if keyboard.right:\n        fox.move()', 'update'))
        self.assertNotIn('error', data)
        start = data['player']['x']
        for _ in range(3):
            idle = json.loads(runtime.step_lesson('{}'))
        self.assertEqual(idle['player']['x'], start)
        for _ in range(3):
            moving = json.loads(runtime.step_lesson('{"right":true}'))
        self.assertEqual(moving['player']['x'], start + 12)
        stopped = json.loads(runtime.step_lesson('{}'))
        self.assertEqual(stopped['player']['x'], moving['player']['x'])
        self.assertEqual(stopped['ticks'], 7)

    def test_pass_does_not_claim_a_working_event(self):
        runtime.run_lesson('def on_space_pressed():\n    pass', 'event')
        self.assertFalse(json.loads(runtime.step_lesson('{"space":true}'))['changed'])

    def test_drawing_uses_loop_values_and_checks_coordinates(self):
        data = json.loads(runtime.run_lesson('for i in range(3):\n    dot(100 + i * 60, 240)\nline(0, 0, 840, 480)', 'drawing'))
        self.assertEqual([s['points'] for s in data['shapes'][:3]], [[100, 240], [160, 240], [220, 240]])
        self.assertEqual(data['shapes'][3]['kind'], 'line')
        for source in ['dot(900, 0)', 'line(0, 0)', 'dot(1/0, 0)', 'dot(__import__("os"), 0)']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'drawing')))

    def test_bad_load_clears_old_rule_and_rejects_function_defaults(self):
        runtime.run_lesson('def update():\n    fox.move()', 'update')
        for source in ['def update(x=fox.move()):\n    pass', '@fox.jump()\ndef update():\n    pass', 'def other():\n    pass']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'update')))
            self.assertIn('error', json.loads(runtime.step_lesson('{}')))
