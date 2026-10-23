# Namu developer platform

How the public API, the API keys and the website's live demos fit together, and how to switch them on.

```
browser ──► Vercel (this Next.js site)      ──► Neon Postgres
             /login /signup /reset-password         neon_auth.*  (Neon Auth: users, sessions;
               relayed through /api/auth/*                         kept by Neon)
             /account/* dashboard                   profiles, api_keys, usage_events
             /api/keys  create / revoke                     ▲
             /api/demo/*  server-held demo key              │ namu_gateway role: two functions only
                    │                                       │
developer app ──────┴──► namu-gateway (Modal, CPU, the only public API)
                           auth · scopes · account active · quota · rate limit · size caps
                           │  Modal proxy auth (Modal-Key / Modal-Secret)
                           ▼
              namu-transcribe · namu-voice · namu-interpret · namu-agent     (GPU, locked)
```

## What is where

| Path | What it is |
| --- | --- |
| `db/migrations/0001_namu_api.sql` | Namu's tables and the two functions the gateway calls |
| `db/migrations/0002_neon_auth.sql` | The move from Better Auth's tables to Neon Auth's (`neon_auth."user"`) |
| `scripts/db-migrate.mjs` | Checks that Neon Auth is on, applies each new file in `db/migrations/` once, then sets up the `namu_gateway` role and its grants (see "Database migrations") |
| `db/gateway-grants.sql` | What the gateway's database role may call; applied on every migrate |
| `scripts/env-init.mjs`, `db-admin.mjs`, `modal-secrets.mjs` | Generate local secrets, make an admin / mark the demo key, copy secrets to Modal |
| `src/lib/auth.ts`, `src/app/api/auth/[...path]`, `src/proxy.ts` | Sign-in: Neon Auth, relayed through the site; the proxy finishes the Google and GitHub return trip |
| `src/components/account/AuthFlow.tsx`, `src/app/[lang]/{login,signup,reset-password}` | The doors: log in, sign up (with a 6-digit code), reset a password |
| `src/app/api/keys`, `src/app/api/demo/[model]`, `src/app/[lang]/account/*`, `src/app/[lang]/docs` | Dashboard, key minting, live demos, docs |
| `platform/modal/namu_gateway.py` | The public API (`/v1/transcribe`, `/v1/speech`, `/v1/translate`, `/v1/converse`, `/v1/models`, `/v1/voices`, `/v1/usage`) |
| `platform/modal/namu_{transcribe,voice,interpret,agent}.py` | The model services, with the proxy-auth switch |
| `platform/tests/test_gateway.py` | Gateway tests with fakes: `cd platform && python -m pytest tests -q` |

## Security model, in short

- **Keys** are `namu_sk_` + 43 base62 characters (256 random bits), minted on the server (`src/lib/keys.ts`).
  The browser sees the secret once. The database stores only `HMAC-SHA256(NAMU_KEY_PEPPER, key)` and a short
  prefix, so a copy of the database alone does not reveal usable keys.
- **The database is never reached from the browser.** The website's server connects with `DATABASE_URL` and
  every query that touches a developer's data filters on the signed-in user's id. The gateway connects as
  `namu_gateway`, a role that can only call the functions in `db/gateway-grants.sql`: it cannot read or change
  a table directly, so a leak of the gateway's secret exposes no account data.
