"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { authClient } from "@/lib/auth-client";
import { accountCopy } from "@/content/account";
import { lp, type Lang } from "@/i18n/config";
import type { Provider } from "@/lib/env";

/* The three doors of the developer console (log in, sign up, reset a password), after auth.openai.com: one question
   per screen, the email address first, then whatever that address needs next.
     log in    email → password → (an address never verified: the 6-digit code) → the console
     sign up   email → name and password → the 6-digit code Neon Auth emails → what are you building → the console
     reset     email → "check your inbox"; the emailed link comes back here with a token → new password → log in
   Google and GitHub sit under the first screen of log in and sign up. Every call goes to Neon Auth through
   /api/auth/*; when it succeeds the browser loads the next page whole, so the server sees the new session. */

export type Door = "login" | "signup" | "reset";
export type Step = "email" | "password" | "setup" | "verify" | "about" | "reset" | "sent" | "new" | "done" | "expired";

const MIN = 8, MAX = 128, RESEND_S = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type T = (typeof accountCopy)["en"]["auth"];
type AuthError = { code?: string; status?: number } | null | undefined;
type Reply = { data: { token?: string | null } | null; error: AuthError };

/* Email and password calls go straight to Neon Auth's endpoints (relayed by /api/auth/*) rather than through its
   client library, which throws Better Auth's exact error codes away (INVALID_OTP, OTP_EXPIRED, ...); these screens
   need the exact reason. The library still handles Google and GitHub, whose redirect it knows. */
async function post(path: string, body: object): Promise<Reply> {
  const res = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  return res.ok ? { data: json, error: null } : { data: null, error: { status: res.status, code: json?.code } };
}

/** Neon Auth's (Better Auth's) error codes, in words. */
function why(e: AuthError, t: T): string {
  if (e?.status === 429) return t.err.rate;
  switch (e?.code) {
    case "INVALID_EMAIL": return t.err.email;
    case "INVALID_EMAIL_OR_PASSWORD": return t.err.wrong;
    case "USER_ALREADY_EXISTS": case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL": return t.err.exists;
    case "PASSWORD_TOO_SHORT": return t.err.short;
    case "PASSWORD_TOO_LONG": return t.err.long;
    case "INVALID_OTP": return t.err.code;
    case "OTP_EXPIRED": return t.err.expired;
    case "TOO_MANY_ATTEMPTS": return t.err.tries;
    default: return t.err.generic;
  }
}

