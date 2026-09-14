"""Bounded introductory Python: commands, drawing, then live event/update rules."""
import ast
import json
from types import SimpleNamespace

MODES = ('commands', 'loop', 'style', 'event', 'update', 'drawing', 'basics', 'robot', 'jump-design')
_session = None


def _number(node, loop_names):
    if isinstance(node, ast.Constant) and type(node.value) in (int, float) and abs(node.value) <= 1000:
        return
    if isinstance(node, ast.Name) and node.id in loop_names:
        return
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return _number(node.operand, loop_names)
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
        _number(node.left, loop_names)
        _number(node.right, loop_names)
        return
    raise ValueError('Use small numbers or a name you have already defined, with +, - or *.')


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
            if (mode == 'robot' and isinstance(call.func, ast.Attribute)
                    and isinstance(call.func.value, ast.Name) and call.func.value.id == 'robot'):
                if call.func.attr == 'turn_right' and not call.args:
                    continue
                if call.func.attr == 'move' and len(call.args) == 1:
                    _number(call.args[0], loop_names)
                    continue
            if (mode not in ('drawing', 'robot') and isinstance(call.func, ast.Attribute)
                    and isinstance(call.func.value, ast.Name) and call.func.value.id in (('fox', 'character') if mode in ('style', 'event', 'update') else ('fox',))
                    and call.func.attr in ('jump', 'move') and not call.args):
                continue
            if mode == 'drawing' and isinstance(call.func, ast.Name) and call.func.id in ('dot', 'line'):
                if len(call.args) != (2 if call.func.id == 'dot' else 4):
                    raise ValueError('dot(x, y) needs two numbers; line(x1, y1, x2, y2) needs four.')
                for arg in call.args:
                    _number(arg, loop_names)
                continue
        if isinstance(node, ast.For) and mode in ('loop', 'drawing', 'robot'):
            it = node.iter
            if (isinstance(node.target, ast.Name) and node.target.id in ('i', 'step', 'side') and not node.orelse
                    and isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == 'range'
                    and len(it.args) == 1 and not it.keywords and isinstance(it.args[0], ast.Constant)
                    and type(it.args[0].value) is int and 1 <= it.args[0].value <= 6):
                _validate(node.body, mode, (*loop_names, node.target.id), depth + 1)
                continue
            raise ValueError('Try for i in range(3): with a number from 1 to 6, then indent your command.')
        if isinstance(node, ast.Assign) and mode == 'style' and len(node.targets) == 1:
            target = node.targets[0]
            if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and isinstance(node.value, ast.Constant):
                choices = {('world', 'sky'): ('peach', 'lavender', 'mint', 'night'), ('fox', 'costume'): ('fox', 'cat', 'bunny'), ('character', 'costume'): ('fox', 'cat', 'bunny')}
                options = choices.get((target.value.id, target.attr), ())
                if node.value.value in options:
                    continue
            raise ValueError('Choose world.sky = "peach", "lavender", "mint" or "night"; character.costume = "fox", "cat" or "bunny".')
        if isinstance(node, ast.If) and mode == 'update' and not node.orelse:
            test = node.test
            if isinstance(test, ast.Attribute) and isinstance(test.value, ast.Name) and test.value.id == 'keyboard' and test.attr == 'right':
                _validate(node.body, mode, loop_names, depth + 1)
                continue
        raise ValueError('This lesson uses a small vocabulary. Follow the example above; the full game editor opens up more Python.')


_RESERVED = {'fox', 'character', 'world', 'keyboard', 'range', 'dot', 'line', 'str', 'print'}


def _name(name, functions):
    if name.startswith('_') or name in _RESERVED or name in functions:
        raise ValueError('Choose your own name, such as distance or cross_gap.')


def _value(node, names):
    if isinstance(node, ast.Constant) and type(node.value) in (str, bool):
        return
    if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
        _value(node.left, names)
        _value(node.right, names)
        return
    if isinstance(node, ast.Compare) and len(node.ops) == 1 and isinstance(node.ops[0], (ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq)):
        _value(node.left, names)
        _value(node.comparators[0], names)
        return
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'str' and len(node.args) == 1 and not node.keywords:
        _value(node.args[0], names)
        return
    _number(node, names)


def _calculate(left, right, op):
    if op == 'Mult' and (isinstance(left, str) or isinstance(right, str)):
        raise ValueError('Use + to join text. Try multiplication with two numbers.')
    result = {'Add': lambda: left + right, 'Sub': lambda: left - right,
              'Mult': lambda: left * right, 'Div': lambda: left / right}[op]()
    if (isinstance(result, str) and len(result) > 1000) or (type(result) in (int, float) and abs(result) > 1000000):
        raise ValueError('Try a smaller value in this little lesson.')
    return result


class _Expressions(ast.NodeTransformer):
    def visit_BinOp(self, node):
        self.generic_visit(node)
        return ast.copy_location(ast.Call(func=ast.Name(id='_calculate', ctx=ast.Load()),
            args=[node.left, node.right, ast.Constant(type(node.op).__name__)], keywords=[]), node)


