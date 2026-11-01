"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { VoiceDot } from "./bits";
import { agentsCopy } from "@/content/agents";
import type { Lang } from "@/i18n/config";
import { Recorder, b64ToBlob, toClip } from "@/lib/audio";
import { language, voice as voiceOf, type LangCode, type VoiceId } from "@/lib/catalog";

/* Talking to an agent from its page, as ElevenAgents' test call, and as a voice interface on Namu's brand: an orb,
   one button, no transcript and no status words. "Talk to it" asks for the greeting (/api/agents/<id>/greet) and
   plays it; then "Speak" records the caller, "Stop" sends the turn (/api/agents/<id>/turn) and the reply plays. The
   orb's voice lines move with the agent's voice, and rest when it is quiet. The conversation's text is kept on the
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

  const v = voice ? voiceOf(voice) : null;
  const button = phase === "idle" ? { label: t.talk.start, run: start, icon: "microphone" as const }
    : phase === "recording" ? { label: t.talk.stop, run: send, icon: "stop" as const }
    : { label: t.talk.speak, run: listen, icon: "microphone" as const };
  return (
    <section className="ag-talk" aria-label={t.talk.label}>
      <Orb graph={graph} active={speakingNow} />
      <h3>{name}</h3>
      <p className="ag-talk-sub"><VoiceDot id={v?.id ?? null} name={v?.name} size={22} /><span>{language(speaking).endonym}{v ? ` · ${v.name}` : ""}</span></p>
      <button type="button" className={`cx-btn primary ag-talk-btn${phase === "recording" ? " on" : ""}`} onClick={() => void button.run()} disabled={phase === "busy"}>
        {phase === "busy" ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={button.icon} size={16} stroke={1.6} />}{button.label}
      </button>
      {phase !== "idle" && phase !== "recording" && (
        <button type="button" className="ag-link" onClick={() => { hush(); setSpeakingNow(false); setConv(null); void start(); }} disabled={phase === "busy"}>{t.talk.again}</button>
      )}
      {err && <p className="cx-error" role="alert">{err}</p>}
    </section>
  );
}

/* The orb: a warm sphere with four voice lines. They move with the level of the agent's voice while it speaks, then
   settle and rest; nothing loops while it is quiet. With reduced motion the lines stay still. */
function Orb({ graph, active }: { graph: React.RefObject<{ analyser: AnalyserNode } | null>; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ level: 0, phase: 0, raf: 0 });
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const g = c.getContext("2d"); if (!g) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = c.width, H = c.height, R = W * .46, buf = new Uint8Array(256), s = state.current;
    const draw = () => {
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.arc(W / 2, H / 2, R, 0, Math.PI * 2); g.clip();
      const grad = g.createRadialGradient(W * .36, H * .32, R * .05, W / 2, H / 2, R * 1.05);
      grad.addColorStop(0, "#FFF4E6"); grad.addColorStop(.45, "#F6C8A0"); grad.addColorStop(.8, "#E8935A"); grad.addColorStop(1, "#B4552A");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const amp = (5 + 40 * s.level) * (1 - k * .18), freq = 1.6 + k * .55, off = k * 1.3;
        for (let x = 0; x <= W; x += 4) {
          const u = x / W, y = H / 2 + (k - 1.5) * 13 + Math.sin(u * Math.PI * 2 * freq + s.phase + off) * amp * Math.sin(Math.PI * u);
          if (x) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.strokeStyle = `rgba(255,250,241,${.75 - k * .14})`; g.lineWidth = 2.8 - k * .45; g.stroke();
      }
      g.restore();
    };
    const tick = () => {
      let target = 0;
      const a = graph.current?.analyser;
      if (active && a) { a.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += ((v - 128) / 128) ** 2; target = Math.min(1, Math.sqrt(sum / buf.length) * 5); }
      s.level += (target - s.level) * .18;
      if (!still) s.phase += .05 + s.level * .08;
      draw();
      if (active || s.level > .01) s.raf = requestAnimationFrame(tick);
      else { s.level = 0; draw(); }
    };
    if (still) { draw(); return; }
    tick();
    return () => cancelAnimationFrame(s.raf);
  }, [active, graph]);
  return <canvas ref={canvas} className="ag-orb" width={360} height={360} aria-hidden="true" />;
}
