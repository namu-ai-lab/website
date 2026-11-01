/* The platform's catalog: languages, models, voices and output targets, and the questions every screen asks of them.
   Browser-safe; import from "@/lib/catalog". */
import { LANGUAGES, LOCAL, WRITTEN, isLangCode, language, type LangCode, type Language } from "./languages";
import { MODELS, TASKS, isModelId, model, modelFor, type Model, type ModelId, type Task } from "./models";
import { USES, VOICES, isVoiceId, sampleOf, voice, voicesFor, type Sample, type Use, type Voice, type VoiceId } from "./voices";

export { LANGUAGES, LOCAL, WRITTEN, isLangCode, language, type LangCode, type Language };
export { MODELS, TASKS, isModelId, model, modelFor, type Model, type ModelId, type Task };
export { USES, VOICES, isVoiceId, sampleOf, voice, voicesFor, type Sample, type Use, type Voice, type VoiceId };
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

/** The local languages a task can use today. The platform offers only these; languages on their way are for the home
    page to announce, not for a picker to show greyed out. */
export const localFor = (task: Task): LangCode[] => LOCAL.filter(l => can(task, l));

/** Whether the API translates written text itself (POST /v1/translate with JSON). Off until the gateway that does is
    deployed (platform/modal/namu_gateway.py from main): until then a text is translated by saying it first, which
    needs a voice in its language; a language without one reaches Kora by voice only. Turn on with that deploy. */
export const TEXT_TRANSLATION = false;

/** Whether words typed in `from` can become `to` today; when not, they come in by voice (the speech path). */
export const canTranslateText = (from: LangCode, to: LangCode) =>
  from === to || (canTranslate(from, to) && (TEXT_TRANSLATION || voicesFor(from).length > 0));
