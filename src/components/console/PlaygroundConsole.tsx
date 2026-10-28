"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CodeTabs } from "../CodeTabs";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { MODEL_ORB } from "./colours";
import { consoleCopy } from "@/content/console";
import type { Lang } from "@/i18n/config";
import { formatNumber, formatSeconds, numberFormat } from "@/i18n/format";
import { b64ToBlob, peaksOfBlob, Recorder, toClip, type Clip } from "@/lib/audio";
import { LIMITS } from "@/lib/limits";

/* The console Playground, after platform.openai.com's playground and ElevenLabs' text-to-speech page: the four
   models as modes across the top; the input and what came back in the middle; Settings | History on the right; and
   View code, the same request written out for cURL, Python and JavaScript. Every run goes through
   /api/playground/<model>, which calls the gateway as the signed-in developer (their allowance, their logs).
   Each mode keeps its input and result while you look at another. */

export type Mode = "speech" | "transcribe" | "translate" | "converse";
const MODES: Mode[] = ["speech", "transcribe", "translate", "converse"];
const NAME: Record<Mode, string> = { speech: "Tafiya", transcribe: "Tatsuniya", translate: "Kora", converse: "Aïr" };
const PATH: Record<Mode, string> = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" };
type Voice = "nadia" | "salim" | "fr";
type Stats = { status: number; latencyMs: number; audioS?: number; chars?: number };
type Turn = { heard: string; reply: string; audio?: Blob };
type Out = { stats: Stats; error?: string; audio?: Blob; text?: string; source?: string; turns?: Turn[] };
type Run = { id: number; mode: Mode; label: string; out: Out };
type T = (typeof consoleCopy)["en"]["playground"];

const newSession = () => `pg-${Math.random().toString(36).slice(2, 10)}`;

/* What a clip sends to /api/playground, which takes LIMITS.playgroundUploadMb (Vercel refuses larger bodies before the
   route runs): the 16 kHz WAV while it fits, about the first two minutes (every model reads it, and the gateway
   measures it exactly); past that, the clip as it was recorded or chosen (Opus, AAC, MP3...), which is several times
   smaller: five minutes of a recording is about 2.3 MB. The WAV comes first because some WebM recordings from older
   Chromium carry no duration, which the gateway's ffprobe cannot measure. Too large in both forms: null, and the clip
   is refused when it is chosen, before anything is sent. */
const UPLOAD_MAX = LIMITS.playgroundUploadMb * 1024 * 1024;
const uploadOf = (c: Clip): Blob | null => (c.wav.size <= UPLOAD_MAX ? c.wav : c.source.size <= UPLOAD_MAX ? c.source : null);

async function call(mode: Mode, body: BodyInit, type: string, query = ""): Promise<Out & { json?: Record<string, unknown> }> {
  const t0 = performance.now();
  try {
    const res = await fetch(`/api/playground/${mode}${query}`, { method: "POST", headers: { "Content-Type": type }, body });
    const latencyMs = Number(res.headers.get("x-namu-latency-ms")) || Math.round(performance.now() - t0);
    if (!res.ok) {
      const j = await res.json().catch(() => null) as { error?: { message?: string } } | null;
      /* a 413 that is not ours is Vercel refusing the body before the route ran: say so in the reader's words */
      return { stats: { status: res.status, latencyMs }, error: j?.error?.message ?? (res.status === 413 ? "too_large" : `HTTP ${res.status}`) };
    }
    if ((res.headers.get("content-type") ?? "").startsWith("audio")) {
      return { stats: { status: res.status, latencyMs, audioS: Number(res.headers.get("x-audio-seconds")) || undefined }, audio: await res.blob() };
    }
    return { stats: { status: res.status, latencyMs }, json: await res.json() };
  } catch {
    return { stats: { status: 0, latencyMs: Math.round(performance.now() - t0) }, error: "network" };
  }
}

