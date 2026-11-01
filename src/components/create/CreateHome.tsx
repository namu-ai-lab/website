"use client";

import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer } from "../platform/media";
import { ChipMenu, Making, MessageList, MiniPlay, VoiceEntry, VoiceNote } from "./bits";
import { fileFor, keep, save, share, speak, translate } from "./client";
import { Dictate } from "./Dictate";
import { Quickstarts } from "./Quickstarts";
import { createCopy } from "@/content/create";
import type { Idea, Showcase } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { WRITTEN, canTranslate, canTranslateText, defaultVoice, language, localFor, sampleOf, voice as voiceOf, voicesFor, type LangCode, type VoiceId } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { LIMITS } from "@/lib/limits";
import { fileName, titleFrom, type Message } from "@/lib/project-shape";

/* Namu Create's home (mock-up v2, Namu/research/elevenlabs/redesign): one question and one box, where French (or a
   local language) becomes a voice note in the local language, ready for WhatsApp; under it the tools, and the ideas
   (Quickstarts: real footage and the Sahel's sectors, to search and open) or the messages already made. Languages and voices come from the catalog, so
   Zarma, Fulfulde and Tamajaq light up here when a model speaks them. */
type Made = { wav: Blob; file: File; text: string; lang: LangCode; voice: VoiceId | null };

