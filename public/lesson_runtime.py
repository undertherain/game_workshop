"""Bounded introductory Python: commands, drawing, then live event/update rules."""
import ast
import json
from types import SimpleNamespace

MODES = ('commands', 'loop', 'style', 'event', 'update', 'drawing')
_session = None


def _number(node, loop_names):
    if isinstance(node, ast.Constant) and type(node.value) in (int, float) and abs(node.value) <= 1000:
        return
    if isinstance(node, ast.Name) and node.id in loop_names:
        return
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return _number(node.operand, loop_names)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult)):
        _number(node.left, loop_names)
        _number(node.right, loop_names)
        return
    raise ValueError('Use small numbers, or a loop variable with +, - or *.')


def _validate(body, mode, loop_names=(), depth=0):
    if depth > 4:
        raise ValueError('Keep the nesting shallow in this little lesson.')
    for node in body:
        if isinstance(node, ast.Pass):
            continue
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            if call.keywords:
                raise ValueError('Use the arguments shown in this lesson.')
            if (mode != 'drawing' and isinstance(call.func, ast.Attribute)
                    and isinstance(call.func.value, ast.Name) and call.func.value.id == 'fox'
                    and call.func.attr in ('jump', 'move') and not call.args):
                continue
            if mode == 'drawing' and isinstance(call.func, ast.Name) and call.func.id in ('dot', 'line'):
                if len(call.args) != (2 if call.func.id == 'dot' else 4):
                    raise ValueError('dot(x, y) needs two numbers; line(x1, y1, x2, y2) needs four.')
                for arg in call.args:
                    _number(arg, loop_names)
                continue
        if isinstance(node, ast.For) and mode in ('loop', 'drawing'):
            it = node.iter
            if (isinstance(node.target, ast.Name) and node.target.id in ('i', 'step') and not node.orelse
                    and isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == 'range'
                    and len(it.args) == 1 and not it.keywords and isinstance(it.args[0], ast.Constant)
                    and type(it.args[0].value) is int and 1 <= it.args[0].value <= 6):
                _validate(node.body, mode, (*loop_names, node.target.id), depth + 1)
                continue
            raise ValueError('Try for i in range(3): with a number from 1 to 6, then indent your command.')
        if isinstance(node, ast.Assign) and mode == 'style' and len(node.targets) == 1:
            target = node.targets[0]
            if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and isinstance(node.value, ast.Constant):
                choices = {('world', 'sky'): ('peach', 'lavender', 'mint', 'night'), ('fox', 'costume'): ('fox', 'cat', 'bunny')}
                options = choices.get((target.value.id, target.attr), ())
                if node.value.value in options:
                    continue
            raise ValueError('Choose world.sky = "peach", "lavender", "mint" or "night"; fox.costume = "fox", "cat" or "bunny".')
        if isinstance(node, ast.If) and mode == 'update' and not node.orelse:
            test = node.test
            if isinstance(test, ast.Attribute) and isinstance(test.value, ast.Name) and test.value.id == 'keyboard' and test.attr == 'right':
                _validate(node.body, mode, loop_names, depth + 1)
                continue
        raise ValueError('This lesson uses a small vocabulary. Follow the example above; the full game editor opens up more Python.')


