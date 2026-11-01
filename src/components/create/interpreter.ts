/* The Interpreter's two sides, from the catalog, for its page and its server route alike: a local language that Kora
   translates both ways with French, and French. It is voice in and voice out, so a side can be spoken into only when
   the other side's language has a voice; the page's one line says what can be heard. A language is voiced when
   Speech speaks it and the catalog has a voice for it. */
import { createCopy } from "@/content/create";
import type { Lang } from "@/i18n/config";
import { LOCAL, WRITTEN, can, canTranslate, language, voicesFor, type LangCode } from "@/lib/catalog";

export const interpreterLocals = (): LangCode[] => LOCAL.filter(l => canTranslate(l, WRITTEN) && canTranslate(WRITTEN, l));
export const voiced = (l: LangCode) => can("speech", l) && voicesFor(l).length > 0;

export function interpreterLede(ui: Lang, local: LangCode = interpreterLocals()[0] ?? "ha"): string {
  const t = createCopy[ui].interpret, name = (l: LangCode) => language(l).name[ui];
  if (voiced(local) && voiced(WRITTEN)) return t.lede(name(local), name(WRITTEN));
  return voiced(local) ? t.ledeOne(name(WRITTEN), name(local)) : t.ledeOne(name(local), name(WRITTEN));
}
