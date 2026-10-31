"use client";

import { useEffect, useRef } from "react";
import { createTurnTaking, TURN_TAKING_STRINGS } from "@/lib/turn-taking";
import { createStrictFolded, STRICT_FOLDED_STRINGS } from "@/lib/strict-folded";
import { createTestSet, TEST_SET_STRINGS } from "@/lib/test-set";
import { createBlossomPlayer, BLOSSOM_STRINGS } from "@/lib/blossom-player";
import { createUtterance, UTTERANCE_STRINGS } from "@/lib/utterance";
import { FLEURS_HA_TEST } from "@/content/fleurs-ha-test";
import type { Lang } from "@/i18n/config";

/* French typography: a narrow no-break space (U+202F) before ; : ! ? and %, inside « », and between
   a number and its unit. Written as an escape because Lab Sans has no glyph for U+202F
   (scripts/coverage.json), so the browser takes this one space from the fallback font. */
const NNBSP = "\u202F";

/** Mounts a ported engine once per language; the keyed <div> gives each language a fresh root. When the figure
    unmounts (or its language changes) it calls the destroy() the engine returned, if any, so the engine's observers,
    timers and animation frames stop with it. The engines are untyped ports, hence the one cast. */
function useMount(fn: (el: HTMLDivElement) => unknown, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.innerHTML = "";
    const engine = fn(el) as { destroy?: () => void } | null | undefined;
    return () => engine?.destroy?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/* ---- Conversation score (Hira) ---- */

const TURN_TAKING_FR: typeof TURN_TAKING_STRINGS = {
  play: "Lire l’échange",
  pause: "Pause",
  overlap: "chevauchement",
  decimal: ",",
  seconds: `${NNBSP}s`,
  glossLang: "fr",
};

const SCORE_TEXT: Record<Lang, { caption: string; caller: string; yields: string; backchannel: string }> = {
  en: { caption: "Illustrative timing — not a measurement", caller: "Caller", yields: "Aïr yields", backchannel: "backchannel" },
  fr: { caption: "Minutage illustratif — pas une mesure", caller: "Appelant", yields: "Aïr cède la parole", backchannel: "signal d’écoute" },
};

/* Hausa `text` lines are shown as written in every language; only the gloss is translated. */
const SCORE_SEGMENTS: { lane: string; start: number; end: number; cut?: boolean; kind?: string; text?: string; gloss?: Record<Lang, string> }[] = [
  { lane: "air", start: .2, end: 3.55, cut: true, text: "Ana yin allurar rigakafi kowace Talata da Alhamis, daga ƙarfe…",
    gloss: { en: "Vaccinations are every Tuesday and Thursday, from…", fr: "Les vaccinations ont lieu tous les mardis et jeudis, à partir de…" } },
  { lane: "caller", start: 2.85, end: 4.9, text: "Aʼa, ba wannan ba. Ina son na Zinder.",
    gloss: { en: "No, not that one. I want Zinder.", fr: "Non, pas celui-là. Je veux celui de Zinder." } },
  { lane: "air", start: 5.35, end: 8.2, text: "Na gane. A Zinder, ranar Litinin kawai ake yi.",
    gloss: { en: "Understood. In Zinder it is Mondays only.", fr: "Compris. À Zinder, c’est uniquement le lundi." } },
  { lane: "caller", start: 6.7, end: 6.98, kind: "backchannel" },
  { lane: "caller", start: 8.7, end: 9.7, text: "To, na gode.",
    gloss: { en: "Alright, thank you.", fr: "D’accord, merci." } },
];

/** Hira — the conversation score. Line text from namu-ai.org's Aïr page; timing illustrative. */
export function ConversationScore({ lang = "en" }: { lang?: Lang }) {
  const ref = useMount(el => {
    const T = SCORE_TEXT[lang];
    const tt = createTurnTaking(el, {
      duration: 10, caption: T.caption,
      lanes: [{ id: "air", label: "Aïr" }, { id: "caller", label: T.caller }],
      segments: SCORE_SEGMENTS.map(({ gloss, ...s }) => (gloss ? { ...s, gloss: gloss[lang] } : s)),
      events: [{ at: 3.55, label: T.yields }, { at: 6.7, label: T.backchannel }],
      strings: lang === "fr" ? TURN_TAKING_FR : undefined,
    });
    tt.seek(4.2);
    return { destroy: tt.pause };          // a score left playing stops its frames
  }, [lang]);
  return <div key={lang} ref={ref} />;
}

/* ---- Strict and folded (Maʼauni) ---- */

const STRICT_FOLDED_FR: typeof STRICT_FOLDED_STRINGS = {
  modes: "Mode de calcul du score",
  strict: "Strict",
  folded: "Replié",
  reference: "Référence",
  hypothesis: "Texte reconnu",
  wer: "Taux d’erreur sur les mots (WER)",
  count: "Erreurs / mots",
  hooks: "Lettres crochetées perdues",
  ruleStrict: "Le mode strict conserve ɓ ɗ ƙ ƴ et ʼ. Un mot auquel il manque un crochet est un autre mot.",
  ruleFolded: "Le mode replié ramène ɓ ɗ ƙ ƴ à b d k y et supprime ʼ avant le calcul du score. Les erreurs de crochet disparaissent.",
  lostOf: (lost: number, total: number) => `${lost} sur ${total}`,
  decimal: ",",
  percent: `${NNBSP}%`,
};

export function StrictFolded({ lang = "en" }: { lang?: Lang }) {
  const ref = useMount(el => createStrictFolded(el, {
    reference: "Ana yin allurar rigakafi kowace Talata da Alhamis, daga ƙarfe takwas na safe.",
    hypothesis: "ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe",
    strings: lang === "fr" ? STRICT_FOLDED_FR : undefined,
  }), [lang]);
  return <div key={lang} ref={ref} />;
}

/* ---- Who is in the test set (Rumbu) ---- */

const TEST_SET_FR: typeof TEST_SET_STRINGS = {
  utterances: "Énoncés",
  hours: "Heures",
  female: `Genre${NNBSP}: féminin`,
  male: `Genre${NNBSP}: masculin`,
  decimal: ",",
  seconds: `${NNBSP}s`,
  mark: (n: number, length: string, isMale: boolean) => `Énoncé ${n} · ${length} · genre indiqué${NNBSP}: ${isMale ? "masculin" : "féminin"}`,
  summary: (n: number, female: number, male: number) => `${n} énoncés${NNBSP}: ${female} de genre indiqué féminin, ${male} de genre indiqué masculin`,
  callout: (n: number) => `énoncé ${n} · la seule voix indiquée comme masculine`,
};

const TEST_SET_CAPTION: Record<Lang, string> = {
  en: "Each mark is one utterance of the FLEURS Hausa (ha_ng) test split, in file order. Colour is the gender recorded in the dataset; each mark’s tooltip gives its length. Source: google/fleurs, data/ha_ng/test.tsv, CC BY 4.0, read 12 Oct 2026.",
  fr: `Chaque trait est un énoncé du jeu de test hausa (ha_ng) de FLEURS, dans l’ordre du fichier. La couleur correspond au genre indiqué dans le jeu de données${NNBSP}; l’info-bulle de chaque trait donne sa durée. Source${NNBSP}: google/fleurs, data/ha_ng/test.tsv, CC BY 4.0, consulté le 12 octobre 2026.`,
};

export function TestSetStrip({ lang = "en" }: { lang?: Lang }) {
  // The engine is ported JS (see src/lib); its option bag is typed loosely.
  const ref = useMount(el => createTestSet(el, FLEURS_HA_TEST, {
    animate: true,
    caption: TEST_SET_CAPTION[lang],
    strings: lang === "fr" ? TEST_SET_FR : undefined,
  } as Parameters<typeof createTestSet>[2] & { caption: string }), [lang]);
  return <div key={lang} ref={ref} />;
}

/* ---- Life of an utterance (Tankaɗe) ---- */

const UTTERANCE_FR: typeof UTTERANCE_STRINGS = {
  stagesLabel: "Étapes",
  consentLabel: "Périmètre du consentement",
  allowed: " — usage autorisé",
  notAllowed: " — usage non autorisé",
  stages: {
    recorded: { label: "Enregistré", note: "Un appel téléphonique, en bande étroite. Le silence, le bruit de ligne et la parole arrivent ensemble." },
    segmented: { label: "Segmenté", note: "La détection d’activité vocale garde la parole et met le silence de côté." },
    aligned: { label: "Aligné", note: "L’alignement forcé relie chaque mot écrit au segment audio qui lui correspond." },
    normalised: { label: "Normalisé", note: `Une seule orthographe${NNBSP}: lettres crochetées rétablies, nombres écrits en toutes lettres, une seule apostrophe (ʼ).` },
    checked: { label: "Vérifié", note: "Un locuteur natif confirme le texte. Le consentement de la personne enregistrée décide des usages permis." },
  },
};

const CONSENT_SCOPES: Record<Lang, [string, string, string, string]> = {
  en: ["ASR training", "Evaluation", "Voice cloning", "Public release"],
  fr: ["Entraînement ASR", "Évaluation", "Clonage de voix", "Diffusion publique"],
};

export function UtterancePipeline({ lang = "en" }: { lang?: Lang }) {
  const ref = useMount(el => {
    const [train, evaluation, cloning, release] = CONSENT_SCOPES[lang];
    const lu = createUtterance(el, {
      speech: [[.05, .47], [.55, .94]],
      words: [{ raw: "daga", clean: "daga", at: .06 }, { raw: "karfe", clean: "ƙarfe", at: .15 }, { raw: "8", clean: "takwas", at: .25 }, { raw: "na", clean: "na", at: .345 }, { raw: "safe", clean: "safe", at: .4 }, { raw: "zuwa", clean: "zuwa", at: .56 }, { raw: "karfe", clean: "ƙarfe", at: .66 }, { raw: "2", clean: "biyu", at: .77 }],
      consent: [{ scope: train, allowed: true }, { scope: evaluation, allowed: true }, { scope: cloning, allowed: false }, { scope: release, allowed: false }],
      strings: lang === "fr" ? UTTERANCE_FR : undefined,
    });
    lu.go(4, true);
    return lu;
  }, [lang]);
  return <div key={lang} ref={ref} />;
}

/* ---- Blossom player ---- */

const BLOSSOM_FR: typeof BLOSSOM_STRINGS = {
  play: (label: string) => `Lire ${label}`,
  pause: (label: string) => `Mettre en pause ${label}`,
  replay: (label: string) => `Réécouter ${label}`,
  glossLang: "fr",
};

/** With lang="fr", pass label, gloss and note in French: the player shows them as given and marks the gloss lang="fr". */
export function BlossomPlayer({ label, gloss, note, words, duration, lang = "en" }: {
  label: string; gloss: string; note?: string; duration: number; words: { w: string; start: number; end: number }[]; lang?: Lang;
}) {
  const ref = useMount(el => {
    const player = createBlossomPlayer(el, { label, gloss, note, words, duration, strings: lang === "fr" ? BLOSSOM_FR : undefined });
    return { destroy: player.pause };      // a clip left playing stops its frames
  }, [lang]);
  return <div key={lang} ref={ref} />;
}
