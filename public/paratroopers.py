# The robots can fall. You write the controls!
cannon.turn_speed = 2
world.fall_speed = 0.7
world.sky = "mint"

def update():
    # Step 1: make the arrow keys tilt your cannon.
    pass

# What should an intercepted robot be worth?
def on_hit(target):
    target.hide()
