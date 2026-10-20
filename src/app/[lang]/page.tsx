import type { Metadata } from "next";
import { HeroRing } from "@/components/Art";
import { Playground } from "@/components/Playground";
import { UseCases } from "@/components/UseCases";
import { playground } from "@/content/playground";
import { Icon } from "@/components/Icon";
import { Explorer, Rail, Reveal } from "@/components/Interactive";
import { NewsArt, ProgrammeArt, darkArt } from "@/components/NewsArt";
import { getNews, getProgrammes, monthYear } from "@/content";
import { models } from "@/content/site";
import { isLang, lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { alternates } from "@/i18n/seo";

const featured = [
  { slug: "air", name: "Aïr", href: "/models/air", listen: true },
  { slug: "hira", name: "Hira", href: "/programmes/hira" },
  { slug: "rumbu", name: "Rumbu", href: "/programmes/rumbu" },
  { slug: "maauni", name: "Maʼauni", href: "/programmes/maauni" },
  { slug: "zarma", name: "Zarma", href: "/programmes/zarma" },
  { slug: "tankade", name: "Tankaɗe", href: "/programmes/tankade" },
];
const isHausa = (s: string) => /[ɓɗƙƴʼ]/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: alternates(isLang(lang) ? lang : "en", "/") };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const c = copy[lang], h = c.home, pg = playground[lang];
  const L = (p: string) => lp(lang, p);
  const [lead, ...rest] = getNews(lang);
  const go = (external?: boolean) => <Icon name={external ? "external" : "chevron"} size={16} stroke={1.6} className={external ? undefined : "rot-90"} />;
  return (
    <>
      <Reveal />
      <section className="hero" aria-labelledby="h-hero">
        <div className="haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /><i className="b5" /><HeroRing /><span className="grain" /></div>
        <h1 id="h-hero" className="display rise">{h.hero}</h1>
        <a className="pill lg frost cta rise d2" href="#try">{c.common.learnMore}</a>
      </section>

      {/* After elevenlabs.io and openai.fm: a console to try the models (a design preview), right under the hero. */}
      <section id="try" className="section try" aria-labelledby="h-try">
        <div className="wrap">
          <h2 id="h-try" className="try-title">{pg.sub}</h2>
          <Playground lang={lang} />
        </div>
      </section>

      <section id="featured" className="section" aria-label={h.featuredLabel}>
        <div className="rail-wrap">
          <Rail label={h.featuredLabel} prev={c.common.previous} next={c.common.next}>
            {featured.map(f => (
              <a key={f.slug} href={L(f.href)} className={`fcard${darkArt.has(f.slug) ? " dark" : ""}`}>
                <div className="art"><ProgrammeArt slug={f.slug} /></div>
                <div className="txt"><h2 className="h3" lang={isHausa(f.name) ? "ha" : undefined}>{f.name}</h2><p>{h.featured[f.slug]}</p></div>
                <div className="acts">
                  <span className={`pill ${darkArt.has(f.slug) ? "light" : "dark"}`}>{c.common.learnMore}</span>
                  {f.listen && <span className="pill frost"><Icon name="play" size={16} stroke={1.6} />{c.common.listen}</span>}
                </div>
              </a>
            ))}
          </Rail>
        </div>
      </section>

      <section id="latest" className="section" aria-labelledby="h-latest">
        <div className="wrap">
          <div className="section-head"><h2 id="h-latest" className="h2">{h.latest}</h2><a className="pill" href={L("/research#latest")}>{h.viewNews}</a></div>
          <div className="news">
            <a className="news-feature reveal" href={L(lead.href)}>
              <p className="h1"><span>{lead.title}</span></p>
              <div className="metarow"><span>{monthYear(lead.date, lang)}</span><span>{lead.topic}</span><span className="go">{c.common.learnMore} {go()}</span></div>
              <div className="thumb"><NewsArt art={lead.art} /></div>
            </a>
            <ul className="news-list">
              {rest.map(n => (
                <li key={n.href} className="reveal">
                  <a href={L(n.href)} hrefLang={n.external && lang === "fr" ? "en" : undefined}>
                    <div><p className="t">{n.title}</p><div className="metarow"><span>{monthYear(n.date, lang)}</span><span>{n.topic}</span>{n.note && <span>{n.note}</span>}<span className="go">{n.external ? "namu-ai.org" : c.common.learnMore} {go(n.external)}</span></div></div>
                    <div className="thumb"><NewsArt art={n.art} /></div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="models" className="section" aria-labelledby="h-models">
        <div className="wrap">
          <div className="section-head"><h2 id="h-models" className="h2">{h.models}<span className="sub">{h.modelsSub}</span></h2><a className="pill" href="https://www.namu-ai.org">{h.modelsLink}</a></div>
          <div className="models">
            {models.map(m => {
              const t = c.models[m.slug];
              return (
                <div key={m.slug} className="model reveal">
                  <div className="tile"><Icon name={m.icon} size={44} stroke={1.3} />{m.isNew && <span className="badge">{h.badge}</span>}</div>
                  <h3 className="h3">{m.name}</h3>
                  <p>{t.line}</p>
                  <span className="overline">{h.statusLabel}</span>
                  <ul><li><span className={`dot${m.status === "In development" ? " dev" : ""}`} />{c.status[m.status]}</li><li className="muted">{t.task} · {t.languages}</li></ul>
                  <a className="textlink" href={L(m.href)}><span>{c.common.learnMore}</span>{go()}</a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="research" className="section" aria-labelledby="h-research">
        <div className="wrap">
          <div className="section-head"><h2 id="h-research" className="h2">{h.research}<span className="sub">{h.researchSub}</span></h2><a className="pill" href={L("/research")}>{h.researchLink}</a></div>
          <Explorer
            items={getProgrammes(lang).map(p => ({ title: p.name, note: c.status[p.status] ?? p.status, body: p.sentence }))}
            stages={getProgrammes(lang).map(p => (
              <a key={p.slug} href={L(`/programmes/${p.slug}`)} aria-label={`${p.name}: ${p.title}`}>
                <ProgrammeArt slug={p.slug} ratio="wide" />
                <span className={`pill ${darkArt.has(p.slug) ? "light" : "dark"}`}>{c.common.explore(p.name)}</span>
              </a>
            ))}
          />
        </div>
      </section>

      <UseCases lang={lang} />
    </>
  );
}
