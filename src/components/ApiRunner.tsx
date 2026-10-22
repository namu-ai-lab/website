"use client";

/* The /api hero: a real request you can run before signing up (after elevenlabs.io/developers' hero demo, made
   live). Pick a model, change the input, read the request in cURL, Python or JavaScript, press Run: the browser calls
   /api/demo/<model>, which adds the site's demo key (smaller limits than a real key), and the response that comes
   back is shown as it is, with the time this request took. The orb is the home playground's painted orb, moving
   with the audio. Converse is a live call, so it points to the home page's call instead of running here. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { AgentOrb } from "./VoiceReel";
import { API_DEMO, apiCopy, type ApiTask } from "@/content/api";
import { lp, type Lang } from "@/i18n/config";

type CodeLang = "cURL" | "Python" | "JavaScript";
const CODE_LANGS: CodeLang[] = ["cURL", "Python", "JavaScript"];
const PALETTE: Record<ApiTask, readonly string[]> = {
  speech: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"],
  transcribe: ["#c4865a", "#f6e6d6", "#5e3418", "#e8935a"],
  translate: ["#8fa6d6", "#f4ece2", "#7a4325", "#e8935a"],
  converse: ["#e8935a", "#ffd8b8", "#7a4325", "#c9a27e"],
};
const SALIM: readonly string[] = ["#7c9bd2", "#f4e7d7", "#2e3f6b", "#e8935a"];
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fileOf = (src: string) => src.split("/").pop() ?? "clip.m4a";

/* ---------------------------------------------------------------- the request, written out */
function requestCode(task: ApiTask, lang: CodeLang, base: string, o: { text: string; voice: string; file: string; target: string }): string {
  const auth = `Bearer $NAMU_API_KEY`;
  const text = o.text.replace(/"/g, '\\"');
  if (task === "speech") return {
    cURL: `curl ${base}/v1/speech \\\n  -H "Authorization: ${auth}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "${text}", "voice": "${o.voice}"}' \\\n  -o speech.wav`,
    Python: `import os, requests\n\nr = requests.post(\n    "${base}/v1/speech",\n    headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},\n    json={"text": "${text}", "voice": "${o.voice}"},\n)\nopen("speech.wav", "wb").write(r.content)`,
    JavaScript: `const r = await fetch("${base}/v1/speech", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.NAMU_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ text: "${text}", voice: "${o.voice}" }),\n});\nconst wav = Buffer.from(await r.arrayBuffer());`,
  }[lang];
  const path = task === "converse" ? "converse" : task;
  const extra = task === "translate" ? { c: ` \\\n  -F target=${o.target}`, p: `\n        data={"target": "${o.target}"},`, j: `\nform.append("target", "${o.target}");` }
    : task === "converse" ? { c: ` \\\n  -F persona=nadia -F session_id=user-42`, p: `\n        data={"persona": "nadia", "session_id": "user-42"},`, j: `\nform.append("session_id", "user-42");` }
    : { c: "", p: "", j: "" };
  const out = task === "transcribe" ? { p: `print(r.json()["text"])`, j: `console.log((await r.json()).text);` }
    : task === "translate" ? { p: `out = r.json()\nprint(out["source_text"], "->", out["text"])`, j: `const { source_text, text } = await r.json();` }
    : { p: `out = r.json()\nprint(out["heard"], "->", out["reply"])`, j: `const { heard, reply, audio } = await r.json();` };
  return {
    cURL: `curl ${base}/v1/${path} \\\n  -H "Authorization: ${auth}" \\\n  -F file=@${o.file}${extra.c}`,
    Python: `import os, requests\n\nwith open("${o.file}", "rb") as f:\n    r = requests.post(\n        "${base}/v1/${path}",\n        headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},\n        files={"file": f},${extra.p}\n    )\n${out.p}`,
    JavaScript: `import { readFile } from "node:fs/promises";\n\nconst form = new FormData();\nform.append("file", new Blob([await readFile("${o.file}")]), "${o.file}");${extra.j}\nconst r = await fetch("${base}/v1/${path}", {\n  method: "POST",\n  headers: { Authorization: \`Bearer \${process.env.NAMU_API_KEY}\` },\n  body: form,\n});\n${out.j}`,
  }[lang];
}

/* strings, comments and the few keywords, enough to read the code at a glance */
export function Highlight({ code, lang }: { code: string; lang: CodeLang | "json" }) {
  const re = lang === "cURL"
    ? /(#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\bcurl\b|(?<=\s)-[A-Za-z]\b)/g
    : /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:import|from|const|await|with|as|new|while|True|for|in|print|open)\b)/g;
  const out: ReactNode[] = []; let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1] ? "c" : m[2] ? (lang === "json" && /^\s*:/.test(code.slice(re.lastIndex)) ? "k" : "s") : "w";
    out.push(<span key={k++} className={`hl-${cls}`}>{m[0]}</span>);
    last = re.lastIndex;
  }
  out.push(code.slice(last));
  return <>{out}</>;
}

