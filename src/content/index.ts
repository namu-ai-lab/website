import type { Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { formatDate } from "@/i18n/format";
import { programmes, type Programme } from "./programmes";
import { programmesFr } from "./programmes.fr";
import { posts, type Post } from "./posts";
import { postsFr, aboutCopyFr } from "./posts.fr";
import { aboutCopy } from "./posts-new";
import { news as newsBase, type NewsItem } from "./news";

/* One door to the Lab's content in either language. Slugs are shared across languages. */

export const getProgrammes = (lang: Lang): Programme[] => (lang === "fr" ? programmesFr : programmes);
export const getProgramme = (lang: Lang, slug: string) => getProgrammes(lang).find(p => p.slug === slug);
export const getPosts = (lang: Lang): Post[] => (lang === "fr" ? postsFr : posts);
export const getPost = (lang: Lang, slug: string) => getPosts(lang).find(p => p.slug === slug);
export const getAbout = (lang: Lang) => (lang === "fr" ? aboutCopyFr : aboutCopy);

/** News items with titles and topics in the page's language. Internal posts take their own translated title. */
export function getNews(lang: Lang): (NewsItem & { note?: string })[] {
  return newsBase.map(n => {
    const slug = n.href.startsWith("/research/") ? n.href.slice("/research/".length) : null;
    const post = slug ? getPost(lang, slug) : undefined;
    const title = post?.title ?? (lang === "fr" && n.titleFr ? n.titleFr : n.title);
    return { ...n, title, topic: copy[lang].topics[n.topic] ?? n.topic, note: n.external && lang === "fr" ? copy.fr.common.inEnglish : undefined };
  });
}

/* a post's or news item's date ("2026-10-15"): a calendar day, the same everywhere */
export const fmtDate = (iso: string, lang: Lang) => formatDate(lang, iso + "T12:00:00Z", { style: "day" });
export const monthYear = (iso: string, lang: Lang) => formatDate(lang, iso + "T12:00:00Z", { style: "monthYear" });