export function AuthFlow({ lang, door, next, providers, start, token, failed }:
  { lang: Lang; door: Door; next: string; providers: Provider[]; start?: Step; token?: string; failed?: boolean }) {
  const t = accountCopy[lang].auth;
  const path = { login: lp(lang, "/login"), signup: lp(lang, "/signup"), reset: lp(lang, "/reset-password") };
  const withNext = (p: string) => `${p}?next=${encodeURIComponent(next)}`;

  const [step, setStep] = useState<Step>(start ?? (door === "reset" ? "reset" : "email"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [useCase, setUseCase] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [err, setErr] = useState<string | null>(failed ? t.err.oauth : null);
  const [note, setNote] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // A failed return from Google or GitHub, or a reset token, is read once: refreshing the page should not repeat it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error") && !url.searchParams.has("token")) return;
    ["error", "token", "neon_auth_session_verifier"].forEach(k => url.searchParams.delete(k));
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait(w => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const to = (s: Step) => { setStep(s); setErr(null); setNote(null); setShown(false); };
  /** Typing again clears the last error: it described what was there before. */
  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => { set(e.target.value); setErr(null); };
  const go = (href: string) => { setLeaving(true); window.location.assign(href); };
  const abs = (p: string) => new URL(p, window.location.origin).toString();

  async function run(e: FormEvent | null, work: () => Promise<void>) {
    e?.preventDefault();
    if (busy || leaving) return;
    setBusy(true); setErr(null); setNote(null);
    try { await work(); } catch { setErr(t.err.generic); } finally { setBusy(false); }
  }

  /* ---- each screen's action */
  const submitEmail = (e: FormEvent) => run(e, async () => {
    const v = email.trim();
    if (!EMAIL.test(v)) { setErr(t.err.email); return; }
    setEmail(v);
    to(door === "login" ? "password" : "setup");
  });

  async function sendCode() {
    const { error } = await post("send-verification-email", { email, callbackURL: abs(next) });
    if (error) { setErr(why(error, t)); return false; }
    setWait(RESEND_S);
    return true;
  }

  const submitPassword = (e: FormEvent) => run(e, async () => {
    const { error } = await post("sign-in/email", { email, password, callbackURL: abs(next) });
    if (!error) return go(next);
    if (error.code === "EMAIL_NOT_VERIFIED") { to("verify"); await sendCode(); return; }
    setErr(why(error, t));
  });

  const submitSetup = (e: FormEvent) => run(e, async () => {
    if (!name.trim()) { setErr(t.err.name); return; }
    if (password.length < MIN) { setErr(t.err.short); return; }
    const { data, error } = await post("sign-up/email", { email, password, name: name.trim(), callbackURL: abs(next) });
    if (error) { setErr(why(error, t)); return; }
    if (data?.token) { to("about"); return; }          // no verification asked for: already signed in
    to("verify"); setWait(RESEND_S);                    // Neon Auth sends the first code with the sign-up
  });

  const submitCode = (e: FormEvent | null, value = code) => run(e, async () => {
    if (!/^\d{6}$/.test(value)) { setErr(t.err.code); return; }
    const { data, error } = await post("email-otp/verify-email", { email, otp: value });
    if (error) { setErr(why(error, t)); return; }
    if (!data?.token) {                                 // verified but not signed in: sign in with what we have
      const r = await post("sign-in/email", { email, password });
      if (r.error) { setErr(why(r.error, t)); return; }
    }
    if (door === "signup") to("about"); else go(next);
  });

  const resend = () => run(null, async () => { if (await sendCode()) setNote(t.resent); });

  const submitAbout = (e: FormEvent) => run(e, async () => {
    const text = useCase.trim();
    if (text) await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ use_case: text }) });
    go(next);
  });

  const submitReset = (e: FormEvent) => run(e, async () => {
    const v = email.trim();
    if (!EMAIL.test(v)) { setErr(t.err.email); return; }
    setEmail(v);
    const { error } = await post("request-password-reset", { email: v, redirectTo: abs(path.reset) });
    if (error && error.status === 429) { setErr(t.err.rate); return; }
    to("sent");                                         // the same answer whether or not the account exists
  });

  const submitNew = (e: FormEvent) => run(e, async () => {
    if (password.length < MIN) { setErr(t.err.short); return; }
    const { error } = await post("reset-password", { newPassword: password, token: token ?? "" });
    if (error?.code === "INVALID_TOKEN") { to("expired"); return; }
    if (error) { setErr(why(error, t)); return; }
    setPassword(""); to("done");
  });

  const social = (provider: Provider) => run(null, async () => {
    const r = await authClient.signIn.social({
      provider, callbackURL: abs(next), errorCallbackURL: abs(`${path.login}?error=1`),
      newUserCallbackURL: abs(`${path.signup}?step=about&next=${encodeURIComponent(next)}`),
    }).catch(() => null);
    if (!r || r.error) setErr(t.err.oauth); else setLeaving(true);   // on success the browser is already on its way
  });

  /* ---- the screens */
  const pending = busy || leaving;
  const errId = err ? "auth-err" : undefined;
  const errEl = err && <p className="cx-door-err" id="auth-err" role="alert"><Warn />{err}</p>;
  const who = (
    <div className="cx-door-who">
      <span>{email}</span>
      <button type="button" className="cx-door-link" onClick={() => { setPassword(""); setCode(""); to(door === "reset" ? "reset" : "email"); }}>{t.edit}</button>
    </div>
  );
  const button = (label: string = t.continue, disabled = false) => (
    <button type="submit" className="cx-door-btn" disabled={disabled || pending} aria-busy={pending || undefined}>{label}</button>
  );
  const pwd = (label: string, auto: "current-password" | "new-password", focus = false) => (
    <Field label={label} invalid={!!err} trailing={
      <button type="button" className="cx-door-eye" aria-label={shown ? t.hide : t.show} aria-pressed={shown} onClick={() => setShown(s => !s)}>
        <Eye open={!shown} />
      </button>}>
      <input type={shown ? "text" : "password"} name="password" autoComplete={auto} required minLength={auto === "new-password" ? MIN : undefined} maxLength={MAX}
        value={password} onChange={edit(setPassword)} autoFocus={focus} placeholder=" " aria-invalid={!!err} aria-describedby={errId} />
    </Field>
  );
  const rule = (
    <p className={`cx-door-rule${password.length >= MIN ? " met" : ""}`}><Icon name="check" size={15} stroke={1.8} />{t.rule}</p>
  );
  const alt = (q: string, label: string, href: string) => <p className="cx-door-alt">{q && `${q} `}<a href={href}>{label}</a></p>;

  let title: string, lede: ReactNode = null, body: ReactNode, below: ReactNode = null;
  switch (step) {
    case "email":
      title = door === "login" ? t.welcome : t.create;
      body = (
        <form onSubmit={submitEmail} noValidate>
          <Field label={t.email} invalid={!!err}>
            <input type="email" name="email" autoComplete="email" inputMode="email" required autoFocus value={email}
              onChange={edit(setEmail)} placeholder=" " aria-invalid={!!err} aria-describedby={errId} />
          </Field>
          {errEl}
          {button()}
        </form>
      );
      below = (
        <>
          {door === "login" ? alt(t.noAccount, t.signUp, withNext(path.signup)) : alt(t.haveAccount, t.logIn, withNext(path.login))}
          {providers.length > 0 && <>
            <p className="cx-door-or"><span>{t.or}</span></p>
            <div className="cx-door-social">
              {providers.includes("google") && <button type="button" className="cx-door-btn quiet" disabled={pending} onClick={() => social("google")}><GoogleMark />{t.google}</button>}
              {providers.includes("github") && <button type="button" className="cx-door-btn quiet" disabled={pending} onClick={() => social("github")}><GitHubMark />{t.github}</button>}
            </div>
          </>}
          {door === "signup" && <p className="cx-door-fine">{t.beta}</p>}
        </>
      );
      break;

    case "password":
      title = t.passwordH;
      body = (
        <form onSubmit={submitPassword}>
          <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
          {who}
          {pwd(t.password, "current-password", true)}
          <p className="cx-door-forgot"><a href={withNext(path.reset)}>{t.forgot}</a></p>
          {errEl}
          {button(t.continue, !password)}
        </form>
      );
      below = alt(t.noAccount, t.signUp, withNext(path.signup));
      break;

    case "setup":
      title = t.setup;
      body = (
        <form onSubmit={submitSetup} noValidate>
          <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
          {who}
          <Field label={t.name}>
            <input type="text" name="name" autoComplete="name" required autoFocus maxLength={100} value={name}
              onChange={edit(setName)} placeholder=" " />
          </Field>
          {pwd(t.password, "new-password")}
          {rule}
          {errEl}
          {button()}
        </form>
      );
      below = alt(t.haveAccount, t.logIn, withNext(path.login));
      break;

    case "verify":
      title = t.verifyH;
      lede = t.verifyLede(email);
      body = (
        <form onSubmit={e => submitCode(e)}>
          <Field label={t.code} invalid={!!err}>
            <input className="cx-door-code" type="text" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" maxLength={6}
              required autoFocus value={code} placeholder=" " aria-invalid={!!err} aria-describedby={errId}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v); setErr(null);
                if (v.length === 6) submitCode(null, v);   // a pasted or autofilled code goes straight in
              }} />
          </Field>
          {errEl}
          {button(t.continue, code.length !== 6)}
        </form>
      );
      below = (
        <>
          <p className="cx-door-alt">
            <button type="button" className="cx-door-link" disabled={pending || wait > 0} onClick={resend}>{wait > 0 ? t.wait(wait) : t.resend}</button>
          </p>
          {/* Neon Auth answers a sign-up for a taken address as if it were new (it never says which addresses
              exist), and sends no code: the way back to log in stays in view. */}
          {door === "signup" && alt(t.haveAccount, t.logIn, withNext(path.login))}
        </>
      );
      break;

    case "about":
      title = t.aboutH;
      lede = t.aboutLede;
      body = (
        <form onSubmit={submitAbout}>
          <Field label={t.project} multiline>
            <textarea name="use_case" rows={4} maxLength={1000} autoFocus value={useCase} placeholder=" " onChange={edit(setUseCase)} />
          </Field>
          <p className="cx-door-hint">{accountCopy[lang].beta.useCasePh}</p>
          {errEl}
          {button(t.continue, !useCase.trim())}
        </form>
      );
      below = <p className="cx-door-alt"><button type="button" className="cx-door-link" disabled={pending} onClick={() => go(next)}>{t.skip}</button></p>;
      break;

    case "reset":
      title = t.resetH;
      lede = t.resetLede;
      body = (
        <form onSubmit={submitReset} noValidate>
          <Field label={t.email} invalid={!!err}>
            <input type="email" name="email" autoComplete="email" inputMode="email" required autoFocus value={email}
              onChange={edit(setEmail)} placeholder=" " aria-invalid={!!err} aria-describedby={errId} />
          </Field>
          {errEl}
          {button()}
        </form>
      );
      below = alt("", t.back, withNext(path.login));
      break;

    case "sent":
      title = t.sentH;
      lede = t.sentLede(email);
      body = <a className="cx-door-btn quiet" href={withNext(path.login)}>{t.back}</a>;
      below = <p className="cx-door-alt"><button type="button" className="cx-door-link" onClick={() => to("reset")}>{t.again}</button></p>;
      break;

    case "new":
      title = t.newH;
      body = (
        <form onSubmit={submitNew}>
          {pwd(t.newPassword, "new-password", true)}
          {rule}
          {errEl}
          {button(t.continue, password.length < MIN)}
        </form>
      );
      break;

    case "done":
      title = t.doneH;
      lede = t.doneLede;
      body = <a className="cx-door-btn" href={withNext(path.login)}>{t.logIn}</a>;
      break;

    case "expired":
      title = t.expiredH;
      lede = t.expiredLede;
      body = <button type="button" className="cx-door-btn" onClick={() => to("reset")}>{t.again}</button>;
      below = alt("", t.back, withNext(path.login));
      break;
  }

  return (
    <div className="cx-door" key={step}>
      <h1>{title}</h1>
      {lede && <p className="cx-door-lede">{lede}</p>}
      {body}
      {note && <p className="cx-door-note" role="status">{note}</p>}
      {below}
    </div>
  );
}

/** A field whose label sits inside the box and rises when the box is focused or filled. */
function Field({ label, children, trailing, invalid, multiline }:
  { label: string; children: ReactNode; trailing?: ReactNode; invalid?: boolean; multiline?: boolean }) {
  return (
    <div className={`cx-float${invalid ? " bad" : ""}${multiline ? " multi" : ""}${trailing ? " has-trail" : ""}`}>
      <label>{children}<span>{label}</span></label>
      {trailing}
    </div>
  );
}

/* Small glyphs in the Lab's grammar (24 grid, round caps), and the two providers' own marks. */
function Eye({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 20L20 4" />}
    </svg>
  );
}

function Warn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5" /><path d="M12 16.4v.1" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
