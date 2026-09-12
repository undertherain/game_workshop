# Framework sketch: a static screen, stationary bricks, a paddle and a ball.
# Select Brick breaker, choose Edit whole file, paste this example, then Run.
# The workshop supplies these objects and calls your rules 60 times per second.
paddle.x = screen.width / 2
paddle.speed = 6
paddle.width = 110
ball.vx = 3
ball.vy = -4
world.sky = "night"

# The same brick objects are used by the simulation and on_break().
for brick in bricks:
    brick.points = (4 - brick.row) * 10


def update():
    if keyboard.left:
        paddle.move_left()
    if keyboard.right:
        paddle.move_right()


def on_paddle():
    ball.bounce_up()
    # Your rule: hitting farther from the centre aims farther sideways.
    ball.vx = (ball.x - paddle.x) / 12


def on_break(brick):
    world.score += brick.points
    brick.hide()
