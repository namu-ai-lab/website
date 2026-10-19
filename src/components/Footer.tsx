import { HeroRing } from "./Art";
import { LangSwitch } from "./Header";
import { Logo } from "./Logo";
import { models } from "@/content/site";
import { getProgrammes } from "@/content";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";

const GitHub = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>;

const GITHUB = "https://github.com/namu-ai-lab";
const PARTNER = `mailto:contact@namuai.org?subject=${encodeURIComponent("Partner with Namu")}`;

type Link = { label: string; href?: string; soon?: string; external?: boolean };

/* The page ends at dusk. The footer carries on the Ink of the Get started band; its columns follow the bar's
   order (Research, Models, then Developers and Organisations as "Get started", then Data and the rest as
   "The Lab"), so every item in the bar has its place here; and the Blossom ring that rises in the hero's
   morning haze sets on the footer's horizon. The last row is the parent company's, as on deepmind.google. */
export function Footer({ lang }: { lang: Lang }) {
  const c = copy[lang], f = c.footer, n = c.nav;
  const L = (p: string) => lp(lang, p);
  const cols: { title: string; links: Link[] }[] = [
    { title: f.research, links: [{ label: n.overview, href: L("/research") }, ...getProgrammes(lang).map(p => ({ label: p.name, href: L(`/programmes/${p.slug}`) })), { label: f.news, href: L("/research#latest") }] },
    { title: f.models, links: models.map(m => ({ label: m.name, href: L(m.href) })) },
    { title: f.start, links: [{ label: f.partner, href: PARTNER }, { label: n.apiPlatform, href: L("/api") }, { label: n.sdks, soon: n.soon }, { label: f.github, href: GITHUB, external: true }] },
    { title: f.lab, links: [{ label: f.about, href: L("/about") }, { label: f.data, href: L("/data") }, { label: f.careers, href: L("/about#careers") }, { label: f.contact, href: "mailto:contact@namuai.org" }] },
  ];
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-top">
          <p className="tag">{f.tag}</p>
          <div className="follow">
            <span>{f.follow}</span>
            <a href={GITHUB} aria-label="GitHub"><GitHub /></a>
          </div>
        </div>
        <div className="ftr-cols">
          {cols.map(col => (
            <div key={col.title} className="ftr-col">
              <h2>{col.title}</h2>
              <ul>{col.links.map(l => (
                <li key={l.label}>
                  {l.href
                    ? <a href={l.href} lang={/[ɗʼ]/.test(l.label) ? "ha" : undefined} {...(l.external ? { target: "_blank", rel: "noopener" } : {})}>{l.label}{l.external && <span aria-hidden="true"> ↗</span>}</a>
                    : <span className="off">{l.label}<em>{l.soon}</em></span>}
                </li>
              ))}</ul>
            </div>
          ))}
        </div>
        <div className="ftr-base">
          <a className="parent" href="https://www.namu-ai.org" aria-label="Namu"><Logo className="mark" id="lg-ftr" /></a>
          <nav aria-label="Namu"><a href="https://www.namu-ai.org">{f.aboutNamu}</a><a href="https://www.namu-ai.org/privacy">{f.privacy}</a><a href="https://www.namu-ai.org/terms">{f.terms}</a></nav>
          <LangSwitch lang={lang} label={n.language} />
          <small>© 2026 Namu</small>
        </div>
      </div>
      <div className="ftr-horizon" aria-hidden="true"><HeroRing id="hr-ftr" /></div>
    </footer>
  );
}