export function CreateHome({ lang: ui, recent: initial, ready, kitVoices }: { lang: Lang; recent: Message[]; ready: boolean; kitVoices: Partial<Record<string, string>> }) {
  const t = createCopy[ui].home, c = createCopy[ui], p = platformCopy[ui], L = (x: string) => lp(ui, x);
  const spoken = localFor("speech");
  const [from, setFrom] = useState<LangCode>(WRITTEN);
  const [to, setTo] = useState<LangCode>(spoken[0] ?? "ha");
  const typed = canTranslateText(from, to);            // written words in `from` work; else `from` comes in by voice
  const [original, setOriginal] = useState<string | null>(null);   // the words heard, when they were said in `from`
  const [voices, setVoices] = useState<Partial<Record<LangCode, VoiceId>>>({});
  const voice = voices[to] ?? defaultVoice(to, kitVoices);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "translate" | "speak">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [recent, setRecent] = useState(initial);
  const [tab, setTab] = useState<"ideas" | "recent">("ideas");
  const box = useRef<HTMLTextAreaElement>(null), top = useRef<HTMLDivElement>(null);
  const tooLong = text.length > LIMITS.textChars;
  // what can be written (or said) to become `to`: French only where Kora translates it, and `to` itself
  const sources: LangCode[] = [WRITTEN, ...spoken].filter(l => canTranslate(l, to));
  const pickTo = (l: LangCode) => { setTo(l); if (!canTranslate(from, l)) { setFrom(l); setOriginal(null); } };

  const make = async () => {
    const words = text.trim();
    if (!words || !voice) return;
    setErr(null); setMade(null);
    try {
      let said = words;
      if (from !== to) { setPhase("translate"); said = await translate(words, from, to); }
      setPhase("speak");
      const wav = await speak(said, to, voice);
      const title = titleFrom(original ?? (from === to ? said : words));
      const file = await fileFor(wav, "whatsapp", fileName(title, language(to).endonym, "x").replace(/\.x$/, ""));
      setMade({ wav, file, text: said, lang: to, voice });
      keep({ sourceLang: original !== null ? WRITTEN : from, sourceText: original ?? (from === to ? "" : words), lang: to, text: said, voice, madeFor: "whatsapp" })
        .then(m => setRecent(r => [m, ...r])).catch(() => {});
    } catch (e) { setErr(e instanceof Error ? e.message : p.errors.generic); }
    finally { setPhase("idle"); }
  };
  /* an idea goes in as French where French can be typed, else as the Hausa the model already said for it (only into
     Hausa) */
  const usable = (i: Idea) => canTranslateText(WRITTEN, to) || (to === "ha" && Boolean(i.ha));
  const use = (i: Idea) => {
    const fr = canTranslateText(WRITTEN, to);
    setFrom(fr ? WRITTEN : to); setText(fr ? i.fr : i.ha ?? ""); setOriginal(fr ? null : i.fr); setMade(null); setErr(null);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
  };

  /* a showcase goes in as the Hausa Nadia said, with the French it was written from above it: so, into Hausa */
  const useShow = (s: Showcase) => {
    setTo("ha"); setFrom("ha"); setText(s.ha); setOriginal(s.fr); setMade(null); setErr(null);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tools: { icon: IconName; label: string; href: string }[] = [
    { icon: "waveform", label: p.nav.speak, href: L("/create/speak") },
    { icon: "turns", label: p.nav.interpret, href: L("/create/interpret") },
    { icon: "translate", label: p.nav.translate, href: L("/create/translate") },
    { icon: "microphone", label: p.nav.voices, href: L("/create/voices") },
    { icon: "phone-voice", label: t.agents, href: L("/agents") },
  ];

  return (
    <div className="cr-home">
      <div className="cr-hero" ref={top}>
        <h1>{t.question}</h1>
        <form className="cr-composer" onSubmit={e => { e.preventDefault(); void make(); }}>
          {original !== null && (
            <div className="cr-original">
              <span>{language(WRITTEN).endonym}</span><p lang={WRITTEN}>{original}</p>
              <button type="button" className="cx-btn ghost sm" onClick={() => { setOriginal(null); setText(""); setFrom(WRITTEN); }}>{c.speak.restore}</button>
            </div>
          )}
          {typed ? (
            <textarea ref={box} value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} aria-label={t.question} rows={2}
              lang={from} aria-invalid={tooLong || undefined}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void make(); } }} />
          ) : (
            <VoiceEntry ui={ui} from={from} to={to} onError={setErr}
              onResult={r => { setOriginal(r.heard); setText(r.text); setFrom(to); setMade(null); setErr(null); }}
              aside={<button type="button" className="cr-link" onClick={() => { setFrom(to); requestAnimationFrame(() => box.current?.focus()); }}>{t.orWrite(language(to).name[ui])}</button>} />
          )}
          <div className="cr-composer-bar">
            <ChipMenu label={t.writtenIn} value={language(original !== null ? WRITTEN : from).endonym} onPick={id => { setFrom(id as LangCode); setOriginal(null); setText(""); }}
              options={sources.map(l => ({ id: l, label: language(l).endonym }))} />
            <Icon name="arrow-long" size={16} stroke={1.5} className="cr-to" />
            {spoken.length > 1
              ? <ChipMenu label={t.to} value={language(to).endonym} onPick={id => pickTo(id as LangCode)} options={spoken.map(l => ({ id: l, label: language(l).endonym }))} />
              : <span className="cr-chip static">{language(to).endonym}</span>}
            {voice && (
              <ChipMenu label={p.voice} value={voiceOf(voice).name} onPick={id => setVoices(v => ({ ...v, [to]: id as VoiceId }))}
                options={voicesFor(to).map(v => ({ id: v.id, label: v.name, end: <MiniPlay src={sampleOf(v, to).src} label={`${p.play} ${v.name}`} /> }))} />
            )}
            <span className="cr-grow" />
            {typed && <Dictate lang={from} onText={x => setText(cur => (cur.trim() ? `${cur.trim()} ${x}` : x))} onError={setErr}
              labels={{ dictate: c.interpret.record, stop: c.interpret.stop, listening: c.interpret.listening, mic: c.errors.mic }} />}
            <button type="submit" className="cx-btn primary" disabled={!text.trim() || tooLong || phase !== "idle" || !voice}>{t.make}</button>
          </div>
        </form>
        {err && <p className="cx-error" role="alert">{err}</p>}
        {phase !== "idle" && <Making label={phase === "translate" ? t.translating : t.speaking} />}
        {made && phase === "idle" && (
          <div className="cr-result">
            <VoiceNote tail={<>{language(made.lang).endonym}{made.voice ? ` · ${voiceOf(made.voice).name}` : ""}</>}>
              <AudioPlayer src={made.wav} labels={{ play: p.play, pause: p.pause, download: p.download }} compact />
            </VoiceNote>
            <p className="cr-said" lang={made.lang}>{made.text}</p>
            <div className="cr-acts">
              <button type="button" className="cx-btn primary" onClick={() => void share(made.file)}><Icon name="share" size={16} stroke={1.6} />{t.whatsapp}</button>
              <button type="button" className="cx-btn" onClick={() => save(made.file, made.file.name)}><Icon name="download" size={16} stroke={1.6} />{t.download}</button>
              <span className="cr-grow" />
              <button type="button" className="cx-btn ghost" onClick={() => { setMade(null); setText(""); setOriginal(null); setFrom(WRITTEN); }}>{t.again}</button>
            </div>
          </div>
        )}
        <nav className="cr-tools" aria-label={p.doors.create}>
          {tools.map(x => <a key={x.href} href={x.href}><span className="cr-tool"><Icon name={x.icon} size={23} stroke={1.4} /></span>{x.label}</a>)}
        </nav>
      </div>

      <section className="cr-below">
        <div className="cr-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "ideas"} onClick={() => setTab("ideas")}>{t.ideas}</button>
          <button type="button" role="tab" aria-selected={tab === "recent"} onClick={() => setTab("recent")}>{t.recent}</button>
        </div>
        {tab === "ideas" ? (
          <div role="tabpanel"><Quickstarts lang={ui} voice={voice} usable={usable} onUse={use} onUseShow={useShow} /></div>
        ) : (
          <div role="tabpanel"><MessageList lang={ui} list={recent} ready={ready} /></div>
        )}
      </section>
    </div>
  );
}
