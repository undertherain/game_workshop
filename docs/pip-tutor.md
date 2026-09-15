# Pip, the AI companion

Pip is a small leaf-topped forest sprite in the lesson, game and museum tutor
panels. It gives hints, explains selected code and, in the workshop, proposes small
edits for the learner to review. It answers by text and, when configured, by voice.
Without an authenticated AI session, the panels explicitly show built-in guided
examples instead. Server configuration is described in
[demo access](demo-access.md).

The avatar blinks, looks thoughtful while a reply is pending, and adopts a listening
pose during voice. Its mouth reacts to outgoing voice audio when browser audio
analysis is available. Reduced-motion preferences keep the expressions static.

## In the game workshop

Pip's workshop greeting follows the selected exercise. Typed and voice context
distinguish museum browsing, exercises and complete games.

Pip receives the selected template and exercise, check feedback, local
learning-progress evidence, the question, current code, selected line, recent
conversation, error and a compact game snapshot. It has no tools and cannot edit
files or execute code. It returns an explanation, a line reference and an optional
replacement. Suggestions never apply automatically: the learner applies them with
**Try this edit** and then presses **Run**. The server does not record
conversations.

## Slide tutor

**Ask Pip** sits beside each lesson on desktop and below it on narrow screens. Ask a
question about Python, your code or game making, or choose **Explain this** /
**What’s next?**. Pip answers general Python questions directly. It distinguishes
language features from editor conveniences and from the subset the current activity
can run; the lesson does not limit which concepts can be discussed.

Pip receives the current slide’s instructions and examples, editor code and last-run
feedback, the ordered lesson route with exact slide distances, visited/practised
lesson evidence, and a high-level outline of other chapters, drawing and games,
including planned activities. It also receives explicit supported commands, syntax,
runtime limits and editor restrictions, separately from the current lesson’s
teaching focus, so it can explain where `fox` comes from or that a topic is two
slides ahead without assuming skipped slides were studied.

Replies are explanations only; they do not change or run code. Each slide’s recent
chat stays in memory during the visit; reloading clears conversations. Navigating to
another slide cancels its pending reply. Restart the server after updating tutor
code or lesson content.

## Voice

The Pip panels offer **Talk to Pip**, **Mute mic** and **End voice**. Spoken messages
stream into the same chat as typed messages. Voice uses `gpt-live-1` with the Marin
voice; coding questions delegate to the `OPENAI_MODEL` tutor (default
`gpt-5.4-mini`). The server needs an invite or personal-key session with access to
GPT-Live, plus the hosted voice cutoff configuration in [demo access](demo-access.md).
Use localhost or HTTPS and allow microphone access when prompted.

The live voice prompt contains the learning-through-games goal, conversation
guidance, current activity focus, runtime capabilities and a compact curriculum
outline. The backend tutor holds the current lesson details, code, progress and
ordered lesson summaries. It answers programming and curriculum questions with
concise explanations and exact short Python examples. Completed voice-tutor answers
containing code appear in chat as **Written answer**, preserving syntax such as
`str(3)` separately from speech captions. Pip is instructed to pronounce `str` as
the letters “S T R” or call it the string function. Full content for every lesson
is not packed into the live prompt, and no curriculum search tool is installed.

Audio travels directly between the browser and OpenAI over WebRTC; the API key
stays on the server. The UI identifies Pip as an AI voice. Sessions request
`store: false`; the app does not record audio. Spoken messages remain in the
current chat's in-memory history, including across voice calls, and clear on
reload. Nearby speech fragments are grouped for display; these are not
authoritative turn boundaries.

### Voice lifecycle

Voice offers explanations only. Pip receives a snapshot of the current lesson or
game, code, feedback, progress and recent typed and spoken conversation when the
call starts. Changing activity, changing code or run feedback, or leaving the tab
ends voice; start it again to share the new context. Sending a typed question ends
voice and continues the same chat.

Mute disables microphone transmission while keeping Pip audible. End voice releases
the microphone immediately and waits up to five seconds for session-close
confirmation. Moving between slides, opening the map or another game, expanding a
game, hiding the tab and leaving the page close the microphone, audio playback and
voice connection immediately, including a call already waiting for confirmation.
Returning never restarts capture. Cancelling while connecting aborts setup; a
microphone stream granted after cancellation is stopped as soon as it arrives. The
server also cancels pending voice setup when the browser disconnects. Hosted calls
end at the configured time limit.

Protocol reference: [OpenAI Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).

### Editor pointer

As Pip names an editor line aloud, a purple sparkle and soft highlight point to it
in either editor. The pointer follows arriving captions, so timing is approximate.
It leaves focus, selection and code untouched, and scrolls within the editor when
the named line is out of view. It clears on learner speech captions, code or
activity changes, voice ending, or eight seconds without output captions. Reading
slides have no editor pointer.

## Learning progress

Progress is local to this browser; there are no accounts or cross-device sync.
Running a meaningful lesson example records **practice**, not mastery. Opening a
slide records a visit, not practice. A successful game behavior check records
**checked** evidence for movement, the game's second mechanic, or scoring. Accepted
AI edits mark subsequent checks in that draft as **assisted**; this deliberately
conservative classification is not a judgement of the learner's ability.

When movement has passed a check in one game without recorded assistance, another
game can offer its controls already included. This is optional and available only
when the target editor exactly matches its starter: existing custom drafts are not
replaced. The learner can preview both rules, include them and move to exercise
two, or practise controls again. Inclusion is undoable and requires Run to affect
play. Those controls are recorded as **supplied**, so checking them does not
establish independent movement evidence. Later mechanics written by the learner can
still receive their own checked evidence.

Pip receives these bounded progress records alongside the current context and can
refer to earlier practice when helping. Recommendations and transfer eligibility use
explicit local rules; AI does not grade mastery or change the learner's curriculum.
