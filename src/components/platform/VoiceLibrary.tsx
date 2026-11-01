"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { VoiceAvatar } from "./pickers";
import { usePlay } from "../create/bits";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { LOCAL, VOICES, WRITTEN, language, voicesFor, type LangCode, type Voice } from "@/lib/catalog";

/* Create's voices (mock-up v2), after ElevenLabs' Voices: the languages as filters (a local language with no voice
   yet shows as Soon), then each voice as a card with its sphere, its language, what it suits, a sample, and Use, which
   opens Voice message with it. Everything comes from the catalog, so a new voice or language appears by itself. */
export function VoiceLibrary({ lang }: { lang: Lang }) {
  const t = createCopy[lang].voices, p = platformCopy[lang];
  const langs: LangCode[] = [...LOCAL, WRITTEN];
  const [pick, setPick] = useState<LangCode | null>(null);
  const shown = VOICES.filter(v => !pick || (v.languages as readonly string[]).includes(pick));
  const soon = LOCAL.filter(l => !voicesFor(l).length);
  return (
    <div className="cr-voices">
      <div className="cr-filters" role="group" aria-label={p.library.language}>
        <button type="button" className="cr-chip" aria-pressed={pick === null} onClick={() => setPick(null)}>{t.all}</button>
        {langs.map(l => voicesFor(l).length
          ? <button key={l} type="button" className="cr-chip" aria-pressed={pick === l} onClick={() => setPick(pick === l ? null : l)}>{language(l).endonym}</button>
          : <span key={l} className="cr-chip off">{language(l).endonym}<span className="pf-soon">{p.soon}</span></span>)}
      </div>
      <ul className="cr-vgrid">
        {shown.map(v => <VoiceCard key={v.id} v={v} lang={lang} />)}
        {!pick && soon.map(l => (
          <li key={l} className="cr-vcard soon">
            <span className="cr-vhead"><span className="cr-orb-ghost" aria-hidden="true" /><span><strong>{language(l).endonym}</strong><em>{p.soon}</em></span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VoiceCard({ v, lang }: { v: Voice; lang: Lang }) {
  const t = createCopy[lang].voices, p = platformCopy[lang];
  const { on, play } = usePlay();
  return (
    <li className="cr-vcard">
      <span className="cr-vhead"><VoiceAvatar v={v} size={64} /><span><strong>{v.name}</strong><em>{v.languages.map(l => language(l).endonym).join(" · ")}</em></span></span>
      <span className="cr-tags">
        {v.gender && <span>{p.gender[v.gender]}</span>}
        {v.uses.map(u => <span key={u}>{p.uses[u]}</span>)}
      </span>
      <span className="cr-vacts">
        <button type="button" className="cx-btn sm" aria-pressed={on} onClick={() => play(v.sample)}><Icon name={on ? "pause" : "play"} size={14} stroke={1.6} />{t.listen}</button>
        {v.languages.some(l => (LOCAL as readonly string[]).includes(l)) && <a className="cx-btn ghost sm" href={`${lp(lang, "/create/speak")}?voice=${v.id}`}>{t.use}</a>}
      </span>
    </li>
  );
}
