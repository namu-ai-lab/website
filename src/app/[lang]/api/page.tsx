import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { GlassArt, NightArt } from "@/components/Art";
import { ApiStudio } from "@/components/ApiStudio";
import { ApiUseCases } from "@/components/ApiUseCases";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Interactive";
import { apiCopy, type ApiCopy } from "@/content/api";
import { isLang, lp, type Lang } from "@/i18n/config";
import { alternates } from "@/i18n/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = apiCopy[l].meta;
  return { title, description, alternates: alternates(l, "/api") };
}

const mail = (subject: string) => `mailto:contact@namuai.org?subject=${encodeURIComponent(subject)}`;
const TALK = mail("Namu API");

/* HA-REVIEW: the Hausa lines in the mock-ups below were written for this preview. */
const HA = {
  market: "Ina so in sayi gero a kasuwa gobe da safe.",
  news: "Barka da safiya! Ga labaran yau daga Yamai da Kano.",
  tale: "Gatanan, gatananku!",
  prices: "Farashin gero a kasuwar Maraɗi ya sauka kaɗan a wannan mako.",
  greet: "Sannu Aïr, ina kwana?",
  reply: "Lafiya lau! Me kake so mu tattauna yau?",
};
const FR = { market: "Je voudrais acheter du mil au marché demain matin." };

/* A glass voice orb, the same family as the home page console's. */
const Orb = ({ c, size, on }: { c: [string, string, string]; size: number; on?: boolean }) => (
  <span className={`orb${on ? " live" : ""}`} style={{ width: size, ["--c1" as string]: c[0], ["--c2" as string]: c[1], ["--c3" as string]: c[2] } as CSSProperties}>
    <span className="swirl" aria-hidden="true" /><span className="gloss" aria-hidden="true" />
  </span>
);
const Bars = ({ n = 24, h = 18 }: { n?: number; h?: number }) => (
  <span className="mk-bars" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} style={{ height: Math.max(3, Math.round(h * (.25 + .75 * Math.abs(Math.sin(i * 1.3) * Math.cos(i * .41 + 1))))) }} />)}</span>
);

/* The three platform pictures: a transcript, a voice picker, a live call. */
function pillarMocks(a: ApiCopy): ReactNode[] {
  const m = a.mock;
  return [
    <div key="l" className="mk mk-card">
      <div className="mk-row"><span className="mk-label">{m.transcript}</span><span className="mk-seg"><b>{m.strict}</b><span>{m.folded}</span></span></div>
      <p className="mk-big" lang="ha">{HA.news}</p>
      <div className="mk-row mk-foot"><Icon name="waveform" size={16} stroke={1.5} /><Bars n={30} h={16} /></div>
    </div>,
    <div key="s" className="mk mk-voices">
      <div className="mk-orbs"><Orb c={["#7a4325", "#f6b48a", "#1c1410"]} size={56} /><span className="mk-ring"><Orb c={["#f29a5f", "#ffd8b8", "#b4552a"]} size={104} on /><span className="mk-play"><Icon name="play" size={16} stroke={1.8} /></span></span><Orb c={["#ffd27f", "#fff1d6", "#e8935a"]} size={56} /></div>
      <p className="mk-voice"><b>{m.voice}</b><span>{m.voiceNote}</span></p>
    </div>,
    <div key="c" className="mk mk-call">
      <div className="mk-row"><span className="mk-live"><i />{m.live}</span><span className="mk-label">Aïr</span></div>
      <p className="mk-bubble you" lang="ha"><small>{m.you}</small>{HA.greet}</p>
      <p className="mk-bubble air" lang="ha"><small>Aïr</small>{HA.reply}</p>
    </div>,
  ];
}

