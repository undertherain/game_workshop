# A crate puzzle: your code defines its controls and rules.
board.level = 1
world.sky = "mint"

def on_key(key):
    if key == "left":
        player.move(-1, 0)
    if key == "up":
        player.move(0, -1)
    if key == "down":
        player.move(0, 1)
    # Your turn: connect the Right key.
    pass

def can_push(crate, dx, dy):
    return board.is_free(crate.x + dx, crate.y + dy)

def is_complete():
    return board.all_crates_on_goals()
