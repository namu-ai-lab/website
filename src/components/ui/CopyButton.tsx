"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "../Icon";

/* The one copy button, for the console, the docs, the /api runner and the home playground. It copies with the
   Clipboard API. When that is refused (Safari's permission prompt, a page without focus, an insecure origin) it selects
   the same text on screen (`select`) and tries the browser's older copy command on it; if that fails too, the text
   stays selected for the reader's own Ctrl+C or ⌘C, and the button says copying failed instead of pretending it worked.
   Its look is the caller's (`className`): words, an icon, or both. */
type State = "idle" | "copied" | "failed";

export function CopyButton({ text, labels, className, select, icon = { size: 16, stroke: 1.6 }, iconOnly = false, name, autoFocus }: {
  text: string;
  labels: { copy: string; copied: string; failed: string };
  className: string;
  select?: RefObject<HTMLElement | null>;
  icon?: { size: number; stroke: number } | null;     // null: words only
  iconOnly?: boolean;                                   // the words become the button's name and tooltip
  name?: string;                                        // an icon-only button's name, when "Copy" alone is not enough
  autoFocus?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef(0);
  useEffect(() => { setState("idle"); }, [text]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = (s: State) => {
    setState(s);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), s === "failed" ? 4000 : 1600);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); show("copied"); return; } catch { /* refused or missing: below */ }
    const el = select?.current;
    if (el) {
      const range = document.createRange(); range.selectNodeContents(el);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
    }
    let ok = false;
    try { ok = Boolean(el) && document.execCommand("copy"); } catch { /* not supported */ }
    show(ok ? "copied" : "failed");
  };
  const words = state === "copied" ? labels.copied : state === "failed" ? labels.failed : labels.copy;
  return (
    <>
      <button type="button" className={className} onClick={() => void copy()} autoFocus={autoFocus}
        aria-label={iconOnly ? name ?? labels.copy : undefined} title={iconOnly ? (state === "idle" ? name ?? labels.copy : words) : undefined}>
        {icon && <Icon name={state === "copied" ? "check" : state === "failed" ? "close" : "copy"} size={icon.size} stroke={icon.stroke} />}
        {!iconOnly && words}
      </button>
      <span className="sr-only" aria-live="polite">{state === "idle" ? "" : words}</span>
    </>
  );
}
