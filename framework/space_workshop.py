"""Browser workshop adapters for Invaders and Asteroids. No rendering dependencies."""
import math
from types import SimpleNamespace
from .invaders import Invaders
from .stock import alien as alien_sprite, bullet


def number(name, value, low=-100000, high=100000):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{name} needs a finite number between {low} and {high}')
    return value


def load_rules(source, scope):
    exec(compile(source, 'my_game.py', 'exec'), scope)
    for name in ('update', 'on_hit'):
        if not callable(scope.get(name)):
            raise ValueError(f'Your game needs a {name} function')


class AlienTarget:
    def __init__(self, actor):
        self.actor = actor

    @property
    def visible(self):
        return self.actor.alive

    def hide(self):
        self.actor.health = 0


class InvaderShip:
    def __init__(self, game):
        self.game, self.speed = game, 5

    @property
    def x(self):
        return self.game.model.ship.x

    @x.setter
    def x(self, value):
        self.game.model.ship.x = value

    def fire(self):
        game = self.game
        if game.ticks < game.next_shot or game.lost or game.won:
            return
        game.next_shot = game.ticks + 10
        game.model.ship.fire(0, -1, speed=600, render_size=(4, 14))


class InvadersWorkshop:
    def __init__(self, source):
        self.model = Invaders()
        # Keep the original ship and alien row; add two rows for the workshop.
        for y in (204, 268):
            for x in range(174, 751, 96):
                self.model.aliens.append(self.model.actor(alien_sprite, x, y, team='aliens', projectile=bullet))
        self.ticks, self.last_fire, self.next_shot = 0, False, 0
        self.direction, self.invulnerable = 1, 0
        self.won = self.lost = False
        self.world = SimpleNamespace(score=0, alien_speed=.65, sky='night')
        self.ship = InvaderShip(self)
        self.items = [AlienTarget(actor) for actor in self.model.aliens]
        self.keyboard = SimpleNamespace(left=False, right=False, fire=False)
        self.scope = dict(ship=self.ship, world=self.world, keyboard=self.keyboard)
        self.model.ship.health = 3
        self.model.ship.on_projectile_hit = lambda shot: self.damage()
        for target in self.items:
            target.actor.projectile_asset = self.model.ship.projectile_asset
            target.actor.on_projectile_hit = lambda shot, target=target: self.scope['on_hit'](target)
        self.model.update = lambda dt: None  # Learner rules replace the example's controls.
        load_rules(source, self.scope)
        self.validate()

    def validate(self):
        number('ship.x', self.ship.x)
        number('ship.speed', self.ship.speed, 0, 15)
        number('world.alien_speed', self.world.alien_speed, 0, 4)
        number('world.score', self.world.score)
        if self.world.sky not in ('night', 'mint', 'peach', 'lavender'):
            raise ValueError('Choose a sky: night, mint, peach, or lavender')

    def damage(self):
        if self.invulnerable or self.lost:
            return
        self.model.ship.health -= 1
        self.invulnerable = 100
        self.lost = not self.model.ship.alive

    def step(self, keys):
        fire = bool(keys.get('jump') or keys.get('fire'))
        for substep in range(2):
            if self.won or self.lost:
                break
            self.keyboard.left, self.keyboard.right = bool(keys.get('left')), bool(keys.get('right'))
            self.keyboard.fire = fire and not self.last_fire and substep == 0
            self.scope['update']()
            self.validate()
            self.ship.x = max(0, min(960 - self.model.ship.width, self.ship.x))
            live = [target.actor for target in self.items if target.visible]
            dx = self.direction * self.world.alien_speed
            if live and any(actor.x + dx < 20 or actor.x + actor.width + dx > 940 for actor in live):
                self.direction *= -1
                dx = self.direction * self.world.alien_speed
                for actor in live:
                    actor.y += 24
            for actor in live:
                actor.x += dx
                if actor.y + actor.height >= self.model.ship.y:
                    self.lost = True
            if self.lost:
                break
            if live and self.ticks % 150 == 149:
                # Frontmost alien in a rotating column sends a shot toward the ship.
                shooter = live[(self.ticks // 150) % len(live)]
                column = [actor for actor in live if abs(actor.x - shooter.x) < 20]
                max(column, key=lambda actor: actor.y).fire(0, 1, speed=190, render_size=(4, 14))
            self.model.step(set(), 1 / 60)
            self.invulnerable = max(0, self.invulnerable - 1)
            self.ticks += 1
            self.won = not any(target.visible for target in self.items) and not self.lost
        self.last_fire = fire

    def snapshot(self):
        self.validate()
        return dict(kind='invaders', width=960, height=640, ticks=self.ticks,
                    world=vars(self.world), ship={**self.model.ship.snapshot(), 'invulnerable': self.invulnerable},
                    items=[{**target.actor.snapshot(), 'visible': target.visible} for target in self.items],
                    shots=[{**shot.snapshot(), 'enemy': shot.team == 'aliens'} for shot in self.model.world.projectiles],
                    sprites={name: dict(rows=list(sprite.rows), color=list(sprite.color)) for name, sprite in self.model.asset_definitions.items()},
                    lives=max(0, self.model.ship.health), won=self.won, lost=self.lost,
                    collected=sum(not target.visible for target in self.items))


def displacement(a, b, span):
    return (a - b + span / 2) % span - span / 2


def circle_hit(x, y, dx, dy, target, radius):
    """Swept circle test across the wrapping playfield, including its edges."""
    tx = displacement(target.x, x, 840)
    ty = displacement(target.y, y, 480)
    length = dx * dx + dy * dy
    t = max(0, min(1, (tx * dx + ty * dy) / length)) if length else 0
    return math.hypot(tx - dx * t, ty - dy * t) <= radius


class SpaceShip:
    def __init__(self, game):
        self.game = game
        self.x, self.y, self.angle = 420, 240, -90
        self.vx = self.vy = 0
        self.turn_speed, self.thrust_power = 4, .09

    def turn(self, degrees):
        self.angle += number('turn angle', degrees, -360, 360)

    def thrust(self):
        power = number('ship.thrust_power', self.thrust_power, 0, .5)
        angle = math.radians(number('ship.angle', self.angle))
        self.vx += math.cos(angle) * power
        self.vy += math.sin(angle) * power
        self.game.thrusting = True

    def fire(self):
        game = self.game
        if game.ticks < game.next_shot or game.won or game.lost:
            return
        angle = math.radians(number('ship.angle', self.angle))
        x, y = number('ship.x', self.x), number('ship.y', self.y)
        game.next_shot = game.ticks + 12
        game.shots.append(dict(x=(x+math.cos(angle)*18) % 840, y=(y+math.sin(angle)*18) % 480,
                               vx=math.cos(angle)*8, vy=math.sin(angle)*8, life=65))


class Rock:
    def __init__(self, game, x, y, vx, vy, size):
        self.game, self.x, self.y, self.vx, self.vy, self.size = game, x, y, vx, vy, size
        self.visible = True
        self.id = len(game.items)
        game.items.append(self)

    def split(self):
        if not self.visible:
            return
        self.visible = False
        if self.size > 1:
            angle = math.atan2(self.vy, self.vx)
            speed = min(2.5, math.hypot(self.vx, self.vy) * 1.3)
            for offset in (-.7, .7):
                Rock(self.game, self.x, self.y, math.cos(angle+offset)*speed, math.sin(angle+offset)*speed, self.size-1)

    @property
    def radius(self):
        return {3: 38, 2: 23, 1: 13}[self.size]


class AsteroidsWorkshop:
    def __init__(self, source):
        self.ticks = self.next_shot = 0
        self.lives, self.invulnerable = 3, 120
        self.won = self.lost = self.thrusting = False
        self.world = SimpleNamespace(score=0, rock_speed=1, sky='night')
        self.ship, self.items, self.shots = SpaceShip(self), [], []
        for x, y, vx, vy in [(110,90,.5,.35), (720,85,-.65,.3), (125,375,.6,-.4), (705,390,-.4,-.55)]:
            Rock(self, x, y, vx, vy, 3)
        self.keyboard = SimpleNamespace(left=False, right=False, thrust=False, fire=False)
        self.scope = dict(ship=self.ship, world=self.world, keyboard=self.keyboard)
        load_rules(source, self.scope)
        self.validate()

    def validate(self):
        for key in ('x', 'y', 'vx', 'vy', 'angle'):
            number('ship.'+key, getattr(self.ship, key))
        number('ship.turn_speed', self.ship.turn_speed, 0, 15)
        number('ship.thrust_power', self.ship.thrust_power, 0, .5)
        number('world.rock_speed', self.world.rock_speed, 0, 3)
        number('world.score', self.world.score)
        if self.world.sky not in ('night', 'mint', 'peach', 'lavender'):
            raise ValueError('Choose a sky: night, mint, peach, or lavender')

    def damage(self):
        if self.invulnerable or self.lost:
            return
        self.lives -= 1
        self.lost = self.lives <= 0
        self.ship.x, self.ship.y, self.ship.vx, self.ship.vy = 420, 240, 0, 0
        self.invulnerable = 120

    def step(self, keys):
        for _ in range(2):
            if self.won or self.lost:
                break
            for key in ('left', 'right', 'thrust'):
                setattr(self.keyboard, key, bool(keys.get(key)))
            self.keyboard.fire = bool(keys.get('jump') or keys.get('fire'))
            self.thrusting = False
            self.scope['update']()
            self.validate()
            ship = self.ship
            ship.angle %= 360
            speed = math.hypot(ship.vx, ship.vy)
            if speed > 6:
                ship.vx, ship.vy = ship.vx / speed * 6, ship.vy / speed * 6
            ship.x, ship.y = (ship.x + ship.vx) % 840, (ship.y + ship.vy) % 480
            for rock in self.items:
                if rock.visible:
                    rock.x = (rock.x + rock.vx * self.world.rock_speed) % 840
                    rock.y = (rock.y + rock.vy * self.world.rock_speed) % 480
            for shot in self.shots:
                for rock in list(self.items):
                    if rock.visible and circle_hit(shot['x'], shot['y'], shot['vx'], shot['vy'], rock, rock.radius):
                        self.scope['on_hit'](rock)
                        shot['life'] = 0
                        break
                shot['x'], shot['y'] = (shot['x']+shot['vx']) % 840, (shot['y']+shot['vy']) % 480
                shot['life'] -= 1
            self.shots = [shot for shot in self.shots if shot['life'] > 0]
            if any(rock.visible and circle_hit(ship.x, ship.y, 0, 0, rock, rock.radius+10) for rock in self.items):
                self.damage()
            self.invulnerable = max(0, self.invulnerable-1)
            self.ticks += 1
            self.won = not any(rock.visible for rock in self.items) and not self.lost

    def snapshot(self):
        self.validate()
        ship = {key: getattr(self.ship, key) for key in ('x', 'y', 'vx', 'vy', 'angle', 'turn_speed', 'thrust_power')}
        ship.update(invulnerable=self.invulnerable, thrusting=self.thrusting)
        return dict(kind='asteroids', width=840, height=480, ticks=self.ticks, world=vars(self.world), ship=ship,
                    items=[dict(x=r.x, y=r.y, radius=r.radius, size=r.size, id=r.id, visible=r.visible) for r in self.items],
                    shots=[dict(shot) for shot in self.shots], lives=self.lives, won=self.won, lost=self.lost,
                    collected=sum(not rock.visible for rock in self.items))
