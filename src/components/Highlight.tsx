import type { ReactNode } from "react";
import type { CodeLang } from "./CodeTabs";

/* A light syntax highlighter for the code the site shows: comments, strings and keywords, nothing more. In JSON a
   string followed by a colon is a key. Colours come from the caller's .hl-c, .hl-s, .hl-w and .hl-k. */
export function Highlight({ code, lang }: { code: string; lang: CodeLang | "json" }) {
  const re = lang === "cURL"
    ? /(#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(\bcurl\b|(?<=\s)-[A-Za-z]\b)/g
    : /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:import|from|const|await|with|as|new|if|throw|while|True|for|in|print|open)\b)/g;
  const out: ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1] ? "c" : m[2] ? (lang === "json" && /^\s*:/.test(code.slice(re.lastIndex)) ? "k" : "s") : "w";
    out.push(<span key={k++} className={`hl-${cls}`}>{m[0]}</span>);
    last = re.lastIndex;
  }
  out.push(code.slice(last));
  return <>{out}</>;
}
