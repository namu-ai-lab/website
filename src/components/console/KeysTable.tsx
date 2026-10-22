"use client";

/* The API keys page, after platform.openai.com's: a table of keys (name, the secret's visible start, permissions,
   created, last used, then edit and revoke) with the revoked ones folded away below it, and four dialogs: create (a
   name, then all models or a chosen few), the secret shown exactly once with a copy button and the line to put it in
   an environment variable, edit (name and permissions), and a revoke that says what will break. Keys are created,
   edited and revoked through /api/keys; the server keeps only a fingerprint of each secret. ?create=1 opens the
   create dialog (the console's Home links here). */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../Icon";
import { consoleCopy } from "@/content/console";
import { MAX_ACTIVE_KEYS, SCOPES, type KeyRow, type Scope } from "@/lib/key-shape";
import type { Lang } from "@/i18n/config";

const ENDPOINT: Record<Scope, string> = { transcribe: "/v1/transcribe", speech: "/v1/speech", translate: "/v1/translate", converse: "/v1/converse" };

const day = (lang: Lang, iso: string | null) =>
  iso ? new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)) : null;

async function call(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? "error");
  return json;
}

/* a modal <dialog> that opens and closes with `open` */
function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return ref;
}

/* all four models, or a chosen few */
function Perms({ t, all, setAll, chosen, setChosen, id }: { t: (typeof consoleCopy)["en"]["keys"]; all: boolean; setAll: (b: boolean) => void;
  chosen: Scope[]; setChosen: (f: (xs: Scope[]) => Scope[]) => void; id: string }) {
  return (
    <div className="cx-field">
      <span id={id}>{t.permsLabel}</span>
      <div className="cx-seg" role="radiogroup" aria-labelledby={id}>
        <button type="button" role="radio" aria-checked={all} onClick={() => setAll(true)}>{t.permsAll}</button>
        <button type="button" role="radio" aria-checked={!all} onClick={() => setAll(false)}>{t.permsRestricted}</button>
      </div>
      {!all && (
        <fieldset className="cx-scopes">
          <legend>{t.permsHelp}</legend>
          {SCOPES.map(s => (
            <label key={s} className="cx-scope">
              <input type="checkbox" checked={chosen.includes(s)} onChange={() => setChosen(xs => (xs.includes(s) ? xs.filter(x => x !== s) : [...xs, s]))} />
              <span><strong>{t.models[s].name}</strong> {t.models[s].task}</span><code>{ENDPOINT[s]}</code>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

export function KeysTable({ lang, initial, apiBase }: { lang: Lang; initial: KeyRow[]; apiBase: string }) {
  const t = consoleCopy[lang].keys;
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [all, setAll] = useState(true);
  const [chosen, setChosen] = useState<Scope[]>(["speech", "transcribe"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ key: string; name: string; scopes: Scope[] } | null>(null);
  const [copied, setCopied] = useState<"secret" | "base" | "env" | null>(null);
  const [revoking, setRevoking] = useState<KeyRow | null>(null);
  const [editing, setEditing] = useState<KeyRow | null>(null);
  const [eName, setEName] = useState(""), [eAll, setEAll] = useState(true), [eChosen, setEChosen] = useState<Scope[]>([]);
  const [showRevoked, setShowRevoked] = useState(false);
  const createRef = useDialog(creating), revokeRef = useDialog(!!revoking), editRef = useDialog(!!editing);
  useEffect(() => {                                     // ?create=1, from the console's Home
    const u = new URL(window.location.href);
    if (u.searchParams.get("create") !== "1") return;
    u.searchParams.delete("create"); window.history.replaceState(null, "", u);
    if (initial.filter(k => !k.revoked_at).length < MAX_ACTIVE_KEYS) setCreating(true);
  }, [initial]);

  const live = keys.filter(k => !k.revoked_at), gone = keys.filter(k => k.revoked_at);
  const scopes: Scope[] = all ? [...SCOPES] : chosen;
  const isAll = (s: Scope[]) => SCOPES.every(x => s.includes(x));
  const copy = async (text: string, what: "secret" | "base" | "env") => { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600); };

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const { key, data } = await call("POST", "/api/keys", { name: name.trim(), scopes });
      setKeys(ks => [data as KeyRow, ...ks]); setSecret({ key: key as string, name: name.trim(), scopes }); setName("");
    } catch (err) { setError(err instanceof Error && err.message !== "error" ? err.message : t.error); }
    finally { setBusy(false); }
  }
  async function revoke() {
    if (!revoking) return;
    setBusy(true); setError(null);
    try {
      const { data } = await call("DELETE", `/api/keys?id=${encodeURIComponent(revoking.id)}`);
      setKeys(ks => ks.map(x => (x.id === revoking.id ? (data as KeyRow) : x))); setRevoking(null);
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }
  const closeCreate = () => { setCreating(false); setSecret(null); setError(null); setAll(true); };
  const openEdit = (k: KeyRow) => { setError(null); setEditing(k); setEName(k.name); setEAll(isAll(k.scopes)); setEChosen(isAll(k.scopes) ? ["speech", "transcribe"] : k.scopes); };
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setError(null);
    try {
      const { data } = await call("PATCH", "/api/keys", { id: editing.id, name: eName.trim(), scopes: eAll ? [...SCOPES] : eChosen });
      setKeys(ks => ks.map(x => (x.id === editing.id ? (data as KeyRow) : x))); setEditing(null);
    } catch (err) { setError(err instanceof Error && err.message !== "error" ? err.message : t.error); }
    finally { setBusy(false); }
  }

  const perms = (s: Scope[]) => isAll(s)
    ? <span className="cx-perm">{t.all}</span>
    : <span className="cx-perm restricted" title={s.map(x => `${t.models[x].name} (${ENDPOINT[x]})`).join(", ")}>{t.restricted}<em>{s.map(x => t.models[x].name).join(", ")}</em></span>;
  const row = (k: KeyRow) => (
    <tr key={k.id} className={k.revoked_at ? "off" : undefined}>
      <td className="cx-name c-main">{k.name}{k.is_demo && <span className="cx-tag">{t.demo}</span>}</td>
      <td data-label={t.th.secret}><code className="cx-secret">{k.prefix}…</code></td>
      <td data-label={t.th.perms}>{perms(k.scopes)}</td>
      <td data-label={t.th.created}>{day(lang, k.created_at)}</td>
      <td data-label={t.th.lastUsed}>{day(lang, k.last_used_at) ?? <span className="cx-muted">{t.never}</span>}</td>
      <td className="cx-acts c-corner">
        {!k.revoked_at && !k.is_demo && <button type="button" className="cx-icon-btn" onClick={() => openEdit(k)} aria-label={t.editLabel(k.name)} title={t.editLabel(k.name)}><Icon name="pencil" size={17} stroke={1.5} /></button>}
        {!k.revoked_at && <button type="button" className="cx-icon-btn" onClick={() => { setError(null); setRevoking(k); }} aria-label={t.revokeLabel(k.name)} title={t.revokeLabel(k.name)}><Icon name="trash" size={17} stroke={1.5} /></button>}
      </td>
    </tr>
  );

  return (
    <>
      <div className="cx-toolbar">
        <div className="cx-base">
          <span>{t.base}</span><code>{apiBase}</code>
          <button type="button" className="cx-icon-btn" onClick={() => copy(apiBase, "base")} aria-label={t.copyBase} title={t.copyBase}><Icon name={copied === "base" ? "check" : "copy"} size={16} stroke={1.5} /></button>
        </div>
        <div className="cx-toolbar-end">
          <span className="cx-muted">{t.count(live.length, MAX_ACTIVE_KEYS)}</span>
          <button type="button" className="cx-btn primary" onClick={() => setCreating(true)} disabled={live.length >= MAX_ACTIVE_KEYS}><Icon name="plus" size={16} stroke={1.8} />{t.createNew}</button>
        </div>
      </div>

      {live.length === 0 ? (
        <div className="cx-empty">
          <span className="cx-empty-ic"><Icon name="key" size={26} stroke={1.4} /></span>
          <h2>{t.emptyH}</h2>
          <p>{t.emptyBody}</p>
          <button type="button" className="cx-btn primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} stroke={1.8} />{t.createNew}</button>
        </div>
      ) : (
        <div className="cx-table-wrap">
          <table className="cx-table stack">
            <thead><tr><th>{t.th.name}</th><th>{t.th.secret}</th><th>{t.th.perms}</th><th>{t.th.created}</th><th>{t.th.lastUsed}</th><th><span className="sr-only">{t.th.actions}</span></th></tr></thead>
            <tbody>{live.map(row)}</tbody>
          </table>
        </div>
      )}

      {gone.length > 0 && (
        <div className="cx-revoked">
          <button type="button" className="cx-fold" aria-expanded={showRevoked} onClick={() => setShowRevoked(s => !s)}>
            <Icon name="chevron" size={16} stroke={1.6} />{t.revokedH(gone.length)}
          </button>
          {showRevoked && (
            <div className="cx-table-wrap">
              <table className="cx-table stack">
                <thead><tr><th>{t.th.name}</th><th>{t.th.secret}</th><th>{t.th.perms}</th><th>{t.th.created}</th><th>{t.th.lastUsed}</th><th /></tr></thead>
                <tbody>{gone.map(row)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* create, then the secret, once */}
      <dialog ref={createRef} className={`cx-dialog${secret ? " cx-dialog-key" : ""}`} onClose={closeCreate} aria-labelledby="cx-create-h">
        {secret ? (
          <div className="cx-dialog-body">
            <h2 id="cx-create-h">{t.saveH}</h2>
            <p>{t.saveBody}</p>
            {/* the whole key, always in view: it wraps rather than scrolls, and one click selects all of it; the dialog
                opens with Copy focused */}
            <div className="cx-key">
              <code className="cx-key-value">{secret.key}</code>
              <button type="button" className="cx-btn" autoFocus onClick={() => copy(secret.key, "secret")}><Icon name={copied === "secret" ? "check" : "copy"} size={16} stroke={1.6} />{copied === "secret" ? t.copied : t.copy}</button>
            </div>
            <dl className="cx-key-meta">
              <div><dt>{t.th.name}</dt><dd>{secret.name}</dd></div>
              <div><dt>{t.permsOf}</dt><dd>{isAll(secret.scopes) ? t.all : secret.scopes.map(x => t.models[x].name).join(", ")}</dd></div>
            </dl>
            <div className="cx-env-hint">
              <p>{t.envHint}</p>
              <div className="cx-env">
                <pre className="cx-code wrap"><code>{`export NAMU_API_KEY="${secret.key}"`}</code></pre>
                <button type="button" className="cx-icon-btn" onClick={() => copy(`export NAMU_API_KEY="${secret.key}"`, "env")} aria-label={t.copy}><Icon name={copied === "env" ? "check" : "copy"} size={16} stroke={1.6} /></button>
              </div>
            </div>
            <div className="cx-dialog-acts"><button type="button" className="cx-btn primary" onClick={closeCreate}>{t.done}</button></div>
          </div>
        ) : (
          <form className="cx-dialog-body" onSubmit={create}>
            <h2 id="cx-create-h">{t.createH}</h2>
            <label className="cx-field"><span>{t.nameLabel}</span>
              <input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={t.namePh} autoFocus />
            </label>
            <Perms t={t} all={all} setAll={setAll} chosen={chosen} setChosen={setChosen} id="cx-perms-l" />
            {error && <p className="cx-error" role="alert">{error}</p>}
            <div className="cx-dialog-acts">
              <button type="button" className="cx-btn" onClick={closeCreate}>{t.cancel}</button>
              <button type="submit" className="cx-btn primary" disabled={busy || !name.trim() || scopes.length === 0}>{busy ? t.creating : t.create}</button>
            </div>
          </form>
        )}
      </dialog>

      {/* edit: the name and the permissions */}
      <dialog ref={editRef} className="cx-dialog" onClose={() => setEditing(null)} aria-labelledby="cx-edit-h">
        {editing && (
          <form className="cx-dialog-body" onSubmit={save}>
            <h2 id="cx-edit-h">{t.editH}</h2>
            <p className="cx-dialog-meta"><code>{editing.prefix}…</code></p>
            <label className="cx-field"><span>{t.nameLabel}</span>
              <input required maxLength={60} value={eName} onChange={e => setEName(e.target.value)} autoFocus />
            </label>
            <Perms t={t} all={eAll} setAll={setEAll} chosen={eChosen} setChosen={setEChosen} id="cx-eperms-l" />
            <p className="cx-muted cx-small">{t.editNote}</p>
            {error && <p className="cx-error" role="alert">{error}</p>}
            <div className="cx-dialog-acts">
              <button type="button" className="cx-btn" onClick={() => setEditing(null)}>{t.cancel}</button>
              <button type="submit" className="cx-btn primary" disabled={busy || !eName.trim() || (!eAll && eChosen.length === 0)}>{busy ? t.saving : t.save}</button>
            </div>
          </form>
        )}
      </dialog>

      {/* revoke */}
      <dialog ref={revokeRef} className="cx-dialog" onClose={() => setRevoking(null)} aria-labelledby="cx-revoke-h">
        {revoking && (
          <div className="cx-dialog-body">
            <h2 id="cx-revoke-h">{t.revokeH}</h2>
            <p>{t.revokeBody}</p>
            <p className="cx-dialog-meta"><span>{revoking.name}</span><code>{revoking.prefix}…</code></p>
            {error && <p className="cx-error" role="alert">{error}</p>}
            <div className="cx-dialog-acts">
              <button type="button" className="cx-btn" onClick={() => setRevoking(null)}>{t.cancel}</button>
              <button type="button" className="cx-btn danger" onClick={revoke} disabled={busy}>{busy ? t.revoking : t.revokeIt}</button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
