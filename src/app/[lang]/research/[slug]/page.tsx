import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNews, getPost, getPosts, getProgramme, fmtDate, monthYear } from "@/content";
import { NewsArt } from "@/components/NewsArt";
import { Share } from "@/components/PostTools";
import { ReadDepth } from "@/components/ReadDepth";
import { Icon } from "@/components/Icon";
import { isLang, lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { alternates } from "@/i18n/seo";
import { localize } from "@/i18n/localize";
import { site } from "@/content/site";

export const dynamicParams = false;
export function generateStaticParams() { return getPosts("en").map(p => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const p = getPost(l, slug);
  if (!p) return {};
  return {
    title: p.title, description: p.dek, alternates: alternates(l, `/research/${p.slug}`),
    openGraph: { type: "article", title: p.title, description: p.dek, publishedTime: p.date, authors: p.authors },
  };
}

/* The DeepMind blog template: centred date and topic, a large centred title, the byline, Share,
   a full-width image, then a 624 px text column with wider figures. */
export default async function PostPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const lang = (await params).lang as Lang;
  const post = getPost(lang, slug);
  if (!post) notFound();
  const c = copy[lang];
  const L = (p: string) => lp(lang, p);
  const programme = post.programme ? getProgramme(lang, post.programme) : undefined;
  const news = getNews(lang);
  const item = news.find(n => n.href === `/research/${post.slug}`);
  const byline = post.authors.length ? post.authors.join(", ") : post.team ?? "Namu AI Lab";
  const more = news.filter(n => n.href !== `/research/${post.slug}`).slice(0, 3);
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.dek, datePublished: post.date, inLanguage: lang,
    author: post.authors.length ? post.authors.map(name => ({ "@type": "Person", name })) : { "@type": "Organization", name: "Namu AI Lab" },
    publisher: { "@type": "Organization", "@id": `${site.url}/#org`, name: "Namu AI Lab" },
    mainEntityOfPage: `${site.url}${L(`/research/${post.slug}`)}`,
  };

  return (
    <article className="page-top">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="wrap post-hd">
        <div className="metarow"><time dateTime={post.date}>{fmtDate(post.date, lang)}</time>{programme ? <a href={L(`/programmes/${programme.slug}`)} style={{ textDecoration: "none" }}>{programme.name}</a> : <span>{c.topics[post.kind] ?? post.kind}</span>}</div>
        <h1 className="h1">{post.title}</h1>
        <p className="by">{byline}</p>
        <Share title={post.title} label={c.common.share} copiedLabel={c.common.copied} />
      </header>
      <div className="wrap"><div className="post-media"><NewsArt art={item?.art ?? "intro"} ratio="wide" /></div></div>

      <div className="prose">
        <p style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.45 }}>{post.dek}</p>
        {localize(post.body, lang)}
      </div>

      <div className="post-foot">
        {post.artefacts.length > 0 && <div className="row"><span>{c.post.artefacts}</span><span>{post.artefacts.map(a => <a key={a.href} href={a.href} className="textlink" style={{ marginLeft: 16 }}><span>{a.label}</span><Icon name="external" size={14} stroke={1.6} /></a>)}</span></div>}
        {post.origin && <div className="row"><span>{post.origin.label.replace(/ (on|sur) namu-ai\.org$/, "")}</span><a href={post.origin.href} className="textlink"><span>namu-ai.org</span><Icon name="external" size={14} stroke={1.6} /></a></div>}
        <div className="row"><span>{c.common.minRead(post.readMinutes)}</span><span>{byline}</span></div>
      </div>
      <ReadDepth post={post.slug} />

      <section className="section" aria-labelledby="h-more" style={{ marginTop: 72 }}>
        <div className="wrap">
          <div className="section-head"><h2 id="h-more" className="h2">{c.post.related}</h2><a className="pill" href={L("/research#latest")}>{c.common.viewAll}</a></div>
          <div className="cardgrid" style={{ marginTop: 0 }}>
            {more.map(n => (
              <a key={n.href} className="acard" href={L(n.href)}>
                <div className="art"><NewsArt art={n.art} ratio="wide" /></div>
                <h3 className="h3">{n.title}</h3>
                <div className="metarow"><span>{monthYear(n.date, lang)}</span><span>{n.topic}</span>{n.note && <span>{n.note}</span>}</div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
