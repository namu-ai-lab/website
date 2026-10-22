import type { Metadata } from "next";
import { GlassArt, NightArt, Blueprint } from "@/components/Art";
import { Reveal } from "@/components/Interactive";
import { TallyLink } from "@/components/Tally";
import { NewsArt } from "@/components/NewsArt";
import { getNews, getProgramme, monthYear } from "@/content";
import { isLang, lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = copy[l].meta.data;
  return { title, description, alternates: alternates(l, "/data") };
}

/* After afterquery.com: a narrow reading column (problem, approach, what the data includes), one wide
   image, research cards, and a coloured closing band. Copy from the Rumbu programme; nothing here says
   data exists that does not. */
export default async function Data({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const c = copy[lang], d = c.data;
  const L = (p: string) => lp(lang, p);
  const rumbu = getProgramme(lang, "rumbu")!;
  const notes = getNews(lang).filter(n => ["fleurs", "strict", "intro"].includes(n.art));
  const art = [
    <GlassArt key="0" motif="talk" palette="apricot" ratio="square" place="centre" />, <GlassArt key="1" motif="mic" palette="sand" ratio="square" place="centre" />,
    <GlassArt key="2" motif="glyph" ch="ƙ" palette="ember" ratio="square" place="centre" />, <Blueprint key="3" kind="measure" ratio="square" />,
  ];
  return (
    <div className="page-top">
      <Reveal />
      <section className="wrap intro" style={{ textAlign: "left", maxWidth: "calc(760px + 2 * var(--gutter))" }}>
        <p className="eyebrow">{d.eyebrow}</p>
        <h1 className="h1">{d.h1}</h1>
        <p className="lede" style={{ margin: "24px 0 0" }}>{d.lede}</p>
        <div className="acts" style={{ justifyContent: "flex-start" }}><a className="pill lg dark" href={L("/programmes/rumbu")}>{d.rumbu}</a><a className="pill lg" href={L("/programmes/maauni")}>{d.measure}</a></div>
      </section>

      <div className="wrap"><div className="post-media reveal" style={{ aspectRatio: "1296 / 560" }}><NightArt seed="data-hero" ratio="wide" /></div></div>

      <section className="prose" style={{ paddingTop: 88 }}>
        <p className="eyebrow">{d.problem}</p>
        <h2 style={{ marginTop: 12 }}>{d.problemH}</h2>
        <p>{rumbu.description[0]}</p>
        <p className="eyebrow" style={{ marginTop: 56 }}>{d.approach}</p>
        <h2 style={{ marginTop: 12 }}>{d.approachH}</h2>
        {rumbu.description.slice(1).map((x, i) => <p key={i}>{x}</p>)}
      </section>

      <section className="section" aria-labelledby="h-incl">
        <div className="wrap" style={{ maxWidth: "calc(1000px + 2 * var(--gutter))" }}>
          <h2 id="h-incl" className="h2" style={{ marginBottom: 48 }}>{d.include}<span className="sub">{d.includeSub}</span></h2>
          <div className="datagrid">
            {d.items.map((x, i) => <div key={x.t} className="datum reveal"><div className="ic">{art[i]}</div><div><h3 className="h3">{x.t}</h3><p>{x.d}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="h-notes">
        <div className="wrap">
          <div className="section-head"><h2 id="h-notes" className="h2">{d.notes}<span className="sub">{d.notesSub}</span></h2><a className="pill" href={L("/research#latest")}>{d.moreResearch}</a></div>
          <div className="cardgrid" style={{ marginTop: 0 }}>
            {notes.map(n => (
              <a key={n.href} className="acard" href={L(n.href)}>
                <div className="art" style={{ aspectRatio: "1" }}><NewsArt art={n.art} /></div>
                <h3 className="h3">{n.title}</h3>
                <div className="metarow"><span>{monthYear(n.date, lang)}</span><span>{n.topic}</span></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 112 }}>
        <div className="demo solid" style={{ aspectRatio: "auto", minHeight: 280, borderRadius: 24 }}>
          <span className="art"><GlassArt motif="stack" palette="ember" ratio="wide" /></span>
          <span className="statement">{d.partner}</span>
          <span style={{ maxWidth: "40em", marginTop: 12, opacity: .9 }}>{rumbu.collaborate}</span>
          <TallyLink className="pill light" form="partner" lang={lang} source="lab-data-rumbu">{c.common.getInTouch}</TallyLink>
        </div>
      </section>
    </div>
  );
}
