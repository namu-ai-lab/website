import type { MetadataRoute } from "next";
import { getPosts, getProgrammes } from "@/content";
import { site } from "@/content/site";
import { lp } from "@/i18n/config";

/* /sitemap.xml, for Google Search Console and other search engines: every public page in English, each with its
   French twin as an alternate. The console, sign-in and sign-up pages are left out (they are noindex). */
const PAGES = ["/", "/research", "/programmes", "/models/air", "/api", "/docs", "/organisations", "/data", "/about"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (path: string, lastModified?: string, fr = true): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${lp("en", path)}`,
    ...(lastModified ? { lastModified } : {}),
    ...(fr ? { alternates: { languages: { en: `${site.url}${lp("en", path)}`, fr: `${site.url}${lp("fr", path)}` } } } : {}),
  });
  const frPosts = new Set(getPosts("fr").map(p => p.slug));
  return [
    ...PAGES.map(p => entry(p)),
    ...getProgrammes("en").map(p => entry(`/programmes/${p.slug}`)),
    ...getPosts("en").map(p => entry(`/research/${p.slug}`, p.date, frPosts.has(p.slug))),
  ];
}
