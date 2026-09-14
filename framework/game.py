"""Small screen-based games with defaults; simulation stays independent of raylib."""
from .assets import PixelSprite
from .topdown import Actor, Camera, Tile, TileMap, World


class ScreenActor(Actor):
    """An actor whose projectile artwork is chosen explicitly at creation."""
    projectile_asset = None

    def fire(self, dx, dy, **options):
        if 'asset' not in options:
            if self.projectile_asset is None:
                raise ValueError('Choose projectile artwork with Game.actor(projectile=...) before firing')
            options['asset'] = self.projectile_asset
        return super().fire(dx, dy, **options)


class ScreenCamera(Camera):
    """Fit a fixed playfield in the window, preserving its aspect ratio."""
    def viewport_for(self, screen_width, screen_height):
        self.zoom = min(screen_width / self.width, screen_height / self.height)
        return self.width, self.height


class Game:
    """Override setup and update to author a game; run fullscreen by default."""
    background_color = (9, 13, 29)

    def __init__(self):
        self.world = World(TileMap(30, 20, 32, [Tile('empty', 'empty')], 'empty'))
        self.camera = ScreenCamera(960, 640)
        self.asset_definitions = {}
        self.keys = set()
        self.pressed = set()
        self.message = ''
        self.setup()

    def setup(self):
        """Create game state once, after framework services are ready."""

    def update(self, dt):
        """Define game rules; called before each frame's simulation step."""

    def _register_sprite(self, sprite):
        if not isinstance(sprite, PixelSprite):
            raise TypeError('Pass a PixelSprite object, such as an explicit import from framework.stock')
        for name, definition in self.asset_definitions.items():
            if definition == sprite:
                return name
        name = f'sprite_{len(self.asset_definitions)}'
        self.asset_definitions[name] = sprite
        return name

    def actor(self, sprite, x, y, *, team='', projectile=None):
        asset = self._register_sprite(sprite)
        actor = ScreenActor(x, y, len(sprite.rows[0]) * 4,
                            len(sprite.rows) * 4, asset, team=team)
        if projectile is not None:
            actor.projectile_asset = self._register_sprite(projectile)
        return self.world.add(actor)

    def step(self, keys, dt, pan=(0, 0), viewport=None, center=False):
        dt = max(0, min(dt, 0.1))
        self.pressed = set(keys) - self.keys
        self.keys = set(keys)
        self.update(dt)
        self.world.step(dt)
        state = self.world.snapshot(self.camera)
        state['tiles'] = []  # Empty screen; no terrain artwork to load or draw.
        state['hud'] = [self.message] if self.message else []
        return state

    def run(self, *, fullscreen=True, max_frames=None, screenshot=None):
        from .raylib_host import run
        run(self, '.', title='Little Makers', fullscreen=fullscreen,
            max_frames=max_frames, screenshot=screenshot)
