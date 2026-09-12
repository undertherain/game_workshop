# The robots can fall. You write the controls!
cannon.speed = 5
world.fall_speed = 0.7
world.sky = "mint"

def update():
    # Step 1: make the arrow keys move your launcher.
    pass

# What should an intercepted robot be worth?
def on_hit(target):
    target.hide()
