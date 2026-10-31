"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { models, programmeIcon } from "@/content/site";
import { LANG_COOKIE, lp, switchPath, type Lang } from "@/i18n/config";
import type { Copy } from "@/i18n/copy";

type Menu = null | "research" | "models" | "developers" | "sheet";
type Page = null | "research" | "models" | "developers";
type Props = { lang: Lang; c: Pick<Copy, "nav" | "models" | "status">; programmes: { slug: string; name: string; title: string }[] };

/** EN · FR. Remembers the visitor's choice so the country-based default never overrides it. */
export function LangSwitch({ lang, label, className = "lang-switch" }: { lang: Lang; label: string; className?: string }) {
  const path = usePathname() || "/";
  const remember = (to: Lang) => { document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`; };
  return (
    <nav className={className} aria-label={label}>
      {(["en", "fr"] as const).map(l => (
        <a key={l} href={switchPath(path, l)} hrefLang={l} lang={l} aria-current={l === lang ? "true" : undefined}
          title={l === "en" ? "English" : "Français"} onClick={() => remember(l)}>{l.toUpperCase()}</a>
      ))}
    </nav>
  );
}

/* DeepMind-pattern header: transparent over the hero, a white frosted bar once the page scrolls, and
   mega menus that drop a white sheet with icon rows. On small screens a sidebar button (openai.com's
   pattern) opens a full-screen menu of large links; Research and Models open their own page in it. */
export function Header({ lang, c, programmes }: Props) {
  const raw = usePathname() || "/";
  const path = raw.replace(/^\/(en|fr)(?=\/|$)/, "") || "/";
  const [menu, setMenu] = useState<Menu>(null);
  const [page, setPage] = useState<Page>(null);   // the small-screen menu's open section
  const [back, setBack] = useState(false);                                // which way its pages slide
  const [solid, setSolid] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const overHero = path === "/" || path === "/api";   // pages whose hero runs up behind the bar
  const L = (p: string) => lp(lang, p);
  const n = c.nav;

  useEffect(() => { setMenu(null); }, [raw]);
  useEffect(() => { if (menu !== "sheet") { setPage(null); setBack(false); } }, [menu]);
  useEffect(() => {
    const on = () => setSolid(!overHero || window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [overHero]);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    const click = (e: MouseEvent) => { if (bar.current && !e.composedPath().includes(bar.current)) setMenu(null); };
    document.addEventListener("keydown", key); document.addEventListener("click", click);
    document.body.style.overflow = menu === "sheet" ? "hidden" : "";
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("click", click); document.body.style.overflow = ""; };
  }, [menu]);

  const toggle = (m: Menu) => setMenu(cur => (cur === m ? null : m));
  const open = (p: Page) => { setBack(p === null); setPage(p); };
  const onFilm = path === "/api" && !solid && !menu;   // /api's hero is a film: the bar reads white on it
  const cls = ["hdr", solid ? "solid" : "", menu ? "open" : "", onFilm ? "on-film" : ""].join(" ");
  const ha = (s: string) => (/[ɗʼ]/.test(s) ? "ha" : undefined);

  return (
    <header ref={bar} className={cls}>
      <a className="skip" href="#main">{n.skip}</a>
      <div className="wrap">
        <a className="brand" href={L("/")} aria-label="Namu AI Lab"><Logo className="mark" /></a>
        <nav className="nav" aria-label="Main">
          <button type="button" aria-expanded={menu === "research"} aria-controls="mega-research" onClick={() => toggle("research")}>{n.research} <Icon name="chevron" size={14} stroke={1.6} /></button>
          <button type="button" aria-expanded={menu === "models"} aria-controls="mega-models" onClick={() => toggle("models")}>{n.models} <Icon name="chevron" size={14} stroke={1.6} /></button>
          <button type="button" aria-expanded={menu === "developers"} aria-controls="mega-developers" onClick={() => toggle("developers")}>{n.developers} <Icon name="chevron" size={14} stroke={1.6} /></button>
          <a href={L("/organisations")} aria-current={path.startsWith("/organisations") ? "page" : undefined}>{n.organisations}</a>
        </nav>
        <LangSwitch lang={lang} label={n.language} />
        <div className="hdr-cta">
          <a className="pill parent" href="https://www.namu-ai.org">namu-ai.org</a>
          <a className="hdr-login" href={L("/login")}>{n.logIn}</a>
          <a className="pill dark" href={L("/signup")}>{n.startBuilding}</a>
        </div>
        <button className="menu-toggle" type="button" aria-expanded={menu === "sheet"} aria-controls="sheet" aria-label={menu === "sheet" ? n.closeMenu : n.openMenu} onClick={() => toggle("sheet")}>
          <Icon name={menu === "sheet" ? "sidebar-open" : "sidebar"} size={22} stroke={1.5} />
        </button>
      </div>

      <div id="mega-research" className="mega" hidden={menu !== "research"}>
        <div className="wrap">
          <div className="mega-intro">
            <p className="h3">{n.research}</p>
            <p>{n.researchIntro}</p>
            <a className="pill dark" href={L("/research")}>{n.exploreResearch}</a>
          </div>
          <div className="mega-list">
            {programmes.map(p => (
              <a key={p.slug} className="mega-item" href={L(`/programmes/${p.slug}`)}>
                <span className="ic"><Icon name={programmeIcon[p.slug] ?? "programme"} size={22} stroke={1.4} /></span>
                <span><b lang={ha(p.name)}>{p.name}</b><span>{p.title}</span></span>
              </a>
            ))}
            <a className="mega-item" href={L("/research#latest")}>
              <span className="ic"><Icon name="paper" size={22} stroke={1.4} /></span>
              <span><b>{n.latest}</b><span>{n.latestSub}</span></span>
            </a>
          </div>
        </div>
      </div>

      <div id="mega-models" className="mega" hidden={menu !== "models"}>
        <div className="wrap">
          <div className="mega-intro">
            <p className="h3">{n.models}</p>
            <p>{n.modelsIntro}</p>
            <a className="pill dark" href={L("/#models")}>{n.viewModels}</a>
          </div>
          <div className="mega-list">
            {models.map(m => (
              <a key={m.slug} className="mega-item" href={L(m.href)}>
                <span className="ic"><Icon name={m.icon} size={22} stroke={1.4} /></span>
                <span><b>{m.name}</b><span>{c.models[m.slug]?.line ?? m.line}</span></span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div id="mega-developers" className="mega" hidden={menu !== "developers"}>
        <div className="wrap">
          <div className="mega-intro">
            <p className="h3">{n.developers}</p>
            <p>{n.devIntro}</p>
            <a className="pill dark" href={L("/api")}>{n.devCta}</a>
          </div>
          <div className="mega-list">
            <a className="mega-item" href={L("/api")} aria-current={path.startsWith("/api") ? "page" : undefined}>
              <span className="ic"><Icon name="code" size={22} stroke={1.4} /></span>
              <span><b>{n.apiPlatform}</b><span>{n.apiPlatformSub}</span></span>
            </a>
            {/* The SDK page is not built yet: shown, not linked. */}
            <div className="mega-item soon" aria-disabled="true">
              <span className="ic"><Icon name="download" size={22} stroke={1.4} /></span>
              <span><b>{n.sdks}<em>{n.soon}</em></b><span>{n.sdksSub}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div id="sheet" className="sheet" hidden={menu !== "sheet"}>
        {page === null && (
          <div className={`sheet-page${back ? " from-left" : ""}`} key="root">
            <nav className="sheet-main" aria-label="Main">
              <button type="button" onClick={() => open("research")}>{n.research}<Icon name="chevron" size={18} stroke={1.6} className="rot-90" /></button>
              <button type="button" onClick={() => open("models")}>{n.models}<Icon name="chevron" size={18} stroke={1.6} className="rot-90" /></button>
              <button type="button" onClick={() => open("developers")}>{n.developers}<Icon name="chevron" size={18} stroke={1.6} className="rot-90" /></button>
              <a href={L("/organisations")} aria-current={path.startsWith("/organisations") ? "page" : undefined}>{n.organisations}</a>
            </nav>
            <div className="sheet-more">
              <a className="pill dark" href={L("/signup")}>{n.startBuilding}</a>
              <a className="pill" href={L("/login")}>{n.logIn}</a>
              <a className="pill" href="https://www.namu-ai.org">namu-ai.org <Icon name="external" size={16} stroke={1.6} /></a>
            </div>
          </div>
        )}
        {page !== null && (
          <div className="sheet-page from-right" key={page}>
            <button className="sheet-back" type="button" onClick={() => open(null)}><Icon name="arrow-back" size={20} stroke={1.6} />{n.menu}</button>
            <p className="sheet-label">{page === "research" ? n.research : page === "models" ? n.models : n.developers}</p>
            {page === "research" ? (
              <>
                <nav className="sheet-main" aria-label={n.research}>
                  <a href={L("/research")}>{n.overview}</a>
                  {programmes.map(p => <a key={p.slug} href={L(`/programmes/${p.slug}`)} lang={ha(p.name)}>{p.name}</a>)}
                </nav>
                <p className="sheet-label">{n.latest}</p>
                <div className="sheet-small"><a href={L("/research#latest")}>{n.latestSub}</a></div>
              </>
            ) : page === "models" ? (
              <nav className="sheet-main" aria-label={n.models}>
                {models.map(m => <a key={m.slug} href={L(m.href)}>{m.name}</a>)}
              </nav>
            ) : (
              <nav className="sheet-main" aria-label={n.developers}>
                <a href={L("/api")}>{n.apiPlatform}</a>
                <span className="soon" aria-disabled="true">{n.sdks}<em>{n.soon}</em></span>
              </nav>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
