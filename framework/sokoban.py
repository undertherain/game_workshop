"""Portable, turn-based crate puzzles. No renderer or browser dependencies."""
from types import SimpleNamespace

# Original teaching layouts, ordered from a first push to two-crate planning.
LEVELS = (
    ("First delivery", ["#######", "#     #", "# @$ .#", "#     #", "#######"]),
    ("Two deliveries", ["########", "#      #", "# .  . #", "# $  $ #", "#   @  #", "########"]),
    ("Around the corner", ["########", "#      #", "# .#   #", "#  $ $ #", "#  @ . #", "#      #", "########"]),
)


class Crate:
    def __init__(self, board, x, y):
        self._board, self.x, self.y = board, x, y

    @property
    def on_goal(self):
        return (self.x, self.y) in self._board.goals


class Keeper:
    def __init__(self, game):
        self._game, self.x, self.y = game, 0, 0

    def move(self, dx, dy):
        return self._game.move(dx, dy)


class Board:
    def __init__(self, game):
        self._game, self._level, self.custom = game, 1, False
        self.walls, self.goals = set(), set()
        self.width = self.height = 0
        self.crates = []

    @property
    def level(self):
        return self._level

    @level.setter
    def level(self, value):
        if type(value) is not int or not 1 <= value <= len(LEVELS):
            raise ValueError(f"board.level needs a whole number from 1 to {len(LEVELS)}")
        self.load(LEVELS[value - 1][1])
        self._level, self.custom = value, False

    def load(self, rows):
        if not isinstance(rows, (list, tuple)) or not 3 <= len(rows) <= 8:
            raise ValueError("A puzzle needs 3 to 8 rows of text")
        if not all(isinstance(row, str) for row in rows):
            raise ValueError("Each puzzle row needs to be text")
        width = len(rows[0])
        if not 3 <= width <= 12 or any(len(row) != width for row in rows):
            raise ValueError("Use equal-length rows, each 3 to 12 tiles wide")
        if any(char not in '# .$@*+' for row in rows for char in row):
            raise ValueError("Puzzle tiles are # wall, space floor, $ crate, . goal, @ player, * crate on goal, + player on goal")
        walls, goals, crates, players = set(), set(), [], []
        for y, row in enumerate(rows):
            for x, char in enumerate(row):
                if char == '#': walls.add((x, y))
                if char in '.*+': goals.add((x, y))
                if char in '$*': crates.append((x, y))
                if char in '@+': players.append((x, y))
        if len(players) != 1 or not 1 <= len(crates) <= 8 or len(crates) != len(goals):
            raise ValueError("Use one player and 1 to 8 crates, with one goal for each crate")
        self.width, self.height, self.walls, self.goals = width, len(rows), walls, goals
        self.crates = [Crate(self, x, y) for x, y in crates]
        self._game.player.x, self._game.player.y = players[0]
        self._game.moves = self._game.pushes = 0
        self._game.history = []
        self.custom = True

    def crate_at(self, x, y):
        return next((crate for crate in self.crates if (crate.x, crate.y) == (x, y)), None)

    def is_free(self, x, y):
        return (0 <= x < self.width and 0 <= y < self.height
                and (x, y) not in self.walls and self.crate_at(x, y) is None)

    def all_crates_on_goals(self):
        return all(crate.on_goal for crate in self.crates)


