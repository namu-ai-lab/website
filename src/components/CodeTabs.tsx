"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "./ui/CopyButton";

/* A code sample in several languages, with a copy button. The chosen language is shared across the page: every
   block that calls useCodeLang (these tabs, the /api page's code cards) follows the same choice. */
export const CODE_LANGS = ["cURL", "Python", "JavaScript"] as const;
export type CodeLang = (typeof CODE_LANGS)[number];
let shared: CodeLang = "cURL";
const listeners = new Set<(l: CodeLang) => void>();

export function useCodeLang(): [CodeLang, (l: CodeLang) => void] {
  const [lang, setLang] = useState<CodeLang>(shared);
  useEffect(() => { listeners.add(setLang); return () => { listeners.delete(setLang); }; }, []);
  return [lang, (l: CodeLang) => { shared = l; listeners.forEach(f => f(l)); }];
}

export function CodeTabs({ code, copyLabel, copiedLabel, failedLabel }: { code: Record<CodeLang, string>; copyLabel: string; copiedLabel: string; failedLabel: string }) {
  const [lang, pick] = useCodeLang();
  const shown = useRef<HTMLElement>(null);
  return (
    <div className="pg-code doc-code">
      <div className="pg-code-head">
        <div className="pg-seg" role="group" aria-label="Language">
          {CODE_LANGS.map(l => <button key={l} type="button" aria-pressed={l === lang} onClick={() => pick(l)}>{l}</button>)}
        </div>
        <CopyButton text={code[lang]} labels={{ copy: copyLabel, copied: copiedLabel, failed: failedLabel }} select={shown} className="pg-run" icon={null} />
      </div>
      <pre><code ref={shown}>{code[lang]}</code></pre>
    </div>
  );
}
