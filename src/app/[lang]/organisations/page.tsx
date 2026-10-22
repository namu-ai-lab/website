import type { Metadata } from "next";
import { Blueprint, GlassArt, NightArt } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { OrgWay } from "@/components/OrgWay";
import { TallyLink } from "@/components/Tally";
import { orgCopy } from "@/content/organisations";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = orgCopy[l].meta;
  return { title, description, alternates: alternates(l, "/organisations") };
}

const MAIL = `mailto:contact@namuai.org?subject=${encodeURIComponent("Namu AI Lab partnership")}`;

/* The pictures for the four steps of a partnership: a conversation, a measurement, a small group, a growing stack */
const STEP_ART = [
  <GlassArt key="0" motif="talk" palette="apricot" ratio="square" seed="org-talk" place="centre" />,
  <Blueprint key="1" kind="measure" ratio="square" />,
  <GlassArt key="2" motif="mic" palette="sand" ratio="square" seed="org-pilot" place="centre" />,
  <GlassArt key="3" motif="stack" palette="ember" ratio="square" seed="org-decide" place="centre" />,
];

/* /organisations, for the organisations that would deploy, test, fund or study speech technology with the Lab (the
   nav's Organisations; the API page is the Developers' door). After the API page's frame, so the two doors match:
   the promise over the haze with who we work with, then "Find your way in" (the partnership form's own questions,
   answered on the page), how a partnership runs, why the Lab, questions, and the way in once more. */
export default async function Organisations({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = orgCopy[lang];
  const L = (p: string) => lp(lang, p);

  return (
    <div className="page-top org">
      <Reveal />

      {/* 1. The promise, and who we work with */}
      <section className="org-hero">
        <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
        <div className="wrap">
          <div className="org-hero-head">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className="org-display">{t.h1}</h1>
            </div>
            <div className="org-hero-side">
              <p className="lede">{t.lede}</p>
              <div className="org-acts">
                <TallyLink className="pill lg dark" form="partner" lang={lang} source="lab-organisations-hero">{t.partner}<Icon name="arrow-long" size={18} stroke={1.6} /></TallyLink>
                <a className="pill lg frost" href={L("/#try")}>{t.hear}</a>
              </div>
            </div>
          </div>
          <div className="org-who" aria-labelledby="h-who">
            <h2 id="h-who" className="org-who-h">{t.whoH}<span>{t.whoSub}</span></h2>
            <ul className="org-types">
              {t.types.map(x => (
                <li key={x.id}><span className="org-ic" aria-hidden="true"><Icon name={x.icon} size={20} stroke={1.4} /></span><strong>{x.t}</strong><span>{x.d}</span></li>
              ))}
            </ul>
            <p className="org-solo"><strong>{t.solo.t}</strong> {t.solo.d} <a href={L("/api")}>{t.solo.cta}<Icon name="arrow-long" size={14} stroke={1.6} /></a></p>
          </div>
        </div>
      </section>

      {/* 2. Find your way in */}
      <section className="section org-sec" id="way" aria-labelledby="h-way">
        <div className="wrap">
          <header className="org-head reveal">
            <h2 id="h-way" className="h1">{t.wayH}</h2>
            <p className="lede">{t.waySub}</p>
          </header>
          <div className="reveal"><OrgWay lang={lang} /></div>
        </div>
      </section>

      {/* 3. How a partnership runs */}
      <section className="section org-sec" aria-labelledby="h-how">
        <div className="wrap">
          <header className="org-head reveal">
            <h2 id="h-how" className="h1">{t.howH}</h2>
            <p className="lede">{t.howSub}</p>
          </header>
          <ol className="org-steps">
            {t.steps.map((s, i) => (
              <li key={s.t} className="reveal">
                <div className="org-step-art" aria-hidden="true">{STEP_ART[i]}</div>
                <span className="org-step-n">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Why the Lab */}
      <section className="section org-sec" aria-labelledby="h-why">
        <div className="wrap">
          <header className="org-head reveal"><h2 id="h-why" className="h1">{t.whyH}</h2></header>
          <div className="org-why">
            {t.why.map((w, i) => (
              <a key={w.t} className="org-why-card reveal" href={L(w.href)}>
                <span className="org-ic" aria-hidden="true"><Icon name={["language", "check", "consent"][i]} size={20} stroke={1.4} /></span>
                <h3>{w.t}</h3><p>{w.d}</p>
                <span className="apx-link">{w.cta}<Icon name="arrow-long" size={14} stroke={1.6} /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Questions */}
      <section className="section org-sec" aria-labelledby="h-faq">
        <div className="wrap apx-faq">
          <h2 id="h-faq" className="h1 reveal">{t.faqH}</h2>
          <div className="apx-faq-list reveal">
            {t.faq.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={18} stroke={1.5} /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      {/* 6. The way in, once more */}
      <section className="apx-end" aria-labelledby="h-end">
        <div className="apx-end-art" aria-hidden="true"><NightArt seed="org-end" ratio="wide" tone="warm" /></div>
        <div className="wrap">
          <h2 id="h-end" className="h1">{t.endH}</h2>
          <p className="lede">{t.endSub}</p>
          <div className="apx-acts">
            <TallyLink className="pill lg light" form="partner" lang={lang} source="lab-organisations-end">{t.partner}<Icon name="arrow-long" size={18} stroke={1.6} /></TallyLink>
            <a className="pill lg on-dark" href={MAIL}>{t.write}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