class SokobanGame:
    def __init__(self, source):
        self.ticks = self.moves = self.pushes = 0
        self.history, self.last_keys = [], set()
        self.held_direction, self.held_frames = None, 0
        self.won, self.in_move = False, False
        self.player = Keeper(self)
        self.board = Board(self)
        self.board.level = 1
        self.world = SimpleNamespace(sky='mint', score=0)
        self.scope = {'player': self.player, 'board': self.board, 'world': self.world}
        exec(compile(source, 'my_game.py', 'exec'), self.scope)
        for callback in ('on_key', 'can_push', 'is_complete'):
            if not callable(self.scope.get(callback)):
                raise ValueError(f"Your game needs a {callback} function")
        self.evaluate_goal()

    def evaluate_goal(self):
        result = self.scope['is_complete']()
        if type(result) is not bool:
            raise ValueError('is_complete() must return True or False')
        self.won = result
        self.world.score = sum(crate.on_goal for crate in self.board.crates)

    def move(self, dx, dy):
        if type(dx) is not int or type(dy) is not int or abs(dx) + abs(dy) != 1:
            raise ValueError('player.move(dx, dy) moves one tile: use (1, 0), (-1, 0), (0, 1) or (0, -1)')
        if self.in_move:
            raise ValueError('can_push() checks a move; do not move the player inside it')
        if self.won: return False
        x, y = self.player.x + dx, self.player.y + dy
        if not (0 <= x < self.board.width and 0 <= y < self.board.height) or (x, y) in self.board.walls:
            return False
        crate = self.board.crate_at(x, y)
        if crate:
            self.in_move = True
            try: allowed = self.scope['can_push'](crate, dx, dy)
            finally: self.in_move = False
            if type(allowed) is not bool:
                raise ValueError('can_push(crate, dx, dy) must return True or False')
            if not allowed or not self.board.is_free(x + dx, y + dy): return False
        self.history.append((self.player.x, self.player.y, [(c.x, c.y) for c in self.board.crates], self.moves, self.pushes))
        if len(self.history) > 1000: self.history.pop(0)
        if crate:
            crate.x, crate.y = x + dx, y + dy
            self.pushes += 1
        self.player.x, self.player.y = x, y
        self.moves += 1
        return True

    def undo(self):
        if not self.history: return
        x, y, crates, self.moves, self.pushes = self.history.pop()
        self.player.x, self.player.y = x, y
        for crate, position in zip(self.board.crates, crates): crate.x, crate.y = position
        self.evaluate_goal()

    def step(self, keys):
        pressed = {key for key, value in keys.items() if value}
        if 'jump' in pressed: pressed.add('undo')
        if 'undo' in pressed - self.last_keys:
            self.undo()
            self.held_direction = None
        elif 'next' in pressed - self.last_keys and self.won and not self.board.custom and self.board.level < len(LEVELS):
            self.held_direction = None
            self.board.level += 1
            self.evaluate_goal()
        else:
            direction = next((key for key in ('left', 'right', 'up', 'down') if key in pressed), None)
            self.held_frames = self.held_frames + 1 if direction == self.held_direction else 0
            if direction and (self.held_frames == 0 or self.held_frames >= 10 and self.held_frames % 4 == 2):
                self.scope['on_key'](direction)
                self.evaluate_goal()
            self.held_direction = direction
        self.last_keys = pressed
        self.ticks += 2

    def snapshot(self):
        if self.world.sky not in ('peach', 'lavender', 'mint', 'night'):
            raise ValueError('Choose a sky: "peach", "lavender", "mint", or "night"')
        return {'kind': 'sokoban', 'world': vars(self.world), 'player': {'x': self.player.x, 'y': self.player.y},
                'board': {'width': self.board.width, 'height': self.board.height,
                          'walls': sorted(self.board.walls), 'goals': sorted(self.board.goals),
                          'level': self.board.level, 'levels': len(LEVELS), 'custom': self.board.custom,
                          'title': 'Your puzzle' if self.board.custom else LEVELS[self.board.level - 1][0]},
                'items': [{'x': c.x, 'y': c.y, 'on_goal': c.on_goal} for c in self.board.crates],
                'moves': self.moves, 'pushes': self.pushes, 'can_undo': bool(self.history),
                'can_next': self.won and not self.board.custom and self.board.level < len(LEVELS),
                'collected': sum(c.on_goal for c in self.board.crates), 'won': self.won, 'ticks': self.ticks}
