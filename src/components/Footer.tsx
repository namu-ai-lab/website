import { FooterShapes } from "./FooterShapes";
import { LangSwitch } from "./Header";
import { Logo } from "./Logo";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";

const PARTNER = `mailto:contact@namuai.org?subject=${encodeURIComponent("Partner with Namu")}`;

type Link = { label: string; href?: string; soon?: string; external?: boolean };

/* After labs.google's footer, in Namu's own terms: a pile of Namu's shapes to play with, resting on the top line,
   with the Lab's GitHub, LinkedIn, X, Instagram and email among them (the bar above already lists the sections);
   one row of what to do (Get started); the Lab's name set across the whole width; and the parent company's row
   in small capitals. */
export function Footer({ lang }: { lang: Lang }) {
  const c = copy[lang], f = c.footer, n = c.nav;
  const L = (p: string) => lp(lang, p);
  /* what to do: the same two ways in as the Get started band above, organisations first */
  const start: Link[] = [
    { label: f.partner, href: PARTNER }, { label: n.apiPlatform, href: L("/api") }, { label: n.docs, href: L("/docs") },
    { label: n.apiKeys, href: L("/account/keys") }, { label: n.sdks, soon: n.soon },
  ];
  return (
    <footer className="ftr">
      <div className="wrap"><FooterShapes follow={f.follow} email={f.email} /></div>
      <div className="wrap">
        <div className="ftr-row">
          <h2>{f.start}</h2>
          <ul>{start.map(l => (
            <li key={l.label}>{l.href ? <a href={l.href}>{l.label}</a> : <span className="off">{l.label}<em>{l.soon}</em></span>}</li>
          ))}</ul>
        </div>
      </div>
      <p className="ftr-word" aria-hidden="true">namu ai lab</p>
      <div className="wrap">
        <div className="ftr-base">
          <a className="parent" href="https://www.namu-ai.org" aria-label="Namu"><Logo className="mark" id="lg-ftr-base" /></a>
          <nav className="ftr-legal" aria-label="Namu">
            <a href="https://www.namu-ai.org">{f.aboutNamu}</a>
            <a href="https://www.namu-ai.org/privacy">{f.privacy}</a>
            <a href="https://www.namu-ai.org/terms">{f.terms}</a>
          </nav>
          <LangSwitch lang={lang} label={n.language} />
          <small>© 2026 Namu</small>
        </div>
      </div>
    </footer>
  );
}
