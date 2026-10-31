"use client";

import { useRef } from "react";
import { CODE_LANGS, useCodeLang, type CodeLang } from "../CodeTabs";
import { Highlight } from "../Highlight";
import { CopyButton } from "../ui/CopyButton";

/* A model's request on the /api page: a light card with the endpoint, the language tabs (one choice for the whole
   page, shared with CodeTabs), the highlighted code and a copy button. The code is the docs' own (docs.ts samples). */
export function ApiCode({ endpoint, code, labels }: { endpoint: string; code: Record<CodeLang, string>; labels: { copy: string; copied: string; failed: string } }) {
  const [lang, pick] = useCodeLang();
  const shown = useRef<HTMLElement>(null);
  return (
    <div className="ax-code">
      <div className="ax-code-head">
        <div className="ax-code-tabs" role="group" aria-label="Language">
          {CODE_LANGS.map(l => <button key={l} type="button" aria-pressed={l === lang} onClick={() => pick(l)}>{l}</button>)}
        </div>
        <CopyButton text={code[lang]} labels={labels} select={shown} className="ax-code-copy" iconOnly name={`${labels.copy} ${endpoint}`} />
      </div>
      <pre tabIndex={0}><code ref={shown}><Highlight code={code[lang]} lang={lang} /></code></pre>
    </div>
  );
}
