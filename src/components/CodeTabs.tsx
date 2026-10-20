"use client";

import { useEffect, useState } from "react";

/* A code sample in several languages, with a copy button. The chosen language is shared across the page. */
const LANGS = ["cURL", "Python", "JavaScript"] as const;
type L = (typeof LANGS)[number];
let shared: L = "cURL";
const listeners = new Set<(l: L) => void>();

export function CodeTabs({ code, copyLabel, copiedLabel }: { code: Record<L, string>; copyLabel: string; copiedLabel: string }) {
  const [lang, setLang] = useState<L>(shared);
  const [copied, setCopied] = useState(false);
  const pick = (l: L) => { shared = l; listeners.forEach(f => f(l)); };
  // Every block on the page follows the same choice.
  useEffect(() => { listeners.add(setLang); return () => { listeners.delete(setLang); }; }, []);
  return (
    <div className="pg-code doc-code">
      <div className="pg-code-head">
        <div className="pg-seg" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l} type="button" aria-pressed={l === lang} onClick={() => pick(l)}>{l}</button>)}
        </div>
        <button type="button" className="pg-run" onClick={async () => { await navigator.clipboard.writeText(code[lang]); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre><code>{code[lang]}</code></pre>
    </div>
  );
}
