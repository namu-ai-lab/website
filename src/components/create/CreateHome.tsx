"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer } from "../platform/media";
import { VoiceAvatar } from "../platform/pickers";
import { ChipMenu, Making, MessageList, MiniPlay, VoiceNote, VoiceOrb } from "./bits";
import { fileFor, keep, save, share, speak, translate } from "./client";
import { Dictate } from "./Dictate";
import { createCopy } from "@/content/create";
import { IDEAS, SECTORS, sampleOf, type Idea, type SectorId } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { intlLocale } from "@/i18n/format";
import { LOCAL, VOICES, WRITTEN, can, canTranslate, defaultVoice, language, voice as voiceOf, voicesFor, type LangCode, type VoiceId } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { LIMITS } from "@/lib/limits";
import { fileName, titleFrom, type Message } from "@/lib/project-shape";

/* Namu Create's home (mock-up v2, Namu/research/elevenlabs/redesign): one question and one box, where French (or a
   local language) becomes a voice note in the local language, ready for WhatsApp; under it the tools, the voices,
   and ideas from the Sahel's sectors or the messages already made. Languages and voices come from the catalog, so
   Zarma, Fulfulde and Tamajaq light up here when a model speaks them. */
type Made = { wav: Blob; file: File; text: string; lang: LangCode; voice: VoiceId | null };

