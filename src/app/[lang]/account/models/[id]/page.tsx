import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/account/AccountShell";
import { CodeTabs } from "@/components/CodeTabs";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Icon } from "@/components/Icon";
import { SampleButton, VoiceAvatar } from "@/components/platform/pickers";
import { consoleCopy } from "@/content/console";
import { samples } from "@/content/docs";
import { platformCopy } from "@/content/platform";
import { isLang, lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { LOCAL, MODELS, VOICES, isModelId, language, model as modelOf, voicesFor, type LangCode, type Model } from "@/lib/catalog";
import { hasAccounts } from "@/lib/env";
import { LIMITS } from "@/lib/limits";
import { apiBase } from "@/lib/public-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params; const l: Lang = isLang(lang) ? lang : "en";
  if (!isModelId(id)) return { robots: { index: false } };
  const m = modelOf(id);
  return { title: `${m.name} · Namu API`, description: platformCopy[l].tasks[m.task], robots: { index: false } };
}

export function generateStaticParams() {
  return MODELS.map(m => ({ id: m.id }));
}

/* A model's page in the API door, after ElevenAPI's Models: what it is called and does, its endpoint, the languages
   it takes (the local languages it does not take yet, as Soon), its voices, its limits, and its request in the docs'
   own code. All of it from the catalog and lib/limits, so a model learning a language shows it here by itself. */
export default async function ModelPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: raw, id } = await params;
  const lang = raw as Lang;
  if (!isModelId(id)) notFound();
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, `/account/models/${id}`);
  const m: Model = modelOf(id), t = consoleCopy[lang].model, p = platformCopy[lang], k = consoleCopy[lang].keys;
  const L = (path: string) => lp(lang, path);
  const code = samples(apiBase);
  const soon = LOCAL.filter(c => !m.languages.includes(c));
  const voices = m.task === "speech" ? m.languages.flatMap(c => voicesFor(c))
    : m.task === "converse" ? VOICES.filter(v => "persona" in v && v.persona) : [];
  const textLimit: [string, string] = [t.text, t.textLimit(LIMITS.textChars.toLocaleString(lang))];
  const limits: [string, string][] = [
    ...(m.task === "speech" ? [] : [[t.audio, t.audioLimit(LIMITS.uploadMb, LIMITS.audioMinutes)] as [string, string]]),
    ...(m.task === "speech" || m.task === "translate" ? [textLimit] : []),
    [t.rateLabel, t.rate(LIMITS.keyPerMin)],
  ];
  const endonym = (c: LangCode) => language(c).endonym;

  return (
    <ConsoleShell lang={lang} page={`model-${id}`} admin={profile.role === "admin"} user={user} access={profile.beta_status} title={m.name}
      actions={<>
        <a className="cx-btn" href={L(`/docs#${m.task}`)}>{t.docs}<Icon name="external" size={14} stroke={1.6} /></a>
        <a className="cx-btn primary" href={`${L("/account/playground")}?model=${m.task}`}>{t.tryIt}<Icon name="arrow-long" size={15} stroke={1.6} /></a>
      </>}>
      <p className="cx-model-task"><Icon name={m.icon} size={18} stroke={1.5} />{p.tasks[m.task]}<span className={`cx-model-status ${m.status}`}>{t.status[m.status]}</span></p>

      <div className="cx-model-facts">
        <div className="cx-model-fact">
          <p className="cx-label">{t.endpoint}</p>
          <code className="cx-model-route"><b>POST</b> {m.endpoint}</code>
        </div>
        <div className="cx-model-fact">
          <p className="cx-label">{t.languages}</p>
          <div className="cx-model-langs">
            {m.pairs
              ? m.pairs.map(([a, b]) => <span key={`${a}-${b}`} className="cx-model-lang">{endonym(a)}<Icon name="arrow-long" size={13} stroke={1.6} />{endonym(b)}</span>)
              : m.languages.map(c => <span key={c} className="cx-model-lang">{endonym(c)}</span>)}
            {soon.map(c => <span key={c} className="cx-model-lang off">{endonym(c)}<span className="pf-soon">{t.soon}</span></span>)}
          </div>
        </div>
        {voices.length > 0 && (
          <div className="cx-model-fact">
            <p className="cx-label">{t.voices}</p>
            <ul className="cx-model-voices">
              {voices.map(v => (
                <li key={v.id}>
                  <VoiceAvatar v={v} size={30} />
                  <span><strong>{v.name}</strong><code>{v.id}</code></span>
                  <SampleButton src={v.sample} label={`${p.play} ${v.name}`} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="cx-model-fact">
          <p className="cx-label">{t.limits}</p>
          <dl className="cx-model-limits">{limits.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
        </div>
      </div>

      <h2 className="cx-model-h">{t.request}</h2>
      {m.task === "translate" && <p className="cx-label">{t.audio}</p>}
      <CodeTabs code={code[m.task]} copyLabel={k.copy} copiedLabel={k.copied} failedLabel={k.copyFailed} />
      {m.task === "translate" && <>
        <p className="cx-label cx-model-sub">{t.text}</p>
        <CodeTabs code={code.translateText} copyLabel={k.copy} copiedLabel={k.copied} failedLabel={k.copyFailed} />
      </>}
    </ConsoleShell>
  );
}
