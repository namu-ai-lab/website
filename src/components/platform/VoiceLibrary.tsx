"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { VoiceOutline } from "./pickers";
import { usePlay } from "../create/bits";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { LOCAL, VOICES, WRITTEN, language, sampleOf, voicesFor, type LangCode, type Voice } from "@/lib/catalog";

/* Create's voices (mock-up v2), after ElevenLabs' Voices: the languages as filters (a local language with no voice
   yet is not shown), then each voice as a card with its outline, its languages, what it suits, a sample, and Use, which
   opens Voice message with it. A voice that speaks several languages plays and opens in the one filtered, else in its
   first local language. Everything comes from the catalog, so a new voice or language appears by itself. */
export function VoiceLibrary({ lang }: { lang: Lang }) {
  const t = createCopy[lang].voices, p = platformCopy[lang];
  const langs: LangCode[] = [...LOCAL, WRITTEN].filter(l => voicesFor(l).length > 0);
  const [pick, setPick] = useState<LangCode | null>(null);
  const shown = VOICES.filter(v => !pick || (v.languages as readonly string[]).includes(pick));
  return (
    <div className="cr-voices">
      {langs.length > 1 && (
        <div className="cr-filters" role="group" aria-label={p.library.language}>
          <button type="button" className="cr-chip" aria-pressed={pick === null} onClick={() => setPick(null)}>{t.all}</button>
          {langs.map(l => <button key={l} type="button" className="cr-chip" aria-pressed={pick === l} onClick={() => setPick(pick === l ? null : l)}>{language(l).endonym}</button>)}
        </div>
      )}
      <ul className="cr-vgrid">
        {shown.map(v => <VoiceCard key={v.id} v={v} lang={lang} pick={pick} />)}
      </ul>
    </div>
  );
}

function VoiceCard({ v, lang, pick }: { v: Voice; lang: Lang; pick: LangCode | null }) {
  const t = createCopy[lang].voices, p = platformCopy[lang];
  const { on, play } = usePlay();
  const local = v.languages.filter(l => (LOCAL as readonly string[]).includes(l));
  const heard = pick && v.languages.includes(pick) ? pick : local[0] ?? v.languages[0];
  const sample = sampleOf(v, heard);
  return (
    <li className="cr-vcard">
      <span className="cr-vhead"><span><strong>{v.name}</strong><em>{v.languages.map(l => language(l).endonym).join(" · ")}</em></span></span>
      <VoiceOutline outline={sample.outline} lang={heard} />
      <span className="cr-tags">
        {v.gender && <span>{p.gender[v.gender]}</span>}
        {v.uses.map(u => <span key={u}>{p.uses[u]}</span>)}
      </span>
      <span className="cr-vacts">
        <button type="button" className="cx-btn sm" aria-pressed={on} onClick={() => play(sample.src)}><Icon name={on ? "pause" : "play"} size={14} stroke={1.6} />{t.listen}</button>
        {local.length > 0 && <a className="cx-btn ghost sm" href={`${lp(lang, "/create/speak")}?voice=${v.id}&lang=${local.includes(heard) ? heard : local[0]}`}>{t.use}</a>}
      </span>
    </li>
  );
}
