"""Invaders seed for the browser workshop.

The editable desktop tutorial owns its complete rules in
examples/alien_invaders/game.py; keep that example self-contained.
Both use the same Game/World primitives and stock sprites.
"""
from .game import Game
from .stock import ship, alien, bullet

class Invaders(Game):
    def setup(self):
        self.ship = self.actor(ship, 462, 560, team='player', projectile=bullet)
        self.aliens = [self.actor(alien, x, 140, team='aliens') for x in range(174, 751, 96)]

    def update(self, dt):
        self.ship.walk(('right' in self.keys) - ('left' in self.keys), 0, 300, dt)
        if 'fire' in self.pressed:
            self.ship.fire(0, -1, render_size=(4, 12))
        self.message = 'Left/Right: move   Space: shoot   Esc: quit' if any(alien.alive for alien in self.aliens) else 'All clear!'
