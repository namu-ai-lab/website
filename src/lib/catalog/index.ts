/* The platform's catalog: languages, models, voices and output targets, and the questions every screen asks of them.
   Browser-safe; import from "@/lib/catalog". */
import { LANGUAGES, LOCAL, WRITTEN, isLangCode, language, type LangCode, type Language } from "./languages";
import { MODELS, TASKS, isModelId, model, modelFor, type Model, type ModelId, type Task } from "./models";
import { USES, VOICES, isVoiceId, voice, voicesFor, type Use, type Voice, type VoiceId } from "./voices";

export { LANGUAGES, LOCAL, WRITTEN, isLangCode, language, type LangCode, type Language };
export { MODELS, TASKS, isModelId, model, modelFor, type Model, type ModelId, type Task };
export { USES, VOICES, isVoiceId, voice, voicesFor, type Use, type Voice, type VoiceId };
export { OUTPUTS, isOutputId, output, type Output, type OutputId } from "./outputs";

/** The languages a task can use today, in catalog order. */
export function languagesFor(task: Task): LangCode[] {
  const on = new Set<string>(modelFor(task).languages);
  return LANGUAGES.map(l => l.code).filter(c => on.has(c));
}

/** Whether a model can carry a task in a language today. */
export const can = (task: Task, lang: LangCode) => languagesFor(task).includes(lang);

/** Whether text or speech in `from` can become `to` today. */
export const canTranslate = (from: LangCode, to: LangCode) =>
  from === to || (modelFor("translate").pairs ?? []).some(([a, b]) => a === from && b === to);

/** The voice to use for a language when nobody has chosen one: the organisation's default, else the first. */
export const defaultVoice = (lang: LangCode, chosen?: Partial<Record<string, string>>): VoiceId | null => {
  const pick = chosen?.[lang];
  if (pick && isVoiceId(pick) && voicesFor(lang).some(v => v.id === pick)) return pick;
  return (voicesFor(lang)[0]?.id as VoiceId | undefined) ?? null;
};

/** A local language a project or an agent can offer: ready when the platform can speak it, else on its way. */
export type LangState = "ready" | "soon";
export const stateOf = (lang: LangCode): LangState => (can("speech", lang) ? "ready" : "soon");
