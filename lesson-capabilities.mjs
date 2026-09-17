// Tutor descriptions of public/lesson_runtime.py; parity examples are checked in tests.
const countedLoop = 'for i/step/side in range(N), with literal N from 1 to 6; indent the repeated body';
const profiles = {
  commands: {
    commands: ['fox.move()', 'fox.jump()'], syntax: ['sequential calls', '# comments', 'pass'],
    limits: ['At most two executable statements; comments and blank lines do not count.'],
  },
  'jump-design': {
    commands: ['fox.jump(height)'], syntax: ['one call', '# comments'],
    limits: ['Exactly one fox.jump(N) call; N is a whole-number literal from 40 to 180.'],
  },
  loop: {
    commands: ['fox.move()', 'fox.jump()'], syntax: ['sequential calls', countedLoop, '# comments', 'pass'],
    limits: ['At most 12 animated actions per run.'],
  },
  style: {
    commands: ['character.move()', 'character.jump()'], syntax: ['property assignments', 'sequential calls', '# comments', 'pass'],
    limits: ['Assign world.sky only "peach", "lavender", "mint" or "night"; character.costume only "fox", "cat" or "bunny".', 'At most 12 animated actions per run.'],
  },
  event: {
    commands: ['character.move()', 'character.jump()'], syntax: ['one def on_space_pressed(): with indented calls or pass', '# comments'],
    limits: ['No parameters or other top-level statements. The game calls the function on each Space press.'],
  },
  update: {
    commands: ['character.move()', 'character.jump()'], syntax: ['one def update(): with indented calls or pass', 'if keyboard.right: with an indented body', '# comments'],
    limits: ['No parameters or other top-level statements; only keyboard.right conditions, without else.', 'The lesson calls update 30 times a second; movement responds while Right is held.'],
  },
  drawing: {
    commands: ['pixel(x, y)', 'line(x1, y1, x2, y2)'], syntax: [countedLoop, 'numeric +, -, *, /, parentheses and loop-variable expressions', '# comments', 'pass'],
    limits: ['An enlarged 8-column by 5-row pixel picture. Whole-number coordinates: x from 0 to 7, y from 0 to 4; (0, 0) is the top left and y increases down.', 'pixel fills one whole cell. line fills a chain of pixel cells including both endpoints. At most 100 drawing commands per run.'],
  },
  robot: {
    commands: ['robot.move(steps)', 'robot.turn_right()'], syntax: ['sequential calls', countedLoop, 'numeric expressions for steps', '# comments', 'pass'],
    limits: ['move accepts whole-number results from 1 to 5; moves must stay on the 6-by-6 board.', 'At most 12 robot actions per run.'],
  },
  basics: {
    commands: ['fox.move(distance)', 'fox.move()', 'fox.jump()', 'fox.say(value)', 'print(value)', 'str(value)'],
    syntax: ['number, string and boolean values; assignments to learner-chosen names', 'top-level value expressions; +, -, *, / and parentheses', 'single comparisons: <, <=, >, >=, ==, !=', 'if / elif / else with a comparison, named value or boolean', 'for name in range(N), with literal N from 1 to 6', 'top-level def helpers with up to two parameters, then calls to those helpers', '# comments', 'pass'],
    limits: ['Movement distance from -300 to 300; jump takes no height argument in this mode.', 'At most 12 actions/outputs per run; numeric literals have magnitude at most 1000.', 'No string repetition. Computed strings up to 1000 characters; numeric results of magnitude at most 1000000.', 'Helpers have local scope, accept numeric arguments and may call previously defined helpers; no recursion, return statements or defaults.'],
  },
};

export function lessonCapabilities(lesson) {
  const profile = profiles[lesson.mode];
  if (!profile) throw Error(`Missing tutor capabilities for ${lesson.mode}`);
  return {
    mode: lesson.mode,
    commands: [...profile.commands], syntax: [...profile.syntax],
    limits: ['This is a bounded subset of real Python, not all of Python.', 'Programs are limited to 1000 characters and shallow nesting.', ...profile.limits],
    unavailable: ['imports', 'input()', 'while loops', 'classes', 'lists/dictionaries', 'arbitrary library calls'],
    compatibility: ['basics', 'style', 'event', 'update'].includes(lesson.mode) ? 'fox and character refer to the same supplied character; use the actor name shown by this lesson.' : undefined,
    editor: {
      available: !lesson.explanation && !lesson.quiz?.only,
      maxLines: lesson.editor?.maxLines ?? null,
      editableLine: lesson.editableLine ?? null,
      commentToggleShortcut: false,
    },
  };
}
