"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer } from "../platform/media";
import { LanguageChips, Letters, VoiceAvatar, VoicePicker } from "../platform/pickers";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";
import { render } from "@/lib/audio-out";
import { LANGUAGES, LOCAL, OUTPUTS, can, canTranslate, defaultVoice, language, voice as voiceOf, type LangCode, type OutputId, type VoiceId } from "@/lib/catalog";
import { fixLetters, hasStandIns } from "@/lib/catalog/text";
import { LIMITS } from "@/lib/limits";
import { apiError } from "./fetch";
import { FileLink } from "./FileLink";

/* Speak, after ElevenLabs' Text to Speech: the words on the left, Settings | History on the right. For the Sahel:
   the text may be written in French and turned into the local language first (shown in the box, to be checked before
   it is spoken); the letters a keyboard lacks sit under the box, with a one-tap fix for b' d' k' y'; and the file is
   made for where it will be heard (a WhatsApp voice note, radio, a phone line), from the same speech, again at once
   when the choice changes. The organisation's word list is applied on the server. */

type Take = { id: number; text: string; lang: LangCode; voice: VoiceId; wav: Blob; target: OutputId; file: { blob: Blob; ext: string }; at: number };

const ORDER: LangCode[] = [...LOCAL, ...LANGUAGES.map(l => l.code).filter(c => !LOCAL.includes(c))];

