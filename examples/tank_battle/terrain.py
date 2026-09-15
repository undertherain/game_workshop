"""Seeded terrain generation with connected lakes and driveable land."""
from random import Random


PLAYER_CELL = (2, 14)
ENEMY_CELLS = tuple((x, y) for y in (3, 19, 35) for x in (3, 23, 43, 61))
STEPS = ((0, -1), (1, 0), (0, 1), (-1, 0))


def lake_shape(rng, target):
    """Grow overlapping 2×2 stamps: every water cell belongs to a broad patch."""
    anchors = [(0, 0)]
    cells = {(0, 0), (1, 0), (0, 1), (1, 1)}
    while len(cells) < target:
        x, y = rng.choice(anchors)
        dx, dy = rng.choice(STEPS)
        anchor = x + dx, y + dy
        if anchor in anchors or not (-4 <= anchor[0] <= 4 and -4 <= anchor[1] <= 4):
            continue
        anchors.append(anchor)
        cells.update((anchor[0] + ox, anchor[1] + oy) for ox in (0, 1) for oy in (0, 1))
    # Fill enclosed holes rather than leaving tiny land islands in a lake.
    outside = {(-5, -5)}
    pending = [(-5, -5)]
    while pending:
        x, y = pending.pop()
        for dx, dy in STEPS:
            cell = x + dx, y + dy
            if (-5 <= cell[0] <= 6 and -5 <= cell[1] <= 6
                    and cell not in cells and cell not in outside):
                outside.add(cell)
                pending.append(cell)
    return {(x, y) for y in range(-4, 6) for x in range(-4, 6) if (x, y) not in outside}


def connected(cells, start):
    visited = {start}
    pending = [start]
    while pending:
        x, y = pending.pop()
        for dx, dy in STEPS:
            cell = x + dx, y + dy
            if cell in cells and cell not in visited:
                visited.add(cell)
                pending.append(cell)
    return len(visited) == len(cells)


def populate(terrain, seed):
    rng = Random(seed)
    land = {(x, y) for y in range(terrain.height) for x in range(terrain.width)}
    protected = {(x + dx, y + dy) for x, y in (PLAYER_CELL, *ENEMY_CELLS)
                 for dx in range(-2, 3) for dy in range(-2, 3)}
    # Give the player room to get moving before encountering terrain or enemies.
    protected.update((x, y) for x in range(0, 7) for y in range(10, 19))

    def place(cells, name, blocking=False):
        nonlocal land
        if not cells or cells & protected:
            return False
        if any(not (1 <= x < terrain.width - 1 and 1 <= y < terrain.height - 1)
               or terrain[x, y] != 'grass' for x, y in cells):
            return False
        remaining = land - cells if blocking else land
        if blocking and not connected(remaining, PLAYER_CELL):
            return False
        for cell in cells:
            terrain[cell] = name
        land = remaining
        return True

    # One lake per region spreads water across the world without scattering pixels.
    for row in range(2):
        for col in range(4):
            for _ in range(80):
                cx = rng.randrange(col * 16 + 4, col * 16 + 12)
                cy = rng.randrange(row * 20 + 4, row * 20 + 16)
                cells = {(cx + x, cy + y) for x, y in lake_shape(rng, rng.randint(24, 48))}
                # Keep separate lakes apart, including diagonal contact.
                if any(0 <= x + dx < terrain.width and 0 <= y + dy < terrain.height
                       and terrain[x + dx, y + dy] == 'water'
                       for x, y in cells for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    continue
                if place(cells, 'water', blocking=True):
                    break

    for _ in range(18):
        for _ in range(40):
            x, y = rng.randrange(2, 60), rng.randrange(2, 36)
            dx, dy = rng.choice(((1, 0), (0, 1)))
            length = rng.randint(3, 7)
            cells = {(x + dx * offset, y + dy * offset) for offset in range(length)}
            if rng.random() < 0.6:
                cells.update((x + dy * offset, y + dx * offset) for offset in range(1, 4))
            if place(cells, 'brick', blocking=True):
                break

    for _ in range(8):
        for _ in range(40):
            cx, cy = rng.randrange(4, 60), rng.randrange(4, 36)
            cells = {(cx + x, cy + y) for x, y in lake_shape(rng, rng.randint(10, 20))}
            if place(cells, 'mud'):
                break

    for row in range(2):
        for col in range(4):
            candidates = [(x, y) for y in range(row * 20 + 1, row * 20 + 19)
                          for x in range(col * 16 + 1, col * 16 + 15)
                          if terrain[x, y] == 'grass' and (x, y) not in protected]
            if candidates:
                terrain[rng.choice(candidates)] = 'repair'
