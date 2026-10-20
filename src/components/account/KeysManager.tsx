"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountCopy } from "@/content/account";
import { MAX_ACTIVE_KEYS, SCOPES, type KeyRow, type Scope } from "@/lib/key-shape";
import type { Lang } from "@/i18n/config";

const fmt = (lang: Lang, iso: string | null) =>
  iso ? new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : null;

async function api(method: "POST" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? "error");
  return json;
}

/* The keys table, after the standard pattern (ElevenLabs, OpenAI, Stripe): create with a name and scopes,
   see the secret exactly once, revoke with a confirmation. */
export function KeysManager({ lang, initial, apiBase }: { lang: Lang; initial: KeyRow[]; apiBase: string }) {
  const t = accountCopy[lang].keys;
  const [keys, setKeys] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["transcribe", "speech", "translate"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => { const d = dialog.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  const active = keys.filter(k => !k.revoked_at).length;

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const { key, data } = await api("POST", "/api/keys", { name, scopes });
      setKeys(ks => [data as KeyRow, ...ks]); setSecret(key as string); setName("");
    } catch (err) { setError(err instanceof Error && err.message !== "error" ? err.message : t.error); }
    finally { setBusy(false); }
  }
  async function revoke(k: KeyRow) {
    if (!window.confirm(t.confirmRevoke(k.name))) return;
    try {
      const { data } = await api("DELETE", `/api/keys?id=${encodeURIComponent(k.id)}`);
      setKeys(ks => ks.map(x => (x.id === k.id ? (data as KeyRow) : x)));
    } catch { window.alert(t.error); }
  }
  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  const close = () => { setOpen(false); setSecret(null); setCopied(false); setError(null); };
  const toggle = (s: Scope) => setScopes(xs => (xs.includes(s) ? xs.filter(x => x !== s) : [...xs, s]));

  return (
    <>
      <div className="acct-bar">
        <p className="meta">{t.base}: <code>{apiBase}</code></p>
        <button type="button" className="pill dark" onClick={() => setOpen(true)} disabled={active >= MAX_ACTIVE_KEYS}>{t.create}</button>
      </div>

      <div className="acct-table-wrap">
        <table className="acct-table">
          <thead><tr><th>{t.th.name}</th><th>{t.th.key}</th><th>{t.th.scopes}</th><th>{t.th.created}</th><th>{t.th.lastUsed}</th><th><span className="sr-only">{t.revoke}</span></th></tr></thead>
          <tbody>
            {keys.length === 0 && <tr><td colSpan={6} className="muted">{t.empty}</td></tr>}
            {keys.map(k => (
              <tr key={k.id} className={k.revoked_at ? "off" : undefined}>
                <td>{k.name}{k.is_demo && <span className="badge">{t.demo}</span>}</td>
                <td><code>{k.prefix}…</code></td>
                <td>{k.scopes.join(", ")}</td>
                <td>{fmt(lang, k.created_at)}</td>
                <td>{fmt(lang, k.last_used_at) ?? t.never}</td>
                <td>{k.revoked_at ? <span className="muted">{t.revoked}</span> : <button type="button" className="textbtn" onClick={() => revoke(k)}>{t.revoke}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">{t.limit(MAX_ACTIVE_KEYS)}</p>

      <dialog ref={dialog} className="acct-dialog" onClose={close} aria-labelledby="key-dialog-h">
        {secret ? (
          <div>
            <h2 id="key-dialog-h" className="h3">{t.secretH}</h2>
            <p className="muted">{t.secretBody}</p>
            <div className="secret"><code>{secret}</code><button type="button" className="pill" onClick={copy}>{copied ? t.copied : t.copy}</button></div>
            <div className="acts"><button type="button" className="pill dark" onClick={close}>{t.done}</button></div>
          </div>
        ) : (
          <form onSubmit={create}>
            <h2 id="key-dialog-h" className="h3">{t.create}</h2>
            <label className="field"><span>{t.name}</span>
              <input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={t.namePh} autoFocus />
            </label>
            <fieldset className="field">
              <legend>{t.scopes}</legend>
              {SCOPES.map(s => (
                <label key={s} className="check"><input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} />{t.scopeNames[s]}</label>
              ))}
            </fieldset>
            {error && <p className="acct-error" role="alert">{error}</p>}
            <div className="acts">
              <button type="button" className="pill" onClick={close}>{t.cancel}</button>
              <button type="submit" className="pill dark" disabled={busy || !name.trim() || scopes.length === 0}>{busy ? t.creating : t.createIt}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
