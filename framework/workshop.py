"""Small game API. Coordinates use the actor's feet, y increases downwards."""
import json
import math
import traceback
from types import SimpleNamespace
from .sokoban import SokobanGame


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


def _error(exc):
    line = getattr(exc, "lineno", None)
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == "my_game.py":
            line = frame.lineno
    return {"type": type(exc).__name__, "message": str(exc)[:800], "line": line}


class PlatformGame:
    def snapshot(self):
        player, world = self.scope["player"], self.scope["world"]
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
                "stars": [vars(s) for s in self.stars], "platforms": PLATFORMS,
                "collected": sum(not s.visible for s in self.stars),
                "won": all(not s.visible for s in self.stars), "ticks": self.ticks}


    def __init__(self, source):
        self.ticks, self.last_jump = 0, False
        self.stars = [Star(x, y) for x, y in [(145, 400), (230, 312), (292, 312),
                                          (435, 232), (498, 232), (655, 312), (715, 312)]]
        self.scope = {"Actor": Actor, "world": SimpleNamespace(gravity=0.5, sky="peach", score=0),
                      "keyboard": SimpleNamespace(left=False, right=False, jump=False)}
        exec(compile(source, "my_game.py", "exec"), self.scope)
        if not isinstance(self.scope.get("player"), Actor):
            raise ValueError('Your game needs a player, like player = Actor("fox", x=80, y=430)')
        for callback in ("update", "on_collect"):
            if not callable(self.scope.get(callback)):
                raise ValueError(f"Your game needs a {callback} function")

    def step(self, keys):
        player, world, keyboard = self.scope["player"], self.scope["world"], self.scope["keyboard"]
        # Two fixed 60 Hz steps per displayed frame, independent of computer speed.
        for substep in range(2):
            keyboard.left, keyboard.right = bool(keys.get("left")), bool(keys.get("right"))
            keyboard.jump = bool(keys.get("jump")) and not self.last_jump and substep == 0
            old_x, old_y = player.x, player.y
            self.scope["update"]()
            self.snapshot()  # Reject invalid user values before physics uses them.
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
            for star in self.stars:
                if star.visible and abs(player.x-star.x) < 25 and abs(player.y-20-star.y) < 32:
                    self.scope["on_collect"](star)
            self.ticks += 1
        self.last_jump = bool(keys.get("jump"))


class Item:
    def __init__(self, **values):
        self.__dict__.update(values)
        self.visible = True

    def hide(self):
        self.visible = False


class StaticScreen:
    """The current fixed, non-scrolling 840 × 480 playfield."""

    width = 840
    height = 480


class Brick(Item):
    """A stationary obstacle: the simulation never moves it."""


class Paddle:
    """Horizontal movement, measured in pixels per simulation tick (60 Hz)."""

    def __init__(self, x=420, width=110, speed=6):
        self.x, self.width, self.speed = x, width, speed

    def move(self, distance):
        self.x += distance

    def move_left(self):
        self.move(-self.speed)

    def move_right(self):
        self.move(self.speed)


class Ball:
    def __init__(self, x=420, y=370, vx=3, vy=-4):
        self.x, self.y, self.vx, self.vy = x, y, vx, vy

    def bounce_up(self):
        self.vy = -abs(self.vy)


class Cannon:
    def __init__(self, game):
        self.x, self.speed, self._game = 420, 5, game

    def fire(self):
        if self._game.cooldown <= 0:
            self._game.sparks.append({"x": self.x, "y": 401})
            self._game.cooldown = 12


