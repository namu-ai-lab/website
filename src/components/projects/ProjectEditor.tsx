"use client";

import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { AudioPlayer } from "../platform/media";
import { Letters, VoicePicker } from "../platform/pickers";
import { kitVoices, patchProject, putVersion, removeProject, save, speak, translate } from "./client";
import { Dictate } from "./Dictate";
import { platformCopy } from "@/content/platform";
import { projectsCopy } from "@/content/projects";
import { lp, type Lang } from "@/i18n/config";
import { render } from "@/lib/audio-out";
import { LOCAL, OUTPUTS, WRITTEN, can, canTranslate, defaultVoice, language, stateOf, type LangCode, type OutputId, type VoiceId } from "@/lib/catalog";
import { fixLetters, hasStandIns } from "@/lib/catalog/text";
import { STATUSES, fileName, versionLangs, type Project, type VersionStatus } from "@/lib/project-shape";
import { zip } from "@/lib/zip";

type Draft = { text: string; voice: string | null; status: VersionStatus };
type Sound = { blob: Blob; text: string; voice: string | null };
const SOURCE = "source";
const WRITTEN_AND_LOCAL: string[] = [WRITTEN, ...LOCAL];

/* A project, the heart of Namu Create: the message as it was written or said (the source), and beside it one column
   per local language, each a version with its own text, voice, sound and review state. Translate fills a version
   from the source; Generate says it; Draft, To review and Checked follow it to the end. "Made for" decides the file
   every download becomes (a WhatsApp voice note, a radio spot, a phone line); Download all puts every language in
   one .zip. Text saves itself; sound stays in this page, made again from the text whenever it is needed. On a phone,
   one column at a time, chosen from a row of languages. */