/* ---------------------------------------------------------------- audio: play, follow, draw */
function useAudio() {
  const el = useRef<HTMLAudioElement | null>(null), analyser = useRef<AnalyserNode | null>(null), url = useRef<string | null>(null);
  const amp = useRef(0), [playing, setPlaying] = useState<string | null>(null), [progress, setProgress] = useState(0);
  const ensure = () => {
    if (el.current) return el.current;
    const a = new Audio();
    a.onended = a.onpause = () => { setPlaying(null); amp.current = 0; };
    try {
      const ctx = new AudioContext(), node = ctx.createAnalyser(); node.fftSize = 512;
      ctx.createMediaElementSource(a).connect(node); node.connect(ctx.destination);
      analyser.current = node; a.addEventListener("play", () => { void ctx.resume(); });
    } catch { /* no Web Audio: the sound still plays, the orb stays calm */ }
    return (el.current = a);
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0; const buf = new Uint8Array(512);
    const tick = () => {
      const a = el.current, node = analyser.current;
      if (a && a.duration) setProgress(a.currentTime / a.duration);
      if (node && !reduced()) {
        node.getByteTimeDomainData(buf);
        let s = 0; for (const v of buf) s += ((v - 128) / 128) ** 2;
        amp.current = Math.min(1, Math.sqrt(s / buf.length) * 4);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => () => { el.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);
  const play = (id: string, src: Blob | string) => {
    const a = ensure();
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    a.src = typeof src === "string" ? src : (url.current = URL.createObjectURL(src));
    setProgress(0); setPlaying(id); void a.play().catch(() => setPlaying(null));
  };
  const stop = () => el.current?.pause();
  return { amp, playing, progress, play, stop };
}

/* the loudness of a clip in `n` bars, from the real audio */
async function peaks(blob: Blob, n = 72): Promise<number[]> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer()), d = buf.getChannelData(0), step = Math.floor(d.length / n) || 1;
    const out = Array.from({ length: n }, (_, i) => { let m = 0; for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j += 8) m = Math.max(m, Math.abs(d[j])); return m; });
    const top = Math.max(...out, 1e-4);
    return out.map(v => Math.max(.06, v / top));
  } catch { return []; } finally { void ctx.close(); }
}
function Wave({ bars, progress = 0 }: { bars: number[]; progress?: number }) {
  return (
    <span className="ar-wave" aria-hidden="true">
      {bars.map((v, i) => <i key={i} className={i / bars.length < progress ? "on" : undefined} style={{ height: `${Math.round(v * 100)}%` }} />)}
    </span>
  );
}

/* ---------------------------------------------------------------- the runner */
type Result = { status: number; ms: number; kind: "audio"; blob: Blob; seconds: string; bars: number[] }
  | { status: number; ms: number; kind: "json"; json: Record<string, unknown>; audio?: Blob }
  | { status: number; ms: number; kind: "error"; message: string };

