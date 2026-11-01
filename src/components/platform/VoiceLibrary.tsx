"use client";

import { useMemo, useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { SampleButton, VoiceAvatar } from "./pickers";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { LANGUAGES, LOCAL, USES, VOICES, language, voicesFor, type LangCode, type Use } from "@/lib/catalog";

/* The voice library, after ElevenLabs' Voices > Explore, for the Sahel: search, then the languages (the local ones
   first; one without a voice yet shows as Coming), then what the voice suits; each voice with its sample, its
   language and its uses. In Create a voice goes straight into Speak; in the API door its ID is what a request names.
   Everything comes from the catalog, so a new voice or language appears here by itself. */
export function VoiceLibrary({ lang, door }: { lang: Lang; door: "create" | "api" }) {
  const t = platformCopy[lang];
  const [q, setQ] = useState(""), [langPick, setLang] = useState<LangCode | null>(null), [use, setUse] = useState<Use | null>(null);
  const langs = useMemo(() => [...LOCAL, ...LANGUAGES.map(l => l.code).filter(c => !LOCAL.includes(c))], []);
  const shown = VOICES.filter(v =>
    (!langPick || (v.languages as readonly string[]).includes(langPick)) &&
    (!use || (v.uses as readonly string[]).includes(use)) &&
    (!q.trim() || `${v.name} ${v.id} ${v.languages.map(l => language(l).endonym).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())));
  const coming = langPick && !voicesFor(langPick).length;

  return (
    <div className="pf-lib">
      <label className="pf-search">
        <Icon name="search" size={18} stroke={1.5} />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.library.search} aria-label={t.library.search} />
      </label>
      <div className="pf-filters">
        <div className="pf-chips" role="group" aria-label={t.library.language}>
          <button type="button" className="pf-chip" aria-pressed={langPick === null} onClick={() => setLang(null)}>{t.all}</button>
          {langs.map(c => (
            <button key={c} type="button" className="pf-chip" aria-pressed={langPick === c} onClick={() => setLang(langPick === c ? null : c)}>
              {language(c).endonym}{!voicesFor(c).length && <span className="pf-soon">{t.library.coming}</span>}
            </button>
          ))}
        </div>
        <div className="pf-chips" role="group" aria-label={t.library.use}>
          {USES.map(u => (
            <button key={u} type="button" className="pf-chip quiet" aria-pressed={use === u} onClick={() => setUse(use === u ? null : u)}>{t.uses[u]}</button>
          ))}
        </div>
      </div>

      {coming ? (
        <div className="pf-empty"><span className="pf-coming-orb" aria-hidden="true" /><h2>{language(langPick).endonym}</h2><p>{t.library.coming}</p></div>
      ) : shown.length === 0 ? (
        <div className="pf-empty"><p>{t.library.none}</p></div>
      ) : (
        <ul className="pf-voices">
          {shown.map(v => (
            <li key={v.id} className="pf-vcard">
              <div className="pf-vcard-top">
                <VoiceAvatar v={v} size={44} />
                <SampleButton src={v.sample} label={`${t.play} ${v.name}`} />
              </div>
              <h3>{v.name}</h3>
              <p className="pf-vmeta">{v.languages.map(l => language(l).endonym).join(" · ")}{"gender" in v && v.gender ? ` · ${t.gender[v.gender]}` : ""}</p>
              <p className="pf-vuses">{v.uses.map(u => <span key={u}>{t.uses[u]}</span>)}</p>
              <div className="pf-vcard-acts">
                {door === "create"
                  ? <a className="cx-btn sm" href={`${lp(lang, "/create/speak")}?voice=${v.id}`}>{t.library.useIn}</a>
                  : <><code className="pf-vid">{v.id}</code><CopyButton text={v.id} labels={{ copy: t.library.copyId, copied: t.copied, failed: t.errors.generic }} className="cx-icon-btn" iconOnly /></>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
