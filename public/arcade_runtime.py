"""Two additional small games; child Python owns controls and event callbacks."""


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


_selected_kind = "platformer"
_arcade = None


def _load_selected(source, kind):
    global _selected_kind, _arcade
    _selected_kind = kind
    if kind == "platformer":
        return _load_game(source)
    try:
        if kind not in ("breaker", "paratroopers"):
            raise ValueError("Choose one of the three game templates")
        _arcade = ArcadeGame(source, kind)
        return json.dumps({"state": _arcade.snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})


def _step_selected(keys_json):
    if _selected_kind == "platformer":
        return _step_game(keys_json)
    try:
        _arcade.step(json.loads(keys_json))
        return json.dumps({"state": _arcade.snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})


def _check_exercise(source, kind, step):
    """Runs in an isolated namespace, never in the learner's live game."""
    loaded = json.loads(_load_selected(source, kind))
    if "error" in loaded:
        return json.dumps({"passed": False, "message": "Fix the Python error first, then check this step again.", "error": loaded["error"]})
    try:
        def tick(**keys):
            result = json.loads(_step_selected(json.dumps(keys)))
            if "error" in result:
                raise ValueError(result["error"]["message"])
            return result["state"]

        if step == 0:
            who = _scope["player"] if kind == "platformer" else _arcade.paddle if kind == "breaker" else _arcade.cannon
            who.x = 420
            start = who.x
            tick()
            still = who.x == start
            tick(right=True)
            right = who.x > start
            start = who.x
            tick(left=True)
            left = who.x < start
            passed = still and right and left
            message = "Both arrow keys work, and you stop when neither is pressed. Try them in your game!" if passed else (
                "Your character moves even without a key. Put movement inside an if keyboard.right or if keyboard.left rule." if not still else
                "Right is not moving right yet. Try an if keyboard.right rule inside update()." if not right else
                "Right works! Now add a left-key rule that makes x smaller.")
        elif step == 1 and kind == "platformer":
            player = _scope["player"]
            start = player.y
            tick(jump=True)
            jumped = player.y < start
            tick()
            player.on_ground = False
            before = player.vy
            tick(jump=True)
            guarded = player.vy >= before
            passed = jumped and guarded
            message = "Space jumps from the ground, and another press in the air does not restart the jump." if passed else (
                "Space did not lift your character. Check keyboard.jump and give player.vy a negative upward push." if not jumped else
                "Your character can jump again in mid-air. Add player.on_ground to your jump condition.")
        elif step == 1 and kind == "breaker":
            ball, paddle = _arcade.ball, _arcade.paddle
            ball.x, ball.vy = paddle.x+20, 4
            _arcade.scope["on_paddle"]()
            right = ball.vx > 0 and ball.vy < 0
            ball.x, ball.vy = paddle.x-20, 4
            _arcade.scope["on_paddle"]()
            passed = right and ball.vx < 0 and ball.vy < 0
            message = "The right side aims right, the left side aims left, and both bounce upward." if passed else "Make ball.vx depend on ball.x minus paddle.x inside on_paddle(), and keep the upward bounce."
        elif step == 1:
            tick()
            quiet = not _arcade.sparks
            tick(jump=True)
            passed = quiet and bool(_arcade.sparks)
            message = "Space fires a spark, and no spark fires without pressing it. Try catching a robot!" if passed else "Inside update(), check keyboard.fire and call cannon.fire() when it is pressed."
        elif step == 2:
            if kind == "platformer":
                item = _stars[0]
                world = _scope["world"]
                before = world.score
                _scope["on_collect"](item)
            else:
                item = _arcade.items[0]
                world = _arcade.world
                before = world.score
                _arcade.scope["on_break" if kind == "breaker" else "on_hit"](item)
            passed = world.score > before and not item.visible
            message = "Your event adds points and removes the object. You chose what it is worth!" if passed else "Add a positive number to world.score inside your event function, and keep the hide() line."
        else:
            return json.dumps({"passed": None, "message": "Your Python starts successfully. This is your own variation: play it and decide how it feels!"})
        return json.dumps({"passed": passed, "message": message})
    except Exception as exc:
        return json.dumps({"passed": False, "message": "Your rule raised an error during the check: " + str(exc), "error": _error(exc)})
