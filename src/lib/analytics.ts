/* The Lab's tracking plan, the only place events are named (docs/analytics.md explains each one and how to read
   them). Everything goes through track(), so the analytics provider can change in this one file: today it is Vercel
   Web Analytics, which sets no cookies and keeps no IP addresses. Custom events need Vercel's Pro plan, which allows
   two properties per event, so no event here has more than two.
   Never send what people say or type, audio, emails, names or keys: only which control, which demo, which result. */
import { track as send } from "@vercel/analytics";

export type DemoMode = "speech" | "transcribe" | "translate" | "converse";

type Events = {
  /** a link to sign up or log in; place is header, footer or page */
  cta_click: { cta: "start_building" | "log_in"; place: string };
  /** a Tally form opened, and sent; source is the page and spot it was opened from */
  form_open: { form: "partner" | "newsletter"; source: string };
  form_submit: { form: "partner" | "newsletter"; source: string };
  /** a request to a website demo: ok, or the reason it failed (a status or the gateway's error type) */
  demo_run: { mode: DemoMode; result: string };
  /** the visitor refused, or has no, microphone */
  mic_denied: { mode: DemoMode };
  /** a use case's spoken example played; voice is the voice and language, as "mouhamad-dje" */
  example_play: { page: "home" | "organisations"; case: string; voice?: string };
  /** how far into a research post a reader got */
  post_read: { post: string; depth: "half" | "end" };
  /** a link off the site; to is its host, or email */
  outbound_click: { to: string; place: string };
  lang_switch: { to: "en" | "fr" };
};

export function track<K extends keyof Events>(name: K, props: Events[K]) {
  try { send(name, props); } catch { /* analytics never breaks the page */ }
}

/* Your own visits: open any page once with ?analytics=off to stop counting this browser, ?analytics=on to resume. */
export const OPT_OUT = "va-disable";

/** Keeps a URL's path and its campaign tags (utm_*), and drops every other query parameter and the fragment, so
 *  tokens (password resets, sign-in callbacks) and anything typed into a URL never reach the analytics. */
export function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const keep = new URLSearchParams();
    u.searchParams.forEach((v, k) => { if (/^utm_(source|medium|campaign|content|term)$/.test(k)) keep.set(k, v); });
    u.search = keep.toString(); u.hash = "";
    return u.toString();
  } catch { return raw; }
}
