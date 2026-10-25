"use client";

import { useState } from "react";
import { LocalTime } from "@/components/console/LocalTime";
import { accountCopy } from "@/content/account";
import type { Profile } from "@/lib/account";
import type { Lang } from "@/i18n/config";

/* Every account, newest first: its status, what it is building, and its monthly audio allowance. Pause stops an
   account's keys at the gateway; Resume turns them back on; Save keeps a new allowance without changing the status. */
export function AdminBeta({ lang, initial, me }: { lang: Lang; initial: Profile[]; me: string }) {
  const t = accountCopy[lang].admin;
  const [rows, setRows] = useState(initial);
  const [minutes, setMinutes] = useState<Record<string, number>>(() => Object.fromEntries(initial.map(p => [p.user_id, Math.round(p.monthly_audio_seconds / 60)])));
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(p: Profile, status: Profile["beta_status"]) {
    setBusy(p.user_id);
    const res = await fetch("/api/admin/beta", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: p.user_id, status, minutes: minutes[p.user_id] }) });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { window.alert(json?.error?.message ?? "Error"); return; }
    setRows(rs => rs.map(r => (r.user_id === p.user_id ? { ...r, ...json.data } : r)));
  }

  if (rows.length === 0) return <p className="cx-muted">{t.empty}</p>;
  return (
    <div className="cx-table-wrap">
      <table className="cx-table stack wide">
        <thead><tr><th>{t.th.email}</th><th>{t.th.useCase}</th><th>{t.th.status}</th><th>{t.th.joined}</th><th>{t.th.allowance}</th><th><span className="sr-only">{t.pause}</span></th></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.user_id}>
              <td className="c-main">{p.email}</td>
              <td className="wrap c-wide" data-label={t.th.useCase}>{p.use_case ?? <span className="cx-muted">–</span>}</td>
              <td className="c-corner"><span className={`cx-pill${p.beta_status === "approved" ? " good" : ""}`}>{t.status[p.beta_status]}</span></td>
              <td data-label={t.th.joined}><LocalTime iso={p.created_at} lang={lang} style="dayMonthShort" /></td>
              <td data-label={t.th.allowance}><input className="cx-input cx-min" type="number" min={0} max={100000} value={minutes[p.user_id] ?? 0} aria-label={t.th.allowance}
                onChange={e => setMinutes(m => ({ ...m, [p.user_id]: Number(e.target.value) }))} /> {t.minutes}</td>
              <td className="cx-acts c-wide"><div className="cx-row-acts">
                <button type="button" className="cx-btn sm" disabled={busy === p.user_id || minutes[p.user_id] === Math.round(p.monthly_audio_seconds / 60)}
                  onClick={() => decide(p, p.beta_status === "denied" ? "denied" : "approved")}>{t.save}</button>
                {p.beta_status === "denied"
                  ? <button type="button" className="cx-btn sm primary" disabled={busy === p.user_id} onClick={() => decide(p, "approved")}>{t.resume}</button>
                  : p.user_id !== me && <button type="button" className="cx-btn sm" disabled={busy === p.user_id} onClick={() => decide(p, "denied")}>{t.pause}</button>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
