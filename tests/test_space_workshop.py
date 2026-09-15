"""Real space-game rules: collisions, controls, wrapping, damage and exercise evidence."""
import json
import math
from pathlib import Path
import unittest
from framework import WorkshopGame
from framework.invaders import Invaders
from framework.workshop_checks import check_exercise

ROOT = Path(__file__).resolve().parents[1]


def source(kind):
    return '\n'.join(json.loads((ROOT / f'public/content/games/{kind}.json').read_text())['complete'])


class SpaceWorkshopTests(unittest.TestCase):
    def test_prepared_exercises_leave_only_the_current_rule_missing(self):
        for kind in ('invaders', 'asteroids'):
            data = json.loads((ROOT / f'public/content/games/{kind}.json').read_text())
            for step, lesson in enumerate(data['lessons']):
                draft = '\n'.join(json.loads((ROOT / f'public/content/game-lessons/{lesson}.json').read_text())['starter'])
                for check in range(3):
                    result = json.loads(check_exercise(draft, kind, check))
                    self.assertEqual(result['passed'], step != check, (kind, step, check, result))

    def test_invaders_reuses_original_game_and_preserves_movement_bounds(self):
        game = WorkshopGame(source('invaders'), 'invaders')
        sim = game.simulation
        self.assertIsInstance(sim.model, Invaders)
        self.assertEqual(len(sim.items), 21)
        for _ in range(60): game.step({'left': True})
        self.assertEqual(sim.ship.x, 0)
        for _ in range(120): game.step({'right': True})
        self.assertEqual(sim.ship.x, 924)

    def test_invaders_reverses_and_descends_at_edge(self):
        game = WorkshopGame(source('invaders'), 'invaders')
        sim = game.simulation
        for target in sim.items: target.actor.x += 150
        before = sim.items[0].actor.y
        for _ in range(5): game.step({})
        self.assertEqual(sim.direction, -1)
        self.assertEqual(sim.items[0].actor.y, before + 24)
        self.assertTrue(all(20 <= target.actor.x <= 904 for target in sim.items))

    def test_clear_invaders_through_actual_projectile_hits(self):
        game = WorkshopGame(source('invaders'), 'invaders')
        sim = game.simulation
        sim.world.alien_speed = 0
        sim.invulnerable = 100000  # Isolate aim/collision from incoming fire.
        for _ in range(30):
            remaining = [target for target in sim.items if target.visible]
            if not remaining: break
            sim.ship.x = remaining[0].actor.x
            game.step({'jump': True})
            count = len([shot for shot in sim.model.world.projectiles if shot.team == 'player'])
            game.step({'jump': True})
            self.assertLessEqual(len([shot for shot in sim.model.world.projectiles if shot.team == 'player']), count)
            for _ in range(30): game.step({})
        self.assertTrue(game.snapshot()['won'])
        self.assertEqual(sim.world.score, 210)
        self.assertFalse(sim.model.world.actors == [])  # The ship survives the clear.

    def test_enemy_projectiles_damage_ship_and_protection_blocks_repeat_hits(self):
        game = WorkshopGame(source('invaders'), 'invaders')
        sim = game.simulation
        shooter = sim.items[-1].actor
        shooter.x, shooter.y = sim.ship.x, 470
        shooter.fire(0, 1, speed=600)
        for _ in range(5): game.step({})
        self.assertEqual(sim.model.ship.health, 2)
        sim.damage()
        self.assertEqual(sim.model.ship.health, 2)
        for _ in range(2):
            sim.invulnerable = 0
            sim.damage()
        self.assertTrue(game.snapshot()['lost'])
        before = game.snapshot()
        self.assertEqual(game.step({'right': True, 'jump': True}), before)
        self.assertEqual(WorkshopGame(source('invaders'), 'invaders').snapshot()['lives'], 3)

    def test_asteroid_thrust_drift_rotation_and_speed_cap(self):
        game = WorkshopGame(source('asteroids'), 'asteroids')
        sim, ship = game.simulation, game.simulation.ship
        game.step({'thrust': True})
        self.assertLess(ship.vy, 0)
        velocity, y = ship.vy, ship.y
        game.step({'right': True})
        self.assertEqual(ship.vy, velocity)
        self.assertLess(ship.y, y)
        self.assertGreater(ship.angle, 270)
        sim.invulnerable = 100000
        for _ in range(200): game.step({'thrust': True})
        self.assertLessEqual(math.hypot(ship.vx, ship.vy), 6.0000001)

    def test_ship_rocks_and_shots_wrap_and_shots_hit_across_seam(self):
        game = WorkshopGame(source('asteroids'), 'asteroids')
        sim = game.simulation
        sim.ship.x, sim.ship.vx, sim.ship.y = 839, 3, 100
        rock = sim.items[0]
        rock.x, rock.y, rock.vx, rock.vy = 839, 400, 2, 0
        game.step({})
        self.assertEqual(sim.ship.x, 5)
        self.assertEqual(rock.x, 3)
        sim.shots = [dict(x=839, y=200, vx=8, vy=0, life=60)]
        game.step({})
        self.assertEqual(sim.shots[0]['x'], 15)
        sim.world.rock_speed = 0
        rock.x, rock.y = 2, 300
        sim.shots = [dict(x=830, y=300, vx=8, vy=0, life=60)]
        game.step({})
        self.assertFalse(rock.visible)
        self.assertEqual(sim.world.score, 10)
        self.assertEqual(len(sim.items), 6)
        self.assertEqual(sim.shots, [])

    def test_rock_split_is_idempotent_and_event_scoring_reaches_win(self):
        game = WorkshopGame(source('asteroids'), 'asteroids')
        sim = game.simulation
        first = sim.items[0]
        first.split(); first.split()
        self.assertEqual(len(sim.items), 6)
        # Every newly-created fragment is reachable by a real swept shot.
        sim.invulnerable = 100000
        sim.world.rock_speed = 0
        for _ in range(40):
            remaining = [rock for rock in sim.items if rock.visible]
            if not remaining: break
            rock = remaining[0]
            sim.shots = [dict(x=rock.x, y=rock.y, vx=0, vy=-8, life=60)]
            game.step({})
        self.assertTrue(game.snapshot()['won'])
        self.assertEqual(len(sim.items), 28)
        self.assertEqual(sim.world.score, 270)  # First split above did not invoke the score rule.

    def test_asteroid_collision_protection_loss_and_restart(self):
        game = WorkshopGame(source('asteroids'), 'asteroids')
        sim = game.simulation
        for remaining in (2, 1, 0):
            sim.invulnerable = 0
            rock = sim.items[0]
            rock.x, rock.y, rock.vx, rock.vy = sim.ship.x, sim.ship.y, 0, 0
            game.step({})
            self.assertEqual(sim.lives, remaining)
            game.step({})
            self.assertEqual(sim.lives, remaining)
        self.assertTrue(sim.lost)
        self.assertFalse(sim.won)
        self.assertEqual(WorkshopGame(source('asteroids'), 'asteroids').snapshot()['lives'], 3)

    def test_invalid_values_and_event_error_line_mapping(self):
        for kind, variable in [('invaders','ship.speed'), ('asteroids','ship.thrust_power')]:
            for value in ['float("nan")', 'float("inf")', '"fast"', '-1']:
                with self.assertRaises(ValueError):
                    WorkshopGame(source(kind) + f'\n{variable} = {value}', kind)
            broken = source(kind).replace('world.score += 10', 'world.score += 1 / 0')
            result = json.loads(check_exercise(broken, kind, 2))
            self.assertFalse(result['passed'])
            self.assertEqual(result['error']['type'], 'ZeroDivisionError')
            self.assertEqual(result['error']['line'], len(broken.splitlines()))


if __name__ == '__main__': unittest.main()