class Lesson:
    def __init__(self, source, mode):
        if mode not in MODES:
            raise ValueError('Choose a lesson from the learning map.')
        if not source.strip() or len(source) > 1000:
            raise ValueError('Write a small program of up to 1,000 characters.')
        tree = ast.parse(source)
        if len(list(ast.walk(tree))) > 120:
            raise ValueError('Try a smaller program for this lesson.')
        self.mode, self.actions, self.shapes = mode, [], []
        self.ticks, self.last_space, self.event_calls = 0, False, 0
        self.world = SimpleNamespace(sky='peach', score=0)
        self.fox = SimpleNamespace(x=250, y=430, vy=0, costume='fox', facing=1, on_ground=True)
        self.keyboard = SimpleNamespace(right=False)
        self.changed = False
        self.scope = {'__builtins__': {}, 'range': range, 'world': self.world, 'fox': self.fox,
                      'keyboard': self.keyboard, 'dot': self.dot, 'line': self.line}
        self.fox.jump = lambda: self.action('jump')
        self.fox.move = lambda: self.action('move')
        interactive = mode in ('event', 'update')
        if interactive:
            name = 'on_space_pressed' if mode == 'event' else 'update'
            fn = tree.body[0]
            if (len(tree.body) != 1 or not isinstance(fn, ast.FunctionDef) or fn.name != name
                    or fn.decorator_list or fn.returns or ast.dump(fn.args) != ast.dump(ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]))):
                raise ValueError(f'Keep def {name}(): and write your instruction underneath it.')
            _validate(fn.body, mode)
        else:
            if mode == 'commands' and len(tree.body) > 2:
                raise ValueError('Try one or two commands; loops come next.')
            _validate(tree.body, mode)
        exec(compile(tree, '<lesson>', 'exec'), self.scope)
        self.features = {'loop': any(isinstance(n, ast.For) for n in ast.walk(tree)),
                         'assignment': any(isinstance(n, ast.Assign) for n in ast.walk(tree))}

    def action(self, name):
        if self.mode in ('event', 'update'):
            if name == 'move':
                self.fox.x = min(800, self.fox.x + 4)
                self.changed = True
            elif self.fox.on_ground:
                self.fox.vy, self.fox.on_ground = -10, False
                self.changed = True
        else:
            if len(self.actions) >= 12:
                raise ValueError('Try at most 12 actions at a time so you can watch each one.')
            self.actions.append(name)

    def dot(self, x, y):
        self.draw('dot', [x, y])

    def line(self, x1, y1, x2, y2):
        self.draw('line', [x1, y1, x2, y2])

    def draw(self, kind, points):
        if len(self.shapes) >= 100:
            raise ValueError('Keep this drawing to 100 shapes or fewer.')
        if any(not 0 <= v <= (840 if i % 2 == 0 else 480) for i, v in enumerate(points)):
            raise ValueError('Keep x between 0 and 840, and y between 0 and 480 so your drawing stays on the grid.')
        self.shapes.append({'kind': kind, 'points': points})

    def snapshot(self):
        return {'actions': self.actions, 'shapes': self.shapes, 'features': self.features,
                'interactive': self.mode in ('event', 'update'), 'ticks': self.ticks,
                'eventCalls': self.event_calls, 'changed': self.changed,
                'player': {k: v for k, v in vars(self.fox).items() if not callable(v)}, 'world': vars(self.world)}

    def step(self, keys):
        self.keyboard.right = bool(keys.get('right'))
        self.changed = False
        space = bool(keys.get('space'))
        if self.mode == 'event' and space and not self.last_space:
            self.scope['on_space_pressed']()
            self.event_calls += 1
        if self.mode == 'update':
            self.scope['update']()
        self.last_space = space
        self.fox.vy += 0.65
        self.fox.y += self.fox.vy
        if self.fox.y >= 430:
            self.fox.y, self.fox.vy, self.fox.on_ground = 430, 0, True
        self.ticks += 1
        return self.snapshot()


def run_lesson(source, mode='commands'):
    global _session
    _session = None
    try:
        _session = Lesson(source, mode)
        return json.dumps(_session.snapshot())
    except (SyntaxError, ValueError) as error:
        return json.dumps({'error': 'Check spelling, parentheses, and indentation. Each indented line belongs to the rule above it.' if isinstance(error, SyntaxError) else str(error)})


def step_lesson(keys_json):
    if _session is None:
        return json.dumps({'error': 'Run your rule first.'})
    return json.dumps(_session.step(json.loads(keys_json)))
