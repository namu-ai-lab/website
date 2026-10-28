# Namu AI Lab website

This repo holds the website of Namu AI Lab, the research unit of Namu, at **https://www.namuai-lab.com**. It also holds the developer platform for the Lab's speech API: sign-in, the developer console (API keys, usage, logs, limits, a Playground), the API docs and the live demos on the home page.

The site is a Next.js 16 app deployed on Vercel. The public API it serves is a gateway plus four model services on Modal, which live in [`platform/`](platform/README.md). The Postgres schema is in [`db/migrations/`](db/migrations/). [ARCHITECTURE.md](ARCHITECTURE.md) explains how the parts fit together and how to make common changes.

## Run it

You need Node 24 (see `.nvmrc`; `package.json` accepts 20.9 or later) and npm.

```sh
npm install
npm run dev            # http://localhost:3000; ?country=NE previews what a visitor from Niger sees (French)
```

The public pages need no settings. To switch on accounts, the console and the live demos, copy `.env.example` to `.env.local`. Then follow [platform/README.md › Switching it on](platform/README.md#switching-it-on-in-order). `npm run env:init` generates the two local secrets for you.

## Check it

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint: Next's core-web-vitals and TypeScript presets (`eslint.config.mjs`) |
| `npm test` | Vitest unit tests, `src/**/*.test.ts`, with no database or network |
| `npm run build` | The production build |
| `npm run check-glyphs` | That every character in the pages, components and copy exists in the site's font, Hausa and Zarma letters included |
| `python -m pytest platform/tests -q` | The gateway's tests, with fakes. Install `platform/requirements-dev.txt` first |

CI (`.github/workflows/ci.yml`) runs every check in this table except `check-glyphs` on each pull request and on each push to `main`.

## Deploy

- **Site:** Vercel builds every push. `main` is production; every pull request gets a preview. Settings use the names in `.env.example` and are set in Vercel → Project → Settings → Environment Variables. A production build stops if a feature's settings are only partly there (`src/lib/env-check.ts`), so the last working deployment stays live.
- **Gateway, model services and database:** deployed by hand. Run `npm run db:migrate` for the database and `modal deploy platform/modal/<file>.py` for each Modal service. Vercel never deploys `platform/` or `db/` (see `.vercelignore`).
- **A change across layers** ships in this order: migration, then gateway, then site. [platform/README.md](platform/README.md) has the first-time setup and the checks to run after a deploy.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/app/[lang]/` | Pages. English is served at plain URLs and French under `/fr`; `src/proxy.ts` picks the language |
| `src/app/[lang]/account/` | The developer console, one folder per page |
| `src/app/api/` | The site's route handlers: sign-in relay, keys, profile, admin, usage export, demos, the console Playground |
| `src/components/` | UI. `console/` and `account/` are the console and the sign-in pages; `figures/` mounts the research figures |
| `src/content/` | Copy and data for each area, in English and French |
| `src/i18n/` | Languages and URL helpers (`config.ts`), site-wide strings (`copy.ts`), SEO alternates |
| `src/lib/` | Logic: database, sign-in, keys, usage, limits, settings; browser audio and the live call; the figure engines |
| `src/styles/` | `lab.css` (design tokens and the site), plus one stylesheet per area |
| `db/migrations/` | The Postgres schema, applied in order by `npm run db:migrate` |
| `platform/` | The API gateway and model services (Modal), and their tests |
| `scripts/` | Settings, database and Modal set-up; the glyph check |
| `docs/analytics.md` | What the site measures and how to read it |
