# Prototype checks

Run `npm test` from the prototype root. Python checks cover real game behavior and
error reporting. Node checks cover tutor edit validation and the HTTP/API boundary
with a fake upstream response; they do not spend API credits. Browser smoke checks
are performed separately against the running local prototype.

Return to the [prototype README](../README.md).

`test_lessons.py` checks introductory Python execution, loop/drawing limits,
properties, event edges, continuously called update rules, and invalid-source
recovery. `progress.test.mjs` checks persistence, evidence classifications, bounded
tutor context and optional control starters against the actual Python game checks.

Browser checks cover autocomplete, prediction, loops, appearance edits, live lesson
controls, drawing, map navigation, movement checks and transfer, draft preservation,
reload persistence, and mobile width. Use an isolated browser profile for checks
that reset test progress; do not clear the learner's own browser data.

`content.test.mjs` validates lesson files and manifests, checks malformed or missing
content, and executes starters through the Python runtimes.

`editor-guidance.test.mjs` checks scope-based anchors, shifted lines, saved rule
regions, and protection of provided code. Browser checks exercise actual typing,
placeholder selection, multiline replacement, deletion boundaries, undo and unlock.
