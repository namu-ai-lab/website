import type { Metadata } from "next";
import Image from "next/image";
import { ApiModels } from "@/components/api/ApiModels";
import { CareArt, StepArt } from "@/components/api/ApiArt";
import { ApiShowcase, RestingOrb } from "@/components/api/ApiShowcase";
import type { CodeLang } from "@/components/CodeTabs";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { apiCopy, type ApiTask } from "@/content/api";
import { samples } from "@/content/docs";
import { voices } from "@/content/playground";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { apiBase } from "@/lib/public-config";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = apiCopy[l].meta;
  return { title, description, alternates: alternates(l, "/api") };
}

/* a hyphenated word in a heading stays on one line ("sign-up", not "sign- / up") */
const whole = (s: string) => s.split(/(\S+-\S+)/).map((p, i) => (i % 2 ? <span key={i} className="ax-nw">{p}</span> : p));

const MAIL = `mailto:contact@namuai.org?subject=${encodeURIComponent("Namu API")}`;

/* /api, after elevenlabs.io: one framed column with hairline rules; the promise and a showcase of every model's real
   output; the models as API rows with their code; the way in; the console; the beta's terms; the Lab's commitments;
   questions; and the way in once more. */
export default async function Api({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const a = apiCopy[lang];
  const L = (p: string) => lp(lang, p);
  const signup = `${L("/signup")}?next=${encodeURIComponent(L("/account/keys?create=1"))}`;
  const code = samples(apiBase) as Record<ApiTask, Record<CodeLang, string>>;
  const more = (label: string, href: string) => <a className="ax-link" href={href}>{label}<Icon name="arrow-long" size={15} stroke={1.6} /></a>;

  return (
    <div className="page-top ax">
      <Reveal />
      <div className="ax-frame">

        {/* 1. The promise, and every model's real output */}
        <section className="ax-hero" aria-labelledby="h-api">
          <div className="ax-hero-head">
            <div>
              <p className="ax-eyebrow"><i aria-hidden="true" />{a.eyebrow}</p>
              <h1 id="h-api" className="ax-display">{a.h1}</h1>
            </div>
            <div className="ax-hero-side">
              <p className="ax-lede">{a.lede}</p>
              <div className="ax-acts">
                <a className="pill lg dark" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
                <a className="pill lg" href={L("/docs")}>{a.docs}</a>
              </div>
            </div>
          </div>
          <ApiShowcase lang={lang} signup={signup} liveHref={`${L("/")}#try`} />
          <p className="ax-cap"><i aria-hidden="true" />{a.show.recorded}</p>
        </section>

        <ul className="ax-proof" aria-label={a.eyebrow}>
          {a.proof.map(([v, l]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}
        </ul>

        {/* 2. The models, each with its request */}
        <section className="ax-sec" id="models" aria-labelledby="h-models">
          <header className="ax-head reveal">
            <div><p className="ax-kick">{a.modelsEyebrow}</p><h2 id="h-models" className="ax-h2">{whole(a.modelsH)}</h2></div>
            <div><p className="ax-sub">{a.modelsSub}</p>{more(a.modelsCta, L("/docs"))}</div>
          </header>
          <div className="reveal">
            <ApiModels copy={a} code={code} docs={{ speech: L("/docs#speech"), transcribe: L("/docs#transcribe"), translate: L("/docs#translate"), converse: L("/docs#converse") }} />
          </div>
        </section>

        {/* 3. Sign-up to first sound */}
        <section className="ax-sec" aria-labelledby="h-steps">
          <header className="ax-head reveal">
            <div><p className="ax-kick">{a.stepsEyebrow}</p><h2 id="h-steps" className="ax-h2">{whole(a.stepsH)}</h2></div>
            <div><p className="ax-sub">{a.stepsSub}</p></div>
          </header>
          <ol className="ax-grid ax-steps">
            {a.steps.map((s, i) => (
              <li key={s.t} className="ax-card reveal">
                <div className="ax-card-pic" aria-hidden="true"><StepArt step={i} mock={a.mock} /></div>
                <div className="ax-card-text"><span className="ax-n">{i + 1}</span><h3>{s.t}</h3><p>{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. The console */}
        <section className="ax-sec" aria-labelledby="h-console">
          <header className="ax-head reveal">
            <div><p className="ax-kick">{a.consoleEyebrow}</p><h2 id="h-console" className="ax-h2">{whole(a.consoleH)}</h2></div>
            <div><p className="ax-sub">{a.consoleSub}</p>{more(a.consoleCta, L("/account"))}</div>
          </header>
          <div className="ax-grid ax-console">
            {(["home", "usage"] as const).map(id => (
              <figure key={id} className={`ax-card ax-shot ${id} reveal`}>
                <Image src={`/api/console-${id}.jpg`} alt={a.consoleShots[id]} width={2160} height={1350}
                  sizes={id === "home" ? "(max-width: 900px) 100vw, 800px" : "(max-width: 900px) 100vw, 480px"} />
              </figure>
            ))}
            {a.consoleCards.map(c => (
              <div key={c.t} className="ax-card ax-feat reveal">
                <span className="ax-feat-ic" aria-hidden="true"><Icon name={c.icon} size={20} stroke={1.5} /></span>
                <h3>{c.t}</h3><p>{c.d}</p>
              </div>
            ))}
          </div>
          <p className="ax-note">{a.consoleNote}</p>
        </section>

        {/* 5. The beta's terms */}
        <section className="ax-sec" aria-labelledby="h-free">
          <header className="ax-head reveal">
            <div><p className="ax-kick">{a.betaEyebrow}</p><h2 id="h-free" className="ax-h2">{whole(a.freeH)}</h2></div>
            <div><p className="ax-sub">{a.freeSub}</p></div>
          </header>
          <div className="ax-price reveal">
            <div className="ax-allow">
              <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
              <p className="ax-allow-big"><strong>{a.allowance[0]}</strong><span>{a.allowance[1]}</span></p>
              <p className="ax-allow-note">{a.allowance[2]}</p>
              <div className="ax-acts">
                <a className="pill lg dark" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
                <a className="pill lg frost" href={MAIL}>{a.more}</a>
              </div>
            </div>
            <ul className="ax-limits">{a.limits.map(([v, l]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}</ul>
          </div>
          <p className="ax-note">{a.pricing}</p>
        </section>

        {/* 6. What stands behind every endpoint */}
        <section className="ax-sec" aria-labelledby="h-care">
          <header className="ax-head reveal">
            <div><p className="ax-kick">{a.careEyebrow}</p><h2 id="h-care" className="ax-h2">{whole(a.careH)}</h2></div>
            <div><p className="ax-sub">{a.careSub}</p></div>
          </header>
          <div className="ax-grid ax-care">
            {a.care.map((c, i) => (
              <a key={c.t} className="ax-card ax-care-card reveal" href={L(c.href)}>
                <div className="ax-card-pic"><CareArt i={i} /></div>
                <div className="ax-card-text"><h3>{c.t}</h3><p>{c.d}</p><span className="ax-link">{c.cta}<Icon name="arrow-long" size={15} stroke={1.6} /></span></div>
              </a>
            ))}
          </div>
        </section>

        {/* 7. Questions */}
        <section className="ax-sec ax-faq" aria-labelledby="h-faq">
          <div className="ax-faq-head reveal">
            <h2 id="h-faq" className="ax-h2">{whole(a.faqH)}</h2>
            {more(a.more, MAIL)}
          </div>
          <div className="ax-faq-list reveal">
            {a.faq.map(([q, ans]) => (
              <details key={q}>
                <summary>{q}<Icon name="plus" size={18} stroke={1.5} /></summary>
                <p>{ans}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 8. The way in, once more */}
        <section className="ax-sec ax-end" aria-labelledby="h-end">
          <div className="ax-end-orb" aria-hidden="true"><RestingOrb palette={voices[lang][0].palette} /></div>
          <h2 id="h-end" className="ax-display">{a.endH}</h2>
          <p className="ax-lede">{a.endSub}</p>
          <div className="ax-acts">
            <a className="pill lg dark" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
            <a className="pill lg" href={L("/docs")}>{a.docs}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
