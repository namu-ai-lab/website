import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProgramme, getProgrammes } from "@/content";
import { SectionTabs } from "@/components/PostTools";
import { ConversationScore, StrictFolded, TestSetStrip, UtterancePipeline } from "@/components/figures";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { GlassArt, NightArt, Blueprint } from "@/components/Art";
import { ProgrammeArt, darkArt } from "@/components/NewsArt";
import { isLang, lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { alternates } from "@/i18n/seo";
import { site } from "@/content/site";

export const dynamicParams = false;
export function generateStaticParams() { return getProgrammes("en").map(p => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const p = getProgramme(l, slug);
  if (!p) return {};
  return { title: `${p.name}: ${p.title}`, description: p.sentence, alternates: alternates(l, `/programmes/${p.slug}`) };
}

/* Each programme's interactive figure and the art for its three overview cards. Text comes from i18n/copy. */
const figureNode = (slug: string, lang: Lang): ReactNode => ({
  hira: <ConversationScore lang={lang} />, rumbu: <TestSetStrip lang={lang} />, tankade: <UtterancePipeline lang={lang} />, maauni: <StrictFolded lang={lang} />,
} as Record<string, ReactNode>)[slug];
const overviewArt: Record<string, { art: ReactNode; dark?: boolean }[]> = {
  hira: [{ art: <GlassArt motif="mic" palette="apricot" ratio="card" /> }, { art: <Blueprint kind="hira" ratio="card" /> }, { art: <GlassArt motif="talk" palette="dusk" ratio="card" /> }],
  rumbu: [{ art: <GlassArt motif="talk" palette="apricot" ratio="card" /> }, { art: <NightArt seed="rumbu-consent" ratio="card" />, dark: true }, { art: <GlassArt motif="stack" palette="sand" ratio="card" /> }],
  zarma: [{ art: <GlassArt motif="glyph" ch="ŋ" palette="dusk" ratio="card" /> }, { art: <Blueprint kind="measure" ratio="card" /> }, { art: <GlassArt motif="bars" palette="apricot" ratio="card" /> }],
  tankade: [{ art: <GlassArt motif="bars" palette="sand" ratio="card" /> }, { art: <Blueprint kind="pipeline" ratio="card" /> }, { art: <GlassArt motif="sieve" palette="apricot" ratio="card" /> }],
  maauni: [{ art: <Blueprint kind="measure" ratio="card" /> }, { art: <GlassArt motif="glyph" ch="ƙ" palette="ember" ratio="card" />, dark: true }, { art: <GlassArt motif="mic" palette="dusk" ratio="card" /> }],
};

export default async function ProgrammePage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = (await params).lang as Lang;
  const p = getProgramme(lang, slug);
  if (!p) notFound();
  const c = copy[lang], t = c.programme;
  const L = (x: string) => lp(lang, x);
  const ha = /[ɓɗƙƴʼ]/.test(p.name) ? "ha" : undefined;
  const fig = t.figures[p.slug];
  const node = figureNode(p.slug, lang);
  const sections = [
    { id: "overview", title: t.tabs.overview },
    ...(fig && node ? [{ id: "figure", title: t.tabs.detail }] : []),
    { id: "questions", title: t.tabs.questions },
    { id: "progress", title: t.tabs.progress },
    { id: "collaborate", title: t.tabs.collaborate },
  ];
  const others = getProgrammes(lang).filter(x => x.slug !== p.slug);
  const dark = darkArt.has(p.slug);
  const pill = `pill lg ${dark ? "on-dark" : "frost"}`;
  const ld = { "@context": "https://schema.org", "@type": "ResearchProject", name: `${p.name}: ${p.title}`, description: p.sentence, inLanguage: lang,
    parentOrganization: { "@type": "Organization", "@id": `${site.url}/#org`, name: "Namu AI Lab" } };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Reveal />
      <div className="mhero">
        <div className={`mhero-card${dark ? " dark" : ""}`}>
          <div className="art"><ProgrammeArt slug={p.slug} ratio="wide" /></div>
          <div>
            <span className="status"><i />{c.status[p.status] ?? p.status}</span>
            <h1 className="display" lang={ha}>{p.name}</h1>
            <p className="lede">{p.title}</p>
          </div>
          <div className="acts">
            <a className={pill} href="#questions">{t.readQuestions}</a>
            <a className={pill} href="#progress">{t.seeProgress}</a>
            <a className={pill} href="#collaborate">{t.collaborate}</a>
          </div>
        </div>
      </div>

      <section className="wrap bigline"><p className="statement">{p.question}</p></section>

      <SectionTabs sections={sections} />

      <section id="overview" className="section" style={{ scrollMarginTop: 150 }}>
        <div className="wrap">
          <h2 className="twotone">{p.sentence} <span>{p.description[0].split(/(?<=[.?!])\s/)[0]}</span></h2>
          <div className="cardgrid">
            {t.overview[p.slug].map((card, i) => (
              <div key={card.t} className={`tcard reveal${overviewArt[p.slug][i].dark ? " dark" : ""}`}>
                <div className="art">{overviewArt[p.slug][i].art}</div>
                <h3 className="h3">{card.t}</h3><p>{card.d}</p>
              </div>
            ))}
          </div>
          <div className="split" style={{ marginTop: 72 }}>
            <div className="prose" style={{ padding: 0, margin: 0 }}>{p.description.map((d, i) => <p key={i}>{d}</p>)}</div>
            <div className="panel reveal">
              <h3 className="h3">{t.noClaim}</h3>
              <ul>{p.noClaim.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {fig && node && (
        <section id="figure" className="section" style={{ scrollMarginTop: 150 }}>
          <div className="wrap">
            <h2 className="twotone">{fig.title} <span>{fig.sub}</span></h2>
            <figure style={{ margin: "48px 0 0" }}><div className="fig">{node}</div><figcaption className="fig-cap">{fig.cap}</figcaption></figure>
          </div>
        </section>
      )}

      <section id="questions" className="section" style={{ scrollMarginTop: 150 }}>
        <div className="wrap">
          <h2 className="h2">{t.questions}<span className="sub">{t.questionsSub}</span></h2>
          <ol className="qgrid">{p.questions.map((q, i) => <li key={i} className="reveal"><span className="n">{String(i + 1).padStart(2, "0")}</span><p>{q}</p></li>)}</ol>
        </div>
      </section>

      <section id="progress" className="section" style={{ scrollMarginTop: 150 }}>
        <div className="wrap">
          <h2 className="h2">{t.progress}<span className="sub">{t.progressSub}</span></h2>
          <ol className="steps">
            {p.ladder.map((r, i) => (
              <li key={i} className="reveal">
                <span className={`st ${r.state}`}><i />{t.states[r.state]}{r.when ? ` · ${r.when}` : ""}</span>
                <span className="t"><b>{r.title}</b>{r.detail && <span>{r.detail}</span>}</span>
              </li>
            ))}
          </ol>
          <div className="panel" style={{ marginTop: 48 }}>
            <h3 className="h3">{t.release}</h3>
            <ul>{p.outputs.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="collaborate" className="section" style={{ scrollMarginTop: 150 }}>
        <div className="wrap split">
          <div>
            <h2 className="statement" style={{ fontSize: "clamp(30px, 2.8vw, 40px)" }}>{t.workWith(p.name)}</h2>
            <p className="lede" style={{ margin: "20px 0 28px" }}>{p.collaborate}</p>
            <a className="pill lg dark" href={`mailto:contact@namuai.org?subject=${encodeURIComponent(`${p.name}, Namu AI Lab`)}`}>{c.common.getInTouch}</a>
          </div>
          <div>
            <h3 className="h3" style={{ marginBottom: 16 }}>{t.reading}</h3>
            <ul className="reflist">{p.related.map(r => <li key={r.href}><a href={r.href}><span>{r.label}</span><Icon name="external" size={18} stroke={1.5} /></a></li>)}</ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="h-other">
        <div className="wrap">
          <div className="section-head"><h2 id="h-other" className="h2">{t.more}</h2><a className="pill" href={L("/research")}>{t.allResearch}</a></div>
          <div className="models" style={{ gridAutoColumns: "minmax(280px, 1fr)" }}>
            {others.map(o => (
              <a key={o.slug} className="acard" href={L(`/programmes/${o.slug}`)}>
                <div className="art"><ProgrammeArt slug={o.slug} ratio="wide" /></div>
                <h3 className="h3" lang={/[ɓɗƙƴʼ]/.test(o.name) ? "ha" : undefined}>{o.name}</h3>
                <p>{o.sentence}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