export function CreateHome({ lang: ui, recent: initial, ready, kitVoices }: { lang: Lang; recent: Message[]; ready: boolean; kitVoices: Partial<Record<string, string>> }) {
  const t = createCopy[ui].home, c = createCopy[ui], p = platformCopy[ui], L = (x: string) => lp(ui, x);
  const spoken = LOCAL.filter(l => can("speech", l));
  const [from, setFrom] = useState<LangCode>(WRITTEN);
  const [to, setTo] = useState<LangCode>(spoken[0] ?? LOCAL[0]);
  const [voices, setVoices] = useState<Partial<Record<LangCode, VoiceId>>>({});
  const voice = voices[to] ?? defaultVoice(to, kitVoices);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"idle" | "translate" | "speak">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [recent, setRecent] = useState(initial);
  const [tab, setTab] = useState<"ideas" | "recent">("ideas");
  const [sector, setSector] = useState<SectorId | null>(null);
  const box = useRef<HTMLTextAreaElement>(null), top = useRef<HTMLDivElement>(null);
  const tooLong = text.length > LIMITS.textChars;
  const sources: LangCode[] = [WRITTEN, ...spoken];

  const make = async () => {
    const words = text.trim();
    if (!words || !voice) return;
    setErr(null); setMade(null);
    try {
      let said = words;
      if (from !== to) { setPhase("translate"); said = await translate(words, from, to); }
      setPhase("speak");
      const wav = await speak(said, to, voice);
      const title = titleFrom(from === to ? said : words);
      const file = await fileFor(wav, "whatsapp", fileName(title, language(to).endonym, "x").replace(/\.x$/, ""));
      setMade({ wav, file, text: said, lang: to, voice });
      keep({ sourceLang: from, sourceText: from === to ? "" : words, lang: to, text: said, voice, madeFor: "whatsapp" })
        .then(m => setRecent(r => [m, ...r])).catch(() => {});
    } catch (e) { setErr(e instanceof Error ? e.message : p.errors.generic); }
    finally { setPhase("idle"); }
  };
  const use = (i: Idea) => {
    setFrom(WRITTEN); setText(i.fr); setMade(null); setErr(null);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
  };

  const tools: { icon: IconName; label: string; href: string }[] = [
    { icon: "waveform", label: p.nav.speak, href: L("/create/speak") },
    { icon: "transcript", label: p.nav.read, href: L("/create/read") },
    { icon: "translate", label: p.nav.translate, href: L("/create/translate") },
    { icon: "microphone", label: p.nav.voices, href: L("/create/voices") },
    { icon: "phone-voice", label: t.agents, href: L("/agents") },
  ];
  const list = (xs: string[]) => new Intl.ListFormat(intlLocale(ui), { type: "conjunction" }).format(xs);
  const shelfVoices = VOICES.filter(v => v.languages.some(l => spoken.includes(l)));
  const soon = LOCAL.filter(l => !voicesFor(l).length || !can("speech", l));
  const ideas = useMemo(() => IDEAS.filter(i => !sector || i.sector === sector), [sector]);

  return (
    <div className="cr-home">
      <div className="cr-hero" ref={top}>
        <h1>{t.question}</h1>
        <form className="cr-composer" onSubmit={e => { e.preventDefault(); void make(); }}>
          <textarea ref={box} value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} aria-label={t.question} rows={2}
            lang={from} aria-invalid={tooLong || undefined}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void make(); } }} />
          <div className="cr-composer-bar">
            <ChipMenu label={t.writtenIn} value={language(from).endonym} onPick={id => setFrom(id as LangCode)}
              options={sources.map(l => ({ id: l, label: language(l).endonym }))} />
            <Icon name="arrow-long" size={16} stroke={1.5} className="cr-to" />
            <ChipMenu label={t.to} value={language(to).endonym} onPick={id => setTo(id as LangCode)}
              options={LOCAL.map(l => ({ id: l, label: language(l).endonym, disabled: !can("speech", l) || (l !== from && !canTranslate(from, l)), end: !can("speech", l) ? <span className="pf-soon">{p.soon}</span> : undefined }))} />
            {voice && (
              <ChipMenu label={p.voice} value={<><VoiceAvatar v={{ id: voice }} size={22} />{voiceOf(voice).name}</>} onPick={id => setVoices(v => ({ ...v, [to]: id as VoiceId }))}
                options={voicesFor(to).map(v => ({ id: v.id, label: <><VoiceAvatar v={v} size={22} />{v.name}</>, end: <MiniPlay src={v.sample} label={`${p.play} ${v.name}`} /> }))} />
            )}
            <span className="cr-grow" />
            <Dictate lang={from} onText={x => setText(cur => (cur.trim() ? `${cur.trim()} ${x}` : x))} onError={setErr}
              labels={{ dictate: c.read.record, stop: c.read.stop, listening: c.read.listening, mic: c.errors.mic }} />
            <button type="submit" className="cx-btn primary" disabled={!text.trim() || tooLong || phase !== "idle" || !voice}>{t.make}</button>
          </div>
        </form>
        {err && <p className="cx-error" role="alert">{err}</p>}
        {phase !== "idle" && <Making label={phase === "translate" ? t.translating : t.speaking} />}
        {made && phase === "idle" && (
          <div className="cr-result">
            <VoiceNote tail={<>{made.voice && <VoiceAvatar v={{ id: made.voice }} size={22} />}{language(made.lang).endonym}{made.voice ? ` · ${voiceOf(made.voice).name}` : ""}</>}>
              <AudioPlayer src={made.wav} labels={{ play: p.play, pause: p.pause, download: p.download }} compact />
            </VoiceNote>
            <p className="cr-said" lang={made.lang}>{made.text}</p>
            <div className="cr-acts">
              <button type="button" className="cx-btn primary" onClick={() => void share(made.file)}><Icon name="share" size={16} stroke={1.6} />{t.whatsapp}</button>
              <button type="button" className="cx-btn" onClick={() => save(made.file, made.file.name)}><Icon name="download" size={16} stroke={1.6} />{t.download}</button>
              <span className="cr-grow" />
              <button type="button" className="cx-btn ghost" onClick={() => { setMade(null); setText(""); box.current?.focus(); }}>{t.again}</button>
            </div>
          </div>
        )}
        <nav className="cr-tools" aria-label={p.doors.create}>
          {tools.map(x => <a key={x.href} href={x.href}><span className="cr-tool"><Icon name={x.icon} size={23} stroke={1.4} /></span>{x.label}</a>)}
        </nav>
      </div>

      <section className="cr-shelf">
        <div>
          <h2>{t.shelf(list(spoken.map(l => language(l).name[ui])))}</h2>
          <p>{t.shelfLine(list(shelfVoices.map(v => v.name)), list(soon.map(l => language(l).endonym)))}</p>
        </div>
        <ul>
          {shelfVoices.map(v => (
            <li key={v.id}><VoiceOrb id={v.id} sample={v.sample} label={`${p.play} ${v.name}`} /><span>{v.name}</span><small>{v.languages.map(l => language(l).endonym).join(" · ")}</small></li>
          ))}
          {soon.map(l => <li key={l} className="soon"><span className="cr-orb-ghost" aria-hidden="true" /><span>{language(l).endonym}</span><small>{p.soon}</small></li>)}
        </ul>
      </section>

      <section className="cr-below">
        <div className="cr-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "ideas"} onClick={() => setTab("ideas")}>{t.ideas}</button>
          <button type="button" role="tab" aria-selected={tab === "recent"} onClick={() => setTab("recent")}>{t.recent}</button>
        </div>
        {tab === "ideas" ? (
          <div role="tabpanel">
            <div className={`cr-sectors${sector ? " picked" : ""}`} role="group" aria-label={t.ideas}>
              {SECTORS.map(s => (
                <button key={s.id} type="button" className="cr-sector" aria-pressed={sector === s.id} onClick={() => setSector(sector === s.id ? null : s.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.photo} alt="" loading="lazy" /><span>{s.name[ui]}</span>
                </button>
              ))}
            </div>
            <ul className="cr-ideas">
              {ideas.map(i => {
                const src = voice ? sampleOf(i, voice) : undefined;
                return (
                  <li key={i.id} className="cr-idea">
                    <span className="cr-idea-top"><span>{SECTORS.find(s => s.id === i.sector)!.name[ui]}</span><span>{i.ha ? language("ha").endonym : t.text}</span></span>
                    <h3>{i.title[ui]}</h3>
                    <p lang="fr">{i.fr}</p>
                    <span className="cr-idea-foot">
                      {src && <MiniPlay src={src} label={`${p.play} ${i.title[ui]}`} />}
                      <button type="button" className="cx-btn ghost sm" onClick={() => use(i)}>{t.use}<Icon name="arrow-long" size={14} stroke={1.6} className="rot-up" /></button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div role="tabpanel"><MessageList lang={ui} list={recent} ready={ready} /></div>
        )}
      </section>
    </div>
  );
}
