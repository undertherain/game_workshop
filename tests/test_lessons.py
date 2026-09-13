"""Check real Python command execution and the beginner vocabulary boundary."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('lesson_runtime', Path(__file__).parents[1] / 'public' / 'lesson_runtime.py')
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LessonTests(unittest.TestCase):
    def test_speech_and_calculator_values(self):
        source = '2 + 3\nfox.say("3 + 4")\nusername = "Ola"\nfox.say("Hello " + username)\nfox.say(7 / 2)\nfox.say(5 > 3)\nfox.say("Age: " + str(8))'
        data = json.loads(runtime.run_lesson(source, 'basics'))
        self.assertEqual([a['text'] for a in data['actions']], ['5', '3 + 4', 'Hello Ola', '3.5', 'True', 'Age: 8'])
        counted = json.loads(runtime.run_lesson('for step in range(3):\n    fox.say(step)\nfox.jump()', 'basics'))
        self.assertEqual(counted['actions'], [{'kind': 'say', 'text': str(i)} for i in range(3)] + ['jump'])

    def test_speech_errors_and_limits_recover(self):
        for source, hint in [('fox.say("Hi)', 'quote'), ('fox.say("Age: " + 8)', 'Text and numbers'), ('7 / 0', 'zero'), ('fox.say("a" * 1000)', 'multiplication'), ('fox.say(1000 * 1000 * 1000)', 'smaller'), ('for i in range(6):\n    for step in range(6):\n        fox.say(step)', '12 actions')]:
            with self.subTest(source=source):
                self.assertIn(hint, json.loads(runtime.run_lesson(source, 'basics'))['error'])
        for source in ['fox.say(fox)', 'fox.say(__import__("os"))', 'fox.say("hi".upper())', 'str = 4', 'fox.say(1, 2)', 'fox.say([1, 2])']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'basics')))
        self.assertEqual(json.loads(runtime.run_lesson('fox.say("Back!")', 'basics'))['actions'][0]['text'], 'Back!')

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
        data = json.loads(runtime.run_lesson('world.sky = "night"\ncharacter.costume = "bunny"\ncharacter.jump()', 'style'))
        self.assertEqual(data['world']['sky'], 'night')
        self.assertEqual(data['player']['costume'], 'bunny')
        self.assertEqual(data['actions'], ['jump'])
        self.assertIn('error', json.loads(runtime.run_lesson('world.sky = "unknown"', 'style')))

    def test_event_waits_for_press_and_fires_once_per_press(self):
        data = json.loads(runtime.run_lesson('def on_space_pressed():\n    character.jump()', 'event'))
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
        data = json.loads(runtime.run_lesson('def update():\n    if keyboard.right:\n        character.move()', 'update'))
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
        runtime.run_lesson('def update():\n    character.move()', 'update')
        for source in ['def update(x=character.move()):\n    pass', '@character.jump()\ndef update():\n    pass', 'def other():\n    pass']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'update')))
            self.assertIn('error', json.loads(runtime.step_lesson('{}')))


    def test_basics_evaluates_values_and_precedence(self):
        data = json.loads(runtime.run_lesson('distance = 30 + 20 * 2\nfox.move(distance)\nfox.move((30 + 20) * 2)\nfox.move(-50)', 'basics'))
        self.assertEqual([a['distance'] for a in data['actions']], [70, 100, -50])
        self.assertTrue(data['features']['expression'])
        self.assertTrue(data['features']['assignment'])

    def test_defining_does_not_run_and_calls_reuse_parameters(self):
        source = 'def travel(distance):\n    fox.move(distance)\n    fox.jump()'
        self.assertEqual(json.loads(runtime.run_lesson(source, 'basics'))['actions'], [])
        data = json.loads(runtime.run_lesson(source + '\ntravel(30)\nfox.move(80)\ntravel(40 + 10)', 'basics'))
        self.assertEqual(data['actions'], [{'kind': 'move', 'distance': 30}, 'jump', {'kind': 'move', 'distance': 80}, {'kind': 'move', 'distance': 50}, 'jump'])
        self.assertTrue(data['features']['parameter'])
        data = json.loads(runtime.run_lesson(source + '\nfor i in range(3):\n    travel(i * 20)', 'basics'))
        self.assertEqual([a['distance'] for a in data['actions'] if isinstance(a, dict)], [0, 20, 40])

    def test_conditions_include_boundary_and_else(self):
        for distance, expected in [(40, ['move']), (50, ['move']), (80, ['jump'])]:
            data = json.loads(runtime.run_lesson(f'distance = {distance}\nif distance > 50:\n    fox.jump()\nelse:\n    fox.move(distance)', 'basics'))
            self.assertEqual([a if isinstance(a, str) else a['kind'] for a in data['actions']], expected)
        data = json.loads(runtime.run_lesson('if 50 >= 50:\n    fox.jump()', 'basics'))
        self.assertEqual(data['actions'], ['jump'])

    def test_basics_rejects_unsafe_or_undefined_programs(self):
        sources = [
            'fox.move(missing)', 'fox.move(301)', 'fox.move(1000 * 1000)',
            'fox = 3', 'range = 2', '__secret = 3', 'import os',
            'while True:\n    fox.jump()',
            'def dance():\n    dance()\ndance()',
            'def one():\n    two()\ndef two():\n    one()\none()',
            'def dance(x=1):\n    fox.jump()',
            'def dance(x):\n    fox.move(x)\ndance()',
            'def dance():\n    fox.jump()\ndance = 2',
            'def dance():\n    fox.jump()\nfor i in range(6):\n    for j in range(6):\n        dance()',
        ]
        for source in sources:
            with self.subTest(source=source):
                self.assertIn('error', json.loads(runtime.run_lesson(source, 'basics')))
        self.assertEqual(json.loads(runtime.run_lesson('fox.move(20)', 'basics'))['actions'][0]['distance'], 20)
