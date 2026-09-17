# Finals presentation — rough opening draft

On a new machine, install Node.js 22 and run these commands from the project root:

```bash
npm ci
npm run present
```

Then open <http://localhost:4179/docs/presentation/index.html>.
On later starts, only `npm run present` is needed.
This enables Pip with your local `OPENAI_API_KEY`, loaded from the environment or
the nearest `.env` in this directory or its parents. The key stays on the server;
there is no need to enter it in the slides. The presentation server binds to
loopback only. To use port 4186, run `PORT=4186 npm run present`.
Use the local server rather than opening the HTML as a file: the playable slides
load the project's bundled browser Python and framework. The Python demos need no
AI session, API key or internet connection once dependencies are installed. Pip's
live chat and voice use the configured AI service (see below). The normal Vercel
build also includes the presentation; this change does not deploy it.

## Present

- **Right / Down arrow**: next slide. **Left / Up arrow**: previous slide.
  **N / Page Down** and **P / Page Up** also work, including during gameplay.
- **F**: fullscreen; Escape exits browser fullscreen.
- Click or Tab into an Invaders canvas to play; a green outline marks focus.
  While focused, **Left / Right** (or A / D) move and **Space** fires one shot per
  press. **Escape**, Tab, or clicking outside releases game controls and returns
  arrows to slide navigation. Entering a game slide does not grab focus.
- **R** or the Restart button: restart the current demo.
- Footer buttons also navigate. Touch devices show game buttons.
- On the fox, robot and programming-puzzle slides, edit Python and press **Ctrl/Cmd+Enter** or
  **Run Python**. Example buttons load code without running it. **Reset** restores
  the initial code and scene. **Page Up/Down** changes slides even with the editor
  focused; arrows move the editor cursor. Escape leaves the editor so arrows and
  N/P/F/R work again. Tab inserts four spaces;
  Shift+Tab moves focus out of the editor.
- On the Pip slide, the first visit runs the prefilled failing expression.
  **Run Python** (or Enter in its one-line editor) reruns the code. The example
  buttons also prefill a matching question. **Send** asks by text; **Talk to Pip**
  opens voice only on a click. Speak the question after it connects.
- The TL;DR finale loops six recorded game previews. **Pause previews** freezes
  them; **Play previews** resumes. Reduced-motion preferences start them paused.
  The two QR codes link to Little Makers and Typper.
- The Typper slide loops a muted gameplay clip. **Pause clip** / **Play clip**
  controls playback; reduced-motion preferences start it paused. It pauses when
  leaving the slide or hiding the tab, and preserves manual pause on return.

Slide links use hashes: `#intro`, `#meme`, `#framework`, `#code`, `#barebones`,
`#full-game`, `#rendering`, `#python-basics`, `#fox`, `#robot`, `#puzzles`, `#computer-graphics`, `#pip`, `#typper`, `#tldr`. The fixed 16:9 stage scales to the
window; a landscape display is best.
Python warms up on the opening slide. Games start when their slide is entered,
pause when it is left or the tab is hidden, and resume on return. Both demos have
independent state. Reloading resets the presentation's games, without touching
workshop drafts or progress. Lesson animations also pause off-slide and while the
tab is hidden. Each Run starts the fox or robot at its initial position; editor
changes remain within this page and never overwrite workshop drafts.

## Edit

`index.html` contains the fifteen slides and copy; `deck.css` controls appearance.
Add sections with the `slide` class and unique IDs before the footer to extend
the narrative. Navigation and the slide counter derive from those sections.

`barebones.py` is the exact source shown on the code slide and executed in the
worker. It adapts `examples/alien_invaders/game.py` only to shorten the completion
message for this presentation. Python owns movement, shooting and collisions;
`deck.js` draws its stock sprites. Its guarded `run()` remains valid for desktop
use but is not invoked in the browser.

The full Invaders slide loads `complete` directly from
`public/content/games/invaders.json`, runs the real `WorkshopGame` simulation,
and draws it using `public/space-scene.js`. `runtime-worker.js` hosts both games
in local Pyodide. There are no recordings, JavaScript game-rule substitutes or
workshop iframes. Worker startup/runtime failures show a retry message.

After the Invaders demos, the rendering slide shows the shared Python simulation
and the desktop raylib/browser Canvas 2D backends. Its concrete example is the
Invaders prototype's `Game`/`World` simulation; it does not imply that every
workshop game or introductory lesson has a desktop renderer.

The beginner section introduces commands and values with the fox, then repetition
with the robot. `lesson-demos.js` uses the existing `public/lesson-worker.js` and
`lesson_runtime.py` in `basics` and `robot` modes. Python validates and executes
the edited program and returns actions; the presentation animates these using
the same `scene.js`, forest artwork, `drawRobot` and `robotPose` as the lessons.
It is an action sequence demonstration, not a Python debugger. Syntax/range errors
appear below the scene; fixing the code and running again retries the worker.
The lesson workers start lazily on Run and are terminated on page departure.