/* The use-case mock-ups, one per use case, in order. */
function useMocks(a: ApiCopy): ReactNode[] {
  const u = a.uses;
  return [
    <div key="0" className="mk mk-card narrow">
      <div className="mk-row"><span className="mk-live"><i />{u[0].label}</span><span className="mk-label">00:42</span></div>
      <p className="mk-big" lang="ha">{HA.market}</p><p className="mk-gloss">{u[0].gloss}</p>
      <div className="mk-row mk-foot"><Icon name="phone-voice" size={16} stroke={1.5} /><Bars n={26} h={16} /></div>
    </div>,
    <div key="1" className="mk mk-video">
      <div className="mk-screen"><NightArt seed="api-caption" ratio="wide" /><span className="mk-caption" lang="ha">{HA.news}</span></div>
      <div className="mk-row"><span className="mk-label">{u[1].label}</span><span className="mk-label">06:00</span></div>
    </div>,
    <div key="2" className="mk mk-card narrow">
      <div className="mk-row"><span className="mk-label">{u[2].label}</span><Icon name="volume" size={16} stroke={1.5} /></div>
      <p className="mk-huge" lang="ha">{HA.tale}</p><p className="mk-gloss">{u[2].gloss}</p>
    </div>,
    <div key="3" className="mk mk-card narrow">
      <div className="mk-row"><span className="mk-live"><i />{u[3].label}</span><Icon name="headphones" size={16} stroke={1.5} /></div>
      <p className="mk-big" lang="ha">{HA.prices}</p><p className="mk-gloss">{u[3].gloss}</p>
    </div>,
    <div key="4" className="mk mk-card narrow">
      <div className="mk-row"><span className="mk-label">{u[4].label}</span><Icon name="translate" size={16} stroke={1.5} /></div>
      <p className="mk-big" lang="ha">{HA.market}</p>
      <span className="mk-arrow"><Icon name="arrow-long" size={18} stroke={1.5} className="rot90" /></span>
      <p className="mk-big" lang="fr">{FR.market}</p>
    </div>,
    <div key="5" className="mk mk-mic">
      <span className="mk-micbtn"><i /><i /><Icon name="microphone" size={28} stroke={1.5} /></span>
      <p>{u[5].label}</p>
      <Bars n={20} h={22} />
    </div>,
  ];
}

const modelSeed: Record<string, [string, "warm" | "rose"]> = { tatsuniya: ["api-m-tatsuniya", "warm"], tafiya: ["api-m-tafiya", "rose"], kora: ["api-m-kora", "warm"], air: ["api-m-air", "rose"] };
/* each model's card carries its own glow, so the four voices read as four landscapes */
const modelGlow: Record<string, string> = { tatsuniya: "#f2b25c", tafiya: "#e8838f", kora: "#d9a26b", air: "#e8935a" };
const useArt: ReactNode[] = [
  <GlassArt key="0" motif="talk" palette="apricot" ratio="wide" seed="uc0" place="centre" />,
  <NightArt key="1" seed="uc-captions" ratio="wide" />,
  <GlassArt key="2" motif="stack" palette="dusk" ratio="wide" seed="uc2" place="centre" />,
  <GlassArt key="3" motif="bars" palette="sand" ratio="wide" seed="uc3" place="centre" />,
  <GlassArt key="4" motif="blossom" palette="haze" ratio="wide" seed="uc4" place="centre" />,
  <GlassArt key="5" motif="mic" palette="apricot" ratio="wide" seed="uc5" place="centre" />,
];
const pillarArt: ReactNode[] = [
  <GlassArt key="0" motif="stack" palette="sand" ratio="square" seed="pl0" place="centre" />,
  <GlassArt key="1" motif="blossom" palette="apricot" ratio="square" seed="pl1" place="centre" />,
  <NightArt key="2" seed="pl-converse" ratio="square" tone="rose" />,
];
const columnIcons = ["language", "check", "consent"];

/* The hero is the request/response studio (kept as the founder chose it). Below it, openai.com/api's sequence,
   adapted: models as tall night-landscape cards, guides, the platform in three pictures, use cases, three columns
   of commitments, and two ways to get started. */
