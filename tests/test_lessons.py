"""Check real Python command execution and the beginner vocabulary boundary."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('lesson_runtime', Path(__file__).parents[1] / 'public' / 'lesson_runtime.py')
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LessonTests(unittest.TestCase):
    def test_jump_design_bounds_and_recovery(self):
        for height in (40, 100, 180):
            data = json.loads(runtime.run_lesson(f'fox.jump({height})', 'jump-design'))
            self.assertFalse(data['interactive'])
            self.assertEqual(data['actions'], [{'kind': 'jump', 'height': height}])
        for value in ('39', '181', '-40', '0', '100.5', 'True', '"100"', '1e309', '100 + 1'):
            data = json.loads(runtime.run_lesson(f'fox.jump({value})', 'jump-design'))
            self.assertIn('40 to 180', data['error'])
        for source in ('fox.y = 100', 'fox.jump_height = 100', 'fox.jump(100)\nfox.jump(100)', 'pass'):
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'jump-design')))
        self.assertEqual(json.loads(runtime.run_lesson('fox.jump(100)', 'jump-design'))['actions'][0]['height'], 100)

    def test_robot_square_preserves_positions_and_turns_in_order(self):
        source = 'for side in range(4):\n    robot.move(3)\n    robot.turn_right()'
        data = json.loads(runtime.run_lesson(source, 'robot'))
        self.assertNotIn('error', data)
        self.assertEqual(data['robot'], {'x': 1, 'y': 1, 'turns': 4})
        self.assertEqual([(a['to']['x'], a['to']['y']) for a in data['actions'][::2]],
                         [(4, 1), (4, 4), (1, 4), (1, 1)])
        self.assertEqual(data['actions'][0]['from'], {'x': 1, 'y': 1, 'turns': 0})
        self.assertTrue(data['features']['loop'])
        short = json.loads(runtime.run_lesson(source.replace('range(4)', 'range(3)'), 'robot'))
        self.assertEqual(short['robot'], {'x': 1, 'y': 4, 'turns': 3})

    def test_robot_boundaries_limits_and_recovery(self):
        for source in ['robot.move(5)', 'robot.move(1.5)', 'robot.move(True)', 'robot.move(-1)',
                       'robot.move(0)', 'robot.fly()', 'robot.x = 4', 'fox.move()',
                       'while True: robot.turn_right()',
                       'for side in range(6):\n    for step in range(6):\n        robot.turn_right()']:
            with self.subTest(source=source):
                self.assertIn('error', json.loads(runtime.run_lesson(source, 'robot')))
        recovered = json.loads(runtime.run_lesson('robot.move(1)', 'robot'))
        self.assertEqual(recovered['robot'], {'x': 2, 'y': 1, 'turns': 0})
        self.assertIn('error', json.loads(runtime.run_lesson('robot.move(1)', 'basics')))

    def test_boolean_variables_and_skipped_blocks(self):
        for guess, expected in [(30, ['True', 'Too low!', 'Checked']), (42, ['False', 'Checked']), (60, ['False', 'Checked'])]:
            source = f'secret = 42\nguess = {guess}\ntoo_low = guess < secret\nprint(too_low)\nif too_low:\n    print("Too low!")\nprint("Checked")'
            data = json.loads(runtime.run_lesson(source, 'basics'))
            self.assertEqual([a['text'] for a in data['actions']], expected)
            self.assertTrue(data['features']['comparison'])
        for value, expected in [('True', ['yes']), ('False', [])]:
            data = json.loads(runtime.run_lesson(f'if {value}:\n    print("yes")', 'basics'))
            self.assertEqual([a['text'] for a in data['actions']], expected)

    def test_guessing_branches_and_endpoint_comparisons(self):
        lesson = json.loads((Path(__file__).parents[1] / 'public/content/lessons/guess-branches.json').read_text())
        for secret in [1, 42, 73, 100]:
            for guess in [1, secret - 1, secret, secret + 1, 100]:
                source = '\n'.join(lesson['starter']).replace('secret = 42', f'secret = {secret}').replace('guess = 60', f'guess = {guess}')
                data = json.loads(runtime.run_lesson(source, 'basics'))
                expected = 'Too low!' if guess < secret else 'Too high!' if guess > secret else 'You found it!'
                self.assertEqual([a['text'] for a in data['actions']], [expected])
        data = json.loads(runtime.run_lesson('100 < 100\n100 <= 100\n1 >= 1\n42 != 42', 'basics'))
        self.assertEqual([a['text'] for a in data['actions']], ['False', 'True', 'True', 'False'])

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
        data = json.loads(runtime.run_lesson('for i in range(3):\n    pixel(1 + i, 2)\nline(0, 0, 7, 3)', 'drawing'))
        self.assertEqual([s['pixels'] for s in data['shapes'][:3]], [[[1, 2]], [[2, 2]], [[3, 2]]])
        self.assertEqual(data['shapes'][3]['kind'], 'line')
        self.assertEqual(data['shapes'][3]['pixels'], [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [5, 2], [6, 3], [7, 3]])
        for source in ['pixel(8, 0)', 'pixel(0, 5)', 'pixel(-1, 0)', 'pixel(1.5, 0)', 'line(0, 0, 8, 4)', 'line(0, 0)', 'pixel(1/0, 0)', 'pixel(__import__("os"), 0)', 'dot(2, 1)']:
            self.assertIn('error', json.loads(runtime.run_lesson(source, 'drawing')))
        self.assertEqual(json.loads(runtime.run_lesson('pixel(6/2, 4)', 'drawing'))['shapes'][0]['pixels'], [[3, 4]])
        excessive = 'for i in range(6):\n    for step in range(6):\n        for side in range(6):\n            pixel(0, 0)'
        self.assertIn('100 shapes', json.loads(runtime.run_lesson(excessive, 'drawing'))['error'])

    def test_pixel_lines_cover_all_directions_endpoints_and_nearest_cells(self):
        for x1 in range(8):
            for y1 in range(5):
                for x2 in range(8):
                    for y2 in range(5):
                        data = json.loads(runtime.run_lesson(f'line({x1}, {y1}, {x2}, {y2})', 'drawing'))
                        pixels = data['shapes'][0]['pixels']
                        dx, dy = x2 - x1, y2 - y1
                        self.assertEqual(pixels[0], [x1, y1])
                        self.assertEqual(pixels[-1], [x2, y2])
                        self.assertEqual(len(pixels), max(abs(dx), abs(dy)) + 1)
                        self.assertEqual(len({tuple(p) for p in pixels}), len(pixels))
                        for x, y in pixels:
                            self.assertTrue(0 <= x < 8 and 0 <= y < 5)
                            # At most half a cell from the ideal line on the minor axis.
                            if abs(dx) >= abs(dy) and dx:
                                self.assertLessEqual(abs((y - y1) * dx - (x - x1) * dy) * 2, abs(dx))
                            elif dy:
                                self.assertLessEqual(abs((x - x1) * dy - (y - y1) * dx) * 2, abs(dy))
                        for a, b in zip(pixels, pixels[1:]):
                            self.assertEqual(max(abs(a[0] - b[0]), abs(a[1] - b[1])), 1)
        tie = json.loads(runtime.run_lesson('line(0, 0, 2, 1)', 'drawing'))
        self.assertEqual(tie['shapes'][0]['pixels'], [[0, 0], [1, 1], [2, 1]])

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
