import type { Metadata } from "next";
import { Blueprint, GlassArt, NightArt } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { NewsArt } from "@/components/NewsArt";
import { OrgSectors } from "@/components/OrgSectors";
import { OrgWay } from "@/components/OrgWay";
import { TallyLink } from "@/components/Tally";
import { getNews, getProgrammes, monthYear } from "@/content";
import { orgCopy } from "@/content/organisations";
import { isLang, lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
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

/* /organisations, the page for the organisations the Lab will partner with, after the partner pages of the frontier
   labs (openaifoundation.org's priorities and resources, Microsoft AI for Good's sourced figures, the ElevenLabs Impact
   Program's sectors and stories, Claude for Nonprofits' rows of what you get), built on what the Lab can honestly
   show: the promise and who we work with; why voice, in sourced public figures; what a programme could sound like,
   spoken by the Lab's own models; the partnership form's questions answered on the page; how a partnership runs and
   what each step leaves you; the rules we keep, and what we do not claim yet; the research behind it; questions; and
   the way in. */
export default async function Organisations({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = orgCopy[lang], c = copy[lang];
  const L = (p: string) => lp(lang, p);
  const programmes = getProgrammes(lang);
  const latest = getNews(lang).filter(n => !n.external).slice(0, 4);

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
                <a className="pill lg frost" href="#sectors">{t.hear}</a>
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

      {/* 2. Why voice, and why now: public figures, each with its source */}
      {t.facts.length > 0 && (
        <section className="section org-sec" aria-labelledby="h-context">
          <div className="wrap">
            <header className="org-head reveal">
              <h2 id="h-context" className="h1">{t.contextH}</h2>
              <p className="lede">{t.contextSub}</p>
            </header>
            <ol className="org-facts">
              {t.facts.map(f => (
                <li key={f.label} className="reveal">
                  <strong>{f.figure}</strong>
                  <p>{f.label}</p>
                  <a href={f.href} rel="noopener" target="_blank">{f.source}<Icon name="external" size={12} stroke={1.6} /></a>
                </li>
              ))}
            </ol>
            <p className="org-facts-note">{t.factsNote}</p>
          </div>
        </section>
      )}

      {/* 3. Where voice can help: what a programme could sound like, sector by sector */}
      <section className="section org-sec org-warm" id="sectors" aria-labelledby="h-sectors">
        <div className="wrap">
          <header className="org-head reveal">
            <h2 id="h-sectors" className="h1">{t.sectorsH}</h2>
            <p className="lede">{t.sectorsSub}</p>
          </header>
          <div className="reveal"><OrgSectors lang={lang} /></div>
        </div>
      </section>

      {/* 4. Find your way in */}
      <section className="section org-sec" id="way" aria-labelledby="h-way">
        <div className="wrap">
          <header className="org-head reveal">
            <h2 id="h-way" className="h1">{t.wayH}</h2>
            <p className="lede">{t.waySub}</p>
          </header>
          <div className="reveal"><OrgWay lang={lang} /></div>
        </div>
      </section>

      {/* 5. How a partnership runs, and what each step leaves you */}
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
                <p className="org-get"><span>{t.receive}</span>{s.get}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. What we commit to, and what we do not claim yet */}
      <section className="section org-sec" aria-labelledby="h-commit">
        <div className="wrap org-commit">
          <div>
            <header className="org-head reveal">
              <h2 id="h-commit" className="h1">{t.commitH}</h2>
              <p className="lede">{t.commitSub}</p>
            </header>
            <ul className="org-rows">
              {t.commits.map(x => (
                <li key={x.t} className="reveal"><span className="org-ic" aria-hidden="true"><Icon name={x.icon} size={20} stroke={1.4} /></span><h3>{x.t}</h3><p>{x.d}</p></li>
              ))}
            </ul>
          </div>
          <aside className="org-notyet reveal" aria-labelledby="h-notyet">
            <h3 id="h-notyet">{t.notYetH}</h3>
            <ul>{t.notYet.map(x => <li key={x}>{x}</li>)}</ul>
          </aside>
        </div>
      </section>

      {/* 7. The research behind it: the programmes and the latest work */}
      <section className="section org-sec" aria-labelledby="h-research">
        <div className="wrap">
          <header className="org-head split reveal">
            <div>
              <h2 id="h-research" className="h1">{t.researchH}</h2>
              <p className="lede">{t.researchSub}</p>
            </div>
            <a className="pill lg" href={L("/research")}>{t.allResearch}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
          </header>
          <div className="org-research">
            <div>
              <p className="org-label">{t.progLabel}</p>
              <ul className="org-progs">
                {programmes.map(p => (
                  <li key={p.slug}><a href={L(`/programmes/${p.slug}`)}>
                    <span className="org-prog-name">{p.name}</span>
                    <span className="org-prog-title">{p.title}</span>
                    <span className={`org-prog-status s-${p.status.toLowerCase()}`}>{c.status[p.status] ?? p.status}</span>
                  </a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="org-label">{t.latestLabel}</p>
              <ul className="org-latest">
                {latest.map(n => (
                  <li key={n.href}><a href={L(n.href)}>
                    <span className="org-latest-art" aria-hidden="true"><NewsArt art={n.art} /></span>
                    <span><strong>{n.title}</strong><em>{monthYear(n.date, lang)} · {n.topic}</em></span>
                  </a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Questions */}
      <section className="section org-sec" aria-labelledby="h-faq">
        <div className="wrap apx-faq">
          <h2 id="h-faq" className="h1 reveal">{t.faqH}</h2>
          <div className="apx-faq-list reveal">
            {t.faq.map(([q, a]) => <details key={q}><summary>{q}<Icon name="plus" size={18} stroke={1.5} /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      {/* 9. The way in, once more */}
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
