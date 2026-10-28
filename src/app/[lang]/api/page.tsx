import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NightArt } from "@/components/Art";
import { ApiCompose } from "@/components/ApiCompose";
import { ApiConsoleTour } from "@/components/ApiConsoleTour";
import { ApiRunner, Highlight } from "@/components/ApiRunner";
import { Icon } from "@/components/Icon";
import { ModelArt } from "@/components/ModelArt";
import { Reveal } from "@/components/Interactive";
import { API_DEMO, apiCopy } from "@/content/api";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";
import { apiBase } from "@/lib/public-config";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = apiCopy[l].meta;
  return { title, description, alternates: alternates(l, "/api") };
}

const MAIL = `mailto:contact@namuai.org?subject=${encodeURIComponent("Namu API")}`;

/* The anatomy of a request: a real call and Tatsuniya's real answer, then the error every client should handle.
   `n` ties a line to the note of the same number. */
function anatomy(base: string, err: string): { text: string; n?: number; gap?: boolean; resp?: boolean }[] {
  const r = API_DEMO.real;
  return [
    { text: `curl ${base}/v1/transcribe \\` },
    { text: `  -H "Authorization: Bearer $NAMU_API_KEY" \\`, n: 1 },
    { text: `  -F file=@storyteller.m4a`, n: 2 },
    { text: "", gap: true },
    { text: "HTTP/1.1 200 OK", resp: true },
    { text: "{", resp: true },
    { text: `  "model": "${r.model}",`, resp: true },
    { text: `  "text": "${r.text}",`, n: 3, resp: true },
    { text: `  "language": "${r.language}",`, resp: true },
    { text: `  "audio_seconds": ${r.audio_seconds}`, n: 4, resp: true },
    { text: "}", resp: true },
    { text: "", gap: true },
    { text: err },
    { text: "HTTP/1.1 429 Too Many Requests", n: 5, resp: true },
    { text: "Retry-After: 18", resp: true },
    { text: `{"error": {"type": "rate_limited", "message": "Too many requests for this key."}}`, resp: true },
  ];
}

/* the hooked letter in Tatsuniya's transcript, marked where it appears */
const markHooked = (s: string): ReactNode => s.split(/([ɓɗƙƴƁƊƘƳ])/).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));

/* /api, rebuilt around a live request: try it first, then the models, the way in, the request itself, products made
   of the models, the console, the beta's terms, the Lab's commitments and the questions developers ask. */
