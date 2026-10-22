"use client";

/* "A console for every key": the developer console in a window, one page at a time (claude.com/platform's
   console section). The pictures are screenshots of the real console with sample data, said so under them. */
import Image from "next/image";
import { useState } from "react";
import { apiCopy } from "@/content/api";
import type { Lang } from "@/i18n/config";

export function ApiConsoleTour({ lang }: { lang: Lang }) {
  const copy = apiCopy[lang];
  const [on, setOn] = useState(0);
  const tabs = copy.consoleTabs;
  return (
    <div className="act">
      <div className="act-tabs" role="tablist" aria-label={copy.consoleH}>
        {tabs.map((x, i) => <button key={x.id} type="button" role="tab" aria-selected={i === on} aria-controls="act-shot" onClick={() => setOn(i)}>{x.label}</button>)}
      </div>
      <figure className="act-window" id="act-shot" role="tabpanel">
        <div className="act-bar" aria-hidden="true"><i /><i /><i /><span>namuai-lab.com/account</span></div>
        <div className="act-shots">
          {tabs.map((x, i) => (
            <Image key={x.id} src={`/api/console-${x.id}.jpg`} alt={x.alt} width={2160} height={1350} sizes="(max-width: 900px) 100vw, 1100px"
              className={i === on ? "on" : undefined} aria-hidden={i !== on} priority={false} />
          ))}
        </div>
        <figcaption>{copy.consoleNote}</figcaption>
      </figure>
    </div>
  );
}
