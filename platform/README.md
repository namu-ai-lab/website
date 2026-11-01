# Namu developer platform

How the public API, the API keys and the website's live demos fit together, and how to switch them on.

```
browser ──► Vercel (this Next.js site)      ──► Neon Postgres
             /login /signup /reset-password         neon_auth.*  (Neon Auth: users, sessions;
               relayed through /api/auth/*                         kept by Neon)
             /account/* dashboard                   profiles, api_keys, usage_events
             /api/keys  create / revoke                     ▲
             /api/demo/*  server-held demo key              │ namu_gateway role: calls functions only
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
| `db/migrations/0001_namu_api.sql` | Namu's tables and the gateway's first two functions, `namu_key_lookup` and `namu_record_usage` |
| `db/migrations/0002_neon_auth.sql` | The move from Better Auth's tables to Neon Auth's (`neon_auth."user"`) |
| `db/migrations/0003_open_access.sql` | Open access: new accounts start active (`beta_status` `approved`); an admin can still pause one (`denied`) |
| `db/migrations/0004_service_key.sql` | The console Playground's service key (`api_keys.is_service`) and two more gateway functions: `namu_key_lookup_v2` (the lookup plus `is_service`) and `namu_account_lookup` (an account's status, allowance and audio used this month) |
| `db/migrations/0005_usage_key_index.sql` | An index on `usage_events(key_id)`, for deleting a key or an account and for the console's Logs filtered by key |
| `db/migrations/0006_platform.sql`, `0007_agent_whatsapp_number.sql` | Create's messages and kit, Agents and their documents, tests and conversations; one WhatsApp number per agent |
| `db/migrations/0008_interpretations.sql` | Create's Interpreter: each conversation and its turns (what was heard, the translation, the voice, the waveform's outline), text only |
| `scripts/db-migrate.mjs` | Checks that Neon Auth is on, applies each new file in `db/migrations/` once, then sets up the `namu_gateway` role and its grants (see "Database migrations") |
| `db/gateway-grants.sql` | What the gateway's database role may call; applied on every migrate |
| `scripts/env-init.mjs`, `db-admin.mjs`, `modal-secrets.mjs` | Generate local secrets, make an admin / mark the demo key, copy secrets to Modal |
| `src/lib/auth.ts`, `src/app/api/auth/[...path]`, `src/proxy.ts` | Sign-in: Neon Auth, relayed through the site; the proxy finishes the Google and GitHub return trip |
| `src/components/account/AuthFlow.tsx`, `src/app/[lang]/{login,signup,reset-password}` | The doors: log in, sign up (with a 6-digit code), reset a password |
| `src/lib/keys.ts`, `src/lib/usage.ts`, `src/lib/limits.ts` | Key minting and hashing; the console's usage figures, counted by UTC month like the allowance; the gateway's limits, as the console shows them |
| `src/app/api/keys`, `src/app/api/demo/[model]`, `src/app/[lang]/account/*`, `src/app/[lang]/docs` | Dashboard, key minting, live demos, docs |
| `platform/modal/namu_gateway.py` | The public API (`/v1/transcribe`, `/v1/speech`, `/v1/translate`, `/v1/converse`, `/v1/models`, `/v1/voices`, `/v1/usage`) |
| `platform/modal/namu_{transcribe,voice,interpret,agent}.py` | The model services, with the proxy-auth switch |
| `platform/tests/` | Gateway and service tests with fakes, no Modal needed: `pip install -r platform/requirements-dev.txt`, then `python3 -m pytest platform/tests -q` |

## Security model, in short

- **Keys** are `namu_sk_` + 43 base62 characters (256 random bits), minted on the server (`src/lib/keys.ts`).
  The browser sees the secret once. The database stores only `HMAC-SHA256(NAMU_KEY_PEPPER, key)` and a short
  prefix, so a copy of the database alone does not reveal usable keys.
- **The database is never reached from the browser.** The website's server connects with `DATABASE_URL` and
  every query that touches a developer's data filters on the signed-in user's id. The gateway connects as
  `namu_gateway`, a role that can only call the functions in `db/gateway-grants.sql`: `namu_key_lookup_v2` and
  `namu_account_lookup` (0004), `namu_record_usage`, and `namu_key_lookup` (0001; the gateway now calls v2 instead).
  It cannot read or change a table directly, so a leak of the gateway's secret exposes no account data.
- **Sign-in** is Neon Auth (Neon's managed Better Auth): email and password, with a 6-digit code to verify the
  address, or Google and GitHub. Passwords and sessions are held by Neon Auth in its own `neon_auth` schema, not in
  Namu's tables; the browser only ever talks to this site (`/api/auth/*`), and the session is a signed, httpOnly
  cookie on the site's own domain. A developer's profile (status and allowance) is created on their first visit.
- **Open beta**: anyone who signs up can create keys at once, within a free monthly allowance (30 minutes of
  audio by default). An admin can raise an account's allowance or pause it at `/account/admin`; pausing or revoking
  stops its keys at the gateway within 30 seconds (each gateway container keeps a key's record, the owner's status
  included, for 30 s), as the console's revoke note says.
- **Gateway checks**, in order: key present → known → not revoked → owner active (not paused) → scope → monthly audio
  quota → per-key rate limit (60/min by default) → size and duration caps (25 MB, 5 min, 2,000 characters),
  measured with ffprobe *before* any GPU is called. `/v1/usage` takes the same checks up to "owner active".
  An unknown key is remembered for 30 s too, and keys that need a database lookup are limited to 60 a minute per
  caller address (per container; IPv6 by /64), so a flood of made-up keys reaches Postgres at most 60 times a minute
  per address and container.
- **Capacity**: each gateway container serves 32 requests at once (`@modal.concurrent`, `MAX_INPUTS`), up to four
  containers. More in flight widens the quota race (the allowance is checked, then recorded) until it is reserved
  atomically (review batch 13).
- **Long calls**: Modal ends one HTTP request at 150 s and answers a 303 to a URL that waits for the result. The
  gateway follows these from the model services; developers whose call passes 150 s get the same 303 from the
  gateway, so their client must follow redirects (`curl -L`; httpx `follow_redirects=True`; `requests` and `fetch`
  follow by default).
- **Console Playground**: the website holds one key marked `is_service` (NAMU_SERVICE_KEY). It is refused unless the
  request names an account (`X-Namu-Account`), which the website sets only after checking the developer's session;
  the gateway then applies that account's status, allowance and a per-account limit (20/min), and meters the request
  to it. Its runs appear in the developer's Usage and Logs as "Playground".
- **Demo**: the website holds one ordinary key marked `is_demo`. Only demo keys may pass the visitor's IP
  (`X-Namu-Client-IP`); the gateway limits each visitor to 30 requests per hour, 15 s of audio and 300 characters.
  A visitor is an IPv4 address or an IPv6 /64 (one host holds a whole /64): the website sends the /64, and the
  gateway narrows a raw address the same way (`address_bucket`).
- **Voices**: the API serves `nadia` (alias `warm`), `fr` (the French reference voice) and the Air persona `nadia`.
  `salim` (a cloned Hausa voice and persona) was withdrawn on 2026-10-31, with no consent record for its speaker:
  naming it is a 400 (`unknown_voice`, `unknown_persona`); the gateway enforces this and namu-voice refuses it too.
  `fr` was withdrawn the same day and is back since 2026-11-01, when the founder confirmed its consent: translate
  says a French translation aloud when `include_audio` asks.
  `src/lib/voices.ts` is the website's copy of the list (a gateway test checks they agree).
- **No conversation is kept.** Converse is stateless: each turn uses only what its request carries (namu-agent's
  `/v1/chat` takes earlier turns in `messages`). A `session_id` is accepted and echoed back; it is never sent on or
  stored. Until 2026-10-31 namu-agent kept recent turns in the Modal Dict `namu-agent-sessions`; nothing writes it
  now, and deleting what it still holds is the owner's step (count the keys, never read the content, then delete).
- **What is stored, and where content goes.** Namu's database holds metadata only: `usage_events` has the endpoint,
  model, audio seconds, character count, status code and latency of each request, never audio or text. The rate-limit
  counters (Modal Dict `namu-gateway-ratelimit`) are keyed by key, account and demo visitor (IPv4 address or IPv6 /64).
  Content passes through without being kept by Namu, except that some of it is sent to the language model provider
  (Google Gemini through OpenRouter) to do the work: the words heard in a converse turn, to write the reply; the text
  to translate; and French audio, to recognise it. That provider's retention is set on the provider's side.
- **What counts** against the allowance is one function, `billable_seconds` in the gateway: transcribe and translate
  count the audio sent, speech the audio returned, converse both. A request that fails (any non-2xx, including a
  502 or 504 the docs call safe to retry) is recorded with its status and 0 s. *Open question for the founder:*
  translate can also return its translation spoken (`include_audio`); that audio is not counted today, and the
  console says so. Counting it is a one-line change in `billable_seconds` plus the copy in `src/content`.
- **Errors** all share `{ "error": { "type", "message", "request_id" } }`, including the gateway's 404, 405 and
  500, and every response carries `X-Request-Id`. A model that does not answer is 502 `upstream_error`; one that
  runs out of time is 504 `upstream_timeout` (95 s for the demo key, 280 s for the Playground, 840 s for developer
  keys, counted from the request's arrival, across Modal's 303s for calls past 150 s; redirects are followed only to
  the same origin, so the proxy token never leaves Modal); silence sent to translate or converse is 422
  `nothing_heard`.
- **Model services** do not answer the open internet (`REQUIRE_PROXY_AUTH = True` in each): Modal rejects requests
  without the proxy token at its edge, before a container (or a GPU) starts. Only Namu's own callers hold the token
  (the `namu-proxy-auth` Modal secret): the gateway, namu-agent and namu-interpret for the services they call, and
  the website's server for the home conversation's text step. The gateway stays public. The three callers carry the
  secret whatever their own lock says, so unlocking one never cuts it off from the services it calls. The services
  send no CORS headers, because no browser may call them.
- **The agent's /v1/chat** runs only the agent's own models (`CHAT_MODELS`: the default and its fallback) and takes
  at most 40 messages of 4,000 characters, so even a caller with the token cannot turn it into a general LLM proxy.
- **Uploads** are measured with ffprobe only if their first bytes are WAV, MP3, M4A/MP4, AAC, OGG, WebM or FLAC, and
  ffprobe is then pinned to that one demuxer and to the uploaded file (no playlists, no other files or URLs).

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
4. **Modal**: `npm run modal:secrets` (creates `namu-db` and `namu-key-pepper`) and create `namu-proxy-auth`
   (step 8, items 1 and 2: the gateway, the agent and the interpreter will not deploy without it), then
   `modal deploy platform/modal/namu_gateway.py` → `https://<workspace>--namu-gateway-api.modal.run/v1/health`.
5. **Vercel**: Project → Settings → Environment Variables → import `.env.local` except `GATEWAY_DATABASE_URL`;
   give Production its own `NEON_AUTH_COOKIE_SECRET` (any random 32+ characters). Add `MODAL_PROXY_KEY` and
   `MODAL_PROXY_SECRET` (step 8) to Production and Preview; `NAMU_AGENT_URL` only if the agent is not on Namu's
   Modal workspace. Redeploy.
6. **First admin**: sign up on the site, then `npm run db:admin -- you@example.org`.
6b. **Console Playground**: after migration 0004 (`npm run db:migrate`) and the gateway deploy that reads
   `namu_key_lookup_v2`, run `npm run db:admin -- --service` and set NAMU_SERVICE_KEY in Vercel (Production).
   Order matters: migrate first, then deploy the gateway, then the website.
7. **Demo key**: in `/account/keys`, create a key named `website demo`, save it as `NAMU_DEMO_KEY` (in Vercel),
   then `npm run db:admin -- --demo`. Raise the admin account's monthly minutes if the demo is busy.
8. **Lock the model services.** `REQUIRE_PROXY_AUTH = True` is already set in the four model services under
   `platform/modal/`: Modal refuses every request to them without the proxy token. The gateway, namu-agent and
   namu-interpret always carry the token (the `namu-proxy-auth` secret), so their calls get through. **Callers
   first**: a service deployed locked before its callers hold the token breaks them.
   1. Modal dashboard → Settings → Proxy auth tokens → create a token. It is shown once; keep it out of chat and
      tickets.
   2. Save it as a Modal secret without echoing it or leaving it in the shell's history (macOS/Linux shell):
      ```
      read -rs MODAL_PROXY_KEY; read -rs MODAL_PROXY_SECRET      # paste the token id, Enter, then the secret, Enter
      modal secret create namu-proxy-auth MODAL_PROXY_KEY="$MODAL_PROXY_KEY" MODAL_PROXY_SECRET="$MODAL_PROXY_SECRET"
      ```
   3. Vercel → Environment Variables: `MODAL_PROXY_KEY` and `MODAL_PROXY_SECRET`, the same two values, in
      Production and Preview. Redeploy the site. The home conversation calls namu-agent directly for its text step
      (`src/app/api/demo/converse`), and its fallback cannot cover for it: the gateway's `/v1/converse` refuses the
      demo key, which has no `converse` scope.
   4. Deploy in this order, each once the one before answers:
      ```
      modal deploy platform/modal/namu_gateway.py      # public; now sends the token
      modal deploy platform/modal/namu_agent.py        # locked; sends the token to transcribe and voice
      modal deploy platform/modal/namu_interpret.py    # locked; sends the token to transcribe and voice
      modal deploy platform/modal/namu_transcribe.py   # locked
      modal deploy platform/modal/namu_voice.py        # locked
      ```
      (The voice image needs a `huggingface-token` secret that can read `Namuorg/tenere-omnivoice-hausa`.)
   5. Check with "Verifying a deployment" below: every model URL answers 401, the gateway answers 200 and serves
      a key, and the home conversation works on a preview and then on production.

   **Rollback**: set `REQUIRE_PROXY_AUTH = False` in the one service that misbehaves and `modal deploy` that file
   alone; the others stay locked, and its callers keep sending the token, which an unlocked service ignores.

   **Other callers**: anything else that calls the model URLs directly stops working, including the `namu-chat` web
   app and `namu_livekit.py` (both outside this repo). Point them at the gateway with a key, or have their *server*
   send the proxy-auth headers; never put the token in browser code. A LiveKit agent calling namu-agent's
   `/v1/chat` must send its 40 most recent messages at most, and only the models in `CHAT_MODELS`.

   **Keep ffmpeg current**: the gateway's image runs ffprobe on uploads, and Modal reuses a built image until told
   otherwise. Every few weeks, and after an FFmpeg security release, rebuild it:
   `MODAL_FORCE_BUILD=1 modal deploy platform/modal/namu_gateway.py`.

## Verifying a deployment

```
curl -i $API/v1/speech -d '{}'                                         # 401 missing_api_key
curl -i $API/v1/speech -H "Authorization: Bearer namu_sk_nope" -d '{}' # 401 invalid_api_key
curl $API/v1/speech -H "Authorization: Bearer $NAMU_API_KEY" -H "Content-Type: application/json" \
  -d '{"text": "Barka da safiya!", "voice": "nadia"}' -o out.wav       # a WAV
# revoke the key in the dashboard → within 30 s the same call returns 401 key_revoked

# withdrawn voices: nadia, warm and fr are listed, and salim is refused, not swapped for another voice
curl -s $API/v1/voices                                                  # ids: nadia, warm, fr
for v in salim; do
  curl -s -o /dev/null -w "$v %{http_code}\n" $API/v1/speech -H "Authorization: Bearer $NAMU_API_KEY" \
    -H "Content-Type: application/json" -d "{\"text\": \"Sannu\", \"voice\": \"$v\"}"   # 400 unknown_voice
done

# the model services answer only callers with the proxy token; the gateway stays open
for s in namu-transcribe-transcribe-api namu-voice-voice-api namu-interpret-api namu-agent-api; do
  curl -s -o /dev/null -w "$s %{http_code}\n" https://namu-ai-lab--$s.modal.run/v1/health  # 401
done
curl -s -o /dev/null -w "gateway %{http_code}\n" $API/v1/health                             # 200
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
- **The gateway role's password** is set when the runner creates the role. It is never changed unasked (the running
  gateway holds it), and `.env.local` is rewritten only for the same database, so a run against a Neon branch or a
  scratch database cannot replace production's `GATEWAY_DATABASE_URL`. The runner warns instead;
  `--rotate-gateway-password` sets a new password for this database and saves it (then `npm run modal:secrets` and
  redeploy the gateway).

Before the first run against production, run it on a Neon branch of production: `--dry-run` should list `0001`–`0004`
as recorded and `0005` as pending; the real run should apply only `0005`; a second run should say "no migrations
pending". Then check that `.env.local` still names production in `GATEWAY_DATABASE_URL` (the runner warns if not).
