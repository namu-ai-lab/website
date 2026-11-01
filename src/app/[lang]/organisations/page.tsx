import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/Interactive";
import { Blossom } from "@/components/Logo";
import { NewsArt } from "@/components/NewsArt";
import { OrgListen } from "@/components/OrgListen";
import { TallyLink } from "@/components/Tally";
import { fmtDate, getNews, getProgramme } from "@/content";
import { ORG_PHOTOS, orgCopy } from "@/content/organisations";
import { useCases } from "@/content/usecases";
import { copy } from "@/i18n/copy";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = orgCopy[l].meta;
  return { title, description, alternates: alternates(l, "/organisations") };
}

const MAIL = `mailto:contact@namuai.org?subject=${encodeURIComponent("Namu AI Lab partnership")}`;

/* /organisations, after openaifoundation.org, kept as plain as it is: the Blossom, the name and the mission, centred;
   one statement beside one large photograph; the work we do with organisations as cards, each with a photograph and a
   line the Lab's models speak; resources, as a two-column list of square pictures, titles and dates; the way to reach
   us. One type family, small dark buttons. */
export default async function Organisations({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = orgCopy[lang];
  const cases = useCases[lang].cases;
  const L = (p: string) => lp(lang, p);

  const rumbu = getProgramme(lang, "rumbu");
  const news = getNews(lang);
  const resources = [
    ...news.slice(0, 3).map(x => ({ ...x, meta: fmtDate(x.date, lang) })),
    ...(rumbu ? [{ href: `/programmes/${rumbu.slug}`, title: rumbu.title, art: "rumbu", external: false, note: undefined, meta: `${t.programme} · ${copy[lang].status[rumbu.status]}` }] : []),
    ...news.slice(3).map(x => ({ ...x, meta: fmtDate(x.date, lang) })),
  ];

  return (
    <div className="page-top ofd">
      <Reveal />

      <header className="ofd-hero wrap">
        <Blossom className="ofd-mark" size={88} />
        <h1>{t.h1}</h1>
        <p>{t.mission}</p>
      </header>

      {/* first screen: no .reveal here, so the statement and the priority photo (the LCP) never wait for JavaScript */}
      <section className="ofd-intro wrap" aria-label={t.h1}>
        <div className="ofd-intro-text">
          <p className="ofd-statement">{t.statement}</p>
          <TallyLink className="ofd-btn" form="partner" lang={lang} source="lab-organisations-intro">{t.partner}</TallyLink>
        </div>
        <div className="ofd-pic ofd-square">
          <Image src={ORG_PHOTOS.statement.src} alt={t.statementAlt} fill sizes="(max-width: 760px) 100vw, 50vw" priority />
        </div>
      </section>

      <section className="ofd-areas wrap" aria-labelledby="h-areas">
        <h2 id="h-areas" className="reveal">{t.areasH}</h2>
        <ul className="ofd-cards">
          {t.areas.map(a => {
            const c = cases.find(x => x.id === a.id);
            return (
              <li key={a.id} className="reveal">
                <div className="ofd-pic ofd-wide">
                  <Image src={ORG_PHOTOS[a.id].src} alt={a.alt} fill sizes="(max-width: 960px) 100vw, 33vw" />
                </div>
                <h3>{a.t}</h3>
                <p>{a.d}</p>
                {c && <OrgListen id={a.id} clips={c.voicings[0].clips} gloss={c.voicings[0].gloss} note={c.note} transcript={c.voicings[0].transcript} heard={t.heard} hear={t.hear} stop={t.stop} />}
              </li>
            );
          })}
        </ul>
        <p className="ofd-more reveal">{t.moreQ} <TallyLink form="partner" lang={lang} source="lab-organisations-more">{t.moreCta} <span aria-hidden="true">→</span></TallyLink></p>
      </section>

      <section className="ofd-res wrap" aria-labelledby="h-res">
        <h2 id="h-res">{t.resourcesH}</h2>
        <ul>
          {resources.map(r => (
            <li key={r.href} className="reveal">
              <a href={r.external ? r.href : L(r.href)} {...(r.external ? { target: "_blank", rel: "noopener" } : {})}>
                <span className="ofd-thumb" aria-hidden="true"><NewsArt art={r.art} /></span>
                <span className="ofd-res-text">
                  <strong>{r.title}</strong>
                  <span>{r.meta}{r.note ? ` · ${r.note}` : ""}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="ofd-end wrap" aria-labelledby="h-end">
        <h2 id="h-end">{t.endH}</h2>
        <p>{t.endSub}</p>
        <div className="ofd-end-acts">
          <TallyLink className="ofd-btn" form="partner" lang={lang} source="lab-organisations-end">{t.partner} <span aria-hidden="true">→</span></TallyLink>
          <a className="ofd-btn light" href={MAIL}>{t.write}</a>
        </div>
      </section>
    </div>
  );
}