export default async function Api({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const a = apiCopy[lang];
  const L = (p: string) => (p.startsWith("http") ? p : lp(lang, p));
  const pillars = pillarMocks(a);

  return (
    <div className="page-top api2">
      <Reveal />

      {/* 1. Hero: words left, the studio right */}
      <section className="ap-hero">
        <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
        <div className="wrap ap-hero-grid">
          <div className="ap-hero-text">
            <p className="api-status"><i aria-hidden="true" />{a.status}</p>
            <h1 className="ap-display">{a.h1}</h1>
            <p className="lede">{a.lede}</p>
            <div className="ap-acts">
              <a className="pill lg dark" href={`${L("/signup")}?next=${encodeURIComponent(L("/account/keys"))}`}>{a.start} <Icon name="arrow-long" size={18} stroke={1.6} /></a>
              <a className="pill lg frost" href={TALK}>{a.talk}</a>
            </div>
          </div>
          <ApiStudio a={a} />
        </div>
      </section>

      {/* 2. Powered by the models: tall night-landscape cards, after OpenAI's model cards */}
      <section id="models" className="section ap-sec" aria-labelledby="h-ap-models">
        <div className="wrap">
          <h2 id="h-ap-models" className="ap-title">{a.modelsH}</h2>
          <p className="ap-lead">{a.modelsSub}</p>
          <div className="ap-models">
            {a.models.map(m => (
              <a key={m.slug} className="ap-mcard reveal" href={L(m.href)} style={{ ["--glow" as string]: modelGlow[m.slug] } as CSSProperties}>
                <span className="art" aria-hidden="true"><NightArt seed={modelSeed[m.slug][0]} tone={modelSeed[m.slug][1]} ratio="card" /></span>
                <span className="ap-mverb">{m.verb}</span>
                <span className="ap-mbody">
                  <b>{m.name}</b>
                  <span>{a.labels.task}: {m.task}</span>
                  <span>{a.labels.io}: {m.io[0]} → {m.io[1]}</span>
                  <span>{a.labels.endpoint}: <code>{m.endpoint}</code></span>
                  <span className="ap-mstat"><i className={m.research ? "research" : "dev"} aria-hidden="true" />{m.status}</span>
                  <em>{a.learnMore}<Icon name={m.href.startsWith("http") ? "external" : "arrow-long"} size={15} stroke={1.6} /></em>
                </span>
              </a>
            ))}
          </div>
          <p className="ap-foot">{a.provisional}</p>

          {/* the guides box, after OpenAI's "Start building with frontier models" */}
          <div className="ap-guides reveal">
            <div className="ap-guides-head">
              <h3>{a.guidesH}</h3>
              <a className="pill dark" href="#get-started">{a.start} <Icon name="arrow-long" size={16} stroke={1.6} /></a>
            </div>
            <div className="ap-guides-grid">
              {a.guides.map(g => (
                <a key={g.t} className="ap-guide" href={L(g.href)}>
                  <b>{g.t}</b><span>{g.d}</span>
                  <em>{g.cta}<Icon name="arrow-long" size={15} stroke={1.6} /></em>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. One platform: three pictures, after OpenAI's "all-in-one platform for agents" */}
      <section className="section ap-sec" aria-labelledby="h-ap-platform">
        <div className="wrap">
          <h2 id="h-ap-platform" className="ap-title">{a.platformH}</h2>
          <p className="ap-lead">{a.platformSub}</p>
          <div className="ap-acts center"><a className="pill" href={L("/research")}>{a.readResearch}</a><a className="pill dark" href="#get-started">{a.start}</a></div>
          <div className="ap-pillars">
            {pillars.map((mock, i) => (
              <div key={i} className="ap-pillar reveal">
                <div className={`ap-pic${i === 2 ? " dark" : ""}`}><span className="art" aria-hidden="true">{pillarArt[i]}</span>{mock}</div>
                <h3>{a.pillars[i].t}</h3>
                <p>{a.pillars[i].d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Use cases, after OpenAI's "Use cases driven by our platform" */}
      <section className="section ap-sec" aria-labelledby="h-ap-uses">
        <div className="wrap">
          <h2 id="h-ap-uses" className="ap-title">{a.useH}</h2>
          <p className="ap-lead">{a.useSub}</p>
          <ApiUseCases uses={a.uses} arts={useArt} mocks={useMocks(a)} cta={a.talkUse} mail={a.uses.map(u => mail(`Namu API: ${u.t}`))} />
        </div>
      </section>

      {/* 5. Three columns of commitments, after OpenAI's "Enterprise-grade features" */}
      <section className="section ap-sec" aria-labelledby="h-ap-built">
        <div className="wrap">
          <h2 id="h-ap-built" className="ap-title">{a.builtH}</h2>
          <p className="ap-lead">{a.builtSub}</p>
          <div className="ap-cols reveal">
            {a.columns.map((col, i) => (
              <div key={col.t} className="ap-col">
                <div className="ap-col-head"><span className="ap-col-ic"><Icon name={columnIcons[i]} size={22} stroke={1.5} /></span>{col.planned && <span className="ap-tag">{a.planned}</span>}</div>
                <h3>{col.t}</h3>
                <ul>{col.items.map(x => <li key={x}><Icon name="check" size={16} stroke={1.8} />{x}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Get started: two cards, after OpenAI's */}
      <section id="get-started" className="section ap-sec ap-start" aria-labelledby="h-ap-start">
        <div className="wrap">
          <h2 id="h-ap-start" className="ap-title">{a.startH}</h2>
          <div className="ap-start-grid">
            {[{ c: a.partner, href: TALK, dark: false, art: <GlassArt motif="talk" palette="sand" ratio="wide" seed="st0" place="centre" /> },
              { c: a.build, href: `${L("/signup")}?next=${encodeURIComponent(L("/account/keys"))}`, dark: true, art: <NightArt seed="api-start" ratio="wide" /> }].map(({ c, href, dark, art }) => (
              <div key={c.t} className={`ap-scard reveal${dark ? " dark" : ""}`}>
                <span className="art" aria-hidden="true">{art}</span>
                <div className="ap-scard-in">
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                  <ul>{c.items.map(x => <li key={x}><Icon name="check" size={16} stroke={1.8} />{x}</li>)}</ul>
                  <a className={`pill lg ${dark ? "light" : "dark"}`} href={href}>{c.cta} <Icon name="arrow-long" size={18} stroke={1.6} /></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
