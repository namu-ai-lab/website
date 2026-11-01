"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { LanguageChips, VoicePicker } from "../platform/pickers";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { LANGUAGES, LOCAL, can, defaultVoice, isLangCode, language, type LangCode, type VoiceId } from "@/lib/catalog";
import type { Word } from "@/lib/catalog/text";
import { apiError } from "./fetch";

/* The Kit: the organisation's word list (a term, how to say it, and the language it applies to, or every language),
   saved as one list and applied wherever the platform speaks; and the voice it uses for each language. A row's
   Listen speaks how the term will be said. */

type Row = Word & { key: number };
const ORDER: LangCode[] = [...LOCAL, ...LANGUAGES.map(l => l.code).filter(c => !LOCAL.includes(c))];
const speakable = ORDER.filter(l => can("speech", l));
let keys = 0;   // row keys only need to be unique on the page
const row = (w: Word): Row => ({ ...w, key: ++keys });

export function KitEditor({ lang: ui, words, voices: initialVoices }: { lang: Lang; words: Word[]; voices: Partial<Record<string, string>> }) {
  const t = createCopy[ui].kit, p = platformCopy[ui], e = createCopy[ui].errors;
  const [rows, setRows] = useState<Row[]>(() => (words.length ? words : [{ term: "", say: "", lang: null }]).map(row));
  const [state, setState] = useState<"clean" | "dirty" | "saving" | "saved">("clean");
  const [err, setErr] = useState<string | null>(null);
  const [voices, setVoices] = useState(initialVoices);
  const [voiceLang, setVoiceLang] = useState<LangCode>(speakable[0]);
  const [playing, setPlaying] = useState<number | null>(null);

  const edit = (key: number, patch: Partial<Word>) => { setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r)); setState("dirty"); };
  const save = async () => {
    setState("saving"); setErr(null);
    try {
      const res = await fetch("/api/kit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words: rows.map(({ term, say, lang }) => ({ term, say, lang })) }) });
      if (!res.ok) { setErr(await apiError(res, e.generic)); setState("dirty"); return; }
      const j = await res.json() as { words: Word[] };
      setRows(j.words.length ? j.words.map(row) : [row({ term: "", say: "", lang: null })]);
      setState("saved");
    } catch { setErr(e.network); setState("dirty"); }
  };
  const listen = async (r: Row) => {
    const l = r.lang && can("speech", r.lang) ? r.lang : speakable[0];
    setPlaying(r.key); setErr(null);
    try {
      const res = await fetch("/api/create/speak", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: r.say, lang: l, voice: defaultVoice(l, voices) }) });
      if (!res.ok) { setErr(await apiError(res, e.generic)); setPlaying(null); return; }
      const url = URL.createObjectURL(await res.blob()), a = new Audio(url);
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); setPlaying(null); };
      await a.play();
    } catch { setErr(e.network); setPlaying(null); }
  };
  const pickVoice = async (l: LangCode, v: VoiceId) => {
    const before = voices;
    setVoices(vs => ({ ...vs, [l]: v })); setErr(null);
    try {
      const res = await fetch("/api/kit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: l, voice: v }) });
      if (!res.ok) { setErr(await apiError(res, e.generic)); setVoices(before); return; }
      setVoices((await res.json() as { voices: Partial<Record<string, string>> }).voices);
    } catch { setErr(e.network); setVoices(before); }
  };

  return (
    <div className="cr-kit">
      <section className="cx-card">
        <div className="cx-card-head"><h2>{t.words}</h2></div>
        <div className="cr-rows-head" aria-hidden="true"><span>{t.term}</span><span>{t.say}</span><span>{t.language}</span><span /><span /></div>
        <div className="cr-rows">
          {rows.map(r => (
            <div key={r.key} className="cr-row">
              <input value={r.term} onChange={ev => edit(r.key, { term: ev.target.value })} placeholder={t.termPh} aria-label={t.term} maxLength={80} />
              <input value={r.say} onChange={ev => edit(r.key, { say: ev.target.value })} placeholder={t.sayPh} aria-label={t.say} maxLength={200} lang={r.lang ?? undefined} />
              <select value={r.lang ?? ""} onChange={ev => edit(r.key, { lang: isLangCode(ev.target.value) ? ev.target.value : null })} aria-label={t.language}>
                <option value="">{t.every}</option>
                {ORDER.map(l => <option key={l} value={l}>{language(l).endonym}</option>)}
              </select>
              <button type="button" className="cx-icon-btn" aria-label={t.listen} title={t.listen} disabled={!r.say.trim() || playing !== null} onClick={() => void listen(r)}>
                <Icon name={playing === r.key ? "volume" : "play"} size={16} stroke={1.6} />
              </button>
              <button type="button" className="cx-icon-btn" aria-label={t.remove} title={t.remove} onClick={() => { setRows(rs => rs.length > 1 ? rs.filter(x => x.key !== r.key) : [row({ term: "", say: "", lang: null })]); setState("dirty"); }}>
                <Icon name="trash" size={16} stroke={1.6} />
              </button>
            </div>
          ))}
        </div>
        <div className="cr-kit-foot">
          <button type="button" className="cx-btn" onClick={() => setRows(rs => [...rs, row({ term: "", say: "", lang: null })])}><Icon name="plus" size={16} stroke={1.6} />{t.add}</button>
          <span className="cr-saved" role="status">
            {state === "saved" && <><Icon name="check" size={15} stroke={1.8} />{t.saved}</>}
            <button type="button" className="cx-btn primary" onClick={() => void save()} disabled={state !== "dirty"}>{state === "saving" ? t.saving : t.save}</button>
          </span>
        </div>
      </section>

      <section className="cx-card">
        <div className="cx-card-head"><h2>{t.voices}</h2></div>
        <div className="cr-voices">
          <LanguageChips value={voiceLang} onPick={setVoiceLang} options={ORDER} ready={l => can("speech", l)} soon={p.soon} label={t.language} />
          <div className="cr-vrow">
            <VoicePicker lang={voiceLang} value={defaultVoice(voiceLang, voices)} onPick={v => void pickVoice(voiceLang, v)} label={p.voice} playLabel={p.play} />
          </div>
        </div>
      </section>
      {err && <p className="cx-error" role="alert">{err}</p>}
    </div>
  );
}
