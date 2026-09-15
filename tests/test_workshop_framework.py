import json
from pathlib import Path
import unittest

from framework import WorkshopGame
from framework.workshop_checks import check_exercise

PUBLIC = Path(__file__).resolve().parents[1] / 'public'


class WorkshopFrameworkTests(unittest.TestCase):
    def source(self, kind):
        if kind == 'platformer':
            return (PUBLIC / 'starter.py').read_text()
        if kind == 'breaker':
            return (PUBLIC / 'examples/breaker_framework.py').read_text()
        return (PUBLIC / 'paratroopers.py').read_text().replace(
            '    pass', '    if keyboard.right:\n        cannon.x += cannon.speed\n    if keyboard.fire:\n        cannon.fire()')

    def test_sessions_and_checks_cannot_change_another_game(self):
        for kind in WorkshopGame.kinds:
            with self.subTest(kind=kind):
                source = self.source(kind)
                first, second = WorkshopGame(source, kind), WorkshopGame(source, kind)
                initial = second.snapshot()
                old = first.snapshot()
                for _ in range(12):
                    first.step({'right': True, 'jump': True})
                self.assertEqual(second.snapshot(), initial)
                self.assertEqual(old, initial)
                before_check = first.snapshot()
                json.loads(check_exercise(source, kind, 0))
                self.assertEqual(first.snapshot(), before_check)
                self.assertEqual(before_check['ticks'], 24)
                self.assertEqual(first.snapshot(), json.loads(json.dumps(first.snapshot())))

    def test_same_input_replays_exactly_and_restart_resets(self):
        for kind in WorkshopGame.kinds:
            with self.subTest(kind=kind):
                source = self.source(kind)
                first, second = WorkshopGame(source, kind), WorkshopGame(source, kind)
                initial = first.snapshot()
                for keys in [{}, {'right': True}, {'jump': True}, {'jump': True}, {}, {'left': True}] * 30:
                    self.assertEqual(first.step(keys), second.step(keys))
                self.assertEqual(WorkshopGame(source, kind).snapshot(), initial)

    def test_rejects_unknown_kind_and_preserves_source_error_lines(self):
        with self.assertRaises(ValueError):
            WorkshopGame('', 'unknown')
        with self.assertRaises(SyntaxError) as raised:
            WorkshopGame('def update()\n    pass', 'breaker')
        self.assertEqual(raised.exception.filename, 'my_game.py')
        self.assertEqual(raised.exception.lineno, 1)
