# Deploy Little Makers on Vercel

The GitHub repository is `undertherain/game_workshop`; its production branch is
`master`. Vercel runs the Node server and serves the browser assets from its CDN.
Docker, Nginx and a database are not needed for this deployment.

## Import and configure

Import the repository in Vercel. Use project name `game-workshop`, root directory
`./`, and the **Node** framework preset. `vercel.json` supplies the build settings:

- Node 22.x, selected by `package.json`.
- Install: `npm ci`.
- Build: `npm run build`.
- Output directory: leave the Node preset default; do not override it.
- Server entrypoint: `server.mjs`.
- Production branch: `master`.

The build copies the locked Pyodide browser runtime and the allowlisted framework
modules into generated `public/vendor/pyodide/` and `public/framework/` directories.
These files are deployed as static assets, keeping the large WebAssembly download
out of a function response. Generated assets, `.vercel/`, environment files and
local caches are excluded from Git. The function also includes the files needed
for curriculum loading and offline game exports. Export responses are streamed
because their ZIPs exceed Vercel's 4.5 MB buffered-response limit.

Leave `OPENAI_API_KEY` unset for the initial public deployment. The site then uses
the built-in guide, and voice reports that it is unavailable. BYOK and judge
invitation links are planned, not implemented. The public APIs currently have no
user authentication or per-user usage limits; the in-process busy flag only avoids
overlapping tutor work in one instance. Setting a shared key would make that key's
AI usage available to visitors.

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

1. `/api/status` returns `{"mode":"examples"}`.
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
On Vercel, the entrypoint calls `listen()` when imported so Vercel can capture the
server; its port is managed by the platform. Local `.env` discovery is disabled
on Vercel.

## Updates

Pushes to `master` trigger production deployments. Feature branches receive
preview deployments. DNS does not need to change for each release.

References: [Node server runtime](https://vercel.com/docs/functions/runtimes/node-js),
[large response streaming](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions),
[custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