export function ProjectEditor({ lang, project }: { lang: Lang; project: Project }) {
  const t = projectsCopy[lang].editor, p = platformCopy[lang], h = projectsCopy[lang].home;
  const [title, setTitle] = useState(project.title);
  const [sourceLang, setSourceLang] = useState<LangCode>(project.sourceLang);
  const [sourceText, setSourceText] = useState(project.sourceText);
  const [madeFor, setMadeFor] = useState<OutputId>(project.madeFor);
  const [drafts, setDrafts] = useState<Partial<Record<LangCode, Draft>>>(() =>
    Object.fromEntries(project.versions.map(v => [v.lang, { text: v.text, voice: v.voice, status: v.status }])));
  const [sounds, setSounds] = useState<Record<string, Sound | undefined>>({});
  const [busy, setBusy] = useState<Record<string, "translate" | "generate" | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [kit, setKit] = useState<Partial<Record<string, string>>>({});
  const [pending, setPending] = useState(0), [savedOnce, setSavedOnce] = useState(false);
  const [zipping, setZipping] = useState(false), [note, setNote] = useState<string | null>(null);
  const [active, setActive] = useState<string>(SOURCE);
  const timers = useRef<Record<string, number>>({});
  const refs = useMemo(() => Object.fromEntries([SOURCE, ...WRITTEN_AND_LOCAL].map(k => [k, createRef<HTMLTextAreaElement>()])), []);

  useEffect(() => { void kitVoices().then(setKit); }, []);
  useEffect(() => {
    const t0 = timers.current;
    return () => Object.values(t0).forEach(clearTimeout);
  }, []);

  /* one save per field, a moment after the last keystroke */
  const later = (key: string, run: () => Promise<unknown>, ms = 700) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      setPending(n => n + 1);
      try { await run(); setSavedOnce(true); setErrors(e => ({ ...e, save: undefined })); }
      catch (e) { setErrors(x => ({ ...x, save: e instanceof Error ? e.message : p.errors.generic })); }
      finally { setPending(n => n - 1); }
    }, ms);
  };
  const fail = (key: string, e: unknown) => setErrors(x => ({ ...x, [key]: e instanceof Error ? e.message : p.errors.generic }));

  const draftOf = (l: LangCode): Draft => drafts[l] ?? { text: "", voice: null, status: "draft" };
  const voiceOf = (l: LangCode): VoiceId | null => {
    const d = drafts[l]?.voice;
    return defaultVoice(l, d ? { ...kit, [l]: d } : kit);
  };
  const setDraft = (l: LangCode, patch: Partial<Draft>, persist: "now" | "later" = "later") => {
    setDrafts(d => ({ ...d, [l]: { ...draftOf(l), ...d[l], ...patch } }));
    const run = () => putVersion(project.id, l, patch);
    if (persist === "now") later(`v-${l}-${Object.keys(patch).join()}`, run, 0); else later(`v-${l}-${Object.keys(patch).join()}`, run);
  };

  const langs = versionLangs(sourceLang);
  const sourceVoice = defaultVoice(sourceLang, kit);
  const textOf = (key: string) => (key === SOURCE ? sourceText : draftOf(key as LangCode).text);
  const langOf = (key: string): LangCode => (key === SOURCE ? sourceLang : (key as LangCode));
  const fresh = (key: string) => {
    const s = sounds[key];
    return s && s.text === textOf(key) && s.voice === (key === SOURCE ? sourceVoice : voiceOf(key as LangCode)) ? s : null;
  };

  const doTranslate = async (l: LangCode) => {
    setBusy(b => ({ ...b, [l]: "translate" })); setErrors(e => ({ ...e, [l]: undefined }));
    try { const text = await translate(sourceText, sourceLang, l); setDraft(l, { text }, "now"); }
    catch (e) { fail(l, e); } finally { setBusy(b => ({ ...b, [l]: undefined })); }
  };
  const doGenerate = async (key: string) => {
    const l = langOf(key), text = textOf(key).trim(), voice = key === SOURCE ? sourceVoice : voiceOf(l);
    if (!text) return;
    setBusy(b => ({ ...b, [key]: "generate" })); setErrors(e => ({ ...e, [key]: undefined }));
    try { const blob = await speak(text, l, voice); setSounds(s => ({ ...s, [key]: { blob, text: textOf(key), voice } })); }
    catch (e) { fail(key, e); } finally { setBusy(b => ({ ...b, [key]: undefined })); }
  };
  const downloadOne = async (key: string) => {
    const s = fresh(key); if (!s) return;
    const out = await render(s.blob, madeFor);
    save(out.blob, fileName(title, language(langOf(key)).endonym, out.ext));
  };
  const downloadAll = async () => {
    const keys = [SOURCE, ...langs].filter(k => fresh(k));
    if (!keys.length) { setNote(t.nothingYet); return; }
    setZipping(true); setNote(null);
    try {
      const files = await Promise.all(keys.map(async k => {
        const out = await render(fresh(k)!.blob, madeFor);
        return { name: fileName(title, language(langOf(k)).endonym, out.ext), data: new Uint8Array(await out.blob.arrayBuffer()) };
      }));
      save(zip(files), fileName(title, p.outputs[madeFor], "zip"));
    } catch (e) { setNote(e instanceof Error ? e.message : p.errors.generic); }
    finally { setZipping(false); }
  };
  const destroy = async () => {
    if (!window.confirm(t.confirmDelete)) return;
    try { await removeProject(project.id); window.location.href = lp(lang, "/create/projects"); } catch (e) { setNote(e instanceof Error ? e.message : p.errors.generic); }
  };

  const sources: LangCode[] = [WRITTEN, ...LOCAL];
  const labels = { play: p.play, pause: p.pause, download: p.download };
  const lettersFix = (key: string) => {
    const l = langOf(key), text = textOf(key);
    if (!hasStandIns(text, l)) return null;
    const fixed = fixLetters(text, l);
    return (
      <button type="button" className="pj-fix" onClick={() => (key === SOURCE ? (setSourceText(fixed), later("source", () => patchProject(project.id, { sourceText: fixed }))) : setDraft(l, { text: fixed }))}>
        {Object.entries(language(l).digraphs).filter(([k]) => text.includes(k)).slice(0, 4).map(([k, v]) => `${k} → ${v}`).join("  ")}
      </button>
    );
  };
  const soundRow = (key: string) => {
    const s = fresh(key), l = langOf(key), b = busy[key];
    if (!can("speech", l)) return null;
    return (
      <div className="pj-sound">
        {s ? (
          <div className="pj-sound-row">
            <AudioPlayer src={s.blob} labels={labels} compact />
            <button type="button" className="cx-icon-btn" aria-label={`${p.download} · ${p.outputs[madeFor]}`} title={`${p.download} · ${p.outputs[madeFor]}`} onClick={() => void downloadOne(key)}>
              <Icon name="download" size={17} stroke={1.6} />
            </button>
          </div>
        ) : (
          <button type="button" className="cx-btn sm primary" disabled={!!b || !textOf(key).trim()} onClick={() => void doGenerate(key)}>
            <Icon name="play" size={14} stroke={1.6} />{b === "generate" ? t.generating : sounds[key] ? t.again : t.generate}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="pj-editor">
      <header className="pj-bar">
        <a className="pj-back" href={lp(lang, "/create/projects")}><Icon name="arrow-back" size={18} stroke={1.6} /><span>{t.back}</span></a>
        <input className="pj-title" value={title} aria-label={t.title} maxLength={200}
          onChange={e => { const v = e.target.value; setTitle(v); if (v.trim()) later("title", () => patchProject(project.id, { title: v.trim() })); }} />
        <span className="pj-saved" aria-live="polite">{pending > 0 ? p.saving : savedOnce ? p.saved : ""}</span>
        <div className="pj-bar-acts">
          <label className="pj-select">
            <span className="pj-select-label">{t.madeFor}</span>
            <select value={madeFor} onChange={e => { const v = e.target.value as OutputId; setMadeFor(v); later("madeFor", () => patchProject(project.id, { madeFor: v }), 0); }}>
              {OUTPUTS.map(o => <option key={o.id} value={o.id}>{p.outputs[o.id]}</option>)}
            </select>
            <Icon name="chevron" size={14} stroke={1.6} />
          </label>
          <button type="button" className="cx-btn sm primary" onClick={() => void downloadAll()} disabled={zipping}>
            <Icon name="download" size={15} stroke={1.6} />{zipping ? t.preparing : t.downloadAll}
          </button>
          <button type="button" className="cx-icon-btn" aria-label={t.deleteProject} title={t.deleteProject} onClick={() => void destroy()}><Icon name="trash" size={17} stroke={1.5} /></button>
        </div>
      </header>
      {(note || errors.save) && <p className="pj-note" role="alert">{note ?? errors.save}</p>}

      <nav className="pj-switch" aria-label={t.language}>
        {[SOURCE, ...langs].map(k => (
          <button key={k} type="button" aria-pressed={active === k} onClick={() => setActive(k)}>
            {k === SOURCE ? t.source : language(k as LangCode).endonym}
          </button>
        ))}
      </nav>

      <div className="pj-cols">
        <section className={`pj-col source${active === SOURCE ? " on" : ""}`} aria-label={t.source}>
          <div className="pj-col-head">
            <label className="pj-select quiet">
              <span className="sr-only">{t.writtenIn}</span>
              <select value={sourceLang} onChange={e => { const v = e.target.value as LangCode; setSourceLang(v); later("sourceLang", () => patchProject(project.id, { sourceLang: v }), 0); }}>
                {sources.map(l => <option key={l} value={l} disabled={l !== WRITTEN && stateOf(l) !== "ready"}>{language(l).endonym}</option>)}
              </select>
              <Icon name="chevron" size={14} stroke={1.6} />
            </label>
            <span className="pj-tag">{t.source}</span>
          </div>
          <textarea ref={refs[SOURCE]} value={sourceText} lang={sourceLang} placeholder={h.placeholder} maxLength={20000}
            onChange={e => { const v = e.target.value; setSourceText(v); later("source", () => patchProject(project.id, { sourceText: v })); }} />
          <div className="pj-tools">
            <Letters lang={sourceLang} target={refs[SOURCE]} onInsert={v => { setSourceText(v); later("source", () => patchProject(project.id, { sourceText: v })); }} />
            {lettersFix(SOURCE)}
            <span className="pj-grow" />
            <Dictate lang={sourceLang} labels={{ dictate: h.dictate, stop: h.stopDictate, listening: h.listening, mic: p.record.mic }} onError={m => setErrors(e => ({ ...e, [SOURCE]: m }))}
              onText={x => { const v = sourceText.trim() ? `${sourceText.trim()} ${x}` : x; setSourceText(v); later("source", () => patchProject(project.id, { sourceText: v }), 0); }} />
          </div>
          {soundRow(SOURCE)}
          {errors[SOURCE] && <p className="cx-error" role="alert">{errors[SOURCE]}</p>}
        </section>

        {langs.map(l => {
          const name = language(l).endonym;
          if (stateOf(l) !== "ready") return (
            <section key={l} className={`pj-col soon${active === l ? " on" : ""}`} aria-label={name}>
              <div className="pj-col-head"><h2>{name}</h2><span className="pf-soon">{p.soon}</span></div>
              <div className="pj-soon-body"><span className="pf-coming-orb" aria-hidden="true" /></div>
            </section>
          );
          const d = draftOf(l), b = busy[l];
          return (
            <section key={l} className={`pj-col${active === l ? " on" : ""}`} aria-label={name}>
              <div className="pj-col-head">
                <h2>{name}</h2>
                <div className="pj-status" role="radiogroup" aria-label={t.statusLabel}>
                  {STATUSES.map(st => (
                    <button key={st} type="button" role="radio" aria-checked={d.status === st} className={st} onClick={() => setDraft(l, { status: st }, "now")}>{t.status[st]}</button>
                  ))}
                </div>
              </div>
              <textarea ref={refs[l]} value={d.text} lang={l} placeholder={t.placeholder(name)} maxLength={20000}
                onChange={e => setDraft(l, { text: e.target.value })} />
              <div className="pj-tools">
                <Letters lang={l} target={refs[l]} onInsert={v => setDraft(l, { text: v })} />
                {lettersFix(l)}
                <span className="pj-grow" />
                {canTranslate(sourceLang, l) && (
                  <button type="button" className="cx-btn sm" disabled={!!b || !sourceText.trim()} onClick={() => void doTranslate(l)}>
                    <Icon name="translate" size={15} stroke={1.6} />{b === "translate" ? t.translating : t.translate}
                  </button>
                )}
              </div>
              <VoicePicker lang={l} value={voiceOf(l)} onPick={v => setDraft(l, { voice: v }, "now")} label={p.voice} playLabel={p.play} />
              {soundRow(l)}
              {errors[l] && <p className="cx-error" role="alert">{errors[l]}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
