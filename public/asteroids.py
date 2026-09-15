# Turn, thrust, and clear the rocks. Momentum carries you forward.
ship.turn_speed = 4
ship.thrust_power = 0.09
world.rock_speed = 1
world.sky = "night"

def steer_ship():
    if keyboard.left:
        ship.turn(-ship.turn_speed)
    # Your turn: make the Right arrow work.
    pass

def apply_thrust():
    if keyboard.thrust:
        ship.thrust()

def update():
    steer_ship()
    apply_thrust()
    if keyboard.fire:
        ship.fire()

def on_hit(rock):
    rock.split()
    world.score += 10