/* ---------------------------------------------------------------- the code a developer would write */
function codeFor(mode: Mode, base: string, o: { text: string; voice: Voice; target: "fr" | "ha"; persona: "nadia" | "salim"; session: string }) {
  const url = `${base}${PATH[mode]}`;
  if (mode === "speech") {
    const json = JSON.stringify({ text: o.text || "Sannu da zuwa!", voice: o.voice });
    return {
      cURL: `curl ${url} \\\n  -H "Authorization: Bearer $NAMU_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${json.replace(/'/g, "'\\''")}' \\\n  -o speech.wav`,
      Python: `import os, requests\n\nr = requests.post(\n    "${url}",\n    headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},\n    json=${json.replace(/":/g, '": ').replace(/,"/g, ', "')},\n)\nr.raise_for_status()\nopen("speech.wav", "wb").write(r.content)`,
      JavaScript: `import { writeFile } from "node:fs/promises";\n\nconst r = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.NAMU_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${json.replace(/":/g, '": ').replace(/,"/g, ', "')}),\n});\nif (!r.ok) throw new Error((await r.json()).error.message);\nawait writeFile("speech.wav", Buffer.from(await r.arrayBuffer()));`,
    };
  }
  const fields: [string, string][] = mode === "translate" ? [["target", o.target], ["include_audio", "1"]]
    : mode === "converse" ? [["persona", o.persona], ["session_id", o.session]] : [];
  const read = mode === "transcribe" ? `out["text"]` : mode === "translate" ? `out["text"]` : `out["reply"]`;
  return {
    cURL: `curl ${url} \\\n  -H "Authorization: Bearer $NAMU_API_KEY" \\\n  -F file=@audio.wav${fields.map(([k, v]) => ` \\\n  -F ${k}=${v}`).join("")}`,
    Python: `import os, requests\n\nwith open("audio.wav", "rb") as f:\n    r = requests.post(\n        "${url}",\n        headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},\n        files={"file": f},${fields.length ? `\n        data={${fields.map(([k, v]) => `"${k}": "${v}"`).join(", ")}},` : ""}\n        timeout=300,\n    )\nr.raise_for_status()\nout = r.json()\nprint(${read})`,
    JavaScript: `import { readFile } from "node:fs/promises";\n\nconst form = new FormData();\nform.append("file", new Blob([await readFile("audio.wav")]), "audio.wav");${fields.map(([k, v]) => `\nform.append("${k}", "${v}");`).join("")}\nconst r = await fetch("${url}", {\n  method: "POST",\n  headers: { Authorization: \`Bearer \${process.env.NAMU_API_KEY}\` },\n  body: form,\n});\nif (!r.ok) throw new Error((await r.json()).error.message);\nconst out = await r.json();\nconsole.log(${read.replace(/out\["(\w+)"\]/, "out.$1")});`,
  };
}

/* ---------------------------------------------------------------- a player with a real waveform */
function Player({ blob, peaks, t, name }: { blob: Blob; peaks?: number[]; t: T; name: string }) {
  const [url, setUrl] = useState<string>();
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[]>(peaks ?? []);
  const [pos, setPos] = useState(0), [dur, setDur] = useState(0), [on, setOn] = useState(false);
  useEffect(() => {                                    // made and released together, so a remount never plays a released URL
    const u = URL.createObjectURL(blob); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  useEffect(() => { if (!peaks) peaksOfBlob(blob).then(setBars).catch(() => setBars([])); }, [blob, peaks]);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => { if (audio.current) setPos(audio.current.currentTime); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current; if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)); setPos(a.currentTime);
  };
  const share = dur ? pos / dur : 0;
  return (
    <div className="cx-player">
      <audio ref={audio} src={url} preload="metadata" onLoadedMetadata={e => setDur(e.currentTarget.duration)}
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setPos(0); }} />
      <button type="button" className="cx-play" aria-label={on ? t.pause : t.play} onClick={() => (on ? audio.current?.pause() : void audio.current?.play())}>
        <Icon name={on ? "pause" : "play"} size={18} stroke={1.6} />
      </button>
      <div className="cx-wave" onClick={seek} role="presentation">
        {(bars.length ? bars : Array.from({ length: 80 }, () => 0.08)).map((b, i, a) => (
          <i key={i} className={i / a.length < share ? "on" : undefined} style={{ height: `${Math.max(6, b * 100)}%` }} />
        ))}
      </div>
      <span className="cx-time">{formatSeconds(pos)} / {formatSeconds(dur)}</span>
      <a className="cx-icon-btn" href={url} download={name} aria-label={t.download} title={t.download}><Icon name="download" size={17} stroke={1.6} /></a>
    </div>
  );
}

