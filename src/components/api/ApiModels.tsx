"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import type { CodeLang } from "../CodeTabs";
import { ApiCode } from "./ApiCode";
import { ENDPOINT, TASK_DOT, type ApiCopy, type ApiTask } from "@/content/api";

/* The /api page's models: a list on the left, one open at a time with what it does and its limits, and beside it the
   open model's request, in the docs' own code. Every model's text is in the page's HTML; closed ones are inert. */
type Props = {
  copy: Pick<ApiCopy, "models" | "labels" | "docs" | "copy" | "copied" | "copyFailed">;
  code: Record<ApiTask, Record<CodeLang, string>>;
  docs: Record<ApiTask, string>;
};

export function ApiModels({ copy, code, docs }: Props) {
  const [open, setOpen] = useState<ApiTask>("speech");
  const shown = copy.models.find(m => m.task === open)!;
  return (
    <div className="ax-models">
      <ul className="ax-mlist">
        {copy.models.map(m => {
          const on = m.task === open;
          return (
            <li key={m.task} className={on ? "on" : undefined}>
              <button type="button" aria-expanded={on} aria-controls={`ax-m-${m.task}`} onClick={() => setOpen(m.task)}>
                <span className="ax-mname"><i style={{ background: TASK_DOT[m.task] }} aria-hidden="true" />{m.name}</span>
                <span className="ax-mjob">{m.job}</span>
                <Icon name="chevron" size={18} stroke={1.5} />
              </button>
              <div className="ax-mbody" id={`ax-m-${m.task}`} inert={!on}>
                <div>
                  <p>{m.desc}</p>
                  <dl className="ax-facts">
                    <div><dt>{copy.labels.endpoint}</dt><dd><code>POST {ENDPOINT[m.task]}</code></dd></div>
                    <div><dt>{copy.labels.langs}</dt><dd>{m.langs}</dd></div>
                    <div><dt>{copy.labels.limit}</dt><dd>{m.limit}</dd></div>
                    <div><dt>{copy.labels.status}</dt><dd><span className={`ax-status${m.research ? " research" : ""}`}>{m.status}</span></dd></div>
                  </dl>
                  <a className="ax-link" href={docs[m.task]}>{copy.docs}<Icon name="arrow-long" size={15} stroke={1.6} /></a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ax-mcode">
        <p className="ax-mcode-head"><code className="ax-ep"><b>POST</b>{ENDPOINT[open]}</code><span>{shown.name} · {shown.job}</span></p>
        <ApiCode endpoint={ENDPOINT[open]} code={code[open]} labels={{ copy: copy.copy, copied: copy.copied, failed: copy.copyFailed }} />
      </div>
    </div>
  );
}
