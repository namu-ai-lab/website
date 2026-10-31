"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer, RecordInput } from "../platform/media";
import { agentsCopy } from "@/content/agents";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { b64ToBlob, type Clip } from "@/lib/audio";
import type { LangCode } from "@/lib/catalog";

/* Talking to an agent from its builder, as ElevenAgents' test call: Start says the greeting; then speak (or type),
   and each reply plays in the agent's voice, with its text and, on request, its French (staff read French; the
   caller hears Hausa). Each turn goes through /api/agents/<id>/turn, which keeps the conversation's text. */
type Line = { role: "caller" | "agent"; text: string; audio?: Blob; fr?: string | null };

export function TalkPanel({ agentId, speaking, lang }: { agentId: string; speaking: LangCode; lang: Lang }) {
  const t = agentsCopy[lang], p = platformCopy[lang];
  const [conv, setConv] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null), player = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [lines, busy]);
  useEffect(() => () => player.current?.pause(), []);

  const play = (b: Blob) => {
    player.current?.pause();
    const u = URL.createObjectURL(b), a = new Audio(u);
    player.current = a; a.onended = () => URL.revokeObjectURL(u);
    void a.play().catch(() => {});
  };
  const failed = async (r: Response) => {
    const j = await r.json().catch(() => null) as { error?: { type?: string; message?: string } } | null;
    setErr(j?.error?.type === "nothing_heard" ? t.errors.nothing : j?.error?.message ?? p.errors.generic);
  };

  const start = async () => {
    setBusy(true); setErr(null); setLines([]); setConv(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/greet`, { method: "POST" });
      if (!r.ok) { await failed(r); return; }
      const j = await r.json() as { conversation: string; text: string; audio: string | null };
      setConv(j.conversation);
      if (j.text) {
        const audio = j.audio ? b64ToBlob(j.audio) : undefined;
        setLines([{ role: "agent", text: j.text, audio }]);
        if (audio) play(audio);
      }
    } catch { setErr(p.errors.network); } finally { setBusy(false); }
  };

  const send = async (body: BodyInit, type: string, shown?: string) => {
    setBusy(true); setErr(null);
    if (shown) setLines(l => [...l, { role: "caller", text: shown }]);
    try {
      const r = await fetch(`/api/agents/${agentId}/turn${conv ? `?c=${conv}` : ""}`, { method: "POST", headers: { "Content-Type": type }, body });
      if (!r.ok) { if (shown) setLines(l => l.slice(0, -1)); await failed(r); return; }
      const j = await r.json() as { conversation: string; heard: string; reply: string; audio: string | null };
      setConv(j.conversation);
      const audio = j.audio ? b64ToBlob(j.audio) : undefined;
      setLines(l => [...(shown ? l : [...l, { role: "caller" as const, text: j.heard }]), { role: "agent", text: j.reply, audio }]);
      if (audio) play(audio);
    } catch { if (shown) setLines(l => l.slice(0, -1)); setErr(p.errors.network); } finally { setBusy(false); }
  };

  const french = async (i: number) => {
    const line = lines[i];
    if (line.fr !== undefined) { setLines(l => l.map((x, k) => (k === i ? { ...x, fr: undefined } : x))); return; }
    setLines(l => l.map((x, k) => (k === i ? { ...x, fr: null } : x)));
    try {
      const r = await fetch("/api/create/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line.text, from: speaking, to: "fr" }) });
      const j = await r.json() as { text?: string };
      setLines(l => l.map((x, k) => (k === i ? { ...x, fr: r.ok ? j.text ?? "" : undefined } : x)));
    } catch { setLines(l => l.map((x, k) => (k === i ? { ...x, fr: undefined } : x))); }
  };

  const started = conv !== null;
  return (
    <section className="ag-talk" aria-label={t.talk.title}>
      <header className="ag-talk-head">
        <h2>{t.talk.title}</h2>
        {started && <button type="button" className="cx-link" onClick={() => void start()} disabled={busy}>{t.talk.again}</button>}
      </header>
      {!started ? (
        <div className="ag-talk-start">
          <button type="button" className={`ag-orb${busy ? " busy" : ""}`} onClick={() => void start()} disabled={busy} aria-label={t.talk.start}>
            <Icon name="phone-voice" size={26} stroke={1.4} />
          </button>
          <button type="button" className="cx-btn primary" onClick={() => void start()} disabled={busy}>{t.talk.start}</button>
          {err && <p className="cx-error" role="alert">{err}</p>}
        </div>
      ) : (
        <>
          <div className="ag-lines" aria-live="polite">
            {lines.map((l, i) => (
              <div key={i} className={`ag-line ${l.role}`}>
                <p className="ag-who">{l.role === "agent" ? t.talk.agent : t.talk.caller}</p>
                {l.audio && <AudioPlayer src={l.audio} labels={{ play: p.play, pause: p.pause, download: p.download }} compact />}
                <p className="ag-said" lang={l.role === "agent" ? speaking : undefined}>{l.text}</p>
                {l.role === "agent" && (
                  <>
                    {l.fr && <p className="ag-fr" lang="fr">{l.fr}</p>}
                    <button type="button" className="ag-fr-btn" aria-pressed={l.fr !== undefined} onClick={() => void french(i)}>
                      {l.fr === null ? t.talk.thinking : l.fr !== undefined ? t.talk.hide : t.talk.french}
                    </button>
                  </>
                )}
              </div>
            ))}
            {busy && <div className="ag-line agent"><span className="ag-dots" aria-hidden="true"><i /><i /><i /></span></div>}
            <div ref={end} />
          </div>
          <div className="ag-talk-in">
            <RecordInput labels={p.record} maxMinutes={1} disabled={busy} onClip={(c: Clip) => void send(c.wav, "audio/wav")} />
            <form className="ag-type" onSubmit={e => { e.preventDefault(); const m = text.trim(); if (!m) return; setText(""); void send(JSON.stringify({ text: m }), "application/json", m); }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder={t.talk.typePh} aria-label={t.talk.typePh} disabled={busy} maxLength={2000} />
              <button type="submit" className="cx-icon-btn" aria-label={t.talk.send} disabled={busy || !text.trim()}><Icon name="arrow-long" size={18} stroke={1.6} /></button>
            </form>
            {err && <p className="cx-error" role="alert">{err}</p>}
          </div>
        </>
      )}
    </section>
  );
}
