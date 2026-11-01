"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "../Icon";
import { LocalTime } from "../console/LocalTime";
import { createProject } from "./client";
import { Dictate } from "./Dictate";
import { LangDots } from "./LangDots";
import { platformCopy } from "@/content/platform";
import { TEMPLATES, projectsCopy } from "@/content/projects";
import { lp, type Lang } from "@/i18n/config";
import { LOCAL, WRITTEN, language, stateOf, type LangCode } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import type { ProjectSummary } from "@/lib/project-shape";

/* Namu Create's home, after ElevenLabs' (screens/01): one question and one box. What you write or say there, in
   French or a local language, becomes a project and opens; the project turns it into every local language. Under it
   the tools as round tiles, then your recent projects or a template to start from. */
export function CreateHome({ lang, recents, ready }: { lang: Lang; recents: ProjectSummary[]; ready: boolean }) {
  const t = projectsCopy[lang].home, p = platformCopy[lang], L = (x: string) => lp(lang, x);
  const router = useRouter();
  const [text, setText] = useState(""), [from, setFrom] = useState<LangCode>(WRITTEN);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"recents" | "templates">(recents.length ? "recents" : "templates");
  const sources: LangCode[] = [WRITTEN, ...LOCAL];

  const open = async (make: () => Promise<{ id: string }>) => {
    if (busy) return;
    setBusy(true); setErr(null);
    try { const pr = await make(); router.push(L(`/create/projects/${pr.id}`)); }
    catch (e) { setErr(e instanceof Error ? e.message : p.errors.generic); setBusy(false); }
  };
  const submit = () => { if (text.trim()) void open(() => createProject({ sourceLang: from, sourceText: text.trim() })); };

  const tiles: { icon: IconName; label: string; href?: string; act?: () => void }[] = [
    { icon: "waveform", label: p.nav.speak, href: L("/create/speak") },
    { icon: "transcript", label: p.nav.transcribe, href: L("/create/transcribe") },
    { icon: "demo", label: p.nav.video, href: L("/create/video") },
    { icon: "plus", label: t.newProject, act: () => void open(() => createProject({ sourceLang: WRITTEN, sourceText: "", title: projectsCopy[lang].list.untitled })) },
    { icon: "microphone", label: p.nav.voices, href: L("/create/voices") },
    { icon: "note", label: p.nav.kit, href: L("/create/kit") },
  ];

  return (
    <div className="pj-home">
      <h1>{t.question}</h1>
      <form className="pj-prompt" onSubmit={e => { e.preventDefault(); submit(); }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} aria-label={t.question} rows={3} maxLength={20000}
          lang={language(from).code} disabled={!ready}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }} />
        <div className="pj-prompt-bar">
          <label className="pj-select">
            <span className="sr-only">{t.writtenIn}</span>
            <select value={from} onChange={e => setFrom(e.target.value as LangCode)} disabled={!ready}>
              {sources.map(l => (
                <option key={l} value={l} disabled={l !== WRITTEN && stateOf(l) !== "ready"}>
                  {language(l).endonym}{l !== WRITTEN && stateOf(l) !== "ready" ? ` · ${p.soon}` : ""}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={14} stroke={1.6} />
          </label>
          <span className="pj-grow" />
          {ready && <Dictate lang={from} onText={x => setText(cur => (cur.trim() ? `${cur.trim()} ${x}` : x))} onError={setErr}
            labels={{ dictate: t.dictate, stop: t.stopDictate, listening: t.listening, mic: p.record.mic }} />}
          <button type="submit" className="pj-send" aria-label={t.send} disabled={!ready || busy || !text.trim()}>
            <Icon name="arrow-long" size={18} stroke={1.8} />
          </button>
        </div>
      </form>
      {(err || !ready) && <p className={err ? "cx-error" : "cx-muted"} role={err ? "alert" : undefined}>{err ?? p.notReady[1]}</p>}

      <ul className="pj-tiles">
        {tiles.map(x => (
          <li key={x.label}>
            {x.href
              ? <a href={x.href}><span className="pj-tile"><Icon name={x.icon} size={20} stroke={1.5} /></span>{x.label}</a>
              : <button type="button" onClick={x.act} disabled={!ready || busy}><span className="pj-tile"><Icon name={x.icon} size={20} stroke={1.5} /></span>{x.label}</button>}
          </li>
        ))}
      </ul>

      <div className="pj-below">
        <div className="pj-tabs" role="tablist" aria-label={t.recents}>
          {(["recents", "templates"] as const).map(k => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{t[k]}</button>
          ))}
        </div>
        {tab === "recents" ? (
          recents.length ? (
            <ul className="pj-rows" role="tabpanel">
              {recents.map(r => (
                <li key={r.id}>
                  <a href={L(`/create/projects/${r.id}`)}>
                    <span className="pj-row-title">{r.title}</span>
                    <LangDots summary={r} status={projectsCopy[lang].editor.status} />
                    <span className="pj-row-time"><LocalTime iso={r.updatedAt} lang={lang} rel /></span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="pj-none" role="tabpanel">{t.none}</p>
        ) : (
          <ul className="pj-templates" role="tabpanel">
            {TEMPLATES.map(x => (
              <li key={x.id}>
                <button type="button" disabled={!ready || busy}
                  onClick={() => void open(() => createProject({ sourceLang: WRITTEN, sourceText: x.text, title: x.title[lang] }))}>
                  <span className="pj-tile sm"><Icon name={x.icon} size={18} stroke={1.5} /></span>
                  <span>{x.title[lang]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
