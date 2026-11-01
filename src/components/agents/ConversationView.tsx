"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { agentsCopy } from "@/content/agents";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import type { LangCode } from "@/lib/catalog";
import type { Conversation } from "@/lib/agent-shape";

/* One conversation, turn by turn, as the organisation reads it: what the caller said and what the agent answered,
   each with its French on request (staff read French; callers speak Hausa), and a flag for a person to look at it. */
export function ConversationView({ c, lang, speaking }: { c: Conversation; lang: Lang; speaking: LangCode }) {
  const t = agentsCopy[lang];
  const [flagged, setFlagged] = useState(c.flagged);
  const [fr, setFr] = useState<Record<number, string | null>>({});
  const flag = async () => {
    const r = await fetch(`/api/agents/conversations/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagged: !flagged }) });
    if (r.ok) setFlagged(!flagged);
  };
  const french = async (i: number) => {
    if (i in fr) { setFr(x => { const y = { ...x }; delete y[i]; return y; }); return; }
    setFr(x => ({ ...x, [i]: null }));
    try {
      const r = await fetch("/api/create/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: c.turns[i].text, from: speaking, to: "fr" }) });
      const j = await r.json() as { text?: string };
      setFr(x => ({ ...x, [i]: r.ok ? j.text ?? "" : "" }));
    } catch { setFr(x => { const y = { ...x }; delete y[i]; return y; }); }
  };
  return (
    <article className="ag-conv">
      <header className="ag-conv-head">
        <div><h1>{c.agent_name}</h1><p>{t.convs.channels[c.channel]}{c.contact ? ` · ${c.contact}` : ""} · {formatDate(lang, c.started_at, { style: "dateTime" })}</p></div>
        <button type="button" className={`cx-btn sm${flagged ? " primary" : ""}`} aria-pressed={flagged} onClick={() => void flag()}>
          <Icon name="warn" size={15} stroke={1.6} />{flagged ? t.convs.unflag : t.convs.flag}
        </button>
      </header>
      <ol className="ag-turns">
        {c.turns.map((x, i) => (
          <li key={i} className={`ag-turn ${x.role}`}>
            <p className="ag-who">{x.role === "agent" ? t.convs.agent : t.convs.caller}</p>
            <p className="ag-said" lang={speaking}>{x.text}</p>
            {fr[i] ? <p className="ag-fr" lang="fr">{fr[i]}</p> : null}
            <button type="button" className="ag-link" aria-pressed={i in fr} onClick={() => void french(i)}>
              {fr[i] === null ? "…" : i in fr ? t.convs.hide : t.convs.french}
            </button>
          </li>
        ))}
      </ol>
    </article>
  );
}
