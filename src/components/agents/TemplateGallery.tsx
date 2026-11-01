"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { SamplePlay, VoiceDot, makeAgent } from "./bits";
import { SECTORS, TEMPLATES, photoOf, type Sector, type Template } from "@/content/agent-templates";
import { agentsCopy } from "@/content/agents";
import type { Lang } from "@/i18n/config";
import { voice } from "@/lib/catalog";

/* Namu Agents' templates, after ElevenAgents' "Browse templates", for the Sahel: who the agent helps, in a
   photograph, with a line and its voice to hear. Choosing one makes the agent (POST /api/agents) and opens it.
   `limit` shows the first few, without the filters, for the Agents page; the full page adds the sector filters
   and a blank agent. */
export function TemplateGallery({ lang, limit }: { lang: Lang; limit?: number }) {
  const t = agentsCopy[lang];
  const [sector, setSector] = useState<Sector | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const full = limit === undefined;
  const sectors = SECTORS.filter(s => TEMPLATES.some(x => x.sector === s));
  const shown = TEMPLATES.filter(x => !sector || x.sector === sector).slice(0, limit);

  const make = async (id?: string) => {
    if (busy) return;
    setBusy(id ?? "blank"); setErr(false);
    if (!(await makeAgent(lang, id))) { setBusy(null); setErr(true); }
  };

  return (
    <div className="ag-gallery">
      {full && (
        <div className="ag-filters" role="group" aria-label={t.templates.title}>
          <button type="button" className="ag-chip" aria-pressed={!sector} onClick={() => setSector(null)}>{t.templates.all}</button>
          {sectors.map(s => <button key={s} type="button" className="ag-chip" aria-pressed={sector === s} onClick={() => setSector(sector === s ? null : s)}>{t.templates.sectors[s]}</button>)}
        </div>
      )}
      {err && <p className="cx-error" role="alert">{t.errors.generic}</p>}
      <ul className="ag-tgrid">
        {shown.map(x => <li key={x.id}><Card x={x} lang={lang} busy={busy === x.id} disabled={busy !== null} onPick={() => void make(x.id)} /></li>)}
        {full && !sector && (
          <li>
            <button type="button" className="ag-blank" onClick={() => void make()} disabled={busy !== null}>
              <Icon name="plus" size={18} stroke={1.6} />{busy === "blank" ? t.templates.using : t.templates.blank}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/* The whole card opens the template; the sample's button only plays. A div with a button role, so the sample's own
   button is not nested inside another button. */
function Card({ x, lang, busy, disabled, onPick }: { x: Template; lang: Lang; busy: boolean; disabled: boolean; onPick: () => void }) {
  const t = agentsCopy[lang], v = voice(x.voice);
  return (
    <div className="ag-tcard" role="button" tabIndex={0} aria-disabled={disabled || undefined} aria-label={x.name[lang]}
      onClick={() => { if (!disabled) onPick(); }} onKeyDown={e => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(); } }}>
      <figure><img src={photoOf(x)} alt="" loading="lazy" /></figure>
      <div className="ag-tcard-body">
        <h3>{x.name[lang]}</h3>
        <p>{x.line[lang]}</p>
        <div className="ag-tcard-foot">
          <VoiceDot id={v.id} name={v.name} size={24} /><span className="ag-quiet">{busy ? t.templates.using : v.name}</span>
          <SamplePlay src={x.sample} label={`${t.templates.listen} · ${x.name[lang]}`} />
        </div>
      </div>
    </div>
  );
}
