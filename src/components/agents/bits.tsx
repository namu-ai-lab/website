"use client";

import { useState } from "react";
import { lp, type Lang } from "@/i18n/config";

/* Small client pieces of Namu Agents' pages. */

/** Makes a blank agent and opens it in the builder. */
export function BlankAgentButton({ lang, label, busyLabel, className = "cx-btn" }: { lang: Lang; label: string; busyLabel: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang }) });
      const j = await r.json().catch(() => null) as { agent?: { id: string } } | null;
      if (r.ok && j?.agent) { window.location.href = lp(lang, `/agents/${j.agent.id}`); return; }
    } catch { /* stays on the page */ }
    setBusy(false);
  };
  return <button type="button" className={className} onClick={() => void make()} disabled={busy}>{busy ? busyLabel : label}</button>;
}