export function ApiRunner({ lang, base }: { lang: Lang; base: string }) {
  const t = apiCopy[lang].run, models = apiCopy[lang].models;
  const [task, setTask] = useState<ApiTask>("speech");
  const [codeLang, setCodeLang] = useState<CodeLang>("cURL");
  const [text, setText] = useState<string>(API_DEMO.text);
  const [voice, setVoice] = useState<"nadia" | "salim">("nadia");
  const [target, setTarget] = useState<"fr" | "ha">("fr");
  const [sample, setSample] = useState(0);
  const [busy, setBusy] = useState(false), [waking, setWaking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [sampleBars, setSampleBars] = useState<number[]>([]);
  const audio = useAudio();
  const model = models.find(m => m.task === task)!;
  const list = task === "translate" ? API_DEMO.samples.translate[target] : API_DEMO.samples.transcribe;
  const clip = list[Math.min(sample, list.length - 1)];
  const code = useMemo(() => requestCode(task, codeLang, base, { text, voice, file: task === "converse" ? "turn.wav" : fileOf(clip.src), target }),
    [task, codeLang, base, text, voice, clip.src, target]);

  useEffect(() => { setResult(null); audio.stop(); }, [task, target]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (task !== "transcribe" && task !== "translate") return;
    let live = true;
    fetch(clip.src).then(r => r.blob()).then(b => peaks(b)).then(b => { if (live) setSampleBars(b); }).catch(() => {});
    return () => { live = false; };
  }, [task, clip.src]);
  /* the model cards' "Try it" links (#run-<task>) pick that model here */
  useEffect(() => {
    const pick = () => {
      const m = /^#run-(speech|transcribe|translate|converse)$/.exec(window.location.hash);
      if (!m) return;
      setTask(m[1] as ApiTask);
      document.getElementById("run")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
    };
    pick(); window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);
  useEffect(() => {
    if (!busy) { setWaking(false); return; }
    const id = setTimeout(() => setWaking(true), 4000);
    return () => clearTimeout(id);
  }, [busy]);

  async function run() {
    if (busy || task === "converse") return;
    setBusy(true); setResult(null); audio.stop();
    const t0 = performance.now();
    try {
      let res: Response;
      if (task === "speech") {
        res = await fetch("/api/demo/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.trim(), voice }) });
      } else {
        const body = await (await fetch(clip.src)).arrayBuffer();
        res = await fetch(`/api/demo/${task}${task === "translate" ? `?target=${target}` : ""}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body });
      }
      const ms = performance.now() - t0;
      if (!res.ok) {
        const j = await res.json().catch(() => null) as { error?: { type?: string } } | null;
        const message = res.status === 429 ? t.limited : res.status === 503 || res.status === 404 ? t.unavailable : j?.error?.type === "text_too_long" ? t.tooLong : t.failed;
        setResult({ status: res.status, ms, kind: "error", message });
      } else if (task === "speech") {
        const blob = await res.blob();
        setResult({ status: res.status, ms, kind: "audio", blob, seconds: res.headers.get("x-audio-seconds") ?? "", bars: await peaks(blob) });
        audio.play("out", blob);
      } else {
        const json = await res.json() as Record<string, unknown>;
        const b64 = typeof json.audio === "string" ? json.audio : null;
        setResult({ status: res.status, ms, kind: "json", json, audio: b64 ? new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: "audio/wav" }) : undefined });
      }
    } catch {
      setResult({ status: 0, ms: performance.now() - t0, kind: "error", message: t.failed });
    } finally { setBusy(false); }
  }

  /* the generated speech as a file to save, released when the next result replaces it */
  const download = useMemo(() => (result?.kind === "audio" ? URL.createObjectURL(result.blob) : null), [result]);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);
  const shownJson = (j: Record<string, unknown>) => JSON.stringify(j, (k, v) => (k === "audio" && typeof v === "string" ? `<base64 WAV, ${Math.round(v.length * .75 / 1024)} KB>` : v), 2);
  const palette = task === "speech" && voice === "salim" ? SALIM : PALETTE[task];
  const status = result && result.status ? `${result.status}${result.status === 200 ? " OK" : ""}` : null;

  return (
    <div className="ar" id="run">
      <div className="ar-tabs" role="tablist" aria-label={t.label}>
        {models.map(m => (
          <button key={m.task} type="button" role="tab" aria-selected={m.task === task} onClick={() => setTask(m.task)}>
            <i style={{ background: `radial-gradient(circle at 34% 30%, ${PALETTE[m.task][1]} 0, ${PALETTE[m.task][0]} 48%, ${PALETTE[m.task][2]} 100%)` }} aria-hidden="true" />
            {m.verb}<span>{m.name}</span>
          </button>
        ))}
      </div>

      <div className="ar-grid">
        <div className="ar-left">
          {/* the input */}
          <div className="ar-input">
            <span className="ar-label">{t.input}</span>
            {task === "speech" && <>
              <textarea value={text} maxLength={API_DEMO.maxText} rows={2} lang="ha" aria-label={t.text} onChange={e => setText(e.target.value)} />
              <div className="ar-row">
                <div className="ar-seg" role="radiogroup" aria-label={t.voice}>
                  {t.voices.map(v => <button key={v.id} type="button" role="radio" aria-checked={voice === v.id} onClick={() => setVoice(v.id)}>{v.name}</button>)}
                </div>
                <span className="ar-count">{t.count(text.length, API_DEMO.maxText)}</span>
              </div>
            </>}
            {(task === "transcribe" || task === "translate") && <>
              {task === "translate" && (
                <div className="ar-seg wide" role="radiogroup" aria-label={t.direction}>
                  {(["fr", "ha"] as const).map(d => <button key={d} type="button" role="radio" aria-checked={target === d} onClick={() => { setTarget(d); setSample(0); }}>{t.dirs[d]}</button>)}
                </div>
              )}
              <div className="ar-row">
                <div className="ar-chips" role="radiogroup" aria-label={t.sample}>
                  {list.map((s, i) => <button key={s.id} type="button" role="radio" aria-checked={clip.id === s.id} onClick={() => { setSample(i); setResult(null); }}>{s.label[lang]}</button>)}
                </div>
              </div>
              <div className="ar-clip">
                <button type="button" className="ar-play" aria-label={audio.playing === "in" ? t.stop : t.listen} onClick={() => (audio.playing === "in" ? audio.stop() : audio.play("in", clip.src))}>
                  <Icon name={audio.playing === "in" ? "stop" : "play"} size={15} stroke={1.8} />
                </button>
                <Wave bars={sampleBars} progress={audio.playing === "in" ? audio.progress : 0} />
                <span className="ar-file">{fileOf(clip.src)}</span>
              </div>
            </>}
            {task === "converse" && <p className="ar-plain">{t.converse}</p>}
          </div>

          {/* the request */}
          <div className="ar-code">
            <div className="ar-code-head">
              <span className="ar-label">{t.code}</span>
              <div className="ar-langs" role="radiogroup" aria-label={t.code}>
                {CODE_LANGS.map(l => <button key={l} type="button" role="radio" aria-checked={codeLang === l} onClick={() => setCodeLang(l)}>{l}</button>)}
              </div>
              <button type="button" className="ar-copy" onClick={() => { void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }}>
                <Icon name={copied ? "check" : "copy"} size={14} stroke={1.7} />{copied ? t.copied : t.copy}
              </button>
            </div>
            <pre tabIndex={0}><code><Highlight code={code} lang={codeLang} /></code></pre>
            <div className="ar-code-foot">
              <span>{t.note}</span>
              {task === "converse"
                ? <a className="ar-run" href={`${lp(lang, "/")}#try`}>{t.converseCta}<Icon name="arrow-long" size={16} stroke={1.7} /></a>
                : <button type="button" className="ar-run" onClick={run} disabled={busy || (task === "speech" && !text.trim())}>
                    {busy ? <span className="ar-spin" aria-hidden="true" /> : <Icon name="play" size={14} stroke={1.9} />}{busy ? t.going : result ? t.again : t.go}
                  </button>}
            </div>
          </div>
        </div>

        {/* the response */}
        <div className="ar-right" aria-live="polite">
          <div className="ar-resp-head">
            <span className="ar-label">{t.response}</span>
            {status && <span className={`ar-status s${String(result!.status)[0]}`}>{status}</span>}
            {result && <span className="ar-ms">{(result.ms / 1000).toFixed(1)} s · {t.yours}</span>}
          </div>
          <div className={`ar-stage${busy ? " busy" : ""}`}>
            <AgentOrb palette={palette} amp={audio.amp} live={busy || audio.playing !== null} />
          </div>
          <div className="ar-out">
            {!result && !busy && <p className="ar-plain">{task === "converse" ? model.job : t.idle(model.name)}</p>}
            {busy && <p className="ar-plain">{waking ? t.waking : t.going}</p>}
            {result?.kind === "error" && <p className="ar-plain err">{result.message}</p>}
            {result?.kind === "audio" && (
              <div className="ar-audio">
                <div className="ar-clip big">
                  <button type="button" className="ar-play dark" aria-label={audio.playing === "out" ? t.stop : t.play} onClick={() => (audio.playing === "out" ? audio.stop() : audio.play("out", result.blob))}>
                    <Icon name={audio.playing === "out" ? "stop" : "play"} size={16} stroke={1.8} />
                  </button>
                  <Wave bars={result.bars} progress={audio.playing === "out" ? audio.progress : 0} />
                </div>
                <pre className="ar-headers"><code><span className="hl-k">Content-Type</span>: {result.blob.type || "audio/wav"}{"\n"}<span className="hl-k">X-Audio-Seconds</span>: {result.seconds}</code></pre>
                {download && <a className="ar-dl" href={download} download="speech.wav"><Icon name="download" size={14} stroke={1.7} />{t.download}</a>}
              </div>
            )}
            {result?.kind === "json" && (
              <div className="ar-json">
                <pre><code><Highlight code={shownJson(result.json)} lang="json" /></code></pre>
                {result.audio && (
                  <button type="button" className="ar-mini" onClick={() => (audio.playing === "tr" ? audio.stop() : audio.play("tr", result.audio!))}>
                    <Icon name={audio.playing === "tr" ? "stop" : "play"} size={13} stroke={1.8} />{audio.playing === "tr" ? t.stop : t.play}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