The programming-puzzles slide follows the robot demonstration with a missing-rule
exercise: replace `pass` to trace the dotted square. Its optional Hint leaves the
answer to the presenter. Completion checks the executed robot path for coverage of
the square perimeter and a return to the start facing right, rather than matching
source text or accepting a robot that only rotates at the starting position.
This presentation-only feedback does not record workshop learning progress.

The computer graphics overview follows the programming puzzle, before Pip. Two
inline SVG illustrations show a whole filled pixel and the eight-cell Bresenham
line from (0, 0) to (7, 3), using the lesson's 8 × 5 coordinate model. The slide
summarizes the implemented route: pixels and coordinates, lines with loops,
Bresenham, the `line()` primitive, and moiré patterns. It is a static overview
that adds no workers or API calls. Open it directly with `#computer-graphics`.

The `#typper` slide introduces a separate project built in parallel during
the hackathon: a Japanese typing arcade, connected to Little Makers through keyboard
practice before coding. Its F/J warm-up, romaji orders and increasing difficulty
are documented in `/home/blackbird/Projects_heavy/Games/typper/README.md`.
`typper-gameplay.mp4` is an 18-second recording of real gameplay, captured with
Chromium and encoded with FFmpeg as H.264 without audio. `typper-clip.js` controls
playback. The existing `typper-gameplay.png`, copied from that project's
`assets/social/typper.png`, remains the poster and unavailable-video fallback.
The clip is bundled locally; recording tools are not presentation dependencies.
The slide works without running Typper or accessing its site;
an optional link opens <https://typper.ukeru.info/> in a new tab. It introduces no
shared runtime or integration between the two projects.

The closing `#tldr` slide summarizes the low-code Python framework with browser
and native backends, the learning portal from hello world to complete games, and
Pip. `finale.js` loops the existing `public/content/game-previews.json` snapshots
through the real `scene.js` renderers for Space Invaders, Brick breaker, Platformer,
Sky Patrol, Sokoban and Asteroids. These are recorded gameplay previews, not six
additional live Python sessions. They load on the first visit, pause off-slide or
when the document is hidden, and preserve manual pause on return.

`qr-little-makers.png` and `qr-typper.png` encode exactly
`https://game.blackbird.pw/` and `https://typper.ukeru.info/`. They are local PNGs
generated with Python qrcode 8.2, medium error correction and a four-module white
quiet zone. The displayed codes and labels are also clickable links. OpenCV decoded
both originals and their rendered screenshots at 1600 × 900 and 1280 × 720.
The QR generator is only an authoring tool; it is not a runtime dependency.

## Pip demo and voice

`pip-demo.js` introduces Pip with three editable examples: `3 + "4"` fails,
`3 + 4` adds numbers, and `"3" + "4"` joins strings. The existing lesson worker
executes them in `basics` mode. The console displays the lesson's actual error
explanation, omitting its extra fox-specific hint. Pip receives the editor source,
last-run source, displayed result and recent typed/spoken conversation under the
canonical `text-numbers` lesson context.

The slide reuses `pip-voice.js`, the shared avatar, captions, spoken code pointer,
`/api/lesson-help`, `/api/voice` and the normal AI-access dialog. Locally,
`npm run present` enables the loopback-only shortcut with your existing key.
On hosted presentations, use **AI access** to connect an invite or a personal key,
or use an already authenticated session on the same hostname;
see [demo access](../demo-access.md). Shared hosted voice still requires the existing
voice-cutoff configuration. No credentials are included in presentation assets.
An invitation can target this HTML page with its usual `#invite/...` fragment;
it is removed before slide routing, and activation remains an explicit action.

Talk requests microphone access only when clicked, on localhost or HTTPS.
Pip's controls offer mute and end, and show captions plus completed written code
answers. Changing code, selecting an example, running Python, sending a typed
question, leaving the slide or hiding the tab ends voice. Returning does not
restart the microphone. Chats remain in this page's memory and never modify code
or learning records. Without AI access, the slide labels the built-in text guide
and opens the access dialog for voice.

Browser verification uses real Python and server endpoints with simulated microphone,
WebRTC and upstream AI responses. It checks examples, tutor context, captions,
written answers, pointing, mute/end, cancellation including late microphone grants,
navigation and access gating. A real microphone-to-Pip conversation still needs a
connected AI session; these checks make no paid API requests.

The meme uses a locally saved [Drake Hotline Bling template from Imgflip](https://imgflip.com/memetemplate/Drake-Hotline-Bling),
downloaded from <https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg> on 2026-09-17.
Scratch and Python logos sit over `drake-template.jpg` as separate local images:
[`scratch-logo.png`](https://scratch.mit.edu/images/logo_sm.png) from Scratch and
[`python-logo.png`](https://www.python.org/community/logos/) from Python's official logo collection.
Replace the figure with your finished meme whenever ready.

Only `docs/presentation/` is exposed by the new server route; other project docs
remain outside the public file tree.
