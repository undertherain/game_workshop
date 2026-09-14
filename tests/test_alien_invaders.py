"""Exercise the short authored game through the shared simulation, without a display."""
import json
import unittest

from framework import Game, PixelSprite
from framework.stock import alien
from examples.alien_invaders.game import Invaders


class AlienInvadersTests(unittest.TestCase):
    def setUp(self):
        self.game = Invaders()
        self.ship, self.aliens = self.game.ship, self.game.aliens

    def test_game_instances_have_independent_state(self):
        other = Invaders()
        self.game.step({'left', 'fire'}, 0.1)
        self.assertEqual(other.ship.x, 462)
        self.assertEqual(other.world.projectiles, [])
        self.assertIsNot(other.aliens[0], self.aliens[0])

    def test_movement_bounds_and_stationary_targets(self):
        positions = [(alien.x, alien.y) for alien in self.aliens]
        for _ in range(40):
            self.game.step({'left'}, 0.1)
        self.assertEqual(self.ship.x, 0)
        for _ in range(40):
            self.game.step({'right'}, 0.1)
        self.assertEqual(self.ship.x + self.ship.width, 960)
        self.assertEqual(positions, [(alien.x, alien.y) for alien in self.aliens])

    def test_press_fires_once_and_misses_are_cleaned_up(self):
        self.ship.move(-self.ship.x, 0)
        self.game.step({'fire'}, 1 / 60)
        for _ in range(5):
            self.game.step({'fire'}, 1 / 60)
        self.assertEqual(len(self.game.world.projectiles), 1)
        self.game.step(set(), 1 / 60)
        self.game.step({'fire'}, 1 / 60)
        self.assertEqual(len(self.game.world.projectiles), 2)
        for _ in range(30):
            self.game.step(set(), 0.1)
        self.assertEqual(self.game.world.projectiles, [])
        self.assertTrue(self.ship.alive)

    def test_clear_every_alien_through_real_projectile_hits(self):
        for alien in self.aliens:
            self.ship.move(alien.x - self.ship.x, 0)
            self.game.step({'fire'}, 1 / 60)
            for _ in range(12):
                self.game.step(set(), 0.1)
            self.assertFalse(alien.alive)
            self.assertNotIn(alien, self.game.world.actors)
        state = self.game.step(set(), 1 / 60)
        self.assertEqual(state['hud'], ['All clear!'])
        self.assertEqual(self.game.world.actors, [self.ship])
        json.dumps(state)

    def test_empty_game_and_fixed_screen_at_different_aspects(self):
        game = Game()
        self.assertEqual(game.asset_definitions, {})
        self.assertEqual(game.step(set(), 0)['actors'], [])
        for window in ((1920, 1080), (600, 900)):
            width, height = game.camera.viewport_for(*window)
            self.assertLessEqual(width * game.camera.zoom, window[0])
            self.assertLessEqual(height * game.camera.zoom, window[1])
            self.assertEqual((width, height), (960, 640))

    def test_explicit_artwork_and_custom_pixel_sprites(self):
        game = Game()
        custom = PixelSprite(('##', '.#'), (255, 0, 100))
        actor = game.actor(custom, 0, 0, projectile=alien)
        second = game.actor(custom, 50, 0)
        self.assertEqual(len(game.asset_definitions), 2)
        self.assertEqual(actor.asset, second.asset)
        self.assertEqual((actor.width, actor.height), (8, 8))
        shot = actor.fire(1, 0)
        self.assertEqual(game.asset_definitions[shot.asset], alien)
        with self.assertRaisesRegex(ValueError, 'projectile artwork'):
            second.fire(1, 0)
        with self.assertRaises(TypeError):
            game.actor('ship', 100, 0)


if __name__ == '__main__':
    unittest.main()
