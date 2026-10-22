# Analytics: what the site measures, and how to read it

The site answers four questions:

- **Credibility:** who comes, from where, and what they read.
- **Developers:** do visitors become developers who call the API, and come back?
- **Organisations:** do they reach the partnership form and send it?
- **Demos:** do the demos work, fast, for the people who try them?

Every number below answers one of these questions. If a new number would not, leave it out.

## Where each answer comes from

| Source | What it holds | Where to read it |
|---|---|---|
| **Vercel Web Analytics** (`src/components/SiteAnalytics.tsx`) | Visitors and page views; referrers, campaign tags, countries, devices; the events below | Vercel → `namuai-lab` → Analytics |
| **Vercel Speed Insights** (same component) | Real visitors' load times (LCP, INP, CLS) by page, country and device | Vercel → `namuai-lab` → Speed Insights |
| **The database** (`usage_events`, `api_keys`, `profiles`) | Every account and what it is building; every key; every API call, including the website demos (the demo key), with status and latency | The admin console (an Insights view is planned) |
| **Tally** | Views, starts, completion and drop-off per question for the newsletter and partnership forms; each submission carries its `source` | tally.so → the form → Summary |
| **Google Search Console** | The searches that show and bring the site, and indexing problems | search.google.com/search-console |

Trust the database for the developer funnel. Many developers block analytics scripts, so the website numbers will undercount them, but every sign-up, key and API call is in the database.

## Privacy

- The site's analytics set **no cookies** and keep **no IP addresses** (Vercel hashes each visitor with a salt that changes every day). So the site needs no consent banner.
- Before anything is sent, each URL is cut down to its path and its `utm_*` tags (`redactUrl` in `src/lib/analytics.ts`). Password-reset tokens and other query parameters never leave the browser.
- Events record which control, demo or result. They never record what anyone said or typed, audio, emails, names or keys.
- **The privacy page on namu-ai.org should say so.** Suggested line:
  > The Namu AI Lab site (namuai-lab.com) measures visits with Vercel Web Analytics and Speed Insights. These set no cookies and store no IP addresses; we use them to count visits, see which pages are read and which links bring people, and keep the site fast.

## Events

All events are defined in `src/lib/analytics.ts`, and only there. Vercel's Pro plan allows two properties per event.

| Event | Properties | Fired when | Answers |
|---|---|---|---|
| `cta_click` | `cta` (start_building, log_in), `place` (header, footer, page) | Any link to sign up or log in is clicked | Which pages and spots send developers to sign up |
| `form_open` | `form` (partner, newsletter), `source` (page and spot) | A Tally form is opened | Interest in partnering, by page |
| `form_submit` | `form`, `source` | A form opened in the popup is sent | Partner requests and newsletter sign-ups, by page |
| `demo_run` | `mode` (speech, transcribe, translate, converse), `result` (ok, a status, the gateway's error type, network; for converse: start, limit, unavailable, failed) | Each website demo request | How much the demos are used, and how often they fail |
| `mic_denied` | `mode` | A visitor refuses, or has no, microphone | Whether mic permission blocks the demos |
| `example_play` | `page` (home, organisations), `case` | A use case's example is played | Which use cases interest people |
| `post_read` | `post`, `depth` (half, end) | A reader reaches half or the end of a research post | Which research is actually read |
| `outbound_click` | `to` (a host, or email), `place` | A link off the site is clicked (Tally links excepted) | Where the site sends people |
| `lang_switch` | `to` (en, fr) | The EN · FR switch is used | Whether French matters to visitors |

The page an event happened on is recorded automatically.

**Turn it on once:**
1. In Vercel, open `namuai-lab` → **Analytics** → **Enable**.
2. Open **Speed Insights** → **Enable**.
3. Redeploy.

Custom events need the Pro plan. Page views and Speed Insights also work on the free plan, with lower limits. If the project leaves Pro, change the provider in `track()` (`src/lib/analytics.ts`), for example to PostHog's free EU cloud, and nothing else changes.

**Don't count your own visits:**
- Open any page once with `?analytics=off`, for example `https://www.namuai-lab.com/?analytics=off`. Do this on each browser and phone you use.
- `?analytics=on` turns counting back on.

## Campaign tags (UTM): tag every link you share

Without a tag, a visit from a deck, an email or a WhatsApp group shows as "direct" and you never learn what worked. Add these to every link you post or send:

| Tag | What it says | Use |
|---|---|---|
| `utm_source` | Where the link sits | `linkedin`, `x`, `whatsapp`, `email`, `deck`, `grant`, `event`, `github` |
| `utm_medium` | What kind of channel | `social`, `email`, `referral`, `print`, `talk` |
| `utm_campaign` | Which push | Short, lowercase, dated: `orgs-launch-2026-10`, `api-beta-2026-10` |
| `utm_content` | Optional: which link, if one message has several | `hero`, `footer`, `slide-12` |

Rules:
- Use lowercase only, with hyphens and no spaces.
- Tag links you share, never links between pages of the site.

Example: `https://www.namuai-lab.com/organisations?utm_source=linkedin&utm_medium=social&utm_campaign=orgs-launch-2026-10`

## Google Search Console

1. Go to search.google.com/search-console → **Add property** → **Domain** → `namuai-lab.com`.
2. Google gives a TXT record. Add it where the domain's DNS is managed. If that is Vercel: **Domains** → `namuai-lab.com` → **DNS Records**. Then click **Verify**.
3. In **Sitemaps**, submit `https://www.namuai-lab.com/sitemap.xml`. The site generates it from `src/app/sitemap.ts`.
4. Add Bing Webmaster Tools later by importing from Search Console.

The site's canonical address is `https://www.namuai-lab.com` (`src/content/site.ts`). Canonical tags, hreflang tags and the sitemap all use it.

## The weekly review (20 minutes, Monday)

1. **Reach:**
   - visitors this week against last week;
   - the top 5 referrers and campaigns;
   - countries: Niger, Nigeria, and the rest;
   - English against French, and mobile share.
2. **Developers:**
   - sign-ups, and read each one's "what are you building";
   - first keys and first successful calls;
   - accounts that called the API in the last 7 days. This is the north star.
3. **Organisations:**
   - Organisations page visits, then `example_play`, then partner `form_open`, then `form_submit`;
   - then the conversations that followed, which you log yourself.
4. **Demos:** `demo_run` by mode and result; `mic_denied`; and demo latency in the database.
5. **Speed:** p75 LCP and INP on mobile, for Niger and Nigeria.

Write down one thing you learned and one thing you'll change.

Set targets only after four weeks of baseline. While numbers are small (under about 100 sign-ups a month), read individual rows rather than percentages. Ignore bounce rate. Watch for bots: a spike from one country or one page is often a crawler.
