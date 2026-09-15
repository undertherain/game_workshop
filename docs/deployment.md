# Deploy Little Makers on Vercel

The GitHub repository is `undertherain/game_workshop`; its production branch is
`master`. Vercel runs the Node server and serves the browser assets from its CDN.
Docker and Nginx are not needed. AI access uses Redis for sessions and shared limits;
hosted voice also uses QStash for scheduled hangup. Neither is needed for built-in guidance.

## Import and configure

Import the repository in Vercel. Use project name `game-workshop`, root directory
`./`, and the **Other** framework preset. `vercel.json` supplies the build settings:

- Node 22.x, selected by `package.json`.
- Install: `npm ci`.
- Build: `npm run build`.
- Output directory: leave the override disabled; the build emits `.vercel/output`.
- API entrypoint: the default request handler exported by `server.mjs`.
- Production branch: `master`.

The build creates Vercel's explicit Build Output API directory: static browser
files under `.vercel/output/static/` and one Node function bundle with aliases for
the API endpoints. It copies the locked Pyodide runtime and allowlisted Python
framework into the static output, including on the first clean build. No framework
autodetection or file tracing is needed. The function includes the files needed
for curriculum loading and offline game exports. It exports a default request
handler, keeps raw request streams, and enables response streaming because game
ZIPs exceed Vercel's 4.5 MB buffered-response limit. Environment files and local
caches are excluded from the artifact; generated output is excluded from Git.

See [demo AI access](demo-access.md) for the server environment, reusable judge
invites, personal keys, 24-hour invite expiry, total/per-invite request allowances
and scheduled voice hangup. The shared key is only available to authenticated
invites; setting `OPENAI_API_KEY` alone does not enable public AI. Missing or failed
limit storage blocks paid requests. Leave the key unset to use built-in guidance
only. The in-process busy flag still avoids overlapping tutor work in one instance;
Redis enforces the shared usage allowances across instances.

## Hostnames and HTTPS

`WORKSHOP_PUBLIC_ORIGINS` in `vercel.json` enables these exact origins:

- `https://game.blackbird.pw`
- `https://game-workshop-xi.vercel.app`

On Vercel, the server also accepts the exact deployment, branch and production
hostnames supplied in `VERCEL_URL`, `VERCEL_BRANCH_URL` and
`VERCEL_PROJECT_PRODUCTION_URL`. Arbitrary `*.vercel.app` hosts are not accepted.
API requests with an Origin header must match the requested host's configured
origin. The server does not trust forwarded headers to grant host access.

In **Settings → Domains**, add `game.blackbird.pw`. At the DNS provider for
`blackbird.pw`, create a CNAME named `game` pointing to the exact target Vercel
displays. A CNAME target is a hostname, with no `https://` or trailing slash.
This connects the custom hostname; it is not a URL forwarding/redirect rule.
Vercel provisions and renews the HTTPS certificate after DNS verification.

## Verify the deployment

After deployment, open `https://game-workshop-xi.vercel.app` and check:

1. `/api/status` includes `"mode":"examples"` and `"access":"none"` for an anonymous visitor.
2. The first lesson runs `fox.jump()`; this checks the real Pyodide worker.
3. A game runs and its controls respond.
4. Ask Pip gives a built-in reply.
5. Download → Playable game produces a ZIP that extracts and plays.
6. Repeat the lesson/API checks on `https://game.blackbird.pw` after DNS verifies.

For the first checks, also use a signed-out browser to confirm the deployment's
Vercel protection settings permit the intended visitors. HTTPS is necessary for
microphone access when voice is enabled later.

## Local or self-hosted server

`npm start` continues to bind to `127.0.0.1:4179` by default. For Docker or another
host, set `WORKSHOP_BIND_HOST=0.0.0.0` and configure `WORKSHOP_PUBLIC_ORIGINS` with
the browser's exact origin. `PORT` takes priority over `WORKSHOP_PORT`.
Behind Nginx, preserve the original Host header and terminate HTTPS at Nginx.
On Vercel, the platform invokes the exported handler directly; it does not need
the local `listen()` path. Local `.env` discovery is disabled on Vercel.

## Updates

Pushes to `master` trigger production deployments. Feature branches receive
preview deployments. DNS does not need to change for each release.

References: [Build Output API](https://vercel.com/docs/build-output-api/primitives),
[large response streaming](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions),
[custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