/* ---------------------------------------------------------------- an audio input: record, upload or a sample */
function ClipInput({ clip, onClip, t, samples, busy }: { clip: Clip | null; onClip: (c: Clip | null) => void; t: T; samples: { label: string; src: string }[]; busy: boolean }) {
  const rec = useRef<Recorder | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false), [elapsed, setElapsed] = useState(0), [level, setLevel] = useState(0);
  const [err, setErr] = useState<string | null>(null), [reading, setReading] = useState(false);
  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = window.setInterval(() => { setElapsed((Date.now() - t0) / 1000); setLevel(rec.current?.level ?? 0); }, 80);
    return () => clearInterval(id);
  }, [recording]);
  useEffect(() => () => { void rec.current?.stop(); }, []);

  const take = async (blob: Blob, name: string) => {
    setReading(true); setErr(null);
    try {
      const c = await toClip(blob, name);
      if (c.seconds > LIMITS.audioMinutes * 60) { setErr(t.errors.long(LIMITS.audioMinutes)); return; }
      if (!uploadOf(c)) { setErr(t.errors.big(LIMITS.playgroundUploadMb)); return; }
      onClip(c);
    } catch { setErr(t.errors.decode); } finally { setReading(false); }
  };
  /* The recorder is held before the permission prompt, so a second tap cannot open another and leaving the page
     mid-prompt stops the one being opened (the cleanup above stops rec.current). */
  const start = async () => {
    if (rec.current) return;
    setErr(null);
    const r = (rec.current = new Recorder());
    try { await r.start(LIMITS.audioMinutes * 60, () => void stop()); }
    catch { if (rec.current === r) rec.current = null; setErr(t.errors.mic); return; }
    if (rec.current !== r) return;                    // stopped while the prompt was open
    setElapsed(0); setRecording(true);
  };
  const stop = async () => {
    const r = rec.current; rec.current = null; setRecording(false);
    if (r) await take(await r.stop(), "recording.wav");
  };

  if (clip && !recording) return (
    <div className="cx-clip">
      <Player blob={clip.wav} peaks={clip.peaks} t={t} name={clip.name} />
      <div className="cx-clip-meta"><span>{clip.name} · {formatSeconds(clip.seconds)}</span>
        <button type="button" className="cx-link" onClick={() => onClip(null)} disabled={busy}>{t.remove}</button></div>
    </div>
  );
  return (
    <div className="cx-clip-in">
      {recording ? (
        <div className="cx-recording" role="status">
          <span className="cx-rec-dot" aria-hidden="true" />
          <span>{t.recording(formatSeconds(elapsed))}</span>
          <span className="cx-level" aria-hidden="true">{[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => <i key={i} style={{ transform: `scaleY(${0.15 + Math.min(1, level * k * 1.6)})` }} />)}</span>
          <button type="button" className="cx-btn primary" onClick={() => void stop()}><Icon name="stop" size={14} stroke={1.6} />{t.stopRec}</button>
        </div>
      ) : (
        <div className="cx-clip-acts">
          <button type="button" className="cx-btn primary" onClick={() => void start()} disabled={reading}><Icon name="microphone" size={16} stroke={1.6} />{t.record}</button>
          <button type="button" className="cx-btn" onClick={() => file.current?.click()} disabled={reading}><Icon name="upload" size={16} stroke={1.6} />{t.upload}</button>
          {samples.map(s => (
            <button key={s.src} type="button" className="cx-btn" disabled={reading}
              onClick={async () => { try { const r = await fetch(s.src); await take(await r.blob(), s.src.split("/").pop()!); } catch { setErr(t.errors.decode); } }}>
              <Icon name="waveform" size={16} stroke={1.6} />{s.label}
            </button>
          ))}
          <input ref={file} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.flac" hidden
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void take(f, f.name); }} />
        </div>
      )}
      <p className={err ? "cx-error" : "cx-muted cx-small"} role={err ? "alert" : undefined}>{err ?? t.maxRec(LIMITS.audioMinutes, LIMITS.playgroundUploadMb)}</p>
    </div>
  );
}

function StatsRow({ s, t, lang }: { s: Stats; t: T; lang: Lang }) {
  const nf = numberFormat(lang);
  return (
    <dl className="cx-stats">
      <div><dt>{t.stats.status}</dt><dd><span className={`cx-status s${String(s.status)[0]}`}>{s.status || "–"}</span></dd></div>
      <div><dt>{t.stats.latency}</dt><dd>{nf.format(s.latencyMs / 1000)} s</dd></div>
      {s.audioS !== undefined && <div><dt>{t.stats.audio}</dt><dd>{nf.format(s.audioS)} s</dd></div>}
      {s.chars !== undefined && <div><dt>{t.stats.chars}</dt><dd>{nf.format(s.chars)}</dd></div>}
    </dl>
  );
}

