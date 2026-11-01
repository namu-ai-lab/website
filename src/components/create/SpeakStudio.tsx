"use client";

import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer } from "../platform/media";
import { Letters, SampleButton, VoiceAvatar } from "../platform/pickers";
import { Making, MessageList, OUTPUT_ICON, VoiceNote } from "./bits";
import { fileFor, keep, save, share, speak, translate } from "./client";
import { Dictate } from "./Dictate";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";
import { LOCAL, OUTPUTS, WRITTEN, can, canTranslate, defaultVoice, language, voice as voiceOf, voicesFor, type LangCode, type OutputId, type VoiceId } from "@/lib/catalog";
import { fixLetters, hasStandIns } from "@/lib/catalog/text";
import { LIMITS } from "@/lib/limits";
import { fileName, titleFrom, type Message } from "@/lib/project-shape";

/* Voice message (mock-up v2), after ElevenLabs' Text to Speech: the words on the left; on the right what they are
   written in, the language and voice that say them, and where they will be heard; the result under the words, and the
   messages already made below. Written in French, the words become the local language first, and the box then holds
   that text, to be checked and said again if it needs a change. The organisation's word list is applied on the
   server; the file is made for its channel in the browser (lib/audio-out). */
type Made = { wav: Blob; file: File; text: string; lang: LangCode; voice: VoiceId; target: OutputId };

