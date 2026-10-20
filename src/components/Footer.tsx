import { LangSwitch } from "./Header";
import { Logo } from "./Logo";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";

const GitHub = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>;
const Mail = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;

const GITHUB = "https://github.com/namu-ai-lab";
const CONTACT = "mailto:contact@namuai.org";
const PARTNER = `mailto:contact@namuai.org?subject=${encodeURIComponent("Partner with Namu")}`;

type Link = { label: string; href?: string; soon?: string; external?: boolean };

/* Four voices, each a line in one of the voice orbs' colours, weaving across the top of the footer. Every
   wavelength divides the period (1440), so a strip two periods long can slide by one period and loop. */
const PERIOD = 1440, HEIGHT = 120;
const VOICES: { colour: string; parts: [number, number, number][]; y: number; dur: number }[] = [
  { colour: "#f0884f", parts: [[16, 2, 0.3], [7, 5, 1.9]], y: 58, dur: 38 },
  { colour: "#ec6b80", parts: [[14, 3, 2.1], [6, 4, 0.4]], y: 62, dur: 46 },
  { colour: "#ffbe48", parts: [[12, 2, 4.0], [8, 6, 2.6]], y: 60, dur: 54 },
  { colour: "#7c9bd2", parts: [[18, 3, 5.2], [5, 8, 1.1]], y: 64, dur: 42 },
];
const voicePath = (v: (typeof VOICES)[number]) => {
  let d = "";
  for (let x = 0; x <= PERIOD * 2; x += 12) {
    const y = v.y + v.parts.reduce((sum, [amp, k, ph]) => sum + amp * Math.sin((2 * Math.PI * k * x) / PERIOD + ph), 0);
    d += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
  }
  return d;
};

/* After labs.google's footer, in Namu's own terms: four voices weaving across the top in the orbs' colours;
   one row of where to go (the bar's sections) with the ways to reach us; one row of what to do (Get started);
   the Lab's name set across the whole width; and the parent company's row in small capitals. */
export function Footer({ lang }: { lang: Lang }) {
  const c = copy[lang], f = c.footer, n = c.nav;
  const L = (p: string) => lp(lang, p);
  /* where to go, in the bar's order (Organisations has no page yet, so About and Careers take its place) */
  const top: Link[] = [
    { label: f.research, href: L("/research") }, { label: f.models, href: L("/#models") }, { label: n.developers, href: L("/api") },
    { label: f.data, href: L("/data") }, { label: f.about, href: L("/about") }, { label: f.careers, href: L("/about#careers") },
  ];
  /* what to do: the same two ways in as the Get started band above, organisations first */
  const start: Link[] = [
    { label: f.partner, href: PARTNER }, { label: n.apiPlatform, href: L("/api") }, { label: n.docs, href: L("/docs") },
    { label: n.apiKeys, href: L("/account/keys") }, { label: n.sdks, soon: n.soon },
  ];
  return (
    <footer className="ftr">
      <div className="ftr-voices" aria-hidden="true">
        {VOICES.map(v => (
          <svg key={v.colour} viewBox={`0 0 ${PERIOD * 2} ${HEIGHT}`} preserveAspectRatio="none" style={{ animationDuration: `${v.dur}s` }}>
            <path d={voicePath(v)} stroke={v.colour} />
          </svg>
        ))}
      </div>
      <div className="wrap">
        <div className="ftr-top">
          <a className="ftr-brand" href={L("/")} aria-label="Namu AI Lab"><Logo className="mark" id="lg-ftr" /></a>
          <nav className="ftr-nav" aria-label={f.lab}>{top.map(l => <a key={l.label} href={l.href}>{l.label}</a>)}</nav>
          <div className="ftr-social">
            <a href={GITHUB} aria-label="GitHub" target="_blank" rel="noopener"><GitHub /></a>
            <a href={CONTACT} aria-label={f.contact}><Mail /></a>
          </div>
        </div>
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
