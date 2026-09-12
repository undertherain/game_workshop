# The world is ready. You write the controls!
player = Actor("fox", x=80, y=430)
player.speed = 4
player.jump_height = 11

world.gravity = 0.5
world.sky = "peach"

# Your movement rules
def update():
    # Step 1: make the arrow keys move your fox.
    pass

# What should a star be worth?
def on_collect(star):
    star.hide()