def _basics(body, names=None, functions=None, depth=0):
    """Validate sequential names and acyclic, top-level helper functions."""
    names = set() if names is None else set(names)
    functions = {} if functions is None else dict(functions)
    if depth > 4:
        raise ValueError('Keep the nesting shallow in this little lesson.')
    for node in body:
        if isinstance(node, ast.Pass):
            continue
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            _name(name, functions)
            _value(node.value, names)
            names.add(name)
            continue
        if isinstance(node, ast.FunctionDef) and depth == 0:
            _name(node.name, functions)
            args = node.args
            if (node.name in names or node.decorator_list or node.returns or args.posonlyargs
                    or args.vararg or args.kwarg or args.kwonlyargs or args.defaults
                    or len(args.args) > 2 or any(a.annotation for a in args.args)):
                raise ValueError('Use def routine(): or up to two simple parameters, with no defaults.')
            params = [a.arg for a in args.args]
            for param in params:
                _name(param, {**functions, node.name: 0})
            if len(set(params)) != len(params):
                raise ValueError('Give each parameter a different name.')
            # Helpers use their own parameters and local variables, not outer variables.
            # Only already defined helpers can be called; recursion cannot enter execution.
            _basics(node.body, params, functions, depth + 1)
            functions[node.name] = len(params)
            continue
        if depth == 0 and isinstance(node, ast.Expr) and not isinstance(node.value, ast.Call):
            _value(node.value, names)
            continue
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            call = node.value
            if not call.keywords:
                if isinstance(call.func, ast.Attribute) and isinstance(call.func.value, ast.Name) and call.func.value.id in ('fox', 'character') and call.func.attr == 'say' and len(call.args) == 1:
                    _value(call.args[0], names)
                    continue
                if isinstance(call.func, ast.Name) and call.func.id == 'print' and len(call.args) == 1:
                    _value(call.args[0], names)
                    continue
                if (isinstance(call.func, ast.Attribute) and isinstance(call.func.value, ast.Name)
                        and call.func.value.id in ('fox', 'character')
                        and ((call.func.attr == 'jump' and not call.args)
                             or (call.func.attr == 'move' and len(call.args) <= 1))):
                    for arg in call.args:
                        _number(arg, names)
                    continue
                if isinstance(call.func, ast.Name) and call.func.id in functions:
                    if len(call.args) != functions[call.func.id]:
                        raise ValueError(f'{call.func.id} needs {functions[call.func.id]} argument(s).')
                    for arg in call.args:
                        _number(arg, names)
                    continue
        if isinstance(node, ast.For) and isinstance(node.target, ast.Name) and not node.orelse:
            it = node.iter
            _name(node.target.id, functions)
            if (isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == 'range'
                    and not it.keywords and len(it.args) == 1 and isinstance(it.args[0], ast.Constant)
                    and type(it.args[0].value) is int and 1 <= it.args[0].value <= 6):
                _basics(node.body, names | {node.target.id}, functions, depth + 1)
                continue
        if isinstance(node, ast.If):
            test = node.test
            if isinstance(test, (ast.Compare, ast.Name)) or (isinstance(test, ast.Constant) and type(test.value) is bool):
                _value(test, names)
                _basics(node.body, names, functions, depth + 1)
                _basics(node.orelse, names, functions, depth + 1)
                continue
        raise ValueError('Use numbers, named values, +, - or *, move/jump, a bounded loop, a named routine, or an if comparison.')


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
        self.character = SimpleNamespace(x=250, y=430, vy=0, costume='fox', facing=1, on_ground=True)
        self.keyboard = SimpleNamespace(right=False)
        self.changed = False
        self.robot = {'x': 1, 'y': 1, 'turns': 0}
        self.scope = {'__builtins__': {}, 'range': range, 'world': self.world, 'fox': self.character, 'character': self.character,
                      '_calculate': _calculate, 'str': str, 'print': self.say, 'keyboard': self.keyboard, 'dot': self.dot, 'line': self.line}
        self.character.say = self.say
        self.character.jump = lambda height=110: self.actions.append({'kind': 'jump', 'height': height}) if mode == 'jump-design' else self.action('jump')
        self.character.move = lambda distance=80: self.action('move', distance)
        if mode == 'robot':
            self.scope['robot'] = SimpleNamespace(move=self.robot_move, turn_right=self.robot_turn)
        interactive = mode in ('event', 'update')
        if interactive:
            name = 'on_space_pressed' if mode == 'event' else 'update'
            fn = tree.body[0]
            if (len(tree.body) != 1 or not isinstance(fn, ast.FunctionDef) or fn.name != name
                    or fn.decorator_list or fn.returns or ast.dump(fn.args) != ast.dump(ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]))):
                raise ValueError(f'Keep def {name}(): and write your instruction underneath it.')
            _validate(fn.body, mode)
        elif mode == 'jump-design':
            hint = 'Choose a whole-number jump height from 40 to 180, like fox.jump(100).'
            node = tree.body[0] if len(tree.body) == 1 else None
            call = node.value if isinstance(node, ast.Expr) else None
            if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
                    and isinstance(call.func.value, ast.Name) and call.func.value.id == 'fox'
                    and call.func.attr == 'jump' and len(call.args) == 1 and not call.keywords
                    and isinstance(call.args[0], ast.Constant) and type(call.args[0].value) is int
                    and 40 <= call.args[0].value <= 180):
                raise ValueError(hint)
        else:
            if mode == 'commands' and len(tree.body) > 2:
                raise ValueError('Try one or two commands; loops come next.')
            if mode == 'basics':
                _basics(tree.body)
            else:
                _validate(tree.body, mode)
        execution = tree
        if mode == 'basics':
            import copy
            execution = _Expressions().visit(copy.deepcopy(tree))
            for original, node in zip(tree.body, execution.body):
                if isinstance(node, ast.Expr) and not isinstance(original.value, ast.Call):
                    node.value = ast.Call(func=ast.Attribute(value=ast.Name(id='fox', ctx=ast.Load()), attr='say', ctx=ast.Load()), args=[node.value], keywords=[])
            ast.fix_missing_locations(execution)
        exec(compile(execution, '<lesson>', 'exec'), self.scope)
        self.features = {'loop': any(isinstance(n, ast.For) for n in ast.walk(tree)),
                         'assignment': any(isinstance(n, ast.Assign) for n in ast.walk(tree)),
                         'expression': any(isinstance(n, ast.BinOp) for n in ast.walk(tree)),
                         'function': any(isinstance(n, ast.FunctionDef) for n in ast.walk(tree)),
                         'parameter': any(isinstance(n, ast.FunctionDef) and n.args.args for n in ast.walk(tree)),
                         'comparison': any(isinstance(n, ast.Compare) for n in ast.walk(tree)),
                         'condition': any(isinstance(n, ast.If) for n in ast.walk(tree))}

    def say(self, value):
        if type(value) not in (str, int, float, bool):
            raise ValueError('Say a word, a number, or True or False.')
        if len(self.actions) >= 12:
            raise ValueError('Try at most 12 actions at a time so you can watch each one.')
        self.actions.append({'kind': 'say', 'text': str(value)[:1000]})

    def robot_action(self, target, label):
        if len(self.actions) >= 12:
            raise ValueError('Try at most 12 robot instructions in one run.')
        self.actions.append({'kind': 'robot', 'from': dict(self.robot), 'to': target, 'label': label})
        self.robot = target

    def robot_move(self, steps):
        if type(steps) is not int or not 1 <= steps <= 5:
            raise ValueError('Move a whole number of tiles from 1 to 5: robot.move(3).')
        dx, dy = ((1, 0), (0, 1), (-1, 0), (0, -1))[self.robot['turns'] % 4]
        target = {**self.robot, 'x': self.robot['x'] + dx * steps, 'y': self.robot['y'] + dy * steps}
        if not (0 <= target['x'] <= 5 and 0 <= target['y'] <= 5):
            raise ValueError('That move leaves the board. Try fewer tiles, or turn before moving. Run starts at START again.')
        self.robot_action(target, f'move({steps})')

    def robot_turn(self):
        self.robot_action({**self.robot, 'turns': self.robot['turns'] + 1}, 'turn right')

    def action(self, name, distance=80):
        if name == 'move' and not -300 <= distance <= 300:
            raise ValueError('Choose a movement distance between -300 and 300.')
        if self.mode in ('event', 'update'):
            if name == 'move':
                self.character.x = min(800, self.character.x + 4)
                self.changed = True
            elif self.character.on_ground:
                self.character.vy = -10
                self.character.on_ground = False
                self.changed = True
        else:
            if len(self.actions) >= 12:
                raise ValueError('Try at most 12 actions at a time so you can watch each one.')
            self.actions.append({'kind': name, 'distance': distance} if self.mode == 'basics' and name == 'move' else name)

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
                'robot': self.robot,
                'interactive': self.mode in ('event', 'update'), 'ticks': self.ticks,
                'eventCalls': self.event_calls, 'changed': self.changed,
                'player': {k: v for k, v in vars(self.character).items() if not callable(v)}, 'world': vars(self.world)}

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
        self.character.vy += 0.65
        self.character.y += self.character.vy
        if self.character.y >= 430:
            self.character.y, self.character.vy, self.character.on_ground = 430, 0, True
        self.ticks += 1
        return self.snapshot()


def run_lesson(source, mode='commands'):
    global _session
    _session = None
    try:
        _session = Lesson(source, mode)
        return json.dumps(_session.snapshot())
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError, NameError) as error:
        message = str(error)
        if isinstance(error, SyntaxError):
            message = 'Text needs a quote at both ends. Try fox.say("Hi!").' if 'string literal' in message else 'Check spelling, parentheses, and indentation. Each indented line belongs to the rule above it.'
        elif isinstance(error, TypeError):
            message = 'Text and numbers are different kinds of value. To join them, try fox.say("Age: " + str(8)).'
        elif isinstance(error, ZeroDivisionError):
            message = 'We cannot divide by zero. Try another number after /.'
        return json.dumps({'error': message})


def step_lesson(keys_json):
    if _session is None:
        return json.dumps({'error': 'Run your rule first.'})
    return json.dumps(_session.step(json.loads(keys_json)))
