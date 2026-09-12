"""Small game API. Coordinates use the actor's feet, y increases downwards."""
import json
import math
import traceback
from types import SimpleNamespace


class Actor:
    def __init__(self, costume="fox", x=80, y=430):
        self.costume, self.x, self.y = costume, x, y
        self.speed, self.jump_height = 4, 11
        self.vy, self.on_ground, self.facing = 0, True, 1


class Star:
    def __init__(self, x, y):
        self.x, self.y, self.visible = x, y, True

    def hide(self):
        self.visible = False


PLATFORMS = [(0, 430, 840), (195, 345, 125), (400, 265, 130), (620, 345, 125)]
_scope = {}
_stars = []
_ticks = 0
_last_jump = False


def _error(exc):
    line = getattr(exc, "lineno", None)
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == "my_game.py":
            line = frame.lineno
    return {"type": type(exc).__name__, "message": str(exc)[:800], "line": line}


def _snapshot():
    player, world = _scope["player"], _scope["world"]
    for name, value in [("player.x", player.x), ("player.y", player.y),
                        ("player.vy", player.vy), ("player.speed", player.speed),
                        ("player.jump_height", player.jump_height),
                        ("world.gravity", world.gravity), ("world.score", world.score)]:
        if not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > 100000:
            raise ValueError(f"{name} needs to be a finite number between -100000 and 100000")
    if player.costume not in ("fox", "cat", "bunny"):
        raise ValueError('Choose a costume: "fox", "cat", or "bunny"')
    if world.sky not in ("peach", "lavender", "mint", "night"):
        raise ValueError('Choose a sky: "peach", "lavender", "mint", or "night"')
    return {"player": vars(player), "world": vars(world),
            "stars": [vars(s) for s in _stars], "platforms": PLATFORMS,
            "collected": sum(not s.visible for s in _stars),
            "won": all(not s.visible for s in _stars), "ticks": _ticks}


def _load_game(source):
    global _scope, _stars, _ticks, _last_jump
    _ticks, _last_jump = 0, False
    _stars = [Star(x, y) for x, y in [(145, 400), (230, 312), (292, 312),
                                    (435, 232), (498, 232), (655, 312), (715, 312)]]
    _scope = {"Actor": Actor, "world": SimpleNamespace(gravity=0.5, sky="peach", score=0),
              "keyboard": SimpleNamespace(left=False, right=False, jump=False)}
    try:
        exec(compile(source, "my_game.py", "exec"), _scope)
        if not isinstance(_scope.get("player"), Actor):
            raise ValueError('Your game needs a player, like player = Actor("fox", x=80, y=430)')
        for callback in ("update", "on_collect"):
            if not callable(_scope.get(callback)):
                raise ValueError(f"Your game needs a {callback} function")
        return json.dumps({"state": _snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})


def _step_game(keys_json):
    global _ticks, _last_jump
    try:
        keys = json.loads(keys_json)
        player, world, keyboard = _scope["player"], _scope["world"], _scope["keyboard"]
        # Two fixed 60 Hz steps per displayed frame, independent of computer speed.
        for substep in range(2):
            keyboard.left, keyboard.right = bool(keys.get("left")), bool(keys.get("right"))
            keyboard.jump = bool(keys.get("jump")) and not _last_jump and substep == 0
            old_x, old_y = player.x, player.y
            _scope["update"]()
            _snapshot()  # Reject invalid user values before physics uses them.
            if player.x != old_x:
                player.facing = 1 if player.x > old_x else -1
            player.x = max(20, min(820, player.x))
            player.vy += world.gravity
            player.y += player.vy
            player.on_ground = False
            if player.vy >= 0:
                for x, y, width in sorted(PLATFORMS, key=lambda p: p[1]):
                    if x - 10 <= player.x <= x + width + 10 and old_y <= y <= player.y:
                        player.y, player.vy, player.on_ground = y, 0, True
                        break
            if player.y > 540 or player.y < -400:
                player.x, player.y, player.vy = 80, 430, 0
            for star in _stars:
                if star.visible and abs(player.x-star.x) < 25 and abs(player.y-20-star.y) < 32:
                    _scope["on_collect"](star)
            _ticks += 1
        _last_jump = bool(keys.get("jump"))
        return json.dumps({"state": _snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})
