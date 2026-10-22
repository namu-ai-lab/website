import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/* /robots.txt: everything public may be crawled; the console and the site's own API routes may not (the /api page,
   the developers' door, is public: only /api/ with a slash is closed). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/fr/account", "/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
