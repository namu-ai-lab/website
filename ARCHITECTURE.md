# Architecture

This page explains how the Namu AI Lab site and its developer platform fit together, where each rule lives, and how to make the common changes. It describes the code as it is on `main`. Changes that are planned but not yet made are marked **planned**, with the review batch that covers each one. The engineering bar the code is held to is the `web-engineering-standards` skill.

## 1. What runs where

```
browser ──► Vercel: this Next.js app ──────────────────────────────► Neon Postgres
             pages (src/app/[lang])                                 profiles, api_keys, usage_events
             route handlers (src/app/api)   ── owner login ───────► (+ neon_auth.*, kept by Neon Auth)
                │  server-held keys                                        ▲
                ▼                                                          │ namu_gateway role:
developer app ─► namu-gateway (Modal, CPU) ─── SECURITY DEFINER calls ─────┘ calls functions only
                 the only public API: /v1/*
                 │  Modal proxy auth
                 ▼
                 namu-transcribe · namu-voice · namu-interpret · namu-agent    (Modal, GPU)
```

- **The site** (Vercel) serves the public pages, the platform (three doors: Create, Agents and the API console; §9) and the docs. Its route handlers relay sign-in, manage keys and call the gateway for the demos and the console Playground. It connects to Postgres as the owner, and every query that touches a developer's data filters on that developer's user id.
- **The gateway** (`platform/modal/namu_gateway.py`) is the only public API. It checks the key, the account, the scope, the allowance, rate limits and input sizes, then calls one model service and records usage. Its database role can only call the functions in `db/migrations/`; it cannot read a table.
- **The model services** (`platform/modal/namu_{transcribe,voice,interpret,agent}.py`) run the models on GPUs. On `main` they still answer the open internet (`REQUIRE_PROXY_AUTH = False`). **planned:** only Namu's own callers, which hold the Modal proxy token, can reach them (batch 1; `platform/README.md` step 8).
- **The database schema** is the numbered files in `db/migrations/`, applied in order by `npm run db:migrate`.

[platform/README.md](platform/README.md) has the security model in full and the deploy steps.

## 2. Request flows

**A developer's API call.** The app sends `POST https://<gateway>/v1/<endpoint>` with `Authorization: Bearer namu_sk_…`. The gateway then:
1. hashes the key: `HMAC-SHA256(NAMU_KEY_PEPPER, key)`, the same function as `src/lib/keys.ts` `hashKey`;
2. looks up the hash with `namu_key_lookup_v2` (one row: owner, scopes, status, allowance, audio used this month), and caches the record for 30 s per container;
3. checks, in order: key known, not revoked, owner not paused, scope, monthly allowance, the key's rate limit (60 a minute by default), size and length caps;
4. calls the model service;
5. records a `usage_events` row (seconds, characters, status, latency, never content) through `namu_record_usage`.

Because of the 30 s cache, revoking a key or pausing an account takes effect within 30 s.

**The platform's pages** (`/create/*`, `/agents/*`, `/account/*`; §9) are server components. Each page:
1. checks `hasAccounts()`, and shows "not configured" if accounts are off;
2. calls `requireAccount()` in `src/lib/account.ts`, which reads the Neon Auth session, creates the profile on the first visit, and redirects to `/login?next=…` when signed out;
3. reads the developer's rows with SQL scoped to their id;
4. renders inside `PlatformShell` (`ConsoleShell` for the API door), which draws its door's sidebar.

Writes go through route handlers. `signedIn(req, write)` in `src/lib/http.ts` refuses cross-origin writes and signed-out callers. `/api/keys` mints a key with `generateKey`, stores only `hashKey(key)` and a short prefix, and returns the secret once.

**The platform's model calls.** Create's routes (`/api/create/speak`, `/translate`, `/listen`) and the agents' test calls go through `src/lib/gateway.ts`, exactly as the Playground does: the service key plus `X-Namu-Account`. `translateText` sends text to `/v1/translate` as JSON; a gateway deployed before text translation answers 400, and it then speaks the text and translates that speech instead.

**The console Playground** (`/api/playground/[model]`). The route checks the session, then calls the gateway with the site's service key (`NAMU_SERVICE_KEY`) and `X-Namu-Account: <user id>`. The gateway applies that account's status, allowance and a 20-a-minute limit, and meters the run to that account.

