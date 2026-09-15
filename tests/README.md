# Prototype checks

Run `npm test` from the prototype root. Python checks cover real game behavior and
error reporting. Node checks cover tutor edit validation and the HTTP/API boundary
with a fake upstream response; they do not spend API credits. Browser smoke checks
are performed separately against the running local prototype.

Return to the [prototype README](../README.md).

`test_workshop_framework.py` verifies independent game instances, snapshot detachment,
repeatable input replay, restart and teaching-check isolation for all three templates.
`export-game.test.mjs` validates the export endpoint and extracts each ZIP into a
temporary directory. An isolated Python subprocess imports only the bundled
framework and must reproduce the repository simulation's snapshots for the same
inputs. Checks also verify exact Unicode draft preservation, ZIP integrity, matching
runtime/artwork bytes, restricted framework routes and rejected export requests.
Export deliberately packages unfinished or invalid source without executing it.

An isolated Chromium smoke check verifies actual Pyodide workshop play, the download
button, the extracted Python launcher, all three exported players, keyboard controls,
scoring, restart, mobile layout, subfolder hosting and infinite-loop recovery. During
exported play, workshop and external HTTPS requests are blocked.

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

`voice.test.mjs` checks fixed GPT-Live configuration, canonical lesson/game context,
server-only credentials, origin and size validation, offline behavior and recovery
from upstream failures. It also covers overlapping speaker fragments updating shared
chat entries and seeding a new voice session with recent chat history.
An isolated Chromium check with simulated microphone,
WebRTC and API responses also verified captions, mute, graceful close, cancellation
while microphone permission is pending, failure cleanup, code-change cleanup and
mobile width, plus spoken messages in the main chat, history sent on reconnect, and
restoring spoken messages after navigating away and back. A real microphone conversation and live delegated tutor reply still
need end-to-end testing in this app; the earlier Voice playground smoke test does
not establish those behaviors here.

`pip-pointer.test.mjs` covers fragmented spoken references, invalid/blank targets,
interruption and stale output, timeout cleanup, and canonical numbered voice context.
An isolated Chromium check with simulated voice events verified pointer movement
in both editors, guided-line alignment at desktop/mobile sizes, focus and selection
preservation, game-editor scrolling, reading slides, edits, and voice-stop cleanup.
Live microphone-to-highlight timing still needs a real conversation.

`voice-lifecycle.test.mjs` runs the browser voice controller with controlled media
and transport promises. It verifies explicit Talk startup, immediate navigation
cleanup, pagehide/visibility cleanup during graceful shutdown, late permission and
connection results, switching panels, remote audio release, close acknowledgement/
timeout, failure recovery, and no automatic restart on return. The voice endpoint
test also verifies that cancelling a browser request aborts pending upstream setup
and permits a fresh connection. An isolated Chromium check using simulated microphone
and WebRTC verified real Next/Back/map navigation, page departure, returning with
capture off, stale callbacks, late permission, and reconnecting via Talk.

`lesson-capabilities.test.mjs` verifies canonical capabilities for all lesson modes,
editor constraints, accepted/rejected examples through the real Python runtime,
the split between teaching focus and executable scope, separate voice/chat output
contracts, and selected-game API context. These checks validate prompt construction;
they do not guarantee model behavior. Prompt changes should also be checked with
representative questions, including general Python questions and corrections to an
earlier interpretation.
Live text probes of the voice backend prompt covered a C-style-comment clarification,
general Python keyboard input, whether input() runs in the current cell, and the
location of loop lessons. The general-input probe exposed an unnecessary local
disclaimer; after revising the prompt it answered the language question without one.
These are backend answer checks, not an end-to-end spoken conversation evaluation.


Museum checks verify all complete programs pass movement, the second mechanic and
scoring; export checks bundle those complete versions and compare isolated replay.
Editor regressions cover Pip's restored fourth-exercise greeting, clearing earlier
conversation, and separate complete-game storage/reset/undo. Voice checks cover the
museum, exercise and complete-game contexts. Browser smoke checks cover museum chat,
complete playback, returning to lesson drafts and mobile width. Live AI replies and
real microphone conversations are not covered by those deterministic checks.


`test_sokoban.py` independently solves the three original rooms and replays the
solutions through real input. It covers blocked pushes, no pulling, no double pushes,
undo after winning, next-room reset, held-key timing, custom maps, invalid return
values and exercise checks against incorrect rules. Complete-program and export
checks include Sokoban. Browser checks exercise actual Pyodide, keyboard movement,
undo/next, guided edits, custom boards, ZIP download and the exported player with
workshop and external requests blocked. Asteroids remains a planned exhibit.
