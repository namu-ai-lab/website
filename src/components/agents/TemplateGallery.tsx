"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { Workflow } from "./Workflow";
import { CHANNELS, PURPOSES, SECTORS, TEMPLATES, type Channel, type Purpose, type Sector, type Template } from "@/content/agent-templates";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";

/* Namu Agents' templates, after ElevenAgents' "Browse templates": three filters (sector, use, channel), "Create blank
   agent", the template cards, and beside them the chosen template's steps on a canvas with "Use template". Using
   one makes the agent (POST /api/agents) and opens it in the builder. */
const SECTOR_TONE: Record<Sector, string> = {
  health: "#e8935a", education: "#8fa6d6", agriculture: "#c9a27e", finance: "#5e5148", public: "#b4552a", commerce: "#d97a6c",
};

export function TemplateGallery({ lang }: { lang: Lang }) {
  const t = agentsCopy[lang];
  const [sector, setSector] = useState<Sector | "">(""), [purpose, setPurpose] = useState<Purpose | "">(""), [channel, setChannel] = useState<Channel | "">("");
  const shown = TEMPLATES.filter(x => (!sector || x.sector === sector) && (!purpose || x.purpose === purpose) && (!channel || x.channels.includes(channel)));
  const [pick, setPick] = useState<string>(TEMPLATES[0].id);
  const chosen = shown.find(x => x.id === pick) ?? shown[0] ?? null;
  const [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);

  const make = async (template: Template | null) => {
    setBusy(template?.id ?? "blank"); setErr(null);
    try {
      const r = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: template?.id, lang }) });
      const j = await r.json().catch(() => null) as { agent?: { id: string }; error?: { message?: string } } | null;
      if (!r.ok || !j?.agent) { setErr(j?.error?.message ?? `HTTP ${r.status}`); setBusy(null); return; }
      window.location.href = lp(lang, `/agents/${j.agent.id}`);
    } catch { setErr("…"); setBusy(null); }
  };

  return (
    <div className="ag-gallery">
      <div className="ag-browse">
        <div className="ag-filters">
          <Filter name={t.templates.filters.sector} value={sector} onPick={v => setSector(v as Sector | "")} options={SECTORS.map(v => [v, t.templates.sectors[v]])} />
          <Filter name={t.templates.filters.purpose} value={purpose} onPick={v => setPurpose(v as Purpose | "")} options={PURPOSES.map(v => [v, t.templates.purposes[v]])} />
          <Filter name={t.templates.filters.channel} value={channel} onPick={v => setChannel(v as Channel | "")} options={CHANNELS.map(v => [v, t.templates.channels[v]])} />
        </div>
        <button type="button" className="ag-blank" onClick={() => void make(null)} disabled={busy !== null}>
          <span className="ag-blank-ring" aria-hidden="true" />{busy === "blank" ? t.templates.using : t.templates.blank}
        </button>
        {err && <p className="cx-error" role="alert">{err}</p>}
        <ul className="ag-cards">
          {shown.map(x => (
            <li key={x.id}>
              <button type="button" className="ag-tcard" aria-pressed={chosen?.id === x.id} onClick={() => setPick(x.id)}>
                <span className="ag-tcard-head"><i style={{ background: SECTOR_TONE[x.sector] }} aria-hidden="true" /><strong>{x.name[lang]}</strong></span>
                <span className="ag-tcard-line">{x.line[lang]}</span>
                <span className="ag-tcard-tags">{x.channels.map(c => <em key={c}>{t.templates.channels[c]}</em>)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {chosen && (
        <aside className="ag-preview" aria-label={chosen.name[lang]}>
          <div className="ag-preview-bar">
            <strong>{chosen.name[lang]}</strong>
            <button type="button" className="cx-btn primary" onClick={() => void make(chosen)} disabled={busy !== null}>
              {busy === chosen.id ? t.templates.using : t.templates.use}<Icon name="arrow-long" size={16} stroke={1.6} />
            </button>
          </div>
          <Workflow steps={chosen.steps} lang={lang} title={chosen.name[lang]} />
        </aside>
      )}
    </div>
  );
}

/* A filter as ElevenAgents shows them: a quiet pill named for what it filters, that opens a short list; choosing its
   name again clears it. A native select, so it works with any keyboard and screen reader. */
function Filter({ value, onPick, options, name }: { value: string; onPick: (v: string) => void; options: [string, string][]; name: string }) {
  return (
    <label className={`ag-filter${value ? " on" : ""}`}>
      <select value={value} onChange={e => onPick(e.target.value)} aria-label={name}>
        <option value="">{name}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Icon name="chevron" size={14} stroke={1.6} />
    </label>
  );
}
