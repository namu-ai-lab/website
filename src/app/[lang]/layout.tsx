import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@/styles/lab.css";
import "@/styles/figures.css";
import "@/styles/api.css";
import "@/styles/console.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteChrome } from "@/components/SiteChrome";
import { site } from "@/content/site";
import { getProgrammes } from "@/content";
import { isLang, locales, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import { alternates } from "@/i18n/seo";

export const dynamicParams = false;
export function generateStaticParams() { return locales.map(lang => ({ lang })); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "en";
  return {
    metadataBase: new URL(site.url),
    title: { default: "Namu AI Lab", template: "%s · Namu AI Lab" },
    description: copy[l].meta.site,
    openGraph: { siteName: "Namu AI Lab", type: "website", locale: l === "fr" ? "fr_FR" : "en_GB" },
    alternates: alternates(l, "/"),
  };
}

export const viewport: Viewport = { themeColor: [{ color: "#FFFFFF" }] };

/* Runs before paint: marks JS as present, so scroll reveals hide content only when JS can show it. */
const boot = `document.documentElement.classList.add('js')`;

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = copy[lang];
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <link rel="preload" href="/fonts/dmsans-lab.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "Organization", "@id": `${site.url}/#org`, name: "Namu AI Lab", url: site.url,
          description: c.meta.site, parentOrganization: { "@type": "Organization", name: "Namu", url: site.parent.url },
          sameAs: ["https://github.com/namu-ai-lab"],
        }) }} />
      </head>
      <body>
        <SiteChrome
          header={<Header lang={lang} c={{ nav: c.nav, models: c.models, status: c.status }} programmes={getProgrammes(lang).map(p => ({ slug: p.slug, name: p.name, title: p.title }))} />}
          footer={<Footer lang={lang} />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