function Choice<V extends string>({ value, onPick, options, label }: { value: V; onPick: (v: V) => void; options: { v: V; title: string; sub?: string; dot?: string }[]; label: string }) {
  return (
    <div className="cx-choice" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={o.v === value} onClick={() => onPick(o.v)}>
          {o.dot && <i style={{ background: o.dot }} aria-hidden="true" />}
          <span><strong>{o.title}</strong>{o.sub && <em>{o.sub}</em>}</span>
          <Icon name="check" size={15} stroke={1.8} />
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- the Playground */
export function PlaygroundConsole({ lang, apiBase, initial }: { lang: Lang; apiBase: string; initial: Mode }) {
  const t = consoleCopy[lang].playground, models = consoleCopy[lang].keys.models;
  const [mode, setMode] = useState<Mode>(initial);
  const [side, setSide] = useState<"settings" | "history">("settings");
  const [text, setText] = useState(""), [voice, setVoice] = useState<Voice>("nadia");
  const [target, setTarget] = useState<"fr" | "ha">("fr"), [persona, setPersona] = useState<"nadia" | "salim">("nadia");
  const [session, setSession] = useState(newSession);
  const [clips, setClips] = useState<Record<Mode, Clip | null>>({ speech: null, transcribe: null, translate: null, converse: null });
  const [outs, setOuts] = useState<Partial<Record<Mode, Out>>>({});
  const [busy, setBusy] = useState<Mode | null>(null), [slow, setSlow] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const transcriptEl = useRef<HTMLParagraphElement>(null);
  const codeRef = useRef<HTMLDialogElement>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const runId = useRef(0);
  /* read after a run's await: the thread and the session as they are now, not as they were when the run began */
  const latest = useRef({ outs, session }); latest.current = { outs, session };

  useEffect(() => {
    const u = new URL(window.location.href); u.searchParams.set("model", mode);
    window.history.replaceState(null, "", u);
  }, [mode]);
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, [busy]);
  useEffect(() => {
    const d = codeRef.current; if (!d) return;
    if (codeOpen && !d.open) d.showModal(); if (!codeOpen && d.open) d.close();
  }, [codeOpen]);

  const record = (m: Mode, label: string, out: Out) => {
    setOuts(o => ({ ...o, [m]: out }));
    if (!out.error) setRuns(r => [{ id: ++runId.current, mode: m, label, out }, ...r].slice(0, 25));
  };

  async function run(m: Mode = mode) {
    if (busy) return;
    if (m === "speech") {
      const body = text.trim();
      if (!body) return;
      setBusy(m);
      try {
        const r = await call("speech", JSON.stringify({ text: body, voice }), "application/json");
        record(m, body.slice(0, 80), { ...r, stats: { ...r.stats, chars: body.length } });
      } finally { setBusy(null); }
      return;
    }
    const clip = clips[m];
    const audio = clip && uploadOf(clip);
    if (!clip || !audio) return;                                // too large clips are refused when chosen
    const type = audio.type || "application/octet-stream", audioS = clip.seconds;
    setBusy(m);
    try {
      if (m === "transcribe") {
        const r = await call("transcribe", audio, type);
        record(m, clip.name, { ...r, text: r.json?.text as string | undefined, stats: { ...r.stats, audioS } });
      } else if (m === "translate") {
        const r = await call("translate", audio, type, `?target=${target}`);
        const a = r.json?.audio as string | undefined;
        record(m, clip.name, { ...r, source: r.json?.source_text as string | undefined, text: r.json?.text as string | undefined,
          audio: a ? b64ToBlob(a) : undefined, stats: { ...r.stats, audioS } });
      } else {
        const sid = session;
        const r = await call("converse", audio, type, `?persona=${persona}&session_id=${sid}`);
        if (latest.current.session !== sid) return;              // "New session" came while this turn was out: it belongs to the old one
        const a = r.json?.audio as string | undefined;
        const turn: Turn | null = r.json ? { heard: String(r.json.heard ?? ""), reply: String(r.json.reply ?? ""), audio: a ? b64ToBlob(a) : undefined } : null;
        const prev = latest.current.outs.converse?.turns ?? [];
        record(m, turn?.heard || clip.name, { ...r, turns: turn ? [...prev, turn] : prev, stats: { ...r.stats, audioS } });
        if (turn) setClips(c => ({ ...c, converse: null }));     // ready for the next question
      }
    } finally { setBusy(null); }
  }

  const code = codeFor(mode, apiBase, { text, voice, target, persona, session });
  const out = outs[mode];
  const ready = mode === "speech" ? text.trim().length > 0 : Boolean(clips[mode]);
  const action = { speech: [t.generate, t.generating], transcribe: [t.transcribe, t.transcribing], translate: [t.translate, t.translating], converse: [t.send, t.sending] }[mode];
  const samples = (m: Mode) => m === "translate" && target === "ha"
    ? [{ label: t.samples.fr, src: "/usecases/translation-fr.m4a" }]
    : [{ label: t.samples.ha, src: m === "converse" ? "/usecases/translation-ha.m4a" : "/usecases/education.m4a" }];

  let output: ReactNode = <p className="cx-pg-empty">{t.empty[mode]}</p>;
  if (out?.error) output = <p className="cx-error" role="alert">{out.error === "network" ? t.errors.generic : out.error === "too_large" ? t.errors.big(LIMITS.playgroundUploadMb) : out.error}</p>;
  else if (out && mode === "speech" && out.audio) output = <Player blob={out.audio} t={t} name={`tafiya-${voice}.wav`} />;
  else if (out && mode === "transcribe") output = (
    <div className="cx-pg-text">
      <p lang="ha" ref={transcriptEl}>{out.text || "…"}</p>
      <CopyButton text={out.text ?? ""} labels={{ copy: t.copy, copied: t.copied, failed: t.copyFailed }} select={transcriptEl} className="cx-btn" icon={{ size: 15, stroke: 1.6 }} />
    </div>
  );
  else if (out && mode === "translate") output = (
    <div className="cx-pg-pair">
      <div><p className="cx-label">{t.heard}</p><p lang={target === "fr" ? "ha" : "fr"}>{out.source || "…"}</p></div>
      <div><p className="cx-label">{t.translation}</p><p lang={target}>{out.text || "…"}</p>
        {out.audio && <Player blob={out.audio} t={t} name={`kora-${target}.wav`} />}</div>
    </div>
  );
  else if (out && mode === "converse" && out.turns?.length) output = (
    <ol className="cx-thread">{out.turns.map((x, i) => (
      <li key={i}>
        <p><span className="cx-label">{t.you}</span><span lang="ha">{x.heard || "…"}</span></p>
        <p><span className="cx-label">{t.air}</span><span lang="ha">{x.reply}</span></p>
        {x.audio && <Player blob={x.audio} t={t} name={`air-${i + 1}.wav`} />}
      </li>
    ))}</ol>
  );

  return (
    <div className="cx-pg">
      <div className="cx-pg-bar">
        <div className="cx-pg-modes" role="tablist" aria-label={consoleCopy[lang].nav.playground}>
          {MODES.map(m => (
            <button key={m} type="button" role="tab" aria-selected={m === mode} onClick={() => setMode(m)}>
              <i style={{ background: MODEL_ORB[m] }} aria-hidden="true" />{t.modes[m]}<em>{NAME[m]}</em>
            </button>
          ))}
        </div>
        <button type="button" className="cx-btn" onClick={() => setCodeOpen(true)}><Icon name="code" size={16} stroke={1.6} />{t.code}</button>
      </div>

      <div className="cx-pg-grid">
        <section className="cx-pg-main" aria-live="polite">
          <div className="cx-card cx-pg-in">
            <div className="cx-pg-head"><h2>{mode === "speech" ? t.textLabel : t.input}</h2><span className="cx-pill">{t.runsOn}</span></div>
            {mode === "speech" ? (
              <>
                <textarea className="cx-pg-textarea" lang="ha" value={text} maxLength={LIMITS.textChars} placeholder={t.textPh} rows={7}
                  onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run(); } }} />
                <div className="cx-pg-foot">
                  <span className="cx-muted cx-small">{formatNumber(lang, text.length)} / {formatNumber(lang, LIMITS.textChars)}</span>
                  <button type="button" className="cx-btn primary" disabled={!ready || busy !== null} onClick={() => void run()}>{busy === mode ? action[1] : action[0]}<kbd>⌘ ↵</kbd></button>
                </div>
              </>
            ) : (
              <>
                <ClipInput clip={clips[mode]} onClip={c => setClips(x => ({ ...x, [mode]: c }))} t={t} samples={samples(mode)} busy={busy !== null} />
                <div className="cx-pg-foot">
                  <span />
                  <button type="button" className="cx-btn primary" disabled={!ready || busy !== null} onClick={() => void run()}>{busy === mode ? action[1] : action[0]}</button>
                </div>
              </>
            )}
          </div>

          <div className={`cx-card cx-pg-out${busy === mode ? " busy" : ""}`}>
            <div className="cx-pg-head"><h2>{t.output}</h2>{out && !out.error && <StatsRow s={out.stats} t={t} lang={lang} />}</div>
            {busy === mode ? <div className="cx-pg-wait"><span className="cx-dots" aria-hidden="true"><i /><i /><i /></span>{slow ? t.wake : action[1]}</div> : output}
          </div>
        </section>

        <aside className="cx-card cx-pg-side">
          <div className="cx-seg cx-pg-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={side === "settings"} aria-checked={side === "settings"} onClick={() => setSide("settings")}>{t.settings}</button>
            <button type="button" role="tab" aria-selected={side === "history"} aria-checked={side === "history"} onClick={() => setSide("history")}>{t.history}{runs.length > 0 && <span className="cx-count">{runs.length}</span>}</button>
          </div>
          {side === "settings" ? (
            <div className="cx-pg-settings">
              <div className="cx-pg-set"><p className="cx-label">{t.model}</p>
                <p className="cx-pg-model"><i style={{ background: MODEL_ORB[mode] }} />{NAME[mode]}<code>POST {PATH[mode]}</code></p>
                <p className="cx-muted cx-small">{models[mode].task}</p></div>
              {mode === "speech" && <div className="cx-pg-set"><p className="cx-label">{t.voice}</p>
                <Choice value={voice} onPick={setVoice} label={t.voice} options={(["nadia", "salim", "fr"] as Voice[]).map(v => ({ v, title: t.voices[v][0], sub: t.voices[v][1] }))} /></div>}
              {mode === "transcribe" && <div className="cx-pg-set"><p className="cx-label">{t.language}</p>
                <Choice value="ha" onPick={() => {}} label={t.language} options={[{ v: "ha", title: t.hausa, sub: "ha" }]} /></div>}
              {mode === "translate" && <div className="cx-pg-set"><p className="cx-label">{t.direction}</p>
                <Choice value={target} onPick={v => { setTarget(v); setClips(c => ({ ...c, translate: null })); }} label={t.direction}
                  options={[{ v: "fr", title: t.haFr, sub: "target=fr" }, { v: "ha", title: t.frHa, sub: "target=ha" }]} /></div>}
              {mode === "converse" && <>
                <div className="cx-pg-set"><p className="cx-label">{t.persona}</p>
                  <Choice value={persona} onPick={setPersona} label={t.persona} options={(["nadia", "salim"] as const).map(v => ({ v, title: t.voices[v][0], sub: t.voices[v][1] }))} /></div>
                <div className="cx-pg-set"><p className="cx-label">{t.session}</p>
                  <p className="cx-pg-model"><code>session_id={session}</code></p>
                  <p className="cx-muted cx-small">{t.sessionNote}</p>
                  <button type="button" className="cx-btn" onClick={() => { setSession(newSession()); setOuts(o => ({ ...o, converse: undefined })); }}><Icon name="refresh" size={15} stroke={1.6} />{t.newSession}</button>
                </div>
              </>}
            </div>
          ) : runs.length === 0 ? <p className="cx-muted cx-small cx-pg-none">{t.noHistory}</p> : (
            <ol className="cx-history">{runs.map(r => (
              <li key={r.id}>
                <button type="button" onClick={() => { setMode(r.mode); setOuts(o => ({ ...o, [r.mode]: r.out })); }}>
                  <i style={{ background: MODEL_ORB[r.mode] }} aria-hidden="true" />
                  <span><strong>{t.modes[r.mode]}</strong><em lang="ha">{r.label}</em></span>
                </button>
              </li>
            ))}</ol>
          )}
        </aside>
      </div>

      <dialog ref={codeRef} className="cx-dialog cx-dialog-wide" onClose={() => setCodeOpen(false)} aria-labelledby="cx-code-h">
        <div className="cx-dialog-body">
          <h2 id="cx-code-h">{t.codeH}</h2>
          <p>{t.codeLede}</p>
          <CodeTabs code={code} copyLabel={t.copy} copiedLabel={t.copied} failedLabel={t.copyFailed} />
          <div className="cx-dialog-acts"><button type="button" className="cx-btn primary" onClick={() => setCodeOpen(false)}>{t.close}</button></div>
        </div>
      </dialog>
    </div>
  );
}
