# Prototype checks

Run `npm test` from the prototype root. Python checks cover real game behavior and
error reporting. Node checks cover tutor edit validation and the HTTP/API boundary
with a fake upstream response; they do not spend API credits. Browser smoke checks
are performed separately against the running local prototype.

Return to the [prototype README](../README.md).

`test_lessons.py` checks introductory Python execution, loop/drawing limits,
numeric expressions, calculator output, speech values, friendly errors, bounded text
operations, parameterized helper calls, comparison boundaries,
unsafe/recursive-source rejection, properties, event edges, continuously called update rules, and invalid-source
recovery. `progress.test.mjs` checks persistence, evidence classifications, bounded
tutor context and optional control starters against the actual Python game checks.

`test_arcade.py` also runs the optional framework example through existing exercise
checks and verifies live brick collisions, stationary bricks, paddle bounds and
snapshot serialization with the explicit object types.

`test_topdown.py` exercises the standalone framework without a display: rectangular
maps, strict edges, normalized and bounded movement, camera resizing and culling,
repeatable tank-battle terrain and artwork, frame-time handling and JSON snapshots. The raylib host
also received a three-frame desktop smoke check with real texture loading and cleanup.

Browser checks cover autocomplete, prediction, loops, appearance edits, live lesson
controls, drawing, map navigation, movement checks and transfer, draft preservation,
reload persistence, and mobile width. Use an isolated browser profile for checks
that reset test progress; do not clear the learner's own browser data.

`content.test.mjs` validates lesson files and manifests, checks malformed or missing
content, and executes starters through the Python runtimes.

`editor-guidance.test.mjs` checks scope-based anchors, shifted lines, saved rule
regions, and protection of provided code. Browser checks exercise actual typing,
placeholder selection, multiline replacement, deletion boundaries, undo and unlock.
`editor-highlights.test.mjs` runs the editor handlers with a minimal DOM stub to
check stale helper highlights, Enter/Tab edits, proposal application and switching
exercises after earlier edits shift the target function.

`test_tile_interactions.py` covers framework-owned spawn/movement bounds, solid
actors, wall sliding and tunneling, terrain speed changes, entry/exit/stay hooks,
projectile pass-through and ordered impacts, brick replacement, friendly fire,
expiry, repairs, battle restart and optional smooth camera following. Camera checks
cover stationary catch-up, 30/144 Hz equivalence, disabling follow and oversized
viewports. The tank renderer was checked in a short automatically closing window.

`test_tile_variants.py` verifies seeded appearance diversity, stable redraws,
background consistency, tile replacement and unchanged movement behavior.

`test_alien_invaders.py` exercises the short example through the shared simulation:
bounded ship movement, stationary aliens, one shot per press, missed-shot cleanup,
clearing the row through actual hits, empty Game defaults and playfield fitting.
A three-frame desktop smoke check also verified the built-in pixel sprites and
captured the ship, aliens and a moving shot with the real raylib host.

The lesson runtime checks also cover robot square endpoints and heading, incomplete
patrols, board/step/action limits and recovery; boolean variables and skipped blocks;
and guessing-game branch outputs across changing secrets and exact-match boundaries.

`lesson-tutor.test.mjs` checks canonical slide context, exact upcoming-slide distances,
visited versus practice evidence, planned topics, bounded history, offline behavior
and explanation-only AI responses through the HTTP endpoint with a fake upstream.
