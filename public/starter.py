# This is your game. Try changing a number!
player = Actor("fox", x=80, y=430)
player.speed = 4
player.jump_height = 11

world.gravity = 0.5
world.sky = "peach"

# These rules run while you play.
def update():
    if keyboard.right:
        player.x += player.speed
    if keyboard.left:
        player.x -= player.speed
    if keyboard.jump and player.on_ground:
        player.vy = -player.jump_height

# What happens when you catch a star?
def on_collect(star):
    world.score += 1
    star.hide()
