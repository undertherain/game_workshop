import json
from collections import deque
from pathlib import Path
import unittest
from framework import WorkshopGame
from framework.sokoban import LEVELS
from framework.workshop_checks import check_exercise

PUBLIC = Path(__file__).resolve().parents[1] / 'public'
SOURCE = '\n'.join(json.loads((PUBLIC / 'content/games/sokoban.json').read_text())['complete'])
DIRECTIONS = {'left':(-1,0), 'right':(1,0), 'up':(0,-1), 'down':(0,1)}


def solution(board, start, boxes):
    """Independent breadth-first search verifies that the original rooms can be solved."""
    goals, walls = set(map(tuple, board['goals'])), set(map(tuple, board['walls']))
    start = (start, frozenset(boxes))
    queue, seen = deque([(start, [])]), {start}
    while queue:
        (player, crates), route = queue.popleft()
        if crates == goals: return route
        for key, (dx, dy) in DIRECTIONS.items():
            target = (player[0]+dx, player[1]+dy)
            if not (0 <= target[0] < board['width'] and 0 <= target[1] < board['height']) or target in walls: continue
            moved = crates
            if target in crates:
                beyond = (target[0]+dx,target[1]+dy)
                if not (0 <= beyond[0] < board['width'] and 0 <= beyond[1] < board['height']) or beyond in walls or beyond in crates: continue
                moved = frozenset((crates-{target})|{beyond})
            state = (target, moved)
            if state not in seen:
                seen.add(state); queue.append((state, route+[key]))
    return None


class SokobanTests(unittest.TestCase):
    def tap(self, game, key):
        game.step({key:True})
        return game.step({})

    def test_all_original_rooms_are_solvable_through_real_key_inputs(self):
        for level in range(1,len(LEVELS)+1):
            game = WorkshopGame(SOURCE.replace('board.level = 1',f'board.level = {level}'),'sokoban')
            s=game.snapshot()
            route=solution(s['board'],(s['player']['x'],s['player']['y']),[(b['x'],b['y']) for b in s['items']])
            self.assertIsNotNone(route,level)
            for key in route: state=self.tap(game,key)
            self.assertTrue(state['won'],level)
            self.assertEqual(state['collected'],len(state['items']))
            self.assertEqual(state['moves'],len(route))

    def test_push_undo_win_and_next_level(self):
        game=WorkshopGame(SOURCE,'sokoban')
        initial=game.snapshot()
        first=self.tap(game,'right')
        self.assertEqual(first['items'][0]['x'],4)
        self.assertFalse(first['won'])
        self.assertEqual(first['pushes'],1)
        won=self.tap(game,'right')
        self.assertTrue(won['won']);self.assertTrue(won['can_next'])
        undone=self.tap(game,'undo')
        self.assertFalse(undone['won']);self.assertEqual(undone['items'],first['items'])
        self.assertEqual(undone['moves'],1)
        self.tap(game,'undo')
        self.assertEqual(game.snapshot()['player'],initial['player'])
        self.assertEqual(game.snapshot()['moves'],0)
        self.tap(game,'right');self.tap(game,'right')
        next_room=self.tap(game,'next')
        self.assertEqual(next_room['board']['level'],2)
        self.assertFalse(next_room['won']);self.assertFalse(next_room['can_undo'])

    def test_no_diagonals_walls_double_pushes_or_pulling(self):
        game=WorkshopGame(SOURCE,'sokoban');sim=game.simulation
        for delta in [(1,1),(2,0),(0,0),(True,0)]:
            with self.assertRaises(ValueError): sim.player.move(*delta)
        sim.board.load(['########','#      #','# @$$..#','#      #','########'])
        sim.evaluate_goal()
        before=game.snapshot()
        self.tap(game,'right')
        self.assertEqual(game.snapshot()['player'],before['player'])
        self.assertEqual(game.snapshot()['moves'],0)
        self.tap(game,'left');self.tap(game,'left')
        self.assertEqual(game.snapshot()['player']['x'],1)
        self.assertEqual(game.snapshot()['items'],before['items'])
        # User predicates cannot push a crate through a wall.
        sim.board.load(['#######','# @$#.#','#     #','#######'])
        sim.scope['can_push']=lambda *args: True
        self.tap(game,'right')
        self.assertEqual(game.snapshot()['moves'],0)

    def test_held_keys_repeat_slowly_and_release_clears_movement(self):
        game=WorkshopGame(SOURCE,'sokoban')
        game.simulation.board.load(['###########','#@     $ .#','#         #','###########'])
        self.assertEqual(game.step({'right':True})['moves'],1)
        for _ in range(8): self.assertEqual(game.step({'right':True})['moves'],1)
        game.step({'right':True})
        self.assertEqual(game.step({'right':True})['moves'],2)
        stopped=game.step({})['moves']
        for _ in range(20): self.assertEqual(game.step({})['moves'],stopped)

    def test_invalid_maps_and_return_values_have_helpful_errors(self):
        game=WorkshopGame(SOURCE,'sokoban')
        invalid=[[],['###','##','###'],['###','#@#','###'],['#####','#@@$#','# . #','#####'],['#####','#@?.#','#####']]
        for rows in invalid:
            with self.assertRaises(ValueError): game.simulation.board.load(rows)
        with self.assertRaisesRegex(ValueError,'is_complete.*True or False'):
            WorkshopGame(SOURCE.replace('return board.all_crates_on_goals()','return 1'),'sokoban')
        bad=WorkshopGame(SOURCE.replace('return board.is_free(crate.x + dx, crate.y + dy)','return None'),'sokoban')
        with self.assertRaisesRegex(ValueError,'can_push.*True or False'): self.tap(bad,'right')

    def test_custom_board_is_authored_in_python_and_retained_on_restart(self):
        content=json.loads((PUBLIC/'content/game-lessons/sokoban-variation.json').read_text())
        source='\n'.join(content['starter'])
        game=WorkshopGame(source,'sokoban');initial=game.snapshot()
        self.assertTrue(initial['board']['custom'])
        self.tap(game,'right');self.tap(game,'right')
        self.assertTrue(game.snapshot()['won']);self.assertFalse(game.snapshot()['can_next'])
        self.assertEqual(WorkshopGame(source,'sokoban').snapshot(),initial)

    def test_exercise_checks_detect_missing_and_incorrect_rules(self):
        for step, suffix in enumerate(('controls','pushing','goals')):
            content=json.loads((PUBLIC/f'content/game-lessons/sokoban-{suffix}.json').read_text())
            self.assertFalse(json.loads(check_exercise('\n'.join(content['starter']),'sokoban',step))['passed'])
            self.assertTrue(json.loads(check_exercise(SOURCE,'sokoban',step))['passed'])
        always_win=SOURCE.replace('return board.all_crates_on_goals()','return True')
        self.assertFalse(json.loads(check_exercise(always_win,'sokoban',2))['passed'])
        always_push=SOURCE.replace('return board.is_free(crate.x + dx, crate.y + dy)','return True')
        self.assertFalse(json.loads(check_exercise(always_push,'sokoban',1))['passed'])
