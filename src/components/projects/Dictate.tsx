"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { dictation } from "./client";
import { Recorder, toClip } from "@/lib/audio";
import type { LangCode } from "@/lib/catalog";
import { LIMITS } from "@/lib/limits";

/* A microphone that writes: press, speak in `lang`, press again, and what was said arrives as text. Hidden for a
   language no model can hear yet. While listening it shows the voice's level; while the model works, a quiet pulse. */
export function Dictate({ lang, onText, labels, onError, className = "pj-mic" }:
  { lang: LangCode; onText: (t: string) => void; labels: { dictate: string; stop: string; listening: string; mic: string }; onError: (m: string) => void; className?: string }) {
  const rec = useRef<Recorder | null>(null);
  const [state, setState] = useState<"idle" | "rec" | "work">("idle"), [level, setLevel] = useState(0);
  const write = dictation(lang);
  useEffect(() => {
    if (state !== "rec") return;
    const id = window.setInterval(() => setLevel(rec.current?.level ?? 0), 80);
    return () => clearInterval(id);
  }, [state]);
  useEffect(() => () => { void rec.current?.stop(); }, []);
  if (!write) return null;

  const start = async () => {
    const r = (rec.current = new Recorder());
    try { await r.start(LIMITS.audioMinutes * 60, () => void stop()); }
    catch { rec.current = null; onError(labels.mic); return; }
    if (rec.current === r) setState("rec");
  };
  const stop = async () => {
    const r = rec.current; rec.current = null;
    if (!r) return;
    setState("work");
    try {
      const clip = await toClip(await r.stop(), "dictation.wav");
      const body = clip.wav.size <= LIMITS.playgroundUploadMb * 1024 * 1024 ? clip.wav : clip.source;
      const text = (await write(body)).trim();
      if (text) onText(text);
    } catch (e) { onError(e instanceof Error ? e.message : "error"); }
    finally { setState("idle"); }
  };

  return (
    <button type="button" className={`${className} ${state}`} aria-pressed={state === "rec"} disabled={state === "work"}
      aria-label={state === "rec" ? labels.stop : state === "work" ? labels.listening : labels.dictate} title={state === "rec" ? labels.stop : labels.dictate}
      onClick={() => (state === "rec" ? void stop() : void start())} style={{ ["--lvl" as string]: String(Math.min(1, level * 1.6)) }}>
      <Icon name={state === "rec" ? "stop" : "microphone"} size={18} stroke={1.6} />
    </button>
  );
}
