"use client";

/* "Put the models together": the use cases as chains of calls (openai.com/api's list-and-picture pattern, with the
   picture made of the API itself). Pick a product on the left; the right shows its path, from a person through the
   models and your own code and back, and the few lines of Python that make it. A light travels along the path. */
import { useState } from "react";
import { Icon } from "./Icon";
import { Highlight } from "./ApiRunner";
import { apiCopy, type ApiTask } from "@/content/api";
import type { Lang } from "@/i18n/config";

const ORB: Record<ApiTask, string> = {
  speech: "radial-gradient(circle at 34% 30%, #ffe3cc 0, #f0884f 48%, #b23e1f 100%)",
  transcribe: "radial-gradient(circle at 34% 30%, #f6e6d6 0, #c4865a 48%, #5e3418 100%)",
  translate: "radial-gradient(circle at 34% 30%, #f4ece2 0, #8fa6d6 48%, #7a4325 100%)",
  converse: "radial-gradient(circle at 34% 30%, #ffd8b8 0, #e8935a 48%, #7a4325 100%)",
};
const PATH: Record<ApiTask, string> = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" };

export function ApiCompose({ lang }: { lang: Lang }) {
  const copy = apiCopy[lang];
  const [on, setOn] = useState(0);
  const f = copy.flows[on];
  return (
    <div className="ac">
      <ul className="ac-list" role="tablist" aria-orientation="vertical" aria-label={copy.composeH}>
        {copy.flows.map((x, i) => (
          <li key={x.id}>
            <button type="button" role="tab" id={`ac-t-${x.id}`} aria-controls="ac-panel" aria-selected={i === on} onClick={() => setOn(i)}>
              <span className="ac-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="ac-t"><strong>{x.t}</strong><em>{x.d}</em></span>
            </button>
          </li>
        ))}
      </ul>
      <div className="ac-panel" id="ac-panel" role="tabpanel" aria-labelledby={`ac-t-${f.id}`} key={f.id}>
        <ol className="ac-path" style={{ ["--n" as string]: f.steps.length }}>
          {f.steps.map((s, i) => (
            <li key={i} className={`ac-node ${s.kind === "you" ? "you" : s.kind === "code" ? "code" : "model"}`} style={{ ["--i" as string]: i }}>
              <span className="ac-dot" aria-hidden="true">
                {s.kind === "you" ? <Icon name="person" size={18} stroke={1.4} /> : s.kind === "code" ? <Icon name="code" size={18} stroke={1.4} /> : <i style={{ background: ORB[s.kind] }} />}
              </span>
              <span className="ac-label"><strong>{s.label}</strong>{s.kind !== "you" && s.kind !== "code" ? <code>{PATH[s.kind]}</code> : s.note ? <em>{s.note}</em> : null}</span>
              {s.kind !== "you" && s.kind !== "code" && s.note && <em className="ac-note">{s.note}</em>}
            </li>
          ))}
        </ol>
        <div className="ac-code">
          <pre tabIndex={0}><code><Highlight code={f.code} lang="Python" /></code></pre>
          <p>{copy.session}</p>
        </div>
      </div>
    </div>
  );
}
