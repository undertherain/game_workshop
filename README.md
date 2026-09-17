# Little Makers — browser Python game workshop

Little Makers teaches children Python by making small games in the browser. Short
slide-by-slide lessons start in a meadow with `fox.jump()` and build up through
variables, loops, decisions, functions and live game rules. A split-screen workshop
then opens six playable games whose controls and rules the learner writes in short
Python exercises: scenery, physics and moving objects are provided, and the child
writes the behaviors. Pip, an optional AI companion, answers questions by text or
voice, explains selected code and proposes small edits for the learner to review.
Finished games export as offline ZIPs.

Python runs locally in a browser worker using the bundled Pyodide distribution.
Everything except live AI works offline; no CDN is required.

## Run

Requires Node 22+; the test suite also requires Python 3.

```sh
npm ci
npm start
```

Open <http://localhost:4179>. The server binds to localhost. Run `npm test` for the
Node and Python suites; they spend no API credits.

Live AI is optional. Copy `.env.example` to `.env`, set `OPENAI_API_KEY` and
configure [demo invites and personal-key access](docs/demo-access.md); for a
loopback-only development shortcut, set `WORKSHOP_LOCAL_AI=1`. The server discovers
the nearest `.env` by walking up from this folder; existing environment variables
take priority, and `WORKSHOP_LOAD_DOTENV=0` disables discovery. Keys stay on the
server, and setting the shared key alone never enables AI for public visitors.
Without an AI session the interface offers built-in guided examples.

## Deploy

See the [Vercel deployment guide](docs/deployment.md) for import settings, public
host configuration, custom-domain HTTPS and launch checks. `npm run build` prepares
the browser Python assets for static hosting; local development needs no build.

## What is inside

- **Python foundations.** Seven chapters of short lessons with a meadow scene, a
  grid robot, a console guessing game and an optional drawing branch. Each lesson
  has a shareable URL, drafts persist in the browser, and a learning map recommends
  a route without locking anything. See [learning path](docs/learning-path.md).
- **Game workshop.** Space Invaders, Brick breaker, Platformer, Sky Patrol, Sokoban
  and Asteroids, each with a short history, a four-step exercise path and a
  complete, editable version. **Check** runs behavioral tests against the learner's
  code without touching the live game. See [game workshop](docs/game-workshop.md).
- **Pip.** A tutor that sees the current slide or game, the code and recent
  feedback. Typed replies are explanations with optional edits the learner applies
  by hand; voice runs over WebRTC with the key on the server. See
  [Pip tutor](docs/pip-tutor.md).
- **Learning progress.** Local, evidence-based records of practice and checked
  mechanics. Controls proven in one game can be offered in another; AI never grades
  mastery. See [learning progress](docs/pip-tutor.md#learning-progress).
- **Export.** **Download → Playable game** produces a ZIP that runs with
  `python3 play.py` and no internet, Node or API key. See
  [export](docs/game-workshop.md#export-and-play-independently).

## Editing lessons

Lessons are JSON files under `public/content/lessons/`; game exercises live under
`public/content/game-lessons/`. The manifest `public/content/lessons/index.json`
controls lesson order. The [content authoring guide](public/content/README.md)
explains the format, shared defaults, runtime modes and validation. Reload the
browser for content changes; restart the server to refresh the tutor's metadata.

## Architecture

Python owns the simulation: movement, gravity, collisions, callbacks and score.
JavaScript draws state snapshots and terminates a stalled worker. The six games
share `framework/workshop.py`, which also runs under ordinary Python for headless
tests and ships unchanged inside exported games. The Node server serves static
files and a small authenticated AI endpoint; the tutor has no tools and cannot run
or edit code.

- [Architecture and verification](docs/architecture.md)
- [Finals presentation](docs/presentation/README.md): HTML draft with live Invaders, fox and robot Python demos
- [Framework API](framework/README.md) and standalone raylib
  [examples](examples/alien_invaders/README.md)
- [Browser workspace](public/README.md), [content](public/content/README.md) and
  [tests](tests/README.md)
- [Demo AI access](docs/demo-access.md) and [deployment](docs/deployment.md)
- [Framework north star](docs/framework-north-star.md): long-term direction,
  proposed rather than committed

References: [Pyodide](https://pyodide.org/en/stable/usage/quickstart.html),
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[OpenAI Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).
