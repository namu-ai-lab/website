"use client";

/* "Find your way in": the partnership form's two questions asked on the page (who you are, what you would like to
   do), answered at once with how working together would look; "Start with this" opens the form with both answers
   passed as hidden fields (org_type, interest), in the form's own words. */
import { useState } from "react";
import { GlassArt, type Palette } from "./Art";
import { Icon } from "./Icon";
import { TallyLink } from "./Tally";
import { FORM_LABELS, orgCopy } from "@/content/organisations";
import { lp, type Lang } from "@/i18n/config";

type Motif = Parameters<typeof GlassArt>[0]["motif"];
const ART: Record<string, [Motif, Palette, string?]> = {
  deploy: ["talk", "apricot"], api: ["bars", "sand"], research: ["glyph", "ember", "ƙ"],
  data: ["mic", "dusk"], product: ["stack", "haze"], funding: ["blossom", "apricot"],
};

export function OrgWay({ lang }: { lang: Lang }) {
  const t = orgCopy[lang];
  const [type, setType] = useState(t.types[0].id);
  const [path, setPath] = useState(t.paths[0].id);
  const who = t.types.find(x => x.id === type)!, way = t.paths.find(x => x.id === path)!;
  const [motif, palette, ch] = ART[way.id];

  return (
    <div className="ow">
      <div className="ow-pick">
        <div className="ow-group" role="radiogroup" aria-labelledby="ow-am">
          <p id="ow-am" className="ow-label">{t.iAm}</p>
          <div className="ow-chips">
            {t.types.map(x => (
              <button key={x.id} type="button" role="radio" aria-checked={x.id === type} onClick={() => setType(x.id)}>
                <Icon name={x.icon} size={18} stroke={1.4} />{x.t}
              </button>
            ))}
          </div>
        </div>
        <div className="ow-group" role="radiogroup" aria-labelledby="ow-want">
          <p id="ow-want" className="ow-label">{t.iWant}</p>
          <div className="ow-list">
            {t.paths.map(x => (
              <button key={x.id} type="button" role="radio" aria-checked={x.id === path} onClick={() => setPath(x.id)}>
                <span className="ow-ic" aria-hidden="true"><Icon name={x.icon} size={18} stroke={1.4} /></span>{x.t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <article className="ow-card" aria-live="polite">
        <div className="ow-art" key={way.id} aria-hidden="true"><GlassArt motif={motif} palette={palette} ch={ch} ratio="wide" seed={`ow-${way.id}`} place="centre" /></div>
        <div className="ow-body" key={`${who.id}-${way.id}`}>
          <p className="ow-for">{t.forYou(who.who, way.want)}</p>
          <h3>{way.t}</h3>
          <p className="ow-d">{way.d}</p>
          <ul>{way.points.map(p => <li key={p}><Icon name="check" size={15} stroke={1.8} />{p}</li>)}</ul>
          <div className="ow-acts">
            <TallyLink className="pill lg dark" form="partner" lang={lang} source="lab-organisations"
              fields={{ org_type: FORM_LABELS.type[who.id as keyof typeof FORM_LABELS.type], interest: FORM_LABELS.path[way.id as keyof typeof FORM_LABELS.path] }}>
              {t.start}<Icon name="arrow-long" size={18} stroke={1.6} />
            </TallyLink>
            <a className="pill lg" href={lp(lang, way.link.href)}>{way.link.label}</a>
          </div>
          <p className="ow-note">{t.startNote}</p>
        </div>
      </article>
    </div>
  );
}
