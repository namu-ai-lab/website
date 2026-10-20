# Namu developer platform

How the public API, the API keys and the website's live demos fit together, and how to switch them on.

```
browser ──► Vercel (this Next.js site)      ──► Neon Postgres
             /login (GitHub, Google)                "user", session, account   (Better Auth: sign-in)
             /account/* dashboard                   profiles, api_keys, usage_events
             /api/keys  create / revoke                     ▲
             /api/demo/*  server-held demo key              │ namu_gateway role: two functions only
                    │                                       │
developer app ──────┴──► namu-gateway (Modal, CPU, the only public API)
                           auth · scopes · beta status · quota · rate limit · size caps
                           │  Modal proxy auth (Modal-Key / Modal-Secret)
                           ▼
              namu-transcribe · namu-voice · namu-interpret · namu-agent     (GPU, locked)
```

## What is where

| Path | What it is |
| --- | --- |
| `db/migrations/0001_namu_api.sql` | Namu's tables, the trigger that creates a pending profile on sign-up, the two functions the gateway calls |
| `scripts/db-migrate.mjs` | Creates Better Auth's tables, the `namu_gateway` role, then applies `db/migrations/` |
| `scripts/env-init.mjs`, `db-admin.mjs`, `modal-secrets.mjs` | Generate local secrets, make an admin / mark the demo key, copy secrets to Modal |
| `src/lib/auth.ts`, `src/app/api/auth/[...all]` | Sign-in (Better Auth, sessions in Neon) |
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
  `namu_gateway`, a role that can only call `namu_key_lookup` and `namu_record_usage`: it cannot read or change
  a table directly, so a leak of the gateway's secret exposes no account data.
- **Sign-in** is GitHub or Google through Better Auth: no passwords stored, sessions in an httpOnly cookie.
- **Private beta**: new accounts are `pending`; an admin approves them at `/account/admin`. Denying an account
  also stops its existing keys (the gateway checks the owner's status on every lookup).
- **Gateway checks**, in order: key present → known → not revoked → owner approved → scope → monthly audio
  quota → per-key rate limit (60/min by default) → size and duration caps (25 MB, 5 min, 2,000 characters),
  measured with ffprobe *before* any GPU is called.
- **Demo**: the website holds one ordinary key marked `is_demo`. Only demo keys may pass the visitor's IP
  (`X-Namu-Client-IP`); the gateway limits each IP to 30 requests per hour, 15 s of audio and 300 characters.
- **Conversation memory** is namespaced by account (`user_id:session_id`).
- **No content is stored**: `usage_events` holds durations, character counts, status codes and latency.
- **Model services** stop answering the open internet once `REQUIRE_PROXY_AUTH = True`: Modal rejects
  requests without the proxy token at its edge, before a container (or a GPU) starts.

## Switching it on (in order)

All commands run from the repository root in PowerShell. Secrets go into `.env.local` (git-ignored) and are
never printed by the scripts.

1. **Local secrets**: `npm run env:init` (session secret, key pepper).
2. **Neon**: create a project at console.neon.tech, copy the *pooled* connection string, and save it without
   echoing it:
   ```powershell
   $s = Read-Host "Neon connection string" -AsSecureString
   Add-Content .env.local ("DATABASE_URL=" + [Net.NetworkCredential]::new("", $s).Password)
   ```
   Then `npm run db:migrate`.
3. **Sign-in provider**: GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   (or the organisation's own settings). Homepage URL = the site; callback URL =
   `https://<site>/api/auth/callback/github` (add a second app with `http://localhost:3000/...` for development).
   Save `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` into `.env.local` the same way. Google works the same with
   `/api/auth/callback/google`.
4. **Modal**: `npm run modal:secrets` (creates `namu-db` and `namu-key-pepper`), then
   `modal deploy platform/modal/namu_gateway.py` → `https://<workspace>--namu-gateway-api.modal.run/v1/health`.
5. **Vercel**: Project → Settings → Environment Variables → import `.env.local` except `GATEWAY_DATABASE_URL`
   and `BETTER_AUTH_URL` (on Vercel the site uses its preview or production address automatically). Redeploy.
   The GitHub OAuth app's callback must match the address you sign in on (preview or production).
6. **First admin**: sign in on the site, then `npm run db:admin -- you@example.org`.
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
