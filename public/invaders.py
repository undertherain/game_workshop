# Move the ship, fire at the formation, and clear all 21 aliens.
ship.speed = 5
world.alien_speed = 0.65
world.sky = "night"

def move_ship():
    if keyboard.left:
        ship.x -= ship.speed
    # Your turn: make the Right arrow work.
    pass

def fire_laser():
    if keyboard.fire:
        ship.fire()

def update():
    move_ship()
    fire_laser()

def on_hit(alien):
    alien.hide()
    world.score += 10
