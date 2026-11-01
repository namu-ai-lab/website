"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { SamplePlay, VoiceDot } from "./bits";
import { ConversationList } from "./Conversations";
import { ScrollRow } from "../platform/ScrollRow";
import { TalkPanel } from "./TalkPanel";
import { TABS, type Tab } from "./tabs";
import { agentsCopy, type AgentsCopy } from "@/content/agents";
import { platformCopy } from "@/content/platform";
import { formatNumber } from "@/i18n/format";
import { lp, type Lang } from "@/i18n/config";
import { LOCAL, can, defaultVoice, language, voicesFor, type LangCode, type VoiceId } from "@/lib/catalog";
import { LIMITS_AGENT, type Agent, type AgentDoc, type Conversation } from "@/lib/agent-shape";

/* One agent's page, after ElevenAgents, cut to what an organisation needs first: its name and whether it is on
   WhatsApp, four tabs (Agent, Knowledge, Conversations, WhatsApp), and beside them the talk panel to try it. Every
   change saves itself a moment after typing stops (PATCH /api/agents/<id>); documents are added and removed one by
   one. On a phone the talk panel comes first. */
type Save = "idle" | "saving" | "saved" | "failed";
type WhatsappInfo = { server: boolean; webhook: string; admin: boolean };

export function AgentBuilder({ lang, initial, docs, conversations, tab: tab0, whatsapp }: {
  lang: Lang; initial: Agent; docs: AgentDoc[]; conversations: Conversation[]; tab: Tab; whatsapp: WhatsappInfo;
}) {
  const t = agentsCopy[lang];
  const [a, setA] = useState(initial);
  const [tab, setTab] = useState<Tab>(tab0);
  const [save, setSave] = useState<Save>("idle");
  const pending = useRef<Partial<Agent>>({}), timer = useRef(0);
  const L = (path: string) => lp(lang, path);
  const router = useRouter();

  const flush = async () => {
    const body = pending.current; pending.current = {};
    if (!Object.keys(body).length) return;
    setSave("saving");
    try {
      const r = await fetch(`/api/agents/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSave(r.ok ? "saved" : "failed");
    } catch { setSave("failed"); }
  };
  const change = (patch: Partial<Agent>) => {
    setA(x => ({ ...x, ...patch }));
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 700);
  };
  useEffect(() => () => { window.clearTimeout(timer.current); void flush(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (x: Tab) => {
    setTab(x);
    const u = new URL(window.location.href); u.searchParams.set("tab", x); window.history.replaceState(null, "", u);
    if (x === "conversations") router.refresh();   // the server lists them again, with any held since the page opened
  };
  const speaking = a.languages[0] ?? "ha";
  const voice = a.voice ?? defaultVoice(speaking);
  const bound = Boolean(a.channels.whatsapp?.phoneNumberId);

  return (
    <div className="ag-builder">
      <nav className="ag-crumb" aria-label={t.list.title}><a href={L("/agents")}>{t.list.title}</a><Icon name="chevron" size={14} stroke={1.6} /><span>{a.name}</span></nav>
      <header className="ag-head">
        <div className="ag-head-name">
          <input className="ag-name" value={a.name} aria-label={t.agent.name} maxLength={LIMITS_AGENT.name} size={Math.max(8, a.name.length)}
            onChange={e => change({ name: e.target.value })} onBlur={e => { if (!e.target.value.trim()) change({ name: initial.name }); }} />
          <span className={`ag-tag${bound ? " live" : ""}`}>{bound ? t.list.live : t.list.draft}</span>
          <span className={`ag-save ${save}`} role="status">{save === "saving" ? t.saving : save === "saved" ? t.saved : save === "failed" ? t.failed : ""}</span>
        </div>
        <button type="button" className="cx-btn" onClick={() => pick("whatsapp")}><Icon name="phone-voice" size={16} stroke={1.6} />{bound ? t.whatsapp.title : t.whatsapp.request}</button>
      </header>
      <ScrollRow className="ag-tabs" role="tablist" aria-label={a.name}>
        {TABS.map(x => <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => pick(x)}>{t.tabs[x]}</button>)}
      </ScrollRow>

      <div className="ag-work">
        <div className="ag-pane" role="tabpanel">
          {tab === "agent" && <AgentTab a={a} change={change} t={t} lang={lang} />}
          {tab === "knowledge" && <KnowledgeTab agentId={a.id} initial={docs} t={t} lang={lang} />}
          {tab === "conversations" && <ConversationList list={conversations} lang={lang} showAgent={false} />}
          {tab === "whatsapp" && <WhatsappTab a={a} change={change} t={t} lang={lang} whatsapp={whatsapp} />}
        </div>
        <TalkPanel agentId={a.id} name={a.name} speaking={speaking} voice={voice} lang={lang} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Agent: first words, what it does, voice, languages */
function AgentTab({ a, change, t, lang }: { a: Agent; change: (x: Partial<Agent>) => void; t: AgentsCopy; lang: Lang }) {
  const p = platformCopy[lang];
  const speaking = a.languages[0] ?? "ha";
  const current = a.voice ?? defaultVoice(speaking);
  const toggle = (l: LangCode) => {
    const on = a.languages.includes(l);
    const next = on ? a.languages.filter(x => x !== l) : [...a.languages, l];
    if (next.length) change({ languages: next });
  };
  const remove = async () => {
    if (!window.confirm(t.agent.removeAsk)) return;
    const r = await fetch(`/api/agents/${a.id}`, { method: "DELETE" });
    if (r.ok) window.location.href = lp(lang, "/agents");
  };
  return (
    <div className="ag-card ag-form">
      <label className="ag-field">
        <span>{t.agent.greeting}</span>
        <textarea rows={2} value={a.greeting} maxLength={LIMITS_AGENT.greeting} placeholder={t.agent.greetingPh} lang="fr" onChange={e => change({ greeting: e.target.value })} />
      </label>
      <label className="ag-field">
        <span>{t.agent.instructions}</span>
        <textarea rows={7} value={a.instructions} maxLength={LIMITS_AGENT.instructions} placeholder={t.agent.instructionsPh} lang="fr" onChange={e => change({ instructions: e.target.value })} />
      </label>
      <div className="ag-field">
        <span>{t.agent.voice}</span>
        <div className="ag-chips" role="radiogroup" aria-label={t.agent.voice}>
          {voicesFor(speaking).map(v => (
            <span key={v.id} className="ag-voice">
              <button type="button" className="ag-chip" role="radio" aria-checked={v.id === current} onClick={() => change({ voice: v.id as VoiceId })}>
                <VoiceDot id={v.id} name={v.name} size={22} />{v.name}
              </button>
              <SamplePlay src={v.sample} label={`${p.play} · ${v.name}`} className="ag-mini round" />
            </span>
          ))}
        </div>
      </div>
      <div className="ag-field">
        <span>{t.agent.languages}</span>
        <div className="ag-chips" role="group" aria-label={t.agent.languages}>
          {LOCAL.filter(l => can("converse", l)).map(l => (
            <button key={l} type="button" className="ag-chip" aria-pressed={a.languages.includes(l)} onClick={() => toggle(l)}>{language(l).endonym}</button>
          ))}
        </div>
      </div>
      <div className="ag-field ag-foot"><span /><button type="button" className="ag-link danger" onClick={() => void remove()}>{t.agent.remove}</button></div>
    </div>
  );
}

/* ---------------------------------------------------------------- Knowledge: the documents it answers from */
function KnowledgeTab({ agentId, initial, t, lang }: { agentId: string; initial: AgentDoc[]; t: AgentsCopy; lang: Lang }) {
  const [docs, setDocs] = useState(initial);
  const [writing, setWriting] = useState(false);
  const [name, setName] = useState(""), [body, setBody] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const read = async (f: File) => {
    const text = await f.text();
    if (text.length > LIMITS_AGENT.doc) { setErr(t.knowledge.tooBig); return; }
    setBody(text); setName(n => n || f.name.replace(/\.(txt|md)$/i, "")); setWriting(true); setErr(null);
  };
  const add = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/documents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, body }) });
      const j = await r.json().catch(() => null) as { doc?: AgentDoc; error?: { message?: string; type?: string } } | null;
      if (!r.ok || !j?.doc) { setErr(j?.error?.type === "limit_reached" ? t.errors.tooMany : j?.error?.message ?? t.errors.generic); return; }
      setDocs(d => [j.doc!, ...d]); setName(""); setBody(""); setWriting(false);
    } catch { setErr(t.errors.generic); } finally { setBusy(false); }
  };
  const drop = async (id: string) => {
    const r = await fetch(`/api/agents/documents/${id}`, { method: "DELETE" });
    if (r.ok) setDocs(d => d.filter(x => x.id !== id));
  };
  const actions = (
    <div className="ag-acts">
      <button type="button" className={`cx-btn${docs.length ? "" : " primary"}`} onClick={() => file.current?.click()}><Icon name="upload" size={16} stroke={1.6} />{t.knowledge.add}</button>
      <button type="button" className="cx-btn" onClick={() => setWriting(true)}><Icon name="pencil" size={16} stroke={1.6} />{t.knowledge.write}</button>
      <input ref={file} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void read(f); }} />
    </div>
  );
  return (
    <div className="ag-knowledge">
      {docs.length > 0 && (
        <ul className="ag-docs">
          {docs.map(d => (
            <li key={d.id}>
              <Icon name="paper" size={18} stroke={1.4} />
              <strong>{d.name}</strong><em>{t.knowledge.chars(formatNumber(lang, d.chars))}</em>
              <button type="button" className="cx-icon-btn" aria-label={`${t.delete} ${d.name}`} onClick={() => void drop(d.id)}><Icon name="trash" size={16} stroke={1.5} /></button>
            </li>
          ))}
        </ul>
      )}
      {writing ? (
        <form className="ag-card ag-write" onSubmit={e => { e.preventDefault(); if (body.trim()) void add(); }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.knowledge.namePh} aria-label={t.knowledge.name} maxLength={200} />
          <textarea rows={7} value={body} onChange={e => setBody(e.target.value)} placeholder={t.knowledge.textPh} aria-label={t.knowledge.text} lang="fr" />
          <p className="ag-quiet">{t.knowledge.heard}</p>
          <div className="ag-acts">
            <button type="button" className="cx-btn ghost" onClick={() => { setWriting(false); setErr(null); }}>{t.knowledge.cancel}</button>
            <button type="submit" className="cx-btn primary" disabled={busy || !body.trim()}>{t.knowledge.save}</button>
          </div>
        </form>
      ) : docs.length ? actions : (
        <div className="ag-card ag-empty"><Icon name="paper" size={26} stroke={1.3} /><p>{t.knowledge.emptyH}</p>{actions}</div>
      )}
      {err && <p className="cx-error" role="alert">{err}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- WhatsApp */
/* A WhatsApp number is bound to an agent by a Namu admin (the API refuses channels from anyone else), so nobody can
   point an agent at a number that is not theirs; the organisation asks, and sees the number once it is connected. */
function WhatsappTab({ a, change, t, lang, whatsapp }: { a: Agent; change: (x: Partial<Agent>) => void; t: AgentsCopy; lang: Lang; whatsapp: WhatsappInfo }) {
  const id = a.channels.whatsapp?.phoneNumberId ?? "";
  const generic = platformCopy[lang].errors.generic;
  return (
    <div className="ag-card ag-wa">
      <span className="ag-wa-icon" aria-hidden="true"><Icon name="phone-voice" size={28} stroke={1.4} /></span>
      {id ? <><h2 className="ag-number">{id}</h2><span className="ag-tag live">{t.list.live}</span></> : <h2>{t.whatsapp.waiting}</h2>}
      {whatsapp.admin ? (
        <div className="ag-form ag-wa-admin">
          <label className="ag-field">
            <span>{t.whatsapp.phoneId}</span>
            <input inputMode="numeric" value={id} placeholder={t.whatsapp.phoneIdPh} onChange={e => change({ channels: { whatsapp: { phoneNumberId: e.target.value.replace(/\D/g, "").slice(0, 24) } } })} />
          </label>
          <div className="ag-field">
            <span>{t.whatsapp.webhook}</span>
            <div className="ag-copyrow"><code>{whatsapp.webhook}</code><CopyButton text={whatsapp.webhook} labels={{ copy: t.whatsapp.copy, copied: t.whatsapp.copied, failed: generic }} className="cx-icon-btn" iconOnly /></div>
          </div>
          <div className="ag-field"><span>{t.whatsapp.verify}</span><p className="ag-quiet">{whatsapp.server ? t.whatsapp.verifySet : t.whatsapp.serverOff}</p></div>
        </div>
      ) : !id && (
        <a className="cx-btn primary" href={`mailto:contact@namuai.org?subject=${encodeURIComponent(`WhatsApp · ${a.name}`)}`}>{t.whatsapp.request}</a>
      )}
    </div>
  );
}
