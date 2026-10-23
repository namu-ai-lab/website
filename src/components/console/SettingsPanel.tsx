"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";

/* Settings, after platform.openai.com/settings/profile: the profile (name, email), the account (its id for support,
   since when, the plan), sign-in and security (linked methods, password, every signed-in device) and how to delete
   the account. Each action is a Neon Auth endpoint through /api/auth/*, as the sign-in screens use them. */
type Me = { id: string; name: string; email: string; emailVerified: boolean };
type Reply = { ok: boolean; status: number; code?: string; data?: unknown };

async function call(path: string, body?: object): Promise<Reply> {
  const res = await fetch(`/api/auth/${path}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { method: "GET" });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, code: json?.code, data: json };
}

export function SettingsPanel({ lang, me, since, allowanceMin }: { lang: Lang; me: Me; since: string; allowanceMin: number }) {
  const t = consoleCopy[lang].settings, router = useRouter();
  const [name, setName] = useState(me.name);
  const [nameState, setNameState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const idEl = useRef<HTMLElement>(null);
  const [methods, setMethods] = useState<string[] | null>(null);
  const [cur, setCur] = useState(""), [next, setNext] = useState("");
  const [pw, setPw] = useState<{ state: "idle" | "saving" | "done"; err?: string }>({ state: "idle" });
  const [out, setOut] = useState(false);

  useEffect(() => {
    call("list-accounts").then(r => {
      const list = Array.isArray(r.data) ? (r.data as { providerId?: string }[]).map(a => a.providerId ?? "").filter(Boolean) : [];
      setMethods(r.ok ? [...new Set(list)] : []);
    });
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameState("error"); return; }
    setNameState("saving");
    const r = await call("update-user", { name: name.trim() });
    if (!r.ok) { setNameState("error"); return; }
    await call("get-session?disableCookieCache=true");          // the session cookie carries the name: refresh it
    setNameState("saved"); router.refresh();
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) { setPw({ state: "idle", err: t.err.short }); return; }
    setPw({ state: "saving" });
    const r = await call("change-password", { currentPassword: cur, newPassword: next, revokeOtherSessions: false });
    if (r.ok) { setCur(""); setNext(""); setPw({ state: "done" }); return; }
    setPw({ state: "idle", err: r.code === "INVALID_PASSWORD" ? t.err.wrong : r.code === "PASSWORD_TOO_SHORT" ? t.err.short : t.err.generic });
  }

  async function signOutAll() {
    setOut(true);
    await call("revoke-sessions", {});
    window.location.assign(lp(lang, "/login"));
  }

  const date = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(since));
  return (
    <>
      <section className="cx-card cx-set">
        <div className="cx-card-head"><h2>{t.profileH}</h2></div>
        <form className="cx-set-row" onSubmit={saveName}>
          <label htmlFor="cx-name">{t.name}</label>
          <div className="cx-set-ctl">
            <input id="cx-name" className="cx-input" value={name} maxLength={100} autoComplete="name"
              onChange={e => { setName(e.target.value); setNameState("idle"); }} aria-invalid={nameState === "error"} />
            <button type="submit" className="cx-btn" disabled={nameState === "saving" || name.trim() === me.name}>{nameState === "saving" ? t.saving : t.save}</button>
            {nameState === "saved" && <span className="cx-ok" role="status"><Icon name="check" size={15} stroke={1.8} />{t.saved}</span>}
            {nameState === "error" && <span className="cx-error" role="alert">{name.trim() ? t.err.generic : t.err.name}</span>}
          </div>
        </form>
        <div className="cx-set-row">
          <span>{t.email}</span>
          <div className="cx-set-ctl"><span className="cx-set-val">{me.email}</span>
            <span className={`cx-pill${me.emailVerified ? " good" : ""}`}>{me.emailVerified ? t.verified : t.unverified}</span></div>
        </div>
      </section>

      <section className="cx-card cx-set">
        <div className="cx-card-head"><h2>{t.accountH}</h2></div>
        <div className="cx-set-row">
          <span>{t.id}</span>
          <div className="cx-set-ctl"><code className="cx-secret" ref={idEl}>{me.id}</code>
            <CopyButton text={me.id} labels={{ copy: t.copy, copied: t.copied, failed: t.copyFailed }} select={idEl} className="cx-icon-btn" iconOnly /></div>
        </div>
        <div className="cx-set-row"><span>{t.since}</span><div className="cx-set-ctl"><span className="cx-set-val">{date}</span></div></div>
        <div className="cx-set-row"><span>{t.plan}</span><div className="cx-set-ctl"><span className="cx-set-val">{t.planValue(String(Math.round(allowanceMin)))}</span></div></div>
      </section>

      <section className="cx-card cx-set">
        <div className="cx-card-head"><h2>{t.securityH}</h2></div>
        <div className="cx-set-row">
          <span>{t.methods}</span>
          <div className="cx-set-ctl">{methods === null ? <span className="cx-muted">…</span>
            : methods.map(m => <span key={m} className="cx-pill">{t.method[m] ?? m}</span>)}</div>
        </div>
        {methods?.includes("credential") && (
          <form className="cx-set-row" onSubmit={changePassword}>
            <span>{t.passwordH}</span>
            <div className="cx-set-ctl cx-set-stack">
              <input className="cx-input" type="password" autoComplete="current-password" placeholder={t.current} value={cur} onChange={e => { setCur(e.target.value); setPw({ state: "idle" }); }} required />
              <input className="cx-input" type="password" autoComplete="new-password" placeholder={t.next} value={next} minLength={8} onChange={e => { setNext(e.target.value); setPw({ state: "idle" }); }} required />
              <div className="cx-set-acts">
                <button type="submit" className="cx-btn" disabled={pw.state === "saving" || !cur || !next}>{pw.state === "saving" ? t.changing : t.change}</button>
                {pw.err ? <span className="cx-error" role="alert">{pw.err}</span>
                  : pw.state === "done" ? <span className="cx-ok" role="status"><Icon name="check" size={15} stroke={1.8} />{t.changed}</span>
                  : <span className="cx-muted">{t.rule}</span>}
              </div>
            </div>
          </form>
        )}
        <div className="cx-set-row">
          <span>{t.sessionsH}</span>
          <div className="cx-set-ctl cx-set-stack"><p className="cx-muted">{t.sessionsBody}</p>
            <div><button type="button" className="cx-btn" onClick={signOutAll} disabled={out}>{out ? t.signingOut : t.signOutAll}</button></div></div>
        </div>
      </section>

      <section className="cx-card cx-set cx-danger">
        <div className="cx-card-head"><div><h2>{t.deleteH}</h2><p className="cx-muted">{t.deleteBody}</p></div>
          <a className="cx-btn" href={`mailto:contact@namuai.org?subject=${encodeURIComponent("Delete my Namu API account")}&body=${encodeURIComponent(`Account ID: ${me.id}`)}`}>{t.deleteCta}</a></div>
      </section>
    </>
  );
}
