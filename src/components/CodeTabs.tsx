"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "./ui/CopyButton";

/* A code sample in several languages, with a copy button. The chosen language is shared across the page. */
const LANGS = ["cURL", "Python", "JavaScript"] as const;
type L = (typeof LANGS)[number];
let shared: L = "cURL";
const listeners = new Set<(l: L) => void>();

export function CodeTabs({ code, copyLabel, copiedLabel, failedLabel }: { code: Record<L, string>; copyLabel: string; copiedLabel: string; failedLabel: string }) {
  const [lang, setLang] = useState<L>(shared);
  const shown = useRef<HTMLElement>(null);
  const pick = (l: L) => { shared = l; listeners.forEach(f => f(l)); };
  // Every block on the page follows the same choice.
  useEffect(() => { listeners.add(setLang); return () => { listeners.delete(setLang); }; }, []);
  return (
    <div className="pg-code doc-code">
      <div className="pg-code-head">
        <div className="pg-seg" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l} type="button" aria-pressed={l === lang} onClick={() => pick(l)}>{l}</button>)}
        </div>
        <CopyButton text={code[lang]} labels={{ copy: copyLabel, copied: copiedLabel, failed: failedLabel }} select={shown} className="pg-run" icon={null} />
      </div>
      <pre><code ref={shown}>{code[lang]}</code></pre>
    </div>
  );
}
