# A paddle, a ball, and a wall of moon bricks.
paddle.speed = 6
paddle.width = 110
ball.vx = 3
ball.vy = -4
world.sky = "night"

def update():
    if keyboard.left:
        paddle.x -= paddle.speed
    # Your turn: make the Right arrow work.
    pass

# Bounce back up when you hit the paddle.
def on_paddle():
    ball.vy = -abs(ball.vy)

# What should a broken brick be worth?
def on_break(brick):
    brick.hide()
