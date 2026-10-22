"use client";

import type { MouseEvent, ReactNode } from "react";
import type { Lang } from "@/i18n/config";

/* The Lab's two Tally forms: the newsletter ("Stay close to what we're building": name, email, interests, consent)
   and partnerships ("Let's build together": who you are, your organisation, how you'd like to work with Namu).
   A form opens over the page as Tally's popup; Tally's script is fetched only on the first click, so no third-party
   code runs for visitors who never open one. Without JavaScript, with a modified click, or if the script cannot load,
   the link opens the form on tally.so. `source` and `lang` are passed as hidden fields, which Tally keeps only if the
   form defines them. */
export const FORMS = { newsletter: "EqkJy2", partner: "2jEx8e" } as const;
const SCRIPT = "https://tally.so/widgets/embed.js";

type TallyApi = { openPopup: (id: string, options?: Record<string, unknown>) => void };
declare global { interface Window { Tally?: TallyApi } }

let loading: Promise<TallyApi> | null = null;
function tally(): Promise<TallyApi> {
  if (window.Tally) return Promise.resolve(window.Tally);
  loading ??= new Promise<TallyApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT; s.async = true;
    s.onload = () => (window.Tally ? resolve(window.Tally) : reject(new Error("tally")));
    s.onerror = () => { loading = null; reject(new Error("tally")); };
    document.head.appendChild(s);
  });
  return loading;
}

export function TallyLink({ form, lang, source, children, className }: { form: keyof typeof FORMS; lang: Lang; source: string; children: ReactNode; className?: string }) {
  const id = FORMS[form];
  const href = `https://tally.so/r/${id}?source=${encodeURIComponent(source)}&lang=${lang}`;
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    tally()
      .then(t => t.openPopup(id, { layout: "modal", width: 560, overlay: true, autoClose: 4000, hiddenFields: { source, lang } }))
      .catch(() => window.open(href, "_blank", "noopener"));
  };
  return <a className={className} href={href} target="_blank" rel="noopener" onClick={open}>{children}</a>;
}
