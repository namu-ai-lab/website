import { FooterShapes } from "./FooterShapes";
import { LangSwitch } from "./Header";
import { Logo } from "./Logo";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";

const PARTNER = `mailto:contact@namuai.org?subject=${encodeURIComponent("Partner with Namu")}`;

/* the Lab's code and Namu's accounts (as namu-ai.org lists them), and the address to write to */
const SOCIALS = [
  { label: "GitHub", href: "https://github.com/namu-ai-lab", icon: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg> },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/namu-a", icon: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.05c.53-1 1.84-2.04 3.78-2.04 4.04 0 4.79 2.66 4.79 6.12V21h-4v-4.96c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z" /></svg> },
  { label: "X", href: "https://x.com/namuai", icon: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.17h1.7L7.4 4.73H5.57l11.1 14.44Z" /></svg> },
  { label: "Instagram", href: "https://www.instagram.com/namuai.inc", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.2" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" /></svg> },
] as const;
const MAIL = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;

/* After labs.google's footer, in Namu's own terms: a pile of the Lab's own things (greetings in its four languages, the objects its names come from),
   resting on the top line; a row of ways in (Get started: build on the API, partner with Namu, read the research, meet the models) and
   a row of where to follow the Lab, in labs.google's outlined circles; the Lab's name set across the whole width;
   and the parent company's row in small capitals. */
export function Footer({ lang }: { lang: Lang }) {
  const c = copy[lang], f = c.footer, n = c.nav;
  const L = (p: string) => lp(lang, p);
  return (
    <footer className="ftr">
      <div className="wrap"><FooterShapes /></div>
      <div className="wrap">
        <div className="ftr-row">
          <h2>{f.start}</h2>
          <ul>
            <li><a className="ftr-api" href={L("/api")}>{n.apiPlatform}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></a></li>
            <li><a href={PARTNER}>{f.partner}</a></li>
            <li><a href={L("/research")}>{f.research}</a></li>
            <li><a href={L("/#models")}>{f.models}</a></li>
          </ul>
        </div>
      </div>
      <div className="ftr-sign">
        <p className="ftr-word" aria-hidden="true">namu ai lab</p>
        {/* the Lab's name speaks: a bubble off the end of it holds where to find the Lab */}
        <nav className="ftr-say" aria-label={f.follow}>
          {SOCIALS.map(x => <a key={x.label} href={x.href} aria-label={x.label} target="_blank" rel="noopener">{x.icon}</a>)}
          <a href="mailto:contact@namuai.org" aria-label={f.email}>{MAIL}</a>
        </nav>
      </div>
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