- **Sign-in** is Neon Auth (Neon's managed Better Auth): email and password, with a 6-digit code to verify the
  address, or Google and GitHub. Passwords and sessions are held by Neon Auth in its own `neon_auth` schema, not in
  Namu's tables; the browser only ever talks to this site (`/api/auth/*`), and the session is a signed, httpOnly
  cookie on the site's own domain. A developer's profile (status and allowance) is created on their first visit.
- **Open beta**: anyone who signs up can create keys at once, within a free monthly allowance (30 minutes of
  audio by default). An admin can raise an account's allowance or pause it at `/account/admin`; pausing stops its
  keys at the gateway at once (the gateway checks the owner's status on every lookup).
- **Gateway checks**, in order: key present → known → not revoked → owner active (not paused) → scope → monthly audio
  quota → per-key rate limit (60/min by default) → size and duration caps (25 MB, 5 min, 2,000 characters),
  measured with ffprobe *before* any GPU is called.
- **Console Playground**: the website holds one key marked `is_service` (NAMU_SERVICE_KEY). It is refused unless the
  request names an account (`X-Namu-Account`), which the website sets only after checking the developer's session;
  the gateway then applies that account's status, allowance and a per-account limit (20/min), and meters the request
  to it. Its runs appear in the developer's Usage and Logs as "Playground".
- **Demo**: the website holds one ordinary key marked `is_demo`. Only demo keys may pass the visitor's IP
  (`X-Namu-Client-IP`); the gateway limits each IP to 30 requests per hour, 15 s of audio and 300 characters.
- **Conversation memory** is namespaced by account (`user_id:session_id`).
- **No content is stored**: `usage_events` holds durations, character counts, status codes and latency.
- **Model services** stop answering the open internet once `REQUIRE_PROXY_AUTH = True`: Modal rejects
  requests without the proxy token at its edge, before a container (or a GPU) starts.

## Switching it on (in order)

All commands run from the repository root in PowerShell. Secrets go into `.env.local` (git-ignored) and are
never printed by the scripts.

1. **Local secrets**: `npm run env:init` (cookie secret, key pepper).
2. **Neon**: create a project at console.neon.tech, copy the *pooled* connection string, and save it without
   echoing it:
   ```powershell
   $s = Read-Host "Neon connection string" -AsSecureString
   Add-Content .env.local ("DATABASE_URL=" + [Net.NetworkCredential]::new("", $s).Password)
   ```
   Then `npm run db:migrate`.
3. **Neon Auth**: Neon Console → the project → Auth → enable it on the branch the site uses. Then, under
   Configuration:
   - copy the **Auth URL** into `.env.local` as `NEON_AUTH_BASE_URL`;
   - **Email and password**: on, with **email verification by code** (the sign-up screens expect a 6-digit code);
   - **Google** and **GitHub**: Neon's shared credentials are fine for development; for production, create your
     own OAuth apps with the callback URL Neon shows there. Switch one off and set `NEON_AUTH_PROVIDERS`
     (for example `google`) so the site stops offering it;
   - **Domains**: add every address people sign in on: `https://www.namuai-lab.com`, `https://namuai-lab.com`,
     and the preview hosts you use (`http://localhost:3000` for development). Neon refuses redirects anywhere else.
4. **Modal**: `npm run modal:secrets` (creates `namu-db` and `namu-key-pepper`), then
   `modal deploy platform/modal/namu_gateway.py` → `https://<workspace>--namu-gateway-api.modal.run/v1/health`.
5. **Vercel**: Project → Settings → Environment Variables → import `.env.local` except `GATEWAY_DATABASE_URL`;
   give Production its own `NEON_AUTH_COOKIE_SECRET` (any random 32+ characters). Redeploy.
6. **First admin**: sign up on the site, then `npm run db:admin -- you@example.org`.
6b. **Console Playground**: after migration 0004 (`npm run db:migrate`) and the gateway deploy that reads
   `namu_key_lookup_v2`, run `npm run db:admin -- --service` and set NAMU_SERVICE_KEY in Vercel (Production).
   Order matters: migrate first, then deploy the gateway, then the website.
7. **Demo key**: in `/account/keys`, create a key named `website demo`, save it as `NAMU_DEMO_KEY` (in Vercel),
   then `npm run db:admin -- --demo`. Raise the admin account's monthly minutes if the demo is busy.
8. **Lock the model services** (last, after step 4 works end to end):
   1. Modal dashboard → Settings → Proxy auth tokens → create a token.
   2. `modal secret create namu-proxy-auth MODAL_PROXY_KEY=wk-... MODAL_PROXY_SECRET=ws-...`
   3. Set `REQUIRE_PROXY_AUTH = True` in all five files under `platform/modal/`.
   4. For each service: `modal app stop <app> --yes` then `modal deploy platform/modal/<file>.py`
      (the voice service needs a `huggingface-token` secret that can read `Namuorg/tenere-omnivoice-hausa`).
   5. Check: a direct `curl` to a model service URL now returns 401; the same call through the gateway works.

   **Before flipping**: anything else that calls the model URLs directly stops working, including the
   `namu-chat` web app and `namu_livekit.py` (both outside this repo). Point them at the gateway with a key,
   or have their *server* send the proxy-auth headers. Never put the proxy token in browser code.

## Verifying a deployment

```
curl -i $API/v1/speech -d '{}'                                         # 401 missing_api_key
curl -i $API/v1/speech -H "Authorization: Bearer namu_sk_nope" -d '{}' # 401 invalid_api_key
curl $API/v1/speech -H "Authorization: Bearer $NAMU_API_KEY" -H "Content-Type: application/json" \
  -d '{"text": "Barka da safiya!", "voice": "nadia"}' -o out.wav       # a WAV
# revoke the key in the dashboard → within 30 s the same call returns 401 key_revoked
```

## Credentials to rotate

Some tokens were pasted into chat sessions while this was built. Rotate them and update the secrets that hold
them: both Hugging Face tokens (the `huggingface-token` Modal secret), and the OpenRouter key (the
`gemini-api-key` Modal secret used by `namu-agent`).

## Database migrations

`npm run db:migrate` applies `db/migrations/*.sql` in name order, each file once. The files applied are recorded in
`public.schema_migrations` (file name, SHA-256 of the text, when), so:

- **Each file runs inside a transaction**, together with its ledger row: it applies whole or not at all. So a file
  must not contain its own `begin`/`commit`, nor statements that cannot run in a transaction (`create index
  concurrently`, `vacuum`). Two runs at once are safe: each transaction takes an advisory lock first.
- **An applied file is never edited.** Before writing anything, the runner compares checksums and refuses if an
  applied file's text has changed; put the change in a new, numbered file. Line endings and a byte-order mark do not
  count, so a Windows checkout is not an edit.
- **`npm run db:migrate -- --dry-run`** says what would be recorded and applied, and changes nothing (the npm-style
  `npm run db:migrate --dry-run` works too).
- **Databases migrated before the ledger** (every run re-applied every file) already hold `0001`–`0004`. On its first
  run the runner checks that `0004` took effect (`namu_key_lookup_v2` exists), records those four as applied without
  running them, then applies only what is new. If `0004` is missing it stops and says so.
- **The gateway role's rights** live in `db/gateway-grants.sql`, applied on every run after the migrations, so they
  hold even for a role created after its functions (a restored database). A migration that adds a function the
  gateway calls adds its grant there.
