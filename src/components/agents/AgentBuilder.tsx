"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { VoicePicker } from "../platform/pickers";
import { TalkPanel } from "./TalkPanel";
import { Workflow } from "./Workflow";
import { TABS, type Tab } from "./tabs";
import type { Step } from "@/content/agent-templates";
import { agentsCopy, type AgentsCopy } from "@/content/agents";
import { platformCopy, type PlatformCopy } from "@/content/platform";
import { formatDate, formatNumber } from "@/i18n/format";
import { lp, type Lang } from "@/i18n/config";
import { LANGUAGES, LOCAL, can, language, type LangCode, type VoiceId } from "@/lib/catalog";
import { LIMITS_AGENT, parseExpect, type Agent, type AgentDoc, type AgentTest, type Check, type Conversation } from "@/lib/agent-shape";

/* The agent builder, after ElevenAgents: the agent's name above its tabs (Agent, Workflow, Knowledge, Checks,
   Tests, Deploy, Conversations), and beside them the talk panel to try it. Every change saves itself a moment after
   typing stops (PATCH /api/agents/<id>); documents and tests are added and removed one by one. */
type Save = "idle" | "saving" | "saved" | "failed";

export function AgentBuilder({ lang, initial, docs: docs0, tests: tests0, conversations, steps, tab: tab0, whatsapp }: {
  lang: Lang; initial: Agent; docs: AgentDoc[]; tests: AgentTest[]; conversations: Conversation[];
  steps: Step[]; tab: Tab; whatsapp: { server: boolean; webhook: string; admin: boolean };
}) {
  const t = agentsCopy[lang], p = platformCopy[lang];
  const [a, setA] = useState(initial);
  const [tab, setTab] = useState<Tab>(tab0);
  const [save, setSave] = useState<Save>("idle");
  const pending = useRef<Partial<Agent>>({}), timer = useRef(0);
  const L = (path: string) => lp(lang, path);

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
  };
  const speaking = a.languages[0] ?? "ha";

  return (
    <div className="ag-builder">
      <header className="ag-top">
        <a className="ag-crumb" href={L("/agents")}>{t.list.title}</a>
        <Icon name="chevron" size={14} stroke={1.6} className="rot-90" />
        <input className="ag-name" value={a.name} aria-label={t.agent.name} maxLength={LIMITS_AGENT.name}
          onChange={e => change({ name: e.target.value })} onBlur={e => { if (!e.target.value.trim()) change({ name: initial.name }); }} />
        <span className={`ag-save ${save}`} role="status">{save === "saving" ? t.saving : save === "saved" ? t.saved : save === "failed" ? t.failed : ""}</span>
      </header>
      <nav className="ag-tabs" role="tablist" aria-label={a.name}>
        {TABS.map(x => <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => pick(x)}>{t.tabs[x]}</button>)}
      </nav>

      <div className="ag-work">
        <div className="ag-pane" role="tabpanel">
          {tab === "agent" && <AgentTab a={a} change={change} t={t} p={p} lang={lang} />}
          {tab === "workflow" && <Workflow steps={steps} lang={lang} title={t.tabs.workflow} />}
          {tab === "knowledge" && <KnowledgeTab agentId={a.id} initial={docs0} t={t} lang={lang} />}
          {tab === "checks" && <ChecksTab checks={a.checks} onChange={checks => change({ checks })} t={t} />}
          {tab === "tests" && <TestsTab agentId={a.id} initial={tests0} t={t} p={p} />}
          {tab === "deploy" && <DeployTab a={a} change={change} t={t} p={p} whatsapp={whatsapp} />}
          {tab === "conversations" && <ConversationList list={conversations} lang={lang} />}
        </div>
        <TalkPanel agentId={a.id} speaking={speaking} lang={lang} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Agent */
