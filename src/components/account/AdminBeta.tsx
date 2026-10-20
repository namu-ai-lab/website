"use client";

import { useState } from "react";
import { accountCopy } from "@/content/account";
import type { Profile } from "@/lib/account";
import type { Lang } from "@/i18n/config";

const fmt = (lang: Lang, iso: string) =>
  new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short" }).format(new Date(iso));

/* The beta queue: pending accounts first, each with approve / deny and its monthly audio allowance. */
export function AdminBeta({ lang, initial, me }: { lang: Lang; initial: Profile[]; me: string }) {
  const t = accountCopy[lang].admin;
  const [rows, setRows] = useState(initial);
  const [minutes, setMinutes] = useState<Record<string, number>>(() => Object.fromEntries(initial.map(p => [p.user_id, Math.round(p.monthly_audio_seconds / 60)])));
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(p: Profile, status: "approved" | "denied") {
    setBusy(p.user_id);
    const res = await fetch("/api/admin/beta", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: p.user_id, status, minutes: minutes[p.user_id] }) });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { window.alert(json?.error?.message ?? "Error"); return; }
    setRows(rs => rs.map(r => (r.user_id === p.user_id ? { ...r, ...json.data } : r)));
  }

  if (rows.length === 0) return <p className="muted">{t.empty}</p>;
  return (
    <div className="acct-table-wrap">
      <table className="acct-table">
        <thead><tr><th>{t.th.email}</th><th>{t.th.useCase}</th><th>{t.th.status}</th><th>{t.th.joined}</th><th>{t.th.allowance}</th><th><span className="sr-only">{t.approve}</span></th></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.user_id}>
              <td>{p.email}</td>
              <td className="wrap-cell">{p.use_case ?? <span className="muted">—</span>}</td>
              <td><span className={`badge ${p.beta_status}`}>{t.status[p.beta_status]}</span></td>
              <td>{fmt(lang, p.created_at)}</td>
              <td><input className="num" type="number" min={0} max={100000} value={minutes[p.user_id] ?? 0} aria-label={t.th.allowance}
                onChange={e => setMinutes(m => ({ ...m, [p.user_id]: Number(e.target.value) }))} /> {t.minutes}</td>
              <td className="row-acts">
                <button type="button" className="pill dark" disabled={busy === p.user_id} onClick={() => decide(p, "approved")}>{t.approve}</button>
                {p.user_id !== me && <button type="button" className="pill" disabled={busy === p.user_id} onClick={() => decide(p, "denied")}>{t.deny}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
