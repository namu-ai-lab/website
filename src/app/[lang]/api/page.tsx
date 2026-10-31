import type { Metadata } from "next";
import Image from "next/image";
import { ApiFilm } from "@/components/api/ApiFilm";
import { ApiStudio } from "@/components/api/ApiStudio";
import type { CodeLang } from "@/components/CodeTabs";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { STUDIO, apiCopy, type ApiTask } from "@/content/api";
import { samples } from "@/content/docs";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { apiBase } from "@/lib/public-config";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = apiCopy[l].meta;
  return { title, description, alternates: alternates(l, "/api") };
}

const MAIL = `mailto:contact@namuai.org?subject=${encodeURIComponent("Namu API")}`;

/* /api, direction A "The storyteller": the promise over real film, the studio to try every model, then a few calm
   moments (the models, the console, the beta, questions) and the way in, centred. */
export default async function Api({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const a = apiCopy[lang];
  const L = (p: string) => lp(lang, p);
  const signup = `${L("/signup")}?next=${encodeURIComponent(L("/account/keys?create=1"))}`;
  const code = samples(apiBase, { text: STUDIO.sentence, voice: STUDIO.voice }) as Record<ApiTask, Record<CodeLang, string>>;
  const arrow = <Icon name="arrow-long" size={18} stroke={1.6} />;

  return (
    <div className="ax">
      <Reveal />

      <section className="ax-hero" aria-labelledby="h-api">
        <ApiFilm />
        <div className="ax-hero-copy">
          <h1 id="h-api">{a.h1}</h1>
          <p>{a.lede}</p>
          <div className="ax-acts">
            <a className="pill lg ax-white" href={signup}>{a.start}{arrow}</a>
            <a className="pill lg ax-glass" href={L("/docs")}>{a.docs}</a>
          </div>
        </div>
      </section>

      <div className="ax-studio-wrap">
        <ApiStudio lang={lang} code={code} liveHref={`${L("/")}#try`} />
      </div>

      <section className="ax-sec" aria-labelledby="h-models">
        <h2 id="h-models" className="ax-h2 reveal">{a.modelsH}</h2>
        <ul className="ax-models reveal">
          {a.models.map(m => (
            <li key={m.task}>
              <a href={L(`/docs#${m.task}`)}>
                <b>{m.name}</b>
                <span>{m.job}</span>
                <span>{m.langs}</span>
                <span className="ax-muted">{m.status}</span>
                <Icon name="arrow-long" size={18} stroke={1.5} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="ax-sec" aria-labelledby="h-console">
        <h2 id="h-console" className="ax-h2 reveal">{a.consoleH}</h2>
        <figure className="ax-console reveal">
          <Image src="/api/console-home.jpg" alt={a.consoleAlt} width={2160} height={1350} sizes="(max-width: 1240px) 100vw, 1180px" />
        </figure>
        <div className="ax-acts ax-center reveal"><a className="pill lg" href={L("/account")}>{a.consoleCta}</a></div>
      </section>

      <section className="ax-sec" aria-labelledby="h-free">
        <h2 id="h-free" className="ax-h2 reveal">{a.freeH}</h2>
        <p className="ax-allow reveal"><strong>{a.allowance[0]}</strong><span>{a.allowance[1]}</span></p>
        <ul className="ax-limits reveal">{a.limits.map(([v, l]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}</ul>
        <div className="ax-acts ax-center reveal">
          <a className="pill lg dark" href={signup}>{a.start}{arrow}</a>
          <a className="pill lg" href={MAIL}>{a.more}</a>
        </div>
        <p className="ax-note reveal">{a.pricing}</p>
      </section>

      <section className="ax-sec" aria-labelledby="h-faq">
        <h2 id="h-faq" className="ax-h2 reveal">{a.faqH}</h2>
        <div className="ax-faq reveal">
          {a.faq.map(([q, ans]) => (
            <details key={q}>
              <summary>{q}<Icon name="plus" size={18} stroke={1.5} /></summary>
              <p>{ans}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ax-end" aria-labelledby="h-end">
        <h2 id="h-end" className="reveal">{a.endH}</h2>
        <div className="ax-acts ax-center reveal">
          <a className="pill lg dark" href={signup}>{a.start}{arrow}</a>
          <a className="pill lg" href={L("/docs")}>{a.docs}</a>
        </div>
      </section>
    </div>
  );
}