function AgentTab({ a, change, t, p, lang }: { a: Agent; change: (x: Partial<Agent>) => void; t: AgentsCopy; p: PlatformCopy; lang: Lang }) {
  const options = [...LOCAL, ...LANGUAGES.map(l => l.code).filter(c => !LOCAL.includes(c))];
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
    <div className="ag-form">
      <label className="ag-field">
        <span>{t.agent.greeting}</span>
        <textarea rows={2} value={a.greeting} maxLength={LIMITS_AGENT.greeting} placeholder={t.agent.greetingPh} lang="fr" onChange={e => change({ greeting: e.target.value })} />
      </label>
      <label className="ag-field">
        <span>{t.agent.instructions}</span>
        <textarea rows={9} value={a.instructions} maxLength={LIMITS_AGENT.instructions} placeholder={t.agent.instructionsPh} lang="fr" onChange={e => change({ instructions: e.target.value })} />
      </label>
      <div className="ag-field">
        <span>{t.agent.languages}</span>
        <div className="pf-chips" role="group" aria-label={t.agent.languages}>
          {options.map(l => {
            const ok = can("converse", l);
            return (
              <button key={l} type="button" className="pf-chip" aria-pressed={a.languages.includes(l)} disabled={!ok} onClick={() => toggle(l)}>
                {language(l).endonym}{!ok && <span className="pf-soon">{p.soon}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="ag-field">
        <span>{t.agent.voice}</span>
        <div className="ag-voice"><VoicePicker lang={a.languages[0] ?? "ha"} value={a.voice} onPick={(v: VoiceId) => change({ voice: v })} label={t.agent.voice} playLabel={p.play} /></div>
      </div>
      <div className="ag-danger"><button type="button" className="cx-link" onClick={() => void remove()}>{t.agent.remove}</button></div>
    </div>
  );
}

/* ---------------------------------------------------------------- Knowledge */
function KnowledgeTab({ agentId, initial, t, lang }: { agentId: string; initial: AgentDoc[]; t: AgentsCopy; lang: Lang }) {
  const [docs, setDocs] = useState(initial);
  const [name, setName] = useState(""), [body, setBody] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const read = async (f: File) => {
    const text = await f.text();
    if (text.length > LIMITS_AGENT.doc) { setErr(t.knowledge.tooBig); return; }
    setBody(text); if (!name) setName(f.name.replace(/\.(txt|md)$/i, ""));
  };
  const add = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/documents`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, body }) });
      const j = await r.json().catch(() => null) as { doc?: AgentDoc; error?: { message?: string; type?: string } } | null;
      if (!r.ok || !j?.doc) { setErr(j?.error?.type === "limit_reached" ? t.errors.tooMany : j?.error?.message ?? `HTTP ${r.status}`); return; }
      setDocs(d => [j.doc!, ...d]); setName(""); setBody("");
    } finally { setBusy(false); }
  };
  const drop = async (id: string) => {
    const r = await fetch(`/api/agents/documents/${id}`, { method: "DELETE" });
    if (r.ok) setDocs(d => d.filter(x => x.id !== id));
  };
  return (
    <div className="ag-form">
      {docs.length > 0 && (
        <ul className="ag-list">
          {docs.map(d => (
            <li key={d.id}>
              <Icon name="paper" size={18} stroke={1.4} />
              <span className="ag-list-main"><strong>{d.name}</strong><em>{t.knowledge.chars(formatNumber(lang, d.chars))}</em></span>
              <button type="button" className="cx-icon-btn" aria-label={`${t.delete} ${d.name}`} onClick={() => void drop(d.id)}><Icon name="trash" size={16} stroke={1.5} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="ag-add">
        <p className="ag-add-h">{t.knowledge.add}</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.knowledge.namePh} aria-label={t.knowledge.name} maxLength={200} />
        <textarea rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder={t.knowledge.textPh} aria-label={t.knowledge.text} />
        <p className="ag-quiet">{t.knowledge.heard}</p>
        <div className="ag-add-acts">
          <button type="button" className="cx-btn sm" onClick={() => file.current?.click()}><Icon name="upload" size={15} stroke={1.6} />{t.knowledge.upload}</button>
          <input ref={file} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void read(f); }} />
          <button type="button" className="cx-btn primary sm" disabled={busy || !body.trim()} onClick={() => void add()}>{t.knowledge.save}</button>
        </div>
        {err && <p className="cx-error" role="alert">{err}</p>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Checks */
function ChecksTab({ checks, onChange, t }: { checks: Check[]; onChange: (c: Check[]) => void; t: AgentsCopy }) {
  const block = (kind: Check["kind"], title: string, ph: string) => <CheckList key={kind} kind={kind} title={title} ph={ph} checks={checks} onChange={onChange} add={t.checks.add} del={t.delete} />;
  return <div className="ag-form">{block("goal", t.checks.goals, t.checks.goalPh)}{block("field", t.checks.fields, t.checks.fieldPh)}</div>;
}

function CheckList({ kind, title, ph, checks, onChange, add, del }: { kind: Check["kind"]; title: string; ph: string; checks: Check[]; onChange: (c: Check[]) => void; add: string; del: string }) {
  const [v, setV] = useState("");
  const mine = checks.map((c, i) => ({ c, i })).filter(x => x.c.kind === kind);
  return (
    <div className="ag-field">
      <span>{title}</span>
      {mine.length > 0 && (
        <ul className="ag-list compact">
          {mine.map(({ c, i }) => (
            <li key={i}><Icon name={kind === "goal" ? "check" : "note"} size={16} stroke={1.5} /><span className="ag-list-main">{c.text}</span>
              <button type="button" className="cx-icon-btn" aria-label={`${del} ${c.text}`} onClick={() => onChange(checks.filter((_, k) => k !== i))}><Icon name="close" size={15} stroke={1.5} /></button></li>
          ))}
        </ul>
      )}
      <form className="ag-inline" onSubmit={e => { e.preventDefault(); const x = v.trim(); if (!x) return; onChange([...checks, { kind, text: x }]); setV(""); }}>
        <input value={v} onChange={e => setV(e.target.value)} placeholder={ph} aria-label={title} maxLength={300} lang="fr" />
        <button type="submit" className="cx-btn sm" disabled={!v.trim()}>{add}</button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- Tests */
function TestsTab({ agentId, initial, t, p }: { agentId: string; initial: AgentTest[]; t: AgentsCopy; p: PlatformCopy }) {
  const [tests, setTests] = useState(initial);
  const [ask, setAsk] = useState(""), [expect, setExpect] = useState(""), [running, setRunning] = useState(false), [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const add = async () => {
    setErr(null);
    const r = await fetch(`/api/agents/${agentId}/tests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask, expect: parseExpect(expect) }) });
    const j = await r.json().catch(() => null) as { test?: AgentTest; error?: { message?: string; type?: string } } | null;
    if (!r.ok || !j?.test) { setErr(j?.error?.type === "limit_reached" ? t.errors.tooMany : j?.error?.message ?? p.errors.generic); return; }
    setTests(x => [...x, j.test!]); setAsk(""); setExpect("");
  };
  const run = async () => {
    setRunning(true); setErr(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/tests/run`, { method: "POST" });
      const j = await r.json().catch(() => null) as { tests?: AgentTest[]; error?: { message?: string } } | null;
      if (!r.ok || !j?.tests) { setErr(j?.error?.message ?? p.errors.generic); return; }
      setTests(j.tests);
    } catch { setErr(p.errors.network); } finally { setRunning(false); }
  };
  const drop = async (id: string) => { const r = await fetch(`/api/agents/tests/${id}`, { method: "DELETE" }); if (r.ok) setTests(x => x.filter(y => y.id !== id)); };
  const passed = tests.filter(x => x.last_pass).length;
  return (
    <div className="ag-form">
      {tests.length > 0 && (
        <>
          <div className="ag-tests-bar">
            <span className="ag-score">{tests.some(x => x.last_pass !== null) ? `${passed} / ${tests.length}` : ""}</span>
            <button type="button" className="cx-btn primary sm" onClick={() => void run()} disabled={running}><Icon name="play" size={13} stroke={1.6} />{running ? t.tests.running : t.tests.runAll}</button>
          </div>
          <ul className="ag-list">
            {tests.map(x => (
              <li key={x.id} className="ag-test">
                <span className={`ag-pill ${x.last_pass === null ? "none" : x.last_pass ? "pass" : "fail"}`}>{x.last_pass === null ? t.tests.notRun : x.last_pass ? t.tests.passed : t.tests.failed}</span>
                <span className="ag-list-main">
                  <strong lang="fr">{x.ask}</strong>
                  {x.expect.length > 0 && <span className="ag-tags">{x.expect.map(w => <em key={w}>{w}</em>)}</span>}
                  {x.last_reply && open === x.id && <span className="ag-reply">{x.last_reply}</span>}
                </span>
                {x.last_reply && <button type="button" className="cx-link" onClick={() => setOpen(open === x.id ? null : x.id)}>{t.tests.reply}</button>}
                <button type="button" className="cx-icon-btn" aria-label={`${t.delete} ${x.ask}`} onClick={() => void drop(x.id)}><Icon name="trash" size={16} stroke={1.5} /></button>
              </li>
            ))}
          </ul>
        </>
      )}
      <form className="ag-add" onSubmit={e => { e.preventDefault(); if (ask.trim()) void add(); }}>
        <p className="ag-add-h">{t.tests.add}</p>
        <input value={ask} onChange={e => setAsk(e.target.value)} placeholder={t.tests.askPh} aria-label={t.tests.ask} maxLength={LIMITS_AGENT.ask} />
        <input value={expect} onChange={e => setExpect(e.target.value)} placeholder={t.tests.expectPh} aria-label={t.tests.expect} />
        <div className="ag-add-acts"><button type="submit" className="cx-btn primary sm" disabled={!ask.trim()}>{t.tests.add}</button></div>
        {err && <p className="cx-error" role="alert">{err}</p>}
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- Deploy */
/* A WhatsApp number is bound to an agent by a Namu admin (the API refuses channels from anyone else), so nobody can
   point an agent at a number that is not theirs; the organisation asks, and sees the number once it is connected. */
function DeployTab({ a, change, t, p, whatsapp }: { a: Agent; change: (x: Partial<Agent>) => void; t: AgentsCopy; p: PlatformCopy; whatsapp: { server: boolean; webhook: string; admin: boolean } }) {
  const id = a.channels.whatsapp?.phoneNumberId ?? "";
  const state = !whatsapp.server ? "off" : id ? "on" : "wait";
  return (
    <div className="ag-deploy">
      <section className="ag-channel">
        <header>
          <span className="ag-wa" aria-hidden="true"><Icon name="waveform" size={20} stroke={1.5} /></span>
          <h3>{t.deploy.whatsapp}</h3>
          <span className={`ag-pill ${state === "on" ? "pass" : "none"}`}>{state === "on" ? t.deploy.connected : state === "wait" ? t.deploy.waiting : t.deploy.serverOff}</span>
        </header>
        {whatsapp.admin ? (
          <>
            <label className="ag-field">
              <span>{t.deploy.phoneId}</span>
              <input inputMode="numeric" value={id} placeholder={t.deploy.phoneIdPh} onChange={e => change({ channels: { whatsapp: { phoneNumberId: e.target.value.replace(/\D/g, "").slice(0, 24) } } })} />
            </label>
            <div className="ag-field">
              <span>{t.deploy.webhook}</span>
              <div className="ag-copyrow"><code>{whatsapp.webhook}</code><CopyButton text={whatsapp.webhook} labels={{ copy: t.deploy.copy, copied: t.deploy.copied, failed: p.errors.generic }} className="cx-icon-btn" iconOnly /></div>
            </div>
            <div className="ag-field"><span>{t.deploy.verify}</span><p className="ag-quiet">{whatsapp.server ? t.deploy.verifySet : t.deploy.serverOff}</p></div>
          </>
        ) : id ? (
          <div className="ag-field"><span>{t.deploy.number}</span><code className="ag-number">{id}</code></div>
        ) : (
          <a className="cx-btn primary sm ag-request" href={`mailto:contact@namuai.org?subject=${encodeURIComponent(`WhatsApp · ${a.name}`)}`}>{t.deploy.request}</a>
        )}
      </section>
      <div className="ag-soon-row">
        <section className="ag-channel soon"><header><span className="ag-wa" aria-hidden="true"><Icon name="code" size={20} stroke={1.5} /></span><h3>{t.deploy.web}</h3><span className="pf-soon">{p.soon}</span></header></section>
        <section className="ag-channel soon"><header><span className="ag-wa" aria-hidden="true"><Icon name="phone-voice" size={20} stroke={1.5} /></span><h3>{t.deploy.phone}</h3><span className="pf-soon">{p.soon}</span></header></section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Conversations of this agent */
export function ConversationList({ list, lang }: { list: Conversation[]; lang: Lang }) {
  const t = agentsCopy[lang];
  if (!list.length) return <div className="pf-empty"><p>{t.convs.emptyH}</p></div>;
  return (
    <ul className="ag-list">
      {list.map(c => (
        <li key={c.id}>
          <a className="ag-conv-link" href={`${lp(lang, "/agents/conversations")}?c=${c.id}`}>
            <span className={`ag-pill ch-${c.channel}`}>{t.convs.channels[c.channel]}</span>
            <span className="ag-list-main"><strong>{c.turns.find(x => x.role === "caller")?.text ?? c.turns[0]?.text ?? "…"}</strong><em>{c.agent_name} · {t.convs.turns(c.turns.length)}</em></span>
            {c.flagged && <Icon name="warn" size={16} stroke={1.5} />}
            <span className="ag-when">{formatDate(lang, c.updated_at, { style: "dayMonth" })}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
