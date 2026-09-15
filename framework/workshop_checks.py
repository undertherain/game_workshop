"""Workshop teaching checks; each check creates its own framework session."""
import json
from .workshop import WorkshopGame, _error


def check_exercise(source, kind, step):
    """Runs in an isolated namespace, never in the learner's live game."""
    try:
        game = WorkshopGame(source, kind)
    except Exception as exc:
        return json.dumps({"passed": False, "message": "Fix the Python error first, then check this step again.", "error": _error(exc)})
    _arcade = game.simulation
    _scope = _arcade.scope
    _stars = _arcade.stars if kind == "platformer" else []
    try:
        def tick(**keys):
            return game.step(keys)

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
