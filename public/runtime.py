"""Compatibility entry for older local scripts. Simulation lives in framework."""
import json
from framework.workshop import WorkshopGame, Actor, _error

_game = None
_scope = {}
_stars = []


def _load_game(source):
    global _game, _scope, _stars
    _game = None
    try:
        _game = WorkshopGame(source, "platformer")
        _scope, _stars = _game.simulation.scope, _game.simulation.stars
        return json.dumps({"state": _game.snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})


def _step_game(keys_json):
    try:
        return json.dumps({"state": _game.step(json.loads(keys_json))})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})
