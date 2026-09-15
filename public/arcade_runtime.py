"""Compatibility entry for older local scripts; no simulation is defined here."""
from framework.workshop import WorkshopGame, ArcadeGame, StaticScreen, Brick, Paddle, Ball
from framework.workshop_checks import check_exercise as _check_exercise

_selected_kind = "platformer"
_arcade = None
_session = None


def _load_selected(source, kind):
    global _selected_kind, _arcade, _session
    _selected_kind, _session, _arcade = kind, None, None
    if kind == "platformer":
        return _load_game(source)
    try:
        _session = WorkshopGame(source, kind)
        _arcade = _session.simulation
        return json.dumps({"state": _session.snapshot()})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})


def _step_selected(keys_json):
    if _selected_kind == "platformer":
        return _step_game(keys_json)
    try:
        return json.dumps({"state": _session.step(json.loads(keys_json))})
    except Exception as exc:
        return json.dumps({"error": _error(exc)})
