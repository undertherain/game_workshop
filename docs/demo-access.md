# Demo AI access

The server key is never sent to the browser. Every paid chat and voice setup
resolves an authenticated session before selecting a key and reserving allowance.
Anonymous visitors receive the built-in guide and can still run lessons and games.

## Configure a hosted demo

1. Use a key belonging to the dedicated OpenAI demo project. Configure its hard
   spend limit separately in OpenAI. The app limits below count requests, not dollars.
2. Configure an Upstash Redis database and add `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` to Vercel's server environment. Keep the same database
   and `WORKSHOP_REDIS_PREFIX` for every instance and deployment of this demo.
3. Generate `WORKSHOP_SESSION_SECRET` with the command in `.env.example` and place
   it in the server environment. It is an AES-256-GCM encryption key, not an OpenAI
   credential. Set the dedicated `OPENAI_API_KEY` there too.
4. Set `WORKSHOP_DEMO_EXPIRES_AT` to an explicit closing time including timezone,
   for example `2026-09-17T00:00:00+09:00`.
   Without a future closing time, shared demo AI is disabled.
5. For voice, set `QSTASH_TOKEN`, the QStash API URL shown for your account in
   `QSTASH_URL`, and `WORKSHOP_VOICE_CALLBACK_URL` to the deployed public
   `https://game.blackbird.pw/api/voice-expire` endpoint. That hostname must be
   accepted by `WORKSHOP_PUBLIC_ORIGINS`. The callback must be accessible to QStash
   without Vercel deployment protection. Application authentication still protects it.
6. Redeploy after updating environment variables. Check the default limits below.

Never put credentials in `public/`, Git, URLs, client environment variables, or
screenshots. Local `.env` remains ignored. Do not put an OpenAI Admin API key in
this app; the app does not manage project spending settings.

## Create and revoke invitations

Set the same Redis credentials, prefix, session secret and demo closing time in
your ignored local `.env`. From the project root:

```sh
npm run demo-access -- invite https://game.blackbird.pw
npm run demo-access -- usage
npm run demo-access -- revoke REVOKE_ID
```

The first command prints a reusable link and a separate revoke ID. Anyone with
the link can activate it, including returning visitors and people it is forwarded to. A link expires at the earlier of 24 hours after creation or the
configured demo closing time. The visitor clicks **Activate demo AI**, exchanging
the invite for an opaque session cookie. Merely previewing the link does not redeem
it. The URL fragment is removed before lesson routing starts and never enters HTTP
access logs. Opening it to check the demo does not consume the link.

Sessions belong to the hostname where they were activated. After clearing cookies,
disconnecting or using another browser, reopen the same invite to reconnect until
it expires. All sessions using a link share its original allowance and expiry;
reactivation never resets or extends them. Revoking the printed ID blocks new
activations and subsequent requests from every session using that link. An already running voice
call retains its scheduled cutoff. The revoke ID cannot activate the invite.

Set `WORKSHOP_DEMO_ENABLED=0` and redeploy to block new shared-key requests for all
invites. Existing voice calls retain their scheduled cutoff. For urgent shutdown
also revoke the demo project's key in OpenAI; account-level enforcement is separate.

## Enforced request allowances

| Scope | Default |
| --- | --- |
| Each invite link, shared across all its visitors and its lifetime | 50 chat requests; 3 voice calls |
| Whole demo, across all invites and dates | 500 chat requests; 30 voice calls |
| Each hosted personal key, per UTC day | 200 chat requests; 10 voice calls |
| Each invite or personal key | 6 AI requests per fixed minute |
| Shared demo / personal-key traffic, separately | 30 AI requests per fixed minute |
| Voice | 120-second scheduled cutoff; one start per identity per 150 seconds |
| Session connections | 30 attempts per fixed minute across the deployment |
| Typed and delegated responses | At most 1,800 output tokens per response |

The configurable values are in `.env.example`. Setting a quota to zero disables
that category for hosted sessions. Temporary localhost personal-key sessions and
the explicit local AI shortcut have no chat/voice request counters, per-minute AI
limits or voice-start cooldowns. The per-call voice duration still applies.
Byte and curriculum-validation limits bound incoming requests;
model choices and voice data-channel permissions are server-owned. Browser clients
can close a voice session but cannot change its delegated model, prompt, tools or
token settings. Provider requests never follow redirects with credentials.