class ArcadeGame:
    def __init__(self, source, kind):
        self.kind, self.ticks, self.last_action, self.cooldown = kind, 0, False, 0
        self.sparks, self.hits, self.misses, self.bounces = [], 0, 0, 0
        self.world = SimpleNamespace(sky="night" if kind == "breaker" else "mint", score=0, fall_speed=0.7)
        self.keyboard = SimpleNamespace(left=False, right=False, jump=False, fire=False)
        self.screen = StaticScreen()
        self.paddle = Paddle()
        self.ball = Ball()
        self.cannon = Cannon(self)
        if kind == "breaker":
            self.items = [Brick(x=83+c*98, y=87+r*29, width=88, height=19, row=r)
                          for r in range(4) for c in range(7)]
        else:
            self.items = [Item(x=75+i*95, y=-55-(i%4)*85, drift=0.2 if i%2 else -0.2)
                          for i in range(8)]
        self.scope = {"world": self.world, "keyboard": self.keyboard,
                      "paddle": self.paddle, "ball": self.ball, "cannon": self.cannon}
        if kind == "breaker":
            self.scope.update(screen=self.screen, bricks=self.items)
        exec(compile(source, "my_game.py", "exec"), self.scope)
        required = ("update", "on_paddle", "on_break") if kind == "breaker" else ("update", "on_hit")
        for callback in required:
            if not callable(self.scope.get(callback)):
                raise ValueError(f"Your game needs a {callback} function")
        self.validate()

    def validate(self):
        values = {"world.score": self.world.score, "world.fall_speed": self.world.fall_speed}
        objects = [("paddle", self.paddle), ("ball", self.ball)] if self.kind == "breaker" else [("cannon", self.cannon)]
        for name, obj in objects:
            values.update({f"{name}.{key}": value for key, value in vars(obj).items() if not key.startswith("_")})
        for name, value in values.items():
            if not isinstance(value, (int, float)) or not math.isfinite(value) or abs(value) > 100000:
                raise ValueError(f"{name} needs to be a finite number")
        if self.world.sky not in ("peach", "lavender", "mint", "night"):
            raise ValueError('Choose a sky: "peach", "lavender", "mint", or "night"')
        if self.kind == "breaker":
            if not 20 <= self.paddle.width <= 400:
                raise ValueError("paddle.width should be between 20 and 400")
            if abs(self.ball.vx) > 15 or abs(self.ball.vy) > 15:
                raise ValueError("Try a ball speed between -15 and 15 so it can find the bricks")
        elif not 0 < self.world.fall_speed <= 5:
            raise ValueError("Try a world.fall_speed greater than 0 and up to 5")

    def snapshot(self):
        self.validate()
        return {"kind": self.kind, "world": vars(self.world), "paddle": vars(self.paddle),
                "ball": vars(self.ball), "cannon": {"x": self.cannon.x, "speed": self.cannon.speed},
                "items": [vars(i) for i in self.items], "sparks": self.sparks,
                "hits": self.hits, "misses": self.misses, "bounces": self.bounces,
                "collected": sum(not i.visible for i in self.items), "won": all(not i.visible for i in self.items),
                "ticks": self.ticks}

    def step(self, keys):
        for substep in range(2):
            action = bool(keys.get("jump")) and not self.last_action and substep == 0
            self.keyboard.left, self.keyboard.right = bool(keys.get("left")), bool(keys.get("right"))
            self.keyboard.jump, self.keyboard.fire = action, action
            self.scope["update"]()
            self.validate()
            if self.kind == "breaker":
                self.step_breaker(action)
            else:
                self.step_patrol()
            self.ticks += 1
        self.last_action = bool(keys.get("jump"))

    def step_breaker(self, reset):
        paddle, ball = self.paddle, self.ball
        paddle.x = max(paddle.width/2+12, min(self.screen.width-12-paddle.width/2, paddle.x))
        if reset:
            ball.x, ball.y, ball.vy = paddle.x, 380, -max(2, abs(ball.vy))
        old_y = ball.y
        ball.x += ball.vx
        ball.y += ball.vy
        if ball.x < 18 or ball.x > self.screen.width-18:
            ball.vx *= -1
            ball.x = max(18, min(self.screen.width-18, ball.x))
        if ball.y < 40:
            ball.vy = abs(ball.vy)
        if ball.vy > 0 and old_y <= 403 <= ball.y and abs(ball.x-paddle.x) <= paddle.width/2+8:
            ball.y = 402
            self.scope["on_paddle"]()
            self.bounces += 1
        for brick in self.items:
            if brick.visible and brick.x-8 <= ball.x <= brick.x+brick.width+8 and brick.y-8 <= ball.y <= brick.y+brick.height+8:
                self.scope["on_break"](brick)
                ball.vy *= -1
                ball.y += ball.vy*2
                break
        if ball.y > self.screen.height:
            self.misses += 1
            ball.x, ball.y, ball.vy = paddle.x, 375, -max(2, abs(ball.vy))

    def step_patrol(self):
        self.cannon.x = max(30, min(810, self.cannon.x))
        self.cooldown -= 1
        for target in self.items:
            if not target.visible:
                continue
            target.y += self.world.fall_speed
            target.x += target.drift
            if target.x < 35 or target.x > 805:
                target.drift *= -1
            if target.y > 416:
                self.misses += 1
                target.y = -60
        remaining = []
        for spark in self.sparks:
            spark["y"] -= 7
            hit = next((target for target in self.items if target.visible and
                        abs(spark["x"]-target.x) < 22 and abs(spark["y"]-target.y) < 23), None)
            if hit:
                self.scope["on_hit"](hit)
                self.hits += 1
            elif spark["y"] > -20:
                remaining.append(spark)
        self.sparks = remaining


class WorkshopGame:
    """Portable workshop session. Hosts call step at 30 Hz (two 60 Hz ticks).

    Rules are ordinary Python with the template's supplied objects and callbacks.
    Rendering and worker/process isolation belong to the host.
    """
    kinds = ("platformer", "breaker", "paratroopers", "sokoban")
    frame_seconds = 1 / 30

    def __init__(self, source, kind="platformer"):
        if kind not in self.kinds:
            raise ValueError("Choose a supported game template")
        self.kind = kind
        self.simulation = SokobanGame(source) if kind == "sokoban" else PlatformGame(source) if kind == "platformer" else ArcadeGame(source, kind)
        self.snapshot()  # Validate initial learner values before returning a session.

    def snapshot(self):
        # A detached JSON-compatible value: later frames cannot mutate old snapshots.
        return json.loads(json.dumps(self.simulation.snapshot()))

    def step(self, keys=None):
        self.simulation.step(keys or {})
        return self.snapshot()