**The home page demos** (`/api/demo/[model]`). The route accepts same-origin requests only. It calls the gateway with the server-held demo key (`NAMU_DEMO_KEY`) and `X-Namu-Client-IP`. The gateway limits each IP to 30 requests an hour, 15 s of audio and 300 characters.

**The live conversation** (`/api/demo/converse`). The route runs Aïr's chain in steps and streams each step as it finishes:
- transcription and speech go through the gateway with the demo key;
- the text step calls `namu-agent`'s `/v1/chat` directly, with the Modal proxy headers when they are set;
- if the text step fails, the turn falls back to the gateway's `/v1/converse`.

**planned:** give the gateway a metered endpoint for the text step, so the site never calls a model service directly (batch 38).

**Sign-in.** Neon Auth (Better Auth, managed by Neon) keeps users and sessions in the `neon_auth` schema. The browser talks only to this site:
- `/api/auth/*` relays requests to Neon Auth;
- the session is a signed, httpOnly cookie on the site's own domain;
- after Google or GitHub sign-in, `src/proxy.ts` swaps the returned one-time verifier for the session cookie.

**Language routing.** `src/proxy.ts` serves `/fr/...` as French. It redirects `/en/...` to the plain URL. For any other path it chooses a language in this order, using `pickLang` in `src/i18n/config.ts`: the visitor's own choice (a cookie), then their country, then their browser. It then redirects to `/fr/...` or rewrites internally to `/en/...`. All pages live once, under `src/app/[lang]/`.

## 3. Layers and import direction

| Layer | Folder | Holds | Imports |
| --- | --- | --- | --- |
| Routes | `src/app/` | Pages, metadata, route handlers | everything below |
| UI | `src/components/` | Components: shared ones, plus feature areas (`console/`, `account/`, the demos) | content, i18n, lib |
| Copy and data | `src/content/` | Strings and static data, per language | types; i18n helpers |
| Languages | `src/i18n/` | Locales, URL helpers, site-wide strings, SEO alternates | lib (none today) |
| Logic | `src/lib/` | Database, sign-in, keys, usage, limits, settings, analytics; browser audio and the call; figure engines | other lib modules |
| Styles | `src/styles/` | Tokens and per-area stylesheets | — |

