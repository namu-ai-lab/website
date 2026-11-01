"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { lp, type Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";

/* Small client pieces of Namu Agents' pages. */

/** Makes an agent (from a template, or blank) and opens it; null when it could not. */
export async function makeAgent(lang: Lang, template?: string): Promise<string | null> {
  try {
    const r = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template, lang }) });
    const j = await r.json().catch(() => null) as { agent?: { id: string }; error?: { message?: string } } | null;
    if (r.ok && j?.agent) { window.location.href = lp(lang, `/agents/${j.agent.id}`); return j.agent.id; }
    return null;
  } catch { return null; }
}

/** Makes a blank agent and opens it. */
export function BlankAgentButton({ lang, label, busyLabel, className = "cx-btn", icon }: { lang: Lang; label: string; busyLabel: string; className?: string; icon?: boolean }) {
  const [busy, setBusy] = useState(false);
  const make = async () => { setBusy(true); if (!(await makeAgent(lang))) setBusy(false); };
  return (
    <button type="button" className={className} onClick={() => void make()} disabled={busy}>
      {icon && <Icon name="plus" size={16} stroke={1.7} />}{busy ? busyLabel : label}
    </button>
  );
}

const TONES: Record<string, [string, string, string]> = {
  nadia: ["#ffe6cf", "#f2b07f", "#c9773f"], salim: ["#efe2d2", "#b08d6c", "#6b4a32"], fr: ["#f4ece2", "#c9b8a6", "#5e5148"],
};
/** A voice's sphere with its initial, the tone fixed by the voice. */
export function VoiceDot({ id, name, size = 26 }: { id: string | null; name?: string; size?: number }) {
  const [a, b, c] = (id && TONES[id]) || ["#fffaf1", "#f3e7d1", "#d9c7ad"];
  const dark = id === "salim" || id === "fr";
  return (
    <span className="ag-dot" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * .42), color: dark ? "#fffaf1" : "#1c1410",
      background: `radial-gradient(circle at 34% 30%, ${a} 0, ${b} 55%, ${c} 100%)` }}>{name?.charAt(0)}</span>
  );
}

/* one sample at a time across the page */
let playing: { audio: HTMLAudioElement; stop: () => void } | null = null;
/** Plays a recording; a second press, or another sample, stops it. Shows its length once known. */
export function SamplePlay({ src, label, className = "ag-mini" }: { src: string; label: string; className?: string }) {
  const [on, setOn] = useState(false), [dur, setDur] = useState(0);
  const a = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = new Audio(); el.preload = "metadata"; el.src = src; a.current = el;
    const meta = () => setDur(el.duration || 0), end = () => setOn(false);
    el.addEventListener("loadedmetadata", meta); el.addEventListener("ended", end);
    return () => { el.pause(); el.removeEventListener("loadedmetadata", meta); el.removeEventListener("ended", end); };
  }, [src]);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const el = a.current; if (!el) return;
    if (on) { el.pause(); el.currentTime = 0; setOn(false); return; }
    playing?.stop();
    el.currentTime = 0; void el.play().catch(() => setOn(false));
    playing = { audio: el, stop: () => { el.pause(); setOn(false); } };
    setOn(true);
  };
  return (
    <button type="button" className={className} aria-label={label} aria-pressed={on} onClick={toggle}>
      <Icon name={on ? "pause" : "play"} size={13} stroke={1.6} />{dur > 0 && <span>{formatSeconds(dur)}</span>}
    </button>
  );
}