export function SpeakStudio({ lang: ui, kitVoices, initialVoice, recent: initial, ready }:
  { lang: Lang; kitVoices: Partial<Record<string, string>>; initialVoice?: VoiceId; recent: Message[]; ready: boolean }) {
  const t = createCopy[ui].speak, c = createCopy[ui], p = platformCopy[ui];
  const first = initialVoice ? voiceOf(initialVoice).languages[0] : LOCAL.find(l => can("speech", l)) ?? "ha";
  const [lang, setLang] = useState<LangCode>(first);
  const [written, setWritten] = useState<LangCode>(initialVoice ? first : WRITTEN);
  const [voices, setVoices] = useState<Partial<Record<LangCode, VoiceId>>>(() => (initialVoice ? { [first]: initialVoice } : {}));
  const voice = voices[lang] ?? defaultVoice(lang, kitVoices);
  const [text, setText] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [target, setTarget] = useState<OutputId>("whatsapp");
  const [phase, setPhase] = useState<"idle" | "translate" | "speak">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [recent, setRecent] = useState(initial);
  const box = useRef<HTMLTextAreaElement>(null);
  const tooLong = text.length > LIMITS.textChars;
  const local = written === lang;
  const digraphs = Object.values(language(lang).digraphs).filter(ch => ch === ch.toLowerCase()).join(" ");

  const make = async () => {
    const words = text.trim();
    if (!words || !voice) return;
    setErr(null); setMade(null);
    try {
      let said = words, source = written, sourceText = "";
      if (written !== lang) {
        setPhase("translate");
        said = await translate(words, written, lang);
        setOriginal(words); setText(said); setWritten(lang); sourceText = words;
      } else if (original !== null) { source = WRITTEN; sourceText = original; }
      setPhase("speak");
      const wav = await speak(said, lang, voice);
      const file = await fileFor(wav, target, fileName(titleFrom(sourceText || said), language(lang).endonym, "x").replace(/\.x$/, ""));
      setMade({ wav, file, text: said, lang, voice, target });
      keep({ sourceLang: source, sourceText, lang, text: said, voice, madeFor: target }).then(m => setRecent(r => [m, ...r])).catch(() => {});
    } catch (e) { setErr(e instanceof Error ? e.message : p.errors.generic); }
    finally { setPhase("idle"); }
  };
  const restore = () => { if (original === null) return; setText(original); setOriginal(null); setWritten(WRITTEN); setMade(null); };
  const pickLang = (l: LangCode) => { setLang(l); setMade(null); if (written !== WRITTEN) setWritten(l); };

  return (
    <div className="cr-studio">
      <div className="cr-studio-main">
        <div className="cr-card cr-editor">
          {original !== null && (
            <div className="cr-original">
              <span>{t.original}</span><p lang={WRITTEN}>{original}</p>
              <button type="button" className="cx-btn ghost sm" onClick={restore}>{t.restore}</button>
            </div>
          )}
          <textarea ref={box} value={text} onChange={e => { setText(e.target.value); if (original !== null && written === WRITTEN) setOriginal(null); }}
            placeholder={t.placeholder} aria-label={p.nav.speak} lang={written} aria-invalid={tooLong || undefined} spellCheck={written === WRITTEN} />
          {local && (
            <div className="cr-letters">
              <Letters lang={lang} target={box} onInsert={setText} />
              {hasStandIns(text, lang) && <button type="button" className="cr-chip" onClick={() => setText(fixLetters(text, lang))}><Icon name="check" size={14} stroke={1.6} />{t.fix(digraphs)}</button>}
            </div>
          )}
          <div className="cr-editor-foot">
            <span className={tooLong ? "over" : undefined}>{t.chars(formatNumber(ui, text.length), formatNumber(ui, LIMITS.textChars))}</span>
            <span className="cr-grow" />
            <Dictate lang={written} onText={x => setText(cur => (cur.trim() ? `${cur.trim()} ${x}` : x))} onError={setErr}
              labels={{ dictate: c.read.record, stop: c.read.stop, listening: c.read.listening, mic: c.errors.mic }} />
            {/* phones: Make it right under the words; the settings card's own button is for wider screens */}
            <button type="button" className="cx-btn primary cr-make-here" onClick={() => void make()} disabled={!text.trim() || tooLong || phase !== "idle" || !voice}>
              {made && made.text === text.trim() ? t.again : t.make}
            </button>
          </div>
        </div>
        {err && <p className="cx-error" role="alert">{err}</p>}
        {phase !== "idle" && <Making label={phase === "translate" ? c.home.translating : c.home.speaking} />}
        {made && phase === "idle" && (
          <div className="cr-result">
            <VoiceNote tail={<><VoiceAvatar v={{ id: made.voice }} size={22} />{language(made.lang).endonym} · {voiceOf(made.voice).name}</>}>
              <AudioPlayer src={made.wav} labels={{ play: p.play, pause: p.pause, download: p.download }} compact />
            </VoiceNote>
            <div className="cr-acts">
              {made.target === "whatsapp" && <button type="button" className="cx-btn primary" onClick={() => void share(made.file)}><Icon name="share" size={16} stroke={1.6} />{c.home.whatsapp}</button>}
              <button type="button" className={`cx-btn${made.target === "whatsapp" ? "" : " primary"}`} onClick={() => save(made.file, made.file.name)}>
                <Icon name="download" size={16} stroke={1.6} />{c.home.download}
              </button>
              <span className="cr-grow" />
              <span className="cr-tag"><Icon name={OUTPUT_ICON[made.target]} size={14} stroke={1.6} />{c.madeFor[made.target]} · .{made.file.name.split(".").pop()}</span>
            </div>
          </div>
        )}
        <section className="cr-section">
          <h2>{t.history}</h2>
          <MessageList lang={ui} list={recent} ready={ready} />
        </section>
      </div>

      <aside className="cr-card cr-settings">
        <div className="cr-set">
          <p className="cr-label">{t.writtenIn}</p>
          <div className="cr-choices" role="radiogroup" aria-label={t.writtenIn}>
            {[WRITTEN, lang].filter((l, i, xs) => xs.indexOf(l) === i).map(l => (
              <button key={l} type="button" role="radio" className="cr-choice" aria-checked={written === l} onClick={() => { setWritten(l); setOriginal(null); }}
                disabled={l !== lang && !canTranslate(l, lang)}>{language(l).endonym}</button>
            ))}
          </div>
        </div>
        <div className="cr-set">
          <p className="cr-label">{t.language}</p>
          <div className="cr-options" role="radiogroup" aria-label={t.language}>
            {LOCAL.map(l => {
              const ok = can("speech", l);
              return (
                <button key={l} type="button" role="radio" className="cr-option" aria-checked={lang === l} disabled={!ok} onClick={() => pickLang(l)}>
                  {language(l).endonym}<span className="cr-end">{ok ? lang === l && <Icon name="check" size={16} stroke={1.6} /> : <span className="pf-soon">{p.soon}</span>}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="cr-set">
          <p className="cr-label">{t.voice}</p>
          <div className="cr-options" role="radiogroup" aria-label={t.voice}>
            {voicesFor(lang).map(v => (
              <div key={v.id} className="cr-option-row">
                <button type="button" role="radio" className="cr-option" aria-checked={voice === v.id} onClick={() => setVoices(vs => ({ ...vs, [lang]: v.id as VoiceId }))}>
                  <VoiceAvatar v={v} size={26} />{v.name}
                </button>
                <SampleButton src={v.sample} label={`${p.play} ${v.name}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="cr-set">
          <p className="cr-label">{t.madeFor}</p>
          <div className="cr-options" role="radiogroup" aria-label={t.madeFor}>
            {OUTPUTS.map(o => (
              <button key={o.id} type="button" role="radio" className="cr-option" aria-checked={target === o.id} onClick={() => setTarget(o.id)}>
                <Icon name={OUTPUT_ICON[o.id]} size={18} stroke={1.5} />{c.madeFor[o.id]}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="cx-btn primary cr-make" onClick={() => void make()} disabled={!text.trim() || tooLong || phase !== "idle" || !voice}>
          {made && made.text === text.trim() ? t.again : t.make}
        </button>
      </aside>
    </div>
  );
}