Redis Lua scripts atomically reserve all applicable allowances before an upstream
request. Failed, cancelled and timed-out upstream attempts still consume allowance;
retries cannot turn failures into unlimited spend. Counters are shared across Vercel
instances. Demo counters persist for ten years and never reset at midnight or on
deployment. Do not flush Redis or change its prefix to restart a deployment: doing
so also resets those counters. The store must retain live keys without eviction.
Personal-key identity uses an HMAC fingerprint, so reconnecting the same key retains
its daily usage. Per-minute limits use fixed windows, so a boundary can admit two
windows' worth of requests in a short interval; total limits still apply.

Missing session storage, failed reservations, and malformed limit-store responses
block paid requests. Missing voice scheduling disables hosted voice while retaining
typed AI. The public `/api/status` response contains access state and remaining
personal allowance, never credentials. The total demo allowance is visible through
the operator's `usage` command; reaching it returns a clear error to visitors.

## Voice cutoff and its limits

After OpenAI creates a voice session, the server encrypts its hangup credential in
Redis and schedules an authenticated QStash callback. It returns SDP only after the
queue confirms scheduling. If scheduling fails, the server attempts an immediate
hangup and returns an error. The callback requests OpenAI hangup even if the browser
ignores its own timer or the originating Vercel instance has stopped. Failed hangups
return errors for eight queue retries. Queue authentication uses a unique random
per-call bearer token; the OpenAI key never goes to QStash or the browser.

This is an enforced scheduled cutoff, **not a guaranteed exact billing deadline**:
queue delays, outages, or an unavailable OpenAI hangup endpoint can extend a call.
The app's request caps are not a hard dollar cap, and delegated voice responses
are billed separately. Keep the dedicated OpenAI project hard spend limit as the
independent financial backstop. Monitor failed QStash deliveries during the demo.
Test a real cutoff on the deployed hostname before distributing invites; local
fake-upstream tests do not establish production queue delivery.

## Personal keys and disconnect

**AI access → Enter your own OpenAI API key** submits the key over same-origin
HTTPS. The server stores it in an encrypted eight-hour session and issues an opaque
`Secure; HttpOnly; SameSite=Strict` cookie. The input clears on submit and close;
the key is not written to localStorage or sessionStorage. Invalid/rejected keys
never fall back to the shared key. The actual OpenAI request validates account and
model access, so connecting a syntactically valid key does not prove it works.

Disconnect stops the current voice call before deleting the session. If hangup or
storage is unavailable, the server returns an error so the deletion can be retried.
Voice hangup records retain encrypted credentials until successful cleanup, with
a maximum 24-hour TTL to permit queued retries after a service outage. They are
separate from the eight-hour chat session. Browser navigation also requests early
hangup; the scheduled cutoff remains the independent fallback.

## Local development and verification

Set `WORKSHOP_LOCAL_AI=1` explicitly to use the shared key on an actual loopback
request without an invite. This shortcut is disabled on Vercel and for public
origins. It uses a process timer for voice; it is not the hosted
security configuration. On actual loopback requests, personal keys also work without
Redis or a session secret: the server creates an encrypted in-memory session with
a temporary secret. Sessions clear when the server restarts. Local AI requests are
not counted or subject to retry cooldowns, so testing the microphone cannot exhaust
an app allowance;
voice uses the same process timer as the local shortcut. This does not automatically
enable the shared server key. Public requests and Vercel still require the hosted
configuration, and a failing configured store never falls back to local storage.
Localhost uses HTTP cookies; hosted sessions require HTTPS.

`npm test` covers reusable redemption, cookie/origin checks, revocation, expiry,
key isolation, quota exhaustion, simultaneous reservations, store failure, queue
failure and authenticated hangup retries with a fake upstream. No OpenAI credits
are used by the suite. `npm run build` includes all access and callback endpoints.

References: [OpenAI authentication](https://developers.openai.com/api/reference/overview#authentication),
[OpenAI project spend limits](https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects#update-project-spend-limit),
[Live session controls](https://developers.openai.com/api/reference/typescript/resources/live),
[Redis REST API](https://upstash.com/docs/redis/features/restapi),
[QStash delivery and retries](https://upstash.com/docs/qstash/api-reference/messages/publish-a-message).