Rules:
- **Imports go down this table, never up.** `src/lib/` never imports React components or copy.
- **Server-only modules** are the ones that hold secrets or reach the database: `lib/db`, `auth`, `keys`, `account`, `usage`, `http` and `env`. Each starts with `import "server-only"`, so a client import fails the build. Client components import the browser-safe parts instead: `lib/key-shape` (key format, scopes), `lib/limits` and `lib/public-config`.
- **Settings.** Server code reads every setting through `src/lib/env.ts`, using `setting(name)`, `required(name)`, `hasAccounts()` and `providers()`. `src/lib/env-check.ts` lists the names and checks them whenever Next starts (`next.config.ts`). It stops a production build if a feature is only partly configured, for example accounts without a key pepper or half a proxy token. The dev server prints which features are on. The browser sees one setting, `NEXT_PUBLIC_NAMU_API_BASE`, through `src/lib/public-config.ts`.
- **`"use client"`** goes on leaf components (the demos, the console tables and forms, the header's menus). Pages are server components; the not-found page is the one exception.
- **Route handlers stay thin.** Each one parses input, authenticates where it must (`signedIn`, or `sameOrigin` for the demos), calls into `lib/`, and answers errors with `fail()` from `lib/http.ts`, in the gateway's envelope `{ error: { type, message } }`.

Known exceptions on `main`, all with a planned fix:
- Four console pages (`account/page.tsx`, `keys`, `limits`, `logs`) and three routes (`/api/keys`, `/api/profile`, `/api/admin/beta`) hold SQL. **planned:** domain modules own their SQL (batch 29).
- `src/lib/account.ts` imports `lp` from `src/i18n/config.ts`.
- Some imports go up a layer: `src/i18n/localize.tsx` and `src/content/posts-new.tsx`, `posts.fr.tsx` import `components/FigureSlot`, and `components/account/AccountShell.tsx` imports from `components/console/`.
- Feature components import page copy directly instead of receiving it as props: `ApiRunner`, `ApiCompose` and `ApiConsoleTour` import `content/api`; `Playground` and `VoiceReel` import `content/playground`; `UseCases` and `OrgListen` import `content/usecases`. **planned:** feature folders, with copy passed as props (batch 43).
- `src/lib/` is one flat folder that mixes server infrastructure, browser audio, canvas art and research figure engines. **planned:** grouping (batch 43).
- The console shares the site's root layout; `SiteChrome` hides the site header and footer on `/account`, `/login`, `/signup` and `/reset-password`. **planned:** route groups (batch 37).

## 4. Styles

`src/styles/lab.css` defines the design tokens on `:root` (`--ink`, `--surface`, `--line`, `--sahel`, the type and easing tokens) and the site-wide rules. Each area has its own stylesheet, with a short class prefix that belongs to it. `src/app/[lang]/layout.tsx` imports all five stylesheets.

| Stylesheet | Prefix | Used by |
| --- | --- | --- |
| `lab.css` | `hdr-` `mega-` `sheet-` `menu-` `lang-` | Header, mega menu, phone sheet, language switch |
| | `ftr-` | Footer |
| | `pg-` | The home playground (`Playground`, `CodeTabs`), also used by `/api` and the console overview |
| | `cs-` `vr-` `ex-` | `UseCases`, `VoiceReel`, `Interactive` |
| | `rail-` `band-` `news-` `post-` `mhero-` `docs-` | Home, research, posts, model and About heroes, `/docs` |
| | `acct-` | Older account styles, still used by `/docs` tables and `AccountPaused` |
| `figures.css` | `tt-` `sf-` `ts-` `bp-` `lu-` | Research figures. The DOM is built by `lib/turn-taking`, `strict-folded`, `test-set`, `blossom-player` and `utterance` |
| `api.css` | `apx-` | The `/api` page |
| | `ar-` `ac-` `act-` `mart-` | `ApiRunner`, `ApiCompose`, `ApiConsoleTour`, `ModelArt` |
| `orgs.css` | `ofd-` | `/organisations` and `OrgListen` |
| `console.css` | `cx-` | The console, the sign-in pages and the account pages; the platform's sidebar, pills, cards and tables |
| `platform.css` | `pf-` | The platform's shell (groups, the door switch, page layouts) and its shared pieces (pickers, player, voice library) |
| `create.css` | `cr-` | Namu Create's tools (Speak, Transcribe, Kit) |
| `projects.css` | `pj-` | Namu Create's home, projects and video translation |
| `agents.css` | `ag-` | Namu Agents |

New styles go in the stylesheet of their area, under that area's prefix, using tokens rather than raw colours. **planned:** more tokens (type scale, radii, alpha steps) and fewer raw colours (batch 40).

## 5. Languages and copy

- **Languages.** `locales = ["en", "fr"]` in `src/i18n/config.ts`. Use `lp(lang, path)` to build any internal link, and `alternates(lang, path)` (`src/i18n/seo.ts`) for each page's canonical and hreflang tags.
- **Where strings live:**
  - site-wide interface and page strings: `src/i18n/copy.ts`, as `copy[lang]`;
  - per-area copy: `src/content/<area>.ts`, each exported as `Record<Lang, …>`. The areas are `account`, `api`, `console`, `docs`, `playground`, `organisations` and `usecases`;
  - long form: programmes in `content/programmes.ts` and `programmes.fr.ts`; posts in `content/posts.tsx`, `posts-new.tsx` and `posts.fr.tsx`. `posts-new.tsx` also holds the English About copy. Read them through `src/content/index.ts` (`getPosts`, `getProgrammes`, `getAbout`, `getNews`);
  - the console's strings are split: most are in `content/console.ts`, and some older ones are still in `content/account.ts`.
- **Markers.**
  - `FR-REVIEW` marks machine-drafted French that a native speaker must review;
  - `NATIVE-REVIEW` marks Hausa strings;
  - French typography uses a narrow no-break space (U+202F) before `; : ! ?` and inside « »;
  - the Hausa and Zarma letters that DM Sans lacks (ɓ ɗ ƙ ƴ ɲ, the ʼ apostrophe) come from an Onest subset, `public/fonts/namu-hz-sans.woff2`. `npm run check-glyphs` fails if any character in `src/app`, `src/components` or `src/content` is missing from the fonts.
- **What may be claimed.** Copy about models, data and results follows the Lab's claims gate (see the `namu-ai-lab` skill). The headers of `content/api.ts` and `content/console.ts` restate it: no prices, no performance numbers, limits as the gateway enforces them.

## 6. Single sources of truth

| Fact | Defined in | Also stated in (keep in step until the planned fix) |
| --- | --- | --- |
| Site address, parent site | `src/content/site.ts` (`site.url`, `site.parent`) | `https://www.namu-ai.org` is typed out about 20 times (batch 40) |
| Key format, scopes, key cap | `src/lib/key-shape.ts` | Gateway `SCOPES`, the `api_keys.scopes` check in `0001`, and the scope lists in `content/api.ts`, `content/console.ts`, `PlaygroundConsole.tsx`, `analytics.ts` (batch 28) |
| Key hashing | `src/lib/keys.ts` `hashKey` | Gateway `hash_key`. `keys.test.ts` and `test_gateway.py` assert the same vector, so a change to one fails CI. `scripts/db-admin.mjs` repeats it |
| Request limits | Gateway constants (`MAX_UPLOAD_BYTES`, `MAX_AUDIO_SECONDS`, …) | `src/lib/limits.ts` mirrors them for the console; the Playground and demo routes and `content/docs.ts` repeat some as literals (batch 27) |
| Monthly allowance | `profiles.monthly_audio_seconds`, default 1800 s (`0001`) | "30 minutes" in copy (`content/api.ts`, `account.ts`, `docs.ts`) (batch 27) |
| Audio used this month | `sum(usage_events.audio_seconds)` since `date_trunc('month', now())` | In `0001`, `0004` (twice), `account/page.tsx`, `account/limits/page.tsx`, `lib/usage.ts` (batch 9) |
| Models, endpoints, the languages each takes | `src/lib/catalog/models.ts` (the platform reads only this) | The gateway's `MODELS`; older public pages still name models in `content/site.ts`, `api.ts`, `console.ts`, `account.ts`, `playground.ts`, `console/colours.ts` (batch 28) |
| Spoken languages (Hausa, Zarma, Fulfulde, Tamasheq, French) | `src/lib/catalog/languages.ts` | none |
| Voices | `src/lib/catalog/voices.ts` | The gateway's `VOICES`; the Playground's own list in `content/console.ts` |
| Output targets (WhatsApp, radio, phone line, file) | `src/lib/catalog/outputs.ts` | The gateway's `SPEECH_FORMATS` for what the API encodes itself |
| Analytics events | `src/lib/analytics.ts` (`docs/analytics.md` explains them) | none |
| Partner and newsletter form ids | `src/components/Tally.tsx` | none |
| Interface languages | `src/i18n/config.ts` `locales` | About 35 files still hard-code `en` and `fr` (batch 35) |
| Server settings | `src/lib/env-check.ts` (the names and the rules); `.env.example` documents each | none: server code reads them only through `src/lib/env.ts` |

## 7. How to make common changes

**Add a public page** (for example `/careers`):
1. Create `src/app/[lang]/careers/page.tsx`. Copy the pattern of `data/page.tsx`: `generateMetadata` uses `copy[l].meta.<page>` and `alternates(l, "/careers")`, and the page reads its strings from `copy[lang]`.
2. Add its strings to `src/i18n/copy.ts`, in both `en` and `fr`. A long page gets its own `src/content/careers.ts` as `Record<Lang, …>`.
3. Add the path to `PAGES` in `src/app/sitemap.ts`.
4. Link it from `Header.tsx` and/or `Footer.tsx` with `lp(lang, "/careers")`.
5. Put its styles in `lab.css` under a new prefix. A large area gets its own stylesheet, imported in `src/app/[lang]/layout.tsx`.

**Add a platform page** (for example `/account/webhooks`, or `/create/radio`). Three files, plus a route for any write:
1. The page, for example `src/app/[lang]/account/webhooks/page.tsx`. Copy `create/voices/page.tsx`: `generateMetadata` from `platformMetadata`, `hasAccounts()`, then `requireAccount(lang, path)`, then `<PlatformShell door="…" page="webhooks" …>` (`<ConsoleShell page=…>` in the API door, after adding the id to its `Page` type).
2. `src/components/platform/doors.ts`: an item in the door's group, with its id, path, icon and `nav` label.
3. `src/content/platform.ts`: the `nav` label, in `en` and `fr`; the page's own strings go in its door's copy file.
4. Writes go through a route in `src/app/api/`, which calls `signedIn(req, true)` first.

`robots.ts` and `SiteChrome` already cover everything under `/account`, `/create` and `/agents`.

**Teach a model a spoken language** (Zarma, Fulfulde, Tamasheq…). With the model served:
1. The gateway: the language in its `MODELS` entry and, for speech, a voice in `VOICES`; deploy it.
2. `src/lib/catalog/models.ts`: the language's code in the model's `languages` (and a direction in `pairs` for translation).
3. `src/lib/catalog/voices.ts`: the voice, with a sample recorded through the API in `public/`.

Every list on the platform then offers it: Speak, Transcribe, the project columns, the voice library and its filters, the agents' languages, the API's model pages and `/llms.txt`. `npm test` checks that every speech language has a voice.

**Add a spoken language the platform does not know yet:** one entry in `src/lib/catalog/languages.ts` (its code, its own name, its names in the interface languages, the countries, the letters keyboards lack and `npm run check-glyphs` for them). It shows as Soon until a model takes it.

**Add a voice:** one entry in `src/lib/catalog/voices.ts` and one in the gateway's `VOICES`, with consent on file.

**Add or rename a model.** The platform reads the catalog; the older public pages do not yet:
1. The gateway: `SCOPES`, `MODELS`, the endpoint, the upstream URL.
2. A migration that widens the `api_keys.scopes` check.
3. `src/lib/catalog/models.ts` and `src/lib/key-shape.ts` `SCOPES` (`catalog.test.ts` keeps them in step). The API door's sidebar, its model page and `/llms.txt` follow.
4. Still by hand: the names in `content/api.ts`, `content/console.ts`, `content/account.ts` and `content/site.ts`; `PlaygroundConsole.tsx`; the path maps in `api/playground/[model]` and `api/demo/[model]`; the colours in `ApiCompose.tsx` and `console/colours.ts`; the samples in `content/docs.ts`; `DemoMode` in `lib/analytics.ts` (batch 28).

Ship it in the deploy order: migration, gateway, site.

**Change a limit or the default allowance.**
1. Change the gateway constant, or the column default by a new migration.
2. Change `src/lib/limits.ts` to match.
3. Search the copy for the old number: `content/docs.ts`, `api.ts`, `account.ts`, `console.ts`.

**planned:** the copy formats the numbers from `LIMITS` (batch 27).

**Add an interface language** (the language the pages are written in; spoken languages are in the catalog, above).
1. Add it to `locales`.
2. Add a translation to every `Record<Lang, …>` copy module (TypeScript lists the ones that are missing).
3. Then fix what is still hard-coded to `"en" | "fr"`: `src/proxy.ts`, `i18n/config.ts` (`pickLang`, `lp`, `switchPath`), `i18n/seo.ts`, `sitemap.ts`, `robots.ts`, `SiteChrome.tsx`, `Header.tsx`, `FigureSlot.tsx`, `lib/analytics.ts`, the root layout, and about 30 `lang === "fr"` branches in 19 files.
4. Check the fonts with `npm run check-glyphs`.

**planned:** derive all of this from `locales` (batch 35).

**Change a colour or other design token.** Edit the token in `lab.css` `:root`. Raw copies of the Sahel orange and of the ink colour still appear in `console.css`, `api.css`, the console charts and the art palettes (batch 40).

## 8. Tests and CI

- **Unit tests** (Vitest): `src/**/*.test.ts`, run by `npm test`. They cover pure logic with no database or network: keys, the redirect allow-list, usage windows, URL redaction, language choice, the catalog's consistency, the word list and letters, and the audio files the platform writes (Ogg pages, zip).
- **Gateway tests** (pytest): `platform/tests/`. They use fakes for the store, the model services and the rate limiter, and run without Modal installed.
- **CI** (`.github/workflows/ci.yml`) runs on every pull request and on every push to `main`. The `web` job runs typecheck, lint, test and build on Node 24, with no secrets. The `platform` job runs pytest on Python 3.11.
- **planned:** a Playwright smoke test for the critical journeys, plus axe checks (batch 30).

## 9. The platform: three areas

After ElevenLabs' ElevenCreative, ElevenAgents and ElevenAPI, cut to what organisations in the Sahel need first (the founder's mock-up v2, `Namu/research/elevenlabs/redesign`), the signed-in platform has three areas and one account. A bar across the top of every page leads to them (`components/platform/PlatformBar.tsx`: the mark, Create · Agents · API, EN/FR, the account). Create and Agents each have a short side menu and stand on Namu's cream ground; Namu API is the developer console as it was, with its own sidebar, under the same bar. On phones every side menu becomes a row of tabs.

