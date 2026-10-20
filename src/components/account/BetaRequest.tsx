"use client";

import { useState, type FormEvent } from "react";
import { accountCopy } from "@/content/account";
import type { Lang } from "@/i18n/config";

/* What a developer sees while the beta request is open (or was declined) instead of the key controls. */
export function BetaRequest({ lang, status, useCase }: { lang: Lang; status: "pending" | "denied"; useCase: string | null }) {
  const t = accountCopy[lang].beta;
  const [text, setText] = useState(useCase ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(useCase ? "saved" : "idle");

  async function save(e: FormEvent) {
    e.preventDefault(); setState("saving");
    const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ use_case: text }) });
    setState(res.ok ? "saved" : "error");
  }

  if (status === "denied") return (
    <div className="panel acct-card">
      <h2 className="h3">{t.deniedH}</h2>
      <p className="muted">{t.deniedBody}</p>
      <div className="acts"><a className="pill" href="mailto:contact@namuai.org?subject=Namu%20API%20beta">{t.contact}</a></div>
    </div>
  );
  return (
    <div className="panel acct-card">
      <h2 className="h3">{t.pendingH}</h2>
      <p className="muted">{t.pendingBody}</p>
      <form onSubmit={save} className="acct-form">
        <label className="field"><span>{t.useCase}</span>
          <textarea rows={3} maxLength={1000} value={text} placeholder={t.useCasePh} onChange={e => { setText(e.target.value); if (state === "saved") setState("idle"); }} />
        </label>
        <div className="acts">
          <button type="submit" className="pill dark" disabled={state === "saving" || !text.trim()}>{t.save}</button>
          {state === "saved" && <span className="meta" role="status">{t.saved}</span>}
        </div>
      </form>
    </div>
  );
}