export function SpeakStudio({ lang: ui, kitVoices, initialVoice }: { lang: Lang; kitVoices: Partial<Record<string, string>>; initialVoice?: VoiceId }) {
  const t = createCopy[ui].speak, p = platformCopy[ui];
  const first = initialVoice ? voiceOf(initialVoice).languages[0] : ORDER.find(l => can("speech", l))!;
  const [lang, setLang] = useState<LangCode>(first);
  const [voices, setVoices] = useState<Partial<Record<LangCode, VoiceId>>>(() => initialVoice ? { [first]: initialVoice } : {});
  const voice = voices[lang] ?? defaultVoice(lang, kitVoices);
  const [text, setText] = useState("");
  const [french, setFrench] = useState(false);                 // the box holds French, to be translated first
  const [original, setOriginal] = useState<string | null>(null);
  const [target, setTarget] = useState<OutputId>("whatsapp");
  const [busy, setBusy] = useState<"translate" | "speak" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [side, setSide] = useState<"settings" | "history">("settings");
  const [takes, setTakes] = useState<Take[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const ids = useRef(0);
  const take = takes.find(x => x.id === current) ?? null;
  const local = lang !== "fr" && canTranslate("fr", lang);
  const tooLong = text.length > LIMITS.textChars;
  const digraphs = Object.values(language(lang).digraphs).filter(ch => ch === ch.toLowerCase()).join(" ");

  /* the file follows the "Made for" choice, made again from the same speech */
  useEffect(() => {
    if (!take || take.target === target) return;
    let live = true;
    void render(take.wav, target).then(f => { if (live) setTakes(ts => ts.map(x => x.id === take.id ? { ...x, target, file: { blob: f.blob, ext: f.ext } } : x)); });
    return () => { live = false; };
  }, [target, take]);

  const pickLang = (l: LangCode) => { setLang(l); setErr(null); if (l === "fr") setFrench(false); };
  const starter = (s: string) => { setText(s); setOriginal(null); setFrench(local); setErr(null); requestAnimationFrame(() => box.current?.focus()); };

  const translate = async () => {
    setBusy("translate"); setErr(null);
    try {
      const res = await fetch("/api/create/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, from: "fr", to: lang }) });
      if (!res.ok) { setErr(await apiError(res, p.errors.generic)); return; }
      const out = (await res.json()) as { text: string };
      setOriginal(text); setText(out.text); setFrench(false);
    } catch { setErr(p.errors.network); } finally { setBusy(null); }
  };

  const generate = async () => {
    if (!voice) return;
    setBusy("speak"); setErr(null);
    try {
      const res = await fetch("/api/create/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang, voice }) });
      if (!res.ok) { setErr(await apiError(res, p.errors.generic)); return; }
      const wav = await res.blob();
      const file = await render(wav, target);
      const id = ++ids.current;
      setTakes(ts => [{ id, text, lang, voice, wav, target, file: { blob: file.blob, ext: file.ext }, at: Date.now() }, ...ts]);
      setCurrent(id);
    } catch { setErr(p.errors.network); } finally { setBusy(null); }
  };

  const primary = french && local
    ? { label: busy === "translate" ? t.translating : t.translate, run: translate, icon: "translate" as const }
    : { label: busy === "speak" ? t.generating : take && take.text === text && take.voice === voice ? t.again : t.generate, run: generate, icon: "waveform" as const };

  return (
    <div className="cr-studio">
      <div className="cr-editor">
        {original !== null && (
          <div className="cr-original">
            <span className="cr-tag">{t.original}</span>
            <p>{original}</p>
            <button type="button" className="cx-link" onClick={() => { setText(original); setOriginal(null); setFrench(true); }}>{t.restore}</button>
          </div>
        )}
        <textarea ref={box} className="cr-text" value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder}
          lang={french ? "fr" : lang} aria-label={t.title} aria-invalid={tooLong || undefined} spellCheck={french || lang === "fr"} />

        {!french && lang !== "fr" && (
          <div className="cr-letters">
            <Letters lang={lang} target={box} onInsert={setText} />
            {hasStandIns(text, lang) && <button type="button" className="pf-chip" onClick={() => setText(fixLetters(text, lang))}><Icon name="check" size={15} stroke={1.6} />{t.fix(digraphs)}</button>}
          </div>
        )}

        {!text && (
          <div className="cr-starters">
            <p>{t.startWith}</p>
            <div className="pf-chips">{t.starters.map(s => <button key={s.label} type="button" className="pf-chip" onClick={() => starter(s.text)}>{s.label}</button>)}</div>
          </div>
        )}

        <div className="cr-foot">
          {take && (
            <div className="cr-result">
              <AudioPlayer src={take.wav} labels={{ play: p.play, pause: p.pause, download: p.download }} />
              <FileLink className="cx-btn sm" blob={take.file.blob} name={`namu-${take.lang}-${take.voice}.${take.file.ext}`}>
                <Icon name="download" size={15} stroke={1.6} />{t.download(p.outputs[take.target], take.file.ext)}
              </FileLink>
            </div>
          )}
          <div className="cr-bar">
            <span className={`cr-count${tooLong ? " over" : ""}`}>{t.chars(formatNumber(ui, text.length), formatNumber(ui, LIMITS.textChars))}</span>
            {err && <p className="cx-error" role="alert">{err}</p>}
            <button type="button" className="cx-btn primary" onClick={() => void primary.run()} disabled={!text.trim() || tooLong || busy !== null || !voice}>
              {busy ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={primary.icon} size={16} stroke={1.6} />}{primary.label}
            </button>
          </div>
        </div>
      </div>

      <aside className="cr-panel">
        <div className="cx-seg cr-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={side === "settings"} onClick={() => setSide("settings")}>{t.settings}</button>
          <button type="button" role="tab" aria-selected={side === "history"} onClick={() => setSide("history")}>{t.history}{takes.length > 0 && <span className="cx-count">{takes.length}</span>}</button>
        </div>

        {side === "settings" ? (
          <div className="cr-settings">
            <div className="cr-set"><p className="cr-label">{t.language}</p>
              <LanguageChips value={lang} onPick={pickLang} options={ORDER} ready={l => can("speech", l)} soon={p.soon} label={t.language} /></div>
            {local && (
              <label className="cr-switch">
                <span>{t.written}</span>
                <input type="checkbox" role="switch" checked={french} onChange={e => setFrench(e.target.checked)} />
                <i aria-hidden="true" />
              </label>
            )}
            <div className="cr-set"><p className="cr-label">{t.voice}</p>
              <VoicePicker lang={lang} value={voice} onPick={v => setVoices(vs => ({ ...vs, [lang]: v }))} label={t.voice} playLabel={p.play} /></div>
            <div className="cr-set"><p className="cr-label">{t.madeFor}</p>
              <div className="cr-targets" role="radiogroup" aria-label={t.madeFor}>
                {OUTPUTS.map(o => (
                  <button key={o.id} type="button" role="radio" aria-checked={target === o.id} onClick={() => setTarget(o.id)}>
                    <Icon name={TARGET_ICON[o.id]} size={18} stroke={1.5} /><span>{p.outputs[o.id]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : takes.length === 0 ? (
          <p className="cr-none">{t.empty}</p>
        ) : (
          <ul className="cr-history">
            {takes.map(x => (
              <li key={x.id}>
                <button type="button" aria-pressed={x.id === current} onClick={() => { setCurrent(x.id); setLang(x.lang); setVoices(vs => ({ ...vs, [x.lang]: x.voice })); setText(x.text); setTarget(x.target); }}>
                  <VoiceAvatar v={{ id: x.voice }} size={28} />
                  <span><strong>{x.text}</strong><em>{voiceOf(x.voice).name} · {language(x.lang).endonym} · {p.outputs[x.target]}</em></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

const TARGET_ICON: Record<OutputId, "microphone" | "volume" | "phone-voice" | "download"> = { whatsapp: "microphone", radio: "volume", phone: "phone-voice", file: "download" };