| Area | Routes | For |
| --- | --- | --- |
| Namu Create | `/create` (the composer, tool shortcuts, voices, Ideas by sector and Recent), `/create/speak`, `/create/interpret` (and `/history`), `/create/translate`, `/create/voices` | Organisations without code: a message written in French, said in a local language, made for WhatsApp, radio, a phone line or a file; the Interpreter, two people speaking Hausa and French with Namu translating each turn aloud where the language has a voice, voice in and voice out with nothing written, every conversation kept and listed on its own page, `/create/interpret/history` (`interpretations`, migration `0008`: the words, never shown, so the voice can be made again; recordings stay in the browser, `lib/recordings`) |
| Namu Agents | `/agents`, `/agents/templates`, `/agents/conversations`, `/agents/[id]` (Agent, Knowledge, Conversations, WhatsApp, and a talk panel) | Voice agents that answer people in their own language |
| Namu API | `/account`, `/account/playground`, `/account/keys`, `/account/usage`, `/account/logs`, `/account/limits`, `/account/settings` | Developers |

- **The frame.** `components/platform/PlatformShell.tsx` draws Create's and Agents' pages; `components/platform/doors.ts` lists the areas and their side menus (a new page is one item). The console keeps `components/console/ConsoleShell.tsx`. The Namu mark leads back to the Lab's home page. Styles: `platform.css` (pf-, the frame and Namu's ground, scoped to `.pf`), `create.css` (cr-), `agents.css` (ag-).
- **Ideas and templates.** `content/ideas.ts`: Create's ideas by sector, in French, with the model's own Hausa and a recorded sample where there is one. `content/agent-templates.ts`: six agents, each with a photograph and a sample. Photographs: `public/organisations` (credits in its CREDITS.md); samples: `public/demo`, `public/usecases`.
- **The catalog.** `src/lib/catalog/` holds the spoken languages, the models, the voices and the output targets, with the questions every screen asks (`languagesFor`, `can`, `canTranslate`, `defaultVoice`, `stateOf`). Nothing on the platform lists a language, a voice or a model by hand. The recipes are in §7.
- **Shared pieces.** `components/platform/`: the voice library, the language and voice pickers, the player and the recorder. `lib/gateway.ts`: the models on a user's behalf. `lib/audio-out.ts`: a recording made ready for each channel (Ogg Opus for WhatsApp, 48 kHz for radio, 8 kHz for a phone line).
- **Data.** Migration `0006_platform.sql`: Create's messages (a `projects` row for what was written, a `project_versions` row for what was said, its voice and its channel; `lib/projects.ts`), the kit (word list and voice per language: read, no editor yet), agents, their documents and conversations (`agent_tests` is unused since the Tests tab was removed). Migration `0008_interpretations.sql`: the Interpreter's conversations, one row each with its turns as JSON (`lib/interpretations.ts`); the person's recordings stay in their browser (IndexedDB, `lib/recordings.ts`, forgotten at sign-out). Text only: audio is made again from the text when it is needed. Every query filters on the user's id. A page whose table is not there yet (the migration not applied) says the platform is almost ready (`isMissingTable` in `lib/db.ts`).
- **Agents.** A turn is a chain (`lib/agent-turn.ts`): Tatsuniya hears, Aïr's agent service answers with the agent's brief and the matching passages of its documents (`lib/agent-knowledge.ts`), Tafiya says it in the agent's voice with the word list applied. The text step goes to the agent service directly, as the home page's conversation does, so `lib/agent-meter.ts` applies the gateway's rules to it (an active account inside its allowance, `LIMITS.playgroundPerMin` a minute) and records it in `usage_events` as endpoint `agents` (counted under Aïr in Usage). **planned:** a metered chat endpoint on the gateway (batch 38). A WhatsApp number answers for one agent: only a Namu admin binds it (the agent's PATCH accepts channels from an admin only) and migration `0007` makes the binding unique; the webhook verifies Meta's signature, answers a message once and limits each contact.
- **For coding agents.** `/llms.txt` describes the API from the catalog and the docs.
- **Testing locally without production.** A throwaway Postgres with the migrations applied and a stand-in `neon_auth."user"` row, a small server that answers Neon Auth's `get-session` for a cookie, and a stand-in gateway that answers `/v1/*` with recorded samples; then `next dev` with `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_NAMU_API_BASE`, `NAMU_SERVICE_KEY` and `NAMU_AGENT_URL` pointing at them. Never the production database or keys.