export default async function Api({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const a = apiCopy[lang];
  const L = (p: string) => (p.startsWith("http") ? p : lp(lang, p));
  const signup = `${L("/signup")}?next=${encodeURIComponent(L("/account/keys?create=1"))}`;

  return (
    <div className="page-top apx">
      <Reveal />

      {/* 1. Hero: the promise, and a real request to run */}
      <section className="apx-hero">
        <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
        <div className="wrap">
          <div className="apx-hero-head">
            <div>
              <p className="api-status"><i aria-hidden="true" />{a.status}</p>
              <h1 className="apx-display">{a.h1}</h1>
            </div>
            <div className="apx-hero-side">
              <p className="lede">{a.lede}</p>
              <div className="apx-acts">
                <a className="pill lg dark" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
                <a className="pill lg frost" href={L("/docs")}>{a.docs}</a>
              </div>
              <ul className="apx-facts">{a.facts.map(f => <li key={f}><Icon name="check" size={15} stroke={1.8} />{f}</li>)}</ul>
            </div>
          </div>
          <ApiRunner lang={lang} base={apiBase} />
        </div>
      </section>

      {/* 2. The models in the API, each a night piece of its own (after openai.com/api's starfields), then all models */}
      <section className="section apx-night" id="models" aria-labelledby="h-models">
        <div className="wrap">
          <header className="apx-head apx-night-head reveal">
            <h2 id="h-models" className="h1">{a.modelsH}</h2>
            <p className="lede">{a.modelsSub}</p>
          </header>
          <div className="apx-mcards">
            {a.models.filter(m => !m.research).map(m => (
              <a key={m.task} className="apx-mcard reveal" href={`#run-${m.task}`} aria-label={`${m.name}, ${m.job}. ${a.tryIt}`}>
                <div className="apx-mcard-art"><ModelArt model={m.task as "speech" | "transcribe" | "translate"} /></div>
                <span className="apx-mcard-status">{m.status}</span>
                <div className="apx-mcard-body">
                  <h3>{m.name}</h3>
                  <p className="apx-mcard-job">{m.job}</p>
                  <dl>
                    <div><dt>{a.labels.endpoint}</dt><dd><code>{m.endpoint}</code></dd></div>
                    <div><dt>{a.labels.langs}</dt><dd>{m.langs}</dd></div>
                    <div><dt>{a.labels.limit}</dt><dd>{m.limit}</dd></div>
                  </dl>
                  <span className="apx-mcard-try">{a.tryIt}<Icon name="arrow-long" size={16} stroke={1.6} /></span>
                </div>
              </a>
            ))}
          </div>
          <div className="apx-mcards-more reveal">
            <a className="pill lg on-dark" href={L("/#models")}>{a.allModels}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
            <p>{a.allModelsNote}</p>
          </div>
        </div>
      </section>

      {/* 3. Sign-up to first sound */}
      <section className="section apx-sec" aria-labelledby="h-steps">
        <div className="wrap">
          <header className="apx-head reveal">
            <h2 id="h-steps" className="h1">{a.stepsH}</h2>
            <p className="lede">{a.stepsSub}</p>
          </header>
          <ol className="apx-steps">
            {a.steps.map((s, i) => (
              <li key={s.t} className="apx-step reveal">
                <div className="apx-step-pic" aria-hidden="true">
                  {i === 0 && (
                    <div className="apx-door">
                      <span className="apx-door-btn"><b className="g">G</b>{a.mock.google}</span>
                      <span className="apx-door-btn"><b className="gh" />{a.mock.github}</span>
                      <span className="apx-door-or" />
                      <span className="apx-door-field">{a.mock.email}</span>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="apx-keybox">
                      <strong>{a.mock.save}</strong>
                      <span className="apx-keyfield"><code>namu_sk_k7Qm••••••••••••••••</code><span className="apx-keycopy"><Icon name="copy" size={14} stroke={1.6} /></span></span>
                      <em>{a.mock.saveNote}</em>
                      <span className="apx-keydone">{a.mock.done}</span>
                    </div>
                  )}
                  {i === 2 && (
                    <pre className="apx-term"><code>
                      <span className="hl-c">$</span> export NAMU_API_KEY=namu_sk_k7Qm…{"\n"}
                      <span className="hl-c">$</span> <span className="hl-w">curl</span> …/v1/speech \{"\n"}
                      {"    "}-d <span className="hl-s">{"'{\"text\": \"Sannu!\"}'"}</span> -o speech.wav{"\n"}
                      <span className="apx-ok"><Icon name="check" size={13} stroke={2} />{a.mock.ok}</span>
                    </code></pre>
                  )}
                </div>
                <span className="apx-step-n">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Anatomy of a request */}
      <section className="section apx-sec" aria-labelledby="h-anatomy">
        <div className="wrap">
          <header className="apx-head reveal">
            <h2 id="h-anatomy" className="h1">{a.anatomyH}</h2>
            <p className="lede">{a.anatomySub}</p>
          </header>
          <div className="apx-anat reveal">
            <figure className="apx-anat-code">
              <pre tabIndex={0}><code>
                {anatomy(apiBase, a.anatomyErr).map((l, i) => (
                  <span key={i} className={`ln${l.resp ? " resp" : ""}${l.gap ? " gap" : ""}${l.n ? ` m${l.n}` : ""}`}>
                    {l.n === 3 ? <><Highlight code={l.text.slice(0, l.text.indexOf(": ") + 2)} lang="json" /><span className="hl-s">{markHooked(l.text.slice(l.text.indexOf(": ") + 2, -1))}</span>,</>
                      : <Highlight code={l.text} lang={l.resp ? "json" : "cURL"} />}
                    {l.n && <b className="apx-pin">{l.n}</b>}{"\n"}
                  </span>
                ))}
              </code></pre>
              <figcaption><span className="apx-live-dot" aria-hidden="true" />{a.anatomyReal}</figcaption>
            </figure>
            <ol className="apx-notes">
              {a.notes.map((x, i) => <li key={x.t} className={`n${i + 1}`}><b className="apx-pin">{i + 1}</b><div><h3>{x.t}</h3><p>{x.d}</p></div></li>)}
            </ol>
          </div>
        </div>
      </section>

      {/* 5. Products made of the models */}
      <section className="section apx-sec" aria-labelledby="h-compose">
        <div className="wrap">
          <header className="apx-head reveal">
            <h2 id="h-compose" className="h1">{a.composeH}</h2>
            <p className="lede">{a.composeSub}</p>
          </header>
          <div className="reveal"><ApiCompose lang={lang} /></div>
        </div>
      </section>

      {/* 6. The console */}
      <section className="section apx-sec apx-console" aria-labelledby="h-console">
        <div className="wrap">
          <header className="apx-head split reveal">
            <div>
              <h2 id="h-console" className="h1">{a.consoleH}</h2>
              <p className="lede">{a.consoleSub}</p>
            </div>
            <ul className="apx-points">{a.consolePoints.map(p => <li key={p}><Icon name="check" size={15} stroke={1.8} />{p}</li>)}</ul>
          </header>
          <div className="reveal"><ApiConsoleTour lang={lang} /></div>
        </div>
      </section>

      {/* 7. The beta's terms, and what stands behind every endpoint */}
      <section className="section apx-sec" aria-labelledby="h-free">
        <div className="wrap apx-free">
          <div className="apx-allow reveal">
            <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
            <h2 id="h-free" className="h2">{a.freeH}</h2>
            <p className="apx-allow-sub">{a.freeSub}</p>
            <p className="apx-allow-big"><strong>{a.allowance[0]}</strong><span>{a.allowance[1]}</span></p>
            <p className="apx-allow-note">{a.allowance[2]}</p>
            <ul className="apx-limits">{a.limits.map(([v, l]) => <li key={l}><strong>{v}</strong><span>{l}</span></li>)}</ul>
            <div className="apx-acts">
              <a className="pill lg dark" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
              <a className="pill lg frost" href={MAIL}>{a.more}</a>
            </div>
            <p className="apx-allow-note">{a.pricing}</p>
          </div>
          <div className="apx-promises">
            <h2 className="h2 reveal">{a.promiseH}</h2>
            {a.promises.map((p, i) => (
              <a key={p.t} className="apx-promise reveal" href={L(p.href)}>
                <span className="apx-promise-ic" aria-hidden="true"><Icon name={i ? "consent" : "check"} size={20} stroke={1.4} /></span>
                <h3>{p.t}</h3><p>{p.d}</p>
                <span className="apx-link">{p.cta}<Icon name="arrow-long" size={14} stroke={1.6} /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Questions */}
      <section className="section apx-sec" aria-labelledby="h-faq">
        <div className="wrap apx-faq">
          <h2 id="h-faq" className="h1 reveal">{a.faqH}</h2>
          <div className="apx-faq-list reveal">
            {a.faq.map(([q, ans]) => (
              <details key={q}>
                <summary>{q}<Icon name="plus" size={18} stroke={1.5} /></summary>
                <p>{ans}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9. The way in, once more */}
      <section className="apx-end" aria-labelledby="h-end">
        <div className="apx-end-art" aria-hidden="true"><NightArt seed="api-end" ratio="wide" tone="rose" /></div>
        <div className="wrap apx-end-in">
          <h2 id="h-end" className="h1">{a.endH}</h2>
          <p className="lede">{a.endSub}</p>
          <div className="apx-acts">
            <a className="pill lg light" href={signup}>{a.start}<Icon name="arrow-long" size={18} stroke={1.6} /></a>
            <a className="pill lg on-dark" href={L("/docs")}>{a.docs}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
