"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AgentOrb } from "../VoiceReel";
import { agentsCopy } from "@/content/agents";
import { voices as reelVoices } from "@/content/playground";
import type { Lang } from "@/i18n/config";
import { Recorder, b64ToBlob, toClip } from "@/lib/audio";
import { language, voice as voiceOf, type LangCode, type VoiceId } from "@/lib/catalog";

/* Talking to an agent from its page, as ElevenAgents' test call, drawn as a phone call: the agent's name at the top,
   the home page's call orb in the middle (VoiceReel's AgentOrb, the founder's choice for this page) with its round
   call button, one line saying what is happening, and Start again and Hang up at the foot. No transcript. "Talk to it" asks for the greeting (/api/agents/<id>/greet) and
   plays it; then "Speak" records the caller, "Stop" sends the turn (/api/agents/<id>/turn) and the reply plays. The
   orb moves with the agent's voice while it speaks and with the caller's while they speak. The conversation's text is kept on the
   server, where Conversations shows it. */
type Phase = "idle" | "busy" | "ready" | "recording";

export function TalkPanel({ agentId, name, speaking, voice, lang }: { agentId: string; name: string; speaking: LangCode; voice: VoiceId | null; lang: Lang }) {
  const t = agentsCopy[lang];
  const [phase, setPhase] = useState<Phase>("idle");
  const [conv, setConv] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [speakingNow, setSpeakingNow] = useState(false);
  const rec = useRef<Recorder | null>(null);
  const graph = useRef<{ ctx: AudioContext; analyser: AnalyserNode } | null>(null);
  const current = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { current.current?.pause(); void rec.current?.stop(); void graph.current?.ctx.close(); }, []);

  /* the agent's voice goes through an analyser, so the orb can follow it */
  const hush = () => { current.current?.pause(); current.current?.dispatchEvent(new Event("ended")); };
  const play = (b: Blob) => {
    hush();
    const g = (graph.current ??= (() => { const ctx = new AudioContext(); const analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.connect(ctx.destination); return { ctx, analyser }; })());
    void g.ctx.resume();
    const url = URL.createObjectURL(b), a = new Audio(url);
    const source = g.ctx.createMediaElementSource(a);
    source.connect(g.analyser);
    current.current = a;
    // ended, failed or cut short (hush): the sound and its node are let go once
    a.onended = a.onerror = () => { a.onended = a.onerror = null; source.disconnect(); URL.revokeObjectURL(url); if (current.current === a) { current.current = null; setSpeakingNow(false); } };
    setSpeakingNow(true);
    void a.play().catch(() => setSpeakingNow(false));
  };
  const failed = async (r: Response) => {
    const j = await r.json().catch(() => null) as { error?: { type?: string; message?: string } } | null;
    setErr(j?.error?.type === "nothing_heard" ? t.errors.nothing : j?.error?.message ?? t.errors.generic);
  };

  const start = async () => {
    setPhase("busy"); setErr(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/greet`, { method: "POST" });
      if (!r.ok) { await failed(r); setPhase("idle"); return; }
      const j = await r.json() as { conversation: string; audio: string | null };
      setConv(j.conversation); setPhase("ready");
      if (j.audio) play(b64ToBlob(j.audio));
    } catch { setErr(t.errors.generic); setPhase("idle"); }
  };
  const listen = async () => {
    hush(); setSpeakingNow(false); setErr(null);
    const r = (rec.current = new Recorder());
    try { await r.start(60, () => void send()); } catch { rec.current = null; setErr(t.errors.mic); return; }
    if (rec.current === r) setPhase("recording");
  };
  const send = async () => {
    const r = rec.current; rec.current = null;
    if (!r) return;
    setPhase("busy");
    try {
      const clip = await toClip(await r.stop(), "turn.webm");
      const res = await fetch(`/api/agents/${agentId}/turn${conv ? `?c=${conv}` : ""}`, { method: "POST", headers: { "Content-Type": "audio/wav" }, body: clip.wav });
      if (!res.ok) { await failed(res); setPhase("ready"); return; }
      const j = await res.json() as { conversation: string; audio: string | null };
      setConv(j.conversation); setPhase("ready");
      if (j.audio) play(b64ToBlob(j.audio));
    } catch { setErr(t.errors.nothing); setPhase("ready"); }
  };

  /* how loud the agent is right now, from its voice's analyser */
  const buf = useRef(new Uint8Array(256));
  const loudness = useCallback(() => {
    const a = graph.current?.analyser;
    if (!a) return 0;
    a.getByteTimeDomainData(buf.current);
    let sum = 0; for (const x of buf.current) sum += ((x - 128) / 128) ** 2;
    return Math.sqrt(sum / buf.current.length) * 5;
  }, []);

  /* the orb's loudness, every frame while someone speaks: the agent through its analyser, the caller through the mic */
  const amp = useRef(0);
  useEffect(() => {
    if (!speakingNow && phase !== "recording") { amp.current = 0; return; }
    let raf = 0;
    const tick = () => { amp.current = Math.min(1, speakingNow ? loudness() : (rec.current?.level ?? 0) * 1.6); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [speakingNow, phase, loudness]);
  const hangUp = () => { hush(); setSpeakingNow(false); void rec.current?.stop(); rec.current = null; setConv(null); setPhase("idle"); setErr(null); };

  const v = voice ? voiceOf(voice) : null;
  const palette = (reelVoices[lang].find(x => x.id === voice) ?? reelVoices[lang][0]).palette;
  const live = phase !== "idle";
  const button = phase === "idle" ? { label: t.talk.start, run: start, icon: "phone-voice" as const }
    : phase === "recording" ? { label: t.talk.stop, run: send, icon: "stop" as const }
    : { label: t.talk.speak, run: listen, icon: "microphone" as const };
  const status = phase === "idle" ? t.talk.callWith(name, language(speaking).name[lang])
    : phase === "busy" ? t.talk.wait : phase === "recording" ? t.talk.listening : speakingNow ? t.talk.speaking : t.talk.tap;
  return (
    <section className="ag-talk" aria-label={t.talk.label} style={{ ["--pg-bg" as string]: "var(--surface)" }}>
      <header className="ag-talk-top">
        <h3>{name}</h3>
        <p className="ag-talk-sub">{language(speaking).endonym}{v ? ` · ${v.name}` : ""}</p>
      </header>
      <div className="ag-talk-mid">
        <div className={`pg-agent${live ? " live" : ""}${phase === "recording" ? " hearing" : ""}`}>
          <i aria-hidden="true" /><i aria-hidden="true" />
          <AgentOrb palette={palette} amp={amp} live={live} />
          <button type="button" className={`pg-call${phase === "recording" ? " on" : ""}`} aria-label={button.label} title={button.label}
            onClick={() => void button.run()} disabled={phase === "busy"}>
            {phase === "busy" ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={button.icon} size={22} stroke={1.6} />}
          </button>
        </div>
        <p className="pg-call-state" aria-live="polite">{status}</p>
        {err && <p className="cx-error" role="alert">{err}</p>}
      </div>
      <footer className="ag-talk-foot">
        {live && <>
          <button type="button" className="ag-link" onClick={() => { hangUp(); void start(); }} disabled={phase === "busy" || phase === "recording"}>{t.talk.again}</button>
          <button type="button" className="ag-talk-end" onClick={hangUp}><Icon name="close" size={16} stroke={1.8} />{t.talk.end}</button>
        </>}
      </footer>
    </section>
  );
}
