"""Desktop renderer and input adapter for the top-down snapshot protocol."""
from pathlib import Path
from math import cos, radians, sin
from .assets import SpriteAsset


def pixel_position(position, camera_position, zoom):
    """Snap world and camera to the same physical-pixel grid, independently."""
    return (round(position * zoom) - round(camera_position * zoom)) / zoom


def run(game, assets, title='Top-down game', max_frames=None, fullscreen=True, screenshot=None):
    import pyray as rl

    rl.set_config_flags(rl.FLAG_WINDOW_RESIZABLE)
    rl.init_window(960, 600, title)
    if fullscreen:
        monitor = rl.get_current_monitor()
        rl.set_window_size(rl.get_monitor_width(monitor), rl.get_monitor_height(monitor))
        rl.toggle_fullscreen()
    rl.set_target_fps(60)
    textures = {}
    sprites = {}
    font = None
    try:
        font = rl.load_font_ex(str(Path(__file__).with_name('assets') / 'DejaVuSans.ttf'), 32, None, 0)
        rl.set_texture_filter(font.texture, rl.TEXTURE_FILTER_BILINEAR)

        def overlay(text, x, y, size=20):
            # A small outline keeps text readable on terrain without covering it.
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (1, 2)):
                rl.draw_text_ex(font, text, rl.Vector2(x + dx, y + dy), size, 0,
                                rl.Color(12, 20, 16, 210))
            rl.draw_text_ex(font, text, rl.Vector2(x, y), size, 0, rl.Color(245, 244, 230, 255))

        definitions = getattr(game, 'asset_definitions', None)
        if definitions is None:
            names = {name for tile in game.world.map.tiles.values() for name in tile.asset_names}
            names.update(actor.asset for actor in game.world.actors)
            definitions = {name: SpriteAsset(f'{name}.png') for name in names}
        for name, definition in definitions.items():
            cache_key = (definition.image, definition.color_key)
            if cache_key in textures:
                texture = textures[cache_key]
                sprites[name] = (texture, definition.source or (0, 0, texture.width, texture.height))
                continue
            path = Path(assets) / definition.image
            if not path.is_file():
                raise FileNotFoundError(path)
            image = rl.load_image(str(path))
            try:
                if definition.color_key is not None:
                    rl.image_format(image, rl.PIXELFORMAT_UNCOMPRESSED_R8G8B8A8)
                    rl.image_color_replace(image, rl.Color(*definition.color_key, 255), rl.BLANK)
                texture = rl.load_texture_from_image(image)
            finally:
                rl.unload_image(image)
            if not texture.id:
                raise RuntimeError(f'Could not load texture: {path}')
            textures[cache_key] = texture
            sprites[name] = (texture, definition.source or (0, 0, texture.width, texture.height))
            rl.set_texture_filter(texture, rl.TEXTURE_FILTER_POINT)
        frames = 0
        while not rl.window_should_close():
            keys = {name for name, key in (
                ('left', rl.KEY_LEFT), ('right', rl.KEY_RIGHT),
                ('up', rl.KEY_UP), ('down', rl.KEY_DOWN),
                ('fire', rl.KEY_SPACE), ('restart', rl.KEY_R)) if rl.is_key_down(key)}
            pan = (0, 0)
            if rl.is_mouse_button_down(rl.MOUSE_BUTTON_RIGHT):
                delta = rl.get_mouse_delta()
                pan = (-delta.x, -delta.y)
            window = (max(1, rl.get_screen_width()), max(1, rl.get_screen_height()))
            viewport = game.camera.viewport_for(*window)
            scale = game.camera.zoom
            state = game.step(keys, rl.get_frame_time(), (pan[0] / scale, pan[1] / scale),
                              viewport,
                              center=rl.is_key_pressed(rl.KEY_SPACE))
            camera = state['camera']
            rl.begin_drawing()
            rl.clear_background(rl.Color(27, 34, 25, 255))
            view = rl.Camera2D(rl.Vector2((window[0] - viewport[0] * scale) / 2,
                                         (window[1] - viewport[1] * scale) / 2),
                               rl.Vector2(0, 0), 0, scale)
            rl.begin_mode_2d(view)
            for item in state['tiles'] + state['actors']:
                texture, source = sprites[item['asset']]
                x = pixel_position(item['x'], camera['x'], scale) + item['width'] / 2
                y = pixel_position(item['y'], camera['y'], scale) + item['height'] / 2
                rotation = item.get('rotation', 0)
                if item.get('trail_length', 0):
                    angle = radians(rotation - 90)
                    tail = rl.Vector2(x - cos(angle) * item['trail_length'], y - sin(angle) * item['trail_length'])
                    head = rl.Vector2(x, y)
                    rl.draw_line_ex(tail, head, 3, rl.Color(65, 37, 15, 220))
                    rl.draw_line_ex(tail, head, 2, rl.Color(255, 222, 115, 255))
                    rl.draw_line_ex(tail, head, 1, rl.Color(255, 249, 215, 255))
                rl.draw_texture_pro(texture,
                    rl.Rectangle(*source),
                    rl.Rectangle(x, y, item['width'], item['height']),
                    rl.Vector2(item['width'] / 2, item['height'] / 2), rotation, rl.WHITE)
            for effect in state.get('effects', []):
                age = 1 - effect['remaining'] / 0.25
                radius = effect['size'] * (0.3 + age)
                x, y = effect['x'] - camera['x'], effect['y'] - camera['y']
                if effect.get('asset'):
                    texture, source = sprites[effect['asset']]
                    rl.draw_texture_pro(texture, rl.Rectangle(*source),
                                        rl.Rectangle(x - radius, y - radius, radius * 2, radius * 2),
                                        rl.Vector2(0, 0), 0, rl.Color(255, 255, 255, int(255 * (1 - age))))
                else:
                    rl.draw_circle(int(x), int(y), radius, rl.Color(255, 150, 35, int(255 * (1 - age))))
            rl.end_mode_2d()
            for line, text in enumerate(state.get('hud', [])):
                overlay(text, 20, 18 + line * 28, 20 if line == 0 else 16)
            rl.end_drawing()
            frames += 1
            if max_frames is not None and frames >= max_frames:
                if screenshot is not None:
                    capture = rl.load_image_from_screen()
                    try:
                        rl.export_image(capture, str(screenshot))
                    finally:
                        rl.unload_image(capture)
                break
    finally:
        for texture in textures.values():
            rl.unload_texture(texture)
        if font is not None:
            rl.unload_font(font)
        rl.close_window()
