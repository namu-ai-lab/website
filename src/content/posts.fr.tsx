// FR-REVIEW: machine-drafted French, to be reviewed by a native French speaker before publication.
import type { Post } from "./posts";
import type { AboutCopy } from "./posts-new";
import { FigureSlot } from "@/components/FigureSlot";

/* French twins of the posts in posts.tsx and posts-new.tsx, and of the About copy (aboutCopy).
   Same slugs, dates, authors, links, section ids and figures as the English; only the words change.
   French typography: U+202F (narrow no-break space) before ; : ! ? %, inside « », in thousands and
   before abbreviated units (16 Go, 16 kHz); decimal comma; typographic apostrophe ’.
   Hausa strings are copied byte for byte from the English (ʼ is U+02BC; sa'a keeps its ASCII apostrophe).
   Internal links stay unprefixed: the site rewrites them per language.

   Header of posts-new.tsx, kept as written: */

/* Lab copy drafted 2026-10-13 for the founders to approve, and now live: the three posts below are on /research
   (posts.tsx lists them) and aboutCopy is the /about page.

   Sources (every claim must agree with them):
   - src/content/programmes.ts (the five programmes, statuses, ladders, "What we do not claim yet")
   - src/content/posts.tsx (Post type; the Swahili challenge post, for Abdourahamane's competition result)
   - src/content/fleurs-ha-test.ts (FLEURS ha_ng test split, read 2026-10-12; every FLEURS figure below is
     computed from it, see the comment above `fleursNote`)
   - src/content/site.ts (contact address, site description)
   - ~/.claude/skills/namu-ai-lab/references/research-programmes.md (claims gate, principles)
   - ~/.claude/skills/namu-ai-lab/references/decisions.md (D9 ƴ by default, D10 programme names, D20 pay)
   - ~/Desktop/Air/STATUS.md and docs/decisions.md (Aïr hears through a transcript: HEARING=text)
   - ~/Desktop/Air/langs/hau/normalize.py (strict and folded definitions; used to cross-check the WER)
   - ~/Desktop/Air/langs/hau/data_cards/brainstyle_v0.md (AfriqueQwen3.5-9B licence: CC BY 4.0)
   - Moshi weights CC BY 4.0, code MIT: as cited in ~/Desktop/Air/research/papers/methods/2609.36903.txt

   NATIVE-REVIEW: every Hausa string in this file is marked inline with a `NATIVE-REVIEW` comment.
   None was supplied by a founder except the programme names (working names, decision D10). */

/* ------------------------------------------------------------------------------------------------ */
/* 1. Introducing Namu AI Lab                                                                         */
/* ------------------------------------------------------------------------------------------------ */

const introducingFr: Post = {
  slug: "introducing-namu-ai-lab",
  title: "Présentation de Namu AI Lab",
  dek: "Namu AI Lab est l’unité de recherche de Namu. Nous étudions les technologies de la parole pour le hausa et le zarma dans cinq programmes de recherche, et nous publions la façon dont nous mesurons ce travail.",
  date: "2026-10-13",
  readMinutes: 4,
  kind: "Story",
  authors: ["Mouhamad Mamane", "Abdourahamane Ide Salifou"],
  artefacts: [],
  sections: [
    { id: "what-the-lab-is", title: "Ce qu’est le Lab" },
    { id: "why-the-sahel", title: "Pourquoi le Sahel" },
    { id: "programmes", title: "Cinq programmes" },
    { id: "how-we-work", title: "Notre façon de travailler" },
    { id: "what-comes-next", title: "La suite" },
  ],
  body: (
    <>
      <p>Namu AI Lab est l’unité de recherche de Namu. Nous étudions les technologies de la parole pour le hausa et le zarma, deux langues du Sahel, et nous publions ici ce travail avec la façon dont nous l’avons mesuré.</p>

      <h2 id="what-the-lab-is">Ce qu’est le Lab</h2>
      <p>Namu construit, pour les langues africaines, des modèles, des jeux de données et des produits conçus nativement pour la parole. Les produits se trouvent sur <a href="https://www.namu-ai.org">namu-ai.org</a>. Le Lab publie la recherche qui les sous-tend.</p>
      <p>Nous commençons par le hausa ; le zarma vient ensuite. Chaque page de programme se termine par ce que nous n’affirmons pas encore.</p>

      <h2 id="why-the-sahel">Pourquoi les langues du Sahel</h2>
      {/* Speaker counts: Hausa ≈ 94M L1+L2 (Ethnologue via Wikipedia: 58M + 36M; the parent voice file gives
          "Ethnologue 2026: 94.5 million"). Zarma ≈ 6.0M (Ethnologue 26th ed., via Wikipedia). "One of the main
          languages of Niamey": SALAN §3, as in programmes.ts. Founders: confirm the Ethnologue edition for Hausa. */}
      <p>Le hausa compte environ 94 millions de locuteurs, en langue première ou seconde (Ethnologue, 2026). Le zarma en compte environ six millions (Ethnologue, 26e édition, 2023) et c’est l’une des principales langues de Niamey.</p>
      <p>Les technologies de la parole sont restées en retard pour l’une comme pour l’autre. La plupart des données vocales publiques en hausa ont été lues à voix haute à partir d’un texte, au Nigeria. Dans le jeu de test hausa de FLEURS, un benchmark sur lequel de nombreux articles publient des résultats, 620 des 621 énoncés portent l’étiquette « féminin ». D’après nos recherches, le zarma n’a ni collection Common Voice, ni jeu de test FLEURS, ni adaptateur dans le système de reconnaissance de la parole MMS de Meta.</p>
      <p>Pour Namu, l’accès à la technologie ne devrait dépendre ni du fait de parler une langue mondiale, ni du fait de savoir lire et écrire. C’est pourquoi le Lab travaille sur la parole, et il commence par le Niger, que les jeux de données publics en hausa laissent le plus souvent de côté.</p>

      <h2 id="programmes">Cinq programmes</h2>
      <p>Le travail est organisé en cinq programmes. Rumbu et Tankaɗe apportent les données et les rendent exploitables. Hira et le programme Zarma s’appuient sur ces données. Maʼauni mesure l’ensemble.</p>
      {/* NATIVE-REVIEW: gloss "Hira (conversation)". Source: research-programmes.md ("conversation, chat"). */}
      <p><a href="/programmes/hira">Hira</a> (conversation) est actif. Il étudie la parole full-duplex en hausa, avec des modèles qui écoutent pendant qu’ils parlent. Notre système actuel, Aïr, a une oreille, un cerveau et une bouche. Le cerveau est AfriqueQwen3.5-9B, de McGill NLP (CC BY 4.0), et nous ne réentraînons pas ses poids. La bouche repose sur Moshi, de Kyutai (poids sous licence CC BY 4.0). En direct, l’écoute d’Aïr passe encore par une transcription écrite : Aïr n’est donc pas encore un système parole-à-parole de bout en bout.</p>
      {/* NATIVE-REVIEW: gloss "Rumbu (granary)". Source: research-programmes.md. */}
      <p><a href="/programmes/rumbu">Rumbu</a> (grenier) est en ouverture. Il constituera un fonds commun de parole hausa, avec consentement, au Niger d’abord, comprenant des conversations à deux sur des canaux séparés, des appels téléphoniques ordinaires et des locuteurs qui ne lisent pas. Rien n’a encore été collecté. Le dispositif de consentement et le taux de rémunération seront publiés avant le début des enregistrements.</p>
      <p>Le programme <a href="/programmes/zarma">Zarma à partir de zéro</a> est en démarrage. Namu n’a encore ni données, ni modèle, ni mesure pour le zarma. Le programme commence par une convention d’écriture validée par des auteurs de langue zarma et par un petit jeu de test constitué avec consentement, et ne passe qu’ensuite aux modèles.</p>
      {/* NATIVE-REVIEW: name "Tankaɗe" and gloss "(sifting)". Source: research-programmes.md ("sifting", from tankaɗe da rairaya). */}
      <p><a href="/programmes/tankade">Tankaɗe</a> (tamisage) est actif. Il étudie comment des archives radiophoniques, des enregistrements de terrain et de l’audio participatif deviennent des données dont un modèle peut apprendre et auxquelles un lecteur peut se fier. Nos chaînes de traitement fonctionnent en interne. Leurs rendements et leurs seuils paraîtront dans un compte rendu avant que nous les citions.</p>
      {/* NATIVE-REVIEW: name "Maʼauni" (U+02BC) and gloss "(measure)". Source: research-programmes.md ("measure, scale"). */}
      <p><a href="/programmes/maauni">Maʼauni</a> (mesure) est actif. Il construit les jeux de test, la normalisation du texte et les protocoles d’écoute qui donnent un sens à un résultat en hausa ou en zarma. Chaque taux d’erreur que nous publierons pour le hausa sera donné deux fois, « strict » et « replié ».</p>

      <h2 id="how-we-work">Notre façon de travailler</h2>
      <p>Le consentement passe avant la collecte. Les locuteurs apprendront dans leur propre langue à quoi sert un enregistrement, et ils choisiront les usages qu’ils autorisent. Ils peuvent se retirer. Toute personne qui enregistre, transcrit ou évalue de la parole pour nous sera rémunérée, et le tarif sera public.</p>
      <p>Nous publions les méthodes et les échecs en même temps que les résultats. Hira existe parce que notre première conception, un seul modèle qui apprenait tout à la fois, a saisi le rythme de la conversation mais en a manqué le sens. Nous le publierons comme un résultat de recherche.</p>
      {/* Competition result kept apart from model results (claims gate 1). Source: posts.tsx, Swahili post:
          17.81% WER, Zindi private leaderboard, 4,089 test recordings, published 2025-09-19. */}
      <p>Chaque chiffre que nous publierons précisera ses conditions et ce qu’il ne permet pas de montrer. Namu n’a encore publié de résultat de benchmark mesuré pour aucun de ses modèles. Le seul résultat public de notre équipe provient d’une compétition. La solution d’Abdourahamane Ide Salifou a remporté l’AI for Good Swahili ASR Challenge sur Zindi en 2025, avec un taux d’erreur sur les mots (WER) de 17,81 % au classement privé (<a href="/research/swahili-asr-challenge">lire le compte rendu</a>). Nous ne mélangeons pas les résultats de compétition et les résultats de modèles.</p>
      <p>Nous rendons publics des outils, des jeux de test et des mesures lorsque le consentement et les licences le permettent. Quand quelque chose reste fermé, nous disons ce que c’est et pourquoi.</p>

      <h2 id="what-comes-next">La suite</h2>
      <p>Prochainement, Maʼauni publiera la v1 de son normaliseur pour le hausa, avec des cas de test, puis recalculera les scores des modèles hausa ouverts sur des jeux de test publics. Tankaɗe décrira ses chaînes de traitement et leurs rendements. Rumbu publiera son dispositif de consentement et son taux de rémunération. L’étape en cours pour Hira est une oreille entraînée sur de l’audio téléphonique réel, pour que l’écoute d’Aïr ne passe plus par une transcription.</p>
      <p>Deux notes de recherche paraissent en même temps que celle-ci : <a href="/research/who-is-in-the-fleurs-hausa-test-set">Qui figure dans le jeu de test hausa de FLEURS</a> et <a href="/research/why-we-report-every-hausa-score-twice">Pourquoi nous publions chaque score hausa deux fois</a>.</p>
      <p>Si vous parlez hausa ou zarma, ou si vous écrivez, transcrivez ou étudiez l’une de ces langues, chaque page de programme précise l’aide dont le programme a besoin. Écrivez-nous à <a href="mailto:contact@namuai.org">contact@namuai.org</a>.</p>
    </>
  ),
};

/* ------------------------------------------------------------------------------------------------ */
/* 2. Who is in the FLEURS Hausa test set                                                             */
/* ------------------------------------------------------------------------------------------------ */

/* Every FLEURS figure stated below, computed from ./fleurs-ha-test.ts (FLEURS_HA_TEST), 2026-10-13:

     const { d, male } = FLEURS_HA_TEST;            // d: seconds per utterance, rounded to 0.1 s; male: indices
     d.length                                       // 621 utterances
     male                                           // [504]  → 1 labelled male, utterance 505 in file order
     d.length - male.length                         // 620 labelled female
     d[504]                                         // 12.8 s (the one utterance labelled male)
     d.reduce((a, b) => a + b, 0)                   // 12023.4 s = 200.39 min = 3.3398 h
       rounding bound: 621 × ±0.05 s = ±31 s = ±0.0086 h  → stated as "about 3.3 hours"
       (research-programmes.md reports 3.34 h from the full TSV; consistent)
     [...d].sort((a, b) => a - b)[310]              // median 17.9 s (311th of 621)
     Math.min(...d), Math.max(...d)                 // 6.1 s, 78.9 s

   Not stated, because the file does not support it: number of distinct speakers (no speaker ids in the
   extracted data), the utterance id 1902 (not in this file), anything about transcripts or spelling. */

const fleursNoteFr: Post = {
  slug: "who-is-in-the-fleurs-hausa-test-set",
  title: "Qui figure dans le jeu de test hausa de FLEURS",
  dek: "La partie test hausa de FLEURS contient 621 énoncés lus, soit environ 3,3 heures d’audio. Ses métadonnées attribuent l’étiquette « féminin » à 620 d’entre eux et l’étiquette « masculin » à un seul.",
  date: "2026-10-13",
  readMinutes: 3,
  kind: "Research",
  programme: "maauni",
  authors: [],
  team: "Namu AI Lab",
  artefacts: [{ label: "FLEURS sur Hugging Face", href: "https://huggingface.co/datasets/google/fleurs" }],
  sections: [
    { id: "contents", title: "Son contenu" },
    { id: "why-it-matters", title: "Pourquoi c’est important" },
    { id: "limits", title: "Ses limites" },
    { id: "what-we-do", title: "Ce que nous en faisons" },
  ],
  body: (
    <>
      <p>FLEURS est un benchmark de parole conçu par Google, qui couvre 102 langues (<a href="https://arxiv.org/abs/2205.12446">Conneau et al., 2022</a>). De nombreux articles y publient des résultats pour le hausa. Sa configuration hausa s’appelle ha_ng, pour le hausa tel qu’il est parlé au Nigeria. Nous avons regardé qui figure dans sa partie test, car c’est le jeu de test qui décide de ce qu’un score peut affirmer.</p>

      <h2 id="contents">Ce que contient la partie test</h2>
      <p>Le 12 octobre 2026, nous avons lu le fichier de métadonnées de cette partie, data/ha_ng/test.tsv, dans le dépôt google/fleurs sur Hugging Face (CC BY 4.0). Il recense 621 énoncés, soit environ 3,3 heures d’audio au total. Le plus court dure 6,1 secondes et le plus long 78,9 secondes. La médiane est de 17,9 secondes.</p>
      <p>Chaque énoncé porte une étiquette de genre. Parmi eux, 620 portent l’étiquette « féminin ». Un seul porte l’étiquette « masculin » : l’énoncé 505 dans l’ordre du fichier, qui dure 12,8 secondes. Les métadonnées ne donnent aucun identifiant de locuteur ; elles ne permettent donc pas de savoir combien de personnes différentes ont été enregistrées.</p>
      {/* Alt text (for FigureSlot): "621 thin vertical marks in rows, one per utterance of the FLEURS Hausa
          test split in file order. 620 marks share one colour. One mark, utterance 505, is highlighted and
          labelled as the only utterance recorded as male." */}
      <FigureSlot
        name="test-set"
        caption="Dans la partie test hausa de FLEURS, 620 des 621 énoncés portent l’étiquette « féminin ». Un trait par énoncé, dans l’ordre du fichier ; le trait mis en évidence est l’énoncé 505, le seul étiqueté « masculin ». Source : google/fleurs, data/ha_ng/test.tsv (CC BY 4.0), consulté le 12 octobre 2026."
      />

      <h2 id="why-it-matters">Pourquoi c’est important</h2>
      <p>Un taux d’erreur sur les mots (WER) mesuré sur cette partie décrit la façon dont un modèle entend du hausa lu par des voix étiquetées « féminin », dans un ensemble étiqueté « hausa du Nigeria ». C’est utile, et c’est la limite de ce que cette partie peut montrer.</p>
      <p>Cette partie ne permet pas d’établir un score distinct pour les hommes. Un seul énoncé est un exemple, et un taux calculé sur lui ne voudrait rien dire. Elle ne dit rien non plus, directement, du hausa du Niger. Quand un article publie un chiffre unique pour le hausa sur FLEURS, ces limites accompagnent ce chiffre, que l’article les mentionne ou non.</p>

      <h2 id="limits">Ses limites</h2>
      <ul>
        <li><strong>De la parole lue.</strong> Les locuteurs de FLEURS lisent des phrases tirées de FLoRes-101, un benchmark de traduction construit à partir d’articles Wikimedia en anglais (Conneau et al., 2022). Le registre est celui du hausa écrit, lu à voix haute. La conversation spontanée en est absente.</li>
        <li><strong>Une seule variété.</strong> La configuration est étiquetée « hausa du Nigeria ». Rien n’y est étiqueté comme hausa du Niger.</li>
        <li><strong>Une seule étiquette de genre, ou presque.</strong> 620 énoncés sur 621 portent la même étiquette ; le genre ne peut donc pas être étudié avec cet ensemble.</li>
        <li><strong>Des locuteurs inconnus.</strong> Sans identifiants de locuteur, nous ne pouvons pas vérifier combien de voix contiennent ces 3,3 heures, ni si quelques locuteurs y dominent.</li>
        <li><strong>Une orthographe pas encore vérifiée.</strong> Nous n’avons pas encore vérifié avec quelle régularité ses transcriptions écrivent les lettres crochetées ɓ ɗ ƙ ƴ. Cette vérification compte pour le calcul des scores, et elle fera partie de notre note de réévaluation.</li>
      </ul>

      <h2 id="what-we-do">Ce que nous en faisons</h2>
      <p>Il vaut toujours la peine de publier des résultats sur FLEURS, car cela permet de les comparer aux travaux publiés. Quand nous le ferons, nous indiquerons la partie utilisée, le normaliseur et sa version, ainsi que les limites ci-dessus.</p>
      <p>Pour les affirmations que FLEURS ne permet pas d’étayer, il nous faut d’autres jeux de test. <a href="/programmes/rumbu">Rumbu</a> prévoit un jeu de test hausa à locuteurs disjoints, qui précise ses dialectes, ses genres et ses conditions téléphoniques, et qui sera figé avant toute collecte de données d’entraînement. D’ici là, nous dirons à quelles questions nous ne pouvons pas encore répondre.</p>
    </>
  ),
};

/* ------------------------------------------------------------------------------------------------ */
/* 3. Why we report every Hausa score twice                                                           */
/* ------------------------------------------------------------------------------------------------ */

/* WER computation for the worked example (standard Levenshtein word alignment, unit costs for
   substitution, deletion and insertion; WER = (S + D + I) / N, N = reference words).
   Computed 2026-10-13 twice: with the site's port (src/lib/strict-folded.ts rules) and with
   ~/Desktop/Air/langs/hau/normalize.py (normalize = strict, fold_ascii = folded). Both agree.

   REF: "Ana yin allurar rigakafi kowace Talata da Alhamis, daga ƙarfe takwas na safe."
   HYP: "ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe"

   Strict (NFC, lower-case, punctuation → space, apostrophes unified; hooks kept):
     ref: ana yin allurar rigakafi kowace talata da alhamis daga ƙarfe takwas na safe   (N = 13)
     hyp: ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe   (13)
     alignment: 11 matches; S = 2 (ƙarfe→karfe, na→da); D = 0; I = 0
     WER = 2 / 13 = 0.153846 → 15.4%

   Folded (strict, then ɓ→b ɗ→d ƙ→k ƴ→y, ʼ removed):
     ref: ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas na safe
     hyp: ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe
     alignment: 12 matches; S = 1 (na→da); D = 0; I = 0
     WER = 1 / 13 = 0.076923 → 7.7%

   No normalisation (split on whitespace only):
     S = 6 (Ana→ana, Talata→talata, "Alhamis,"→alhamis, ƙarfe→karfe, na→da, "safe."→safe); D = 0; I = 0
     WER = 6 / 13 = 0.461538 → 46.2%

   No alignment with fewer edits exists in any mode: the sequences have equal length and differ position
   by position only where listed; any shift costs at least two edits. */

const strictFoldedFr: Post = {
  slug: "why-we-report-every-hausa-score-twice",
  title: "Pourquoi nous publions chaque score hausa deux fois",
  dek: "En hausa, un taux d’erreur sur les mots (WER) dépend de la façon dont le texte est nettoyé avant le calcul du score. Nous publierons chaque résultat en « strict », qui conserve les lettres crochetées, et en « replié », qui les retire.",
  date: "2026-10-13",
  readMinutes: 3,
  kind: "Research",
  programme: "maauni",
  authors: [],
  team: "Namu AI Lab",
  artefacts: [],
  sections: [
    { id: "two-scores", title: "Deux scores" },
    { id: "worked-example", title: "Un exemple détaillé" },
    { id: "what-folding-hides", title: "Ce que le repliement cache" },
    { id: "our-rule", title: "Notre règle" },
  ],
  body: (
    <>
      <p>Le taux d’erreur sur les mots (WER) compte les mots sur lesquels un système de reconnaissance de la parole s’est trompé, sous forme de substitutions, de suppressions et d’insertions, puis divise ce nombre par le nombre de mots de la référence. Avant de compter, l’outil de notation nettoie les deux textes. En hausa, cette étape de nettoyage peut changer le score sans que rien ne change dans le modèle.</p>

      <h2 id="two-scores">Deux scores</h2>
      <p>Nos deux scores commencent de la même façon. Les majuscules et la ponctuation sont des conventions d’écriture : nous les retirons donc des deux textes, et nous écrivons tout signe semblable à une apostrophe avec un seul et même caractère, ʼ.</p>
      <p>Le score « strict » conserve ensuite les lettres crochetées ɓ ɗ ƙ ƴ et l’apostrophe. Un mot écrit avec k là où la référence porte ƙ compte comme une erreur.</p>
      <p>Le score « replié » (folded en anglais) ramène ɓ ɗ ƙ ƴ à b d k y, c’est-à-dire qu’il replie chaque lettre crochetée sur la lettre simple correspondante, et supprime l’apostrophe avant le comptage.</p>
      <p>Le repliement existe pour une raison légitime. Le hausa est souvent saisi sur des claviers qui n’ont pas ces lettres ; beaucoup de transcriptions omettent donc les crochets ou placent une apostrophe devant une lettre simple. Si une référence a perdu un crochet que le modèle, lui, a écrit, le score strict compte comme une faute l’orthographe correcte du modèle.</p>

      <h2 id="worked-example">Un exemple détaillé</h2>
      <p>La paire ci-dessous a été construite pour illustrer le calcul. La seconde ligne n’est la sortie d’aucun modèle.</p>
      {/* NATIVE-REVIEW: reference sentence, hypothesis and English gloss. Sentence and hypothesis were supplied
          in the brief; the gloss is ours. Confirm a founder wrote or approved the sentence. */}
      <blockquote>
        <p lang="ha">Référence : Ana yin allurar rigakafi kowace Talata da Alhamis, daga ƙarfe takwas na safe.</p>
        <p lang="ha">Hypothèse : ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe</p>
        <p>Les vaccins sont administrés tous les mardis et jeudis, à partir de huit heures du matin.</p>
      </blockquote>
      {/* NATIVE-REVIEW: the words ƙarfe, karfe, na, da as cited from the example. */}
      <p>Après nettoyage, chaque ligne compte 13 mots, et il reste deux différences. Le modèle a écrit karfe sans le crochet du ƙ, et il a écrit da là où la référence porte na.</p>
      <p>Le score strict compte les deux : 2 erreurs sur 13 mots, soit un WER de 15,4 %. Le score replié fait de ƙarfe et de karfe un seul et même mot, ce qui laisse 1 erreur sur 13, soit 7,7 %.</p>
      {/* NATIVE-REVIEW: Ana, Talata, Alhamis, safe as cited from the example. */}
      <p>Sans aucun nettoyage, la même paire obtient 6 erreurs sur 13 mots, soit 46,2 %. Quatre mots corrects, Ana, Talata, Alhamis et safe, comptent comme des erreurs à cause d’une majuscule ou d’un signe de ponctuation.</p>
      {/* Alt text (for FigureSlot): "The reference and the hypothesis aligned word by word. In strict mode, two
          words are marked as errors: ƙarfe written as karfe, and na written as da. In folded mode, only na
          written as da is marked. A readout shows 2 of 13 words, 15.4%, strict, and 1 of 13, 7.7%, folded." */}
      <FigureSlot
        name="strict-folded"
        caption="Sur cette paire construite, le score strict compte 2 erreurs sur 13 mots (15,4 %) et le score replié en compte 1 (7,7 %). Le repliement efface le crochet manquant de ƙarfe. Aucune des deux lignes n’est une sortie de modèle."
      />

      <h2 id="what-folding-hides">Ce que le repliement cache</h2>
      <p>Dans cet exemple, le repliement divise le score par deux. L’erreur qu’il efface est le crochet manquant, le type d’erreur qu’un lecteur hausa remarque en premier.</p>
      {/* NATIVE-REVIEW: kasa / ƙasa and the gloss "(land, country)". Source for the pair: programmes.ts (Maʼauni). */}
      <p>En hausa, ɓ ɗ ƙ ƴ sont des lettres à part entière, qui notent des sons distincts. Une transcription qui écrit kasa pour ƙasa (terre, pays) est fausse aux yeux d’un lecteur hausa, et le score replié la juge correcte. Un système de reconnaissance de la parole qui n’écrit jamais de lettre crochetée peut obtenir un bon score replié tout en produisant un texte qu’un locuteur du hausa doit corriger à la main.</p>
      {/* NATIVE-REVIEW: saʼa and sa'a (U+02BC vs U+0027) as cited. Source: programmes.ts (Maʼauni description). */}
      <p>L’apostrophe pose la même question. Ceux qui écrivent le hausa utilisent plusieurs caractères différents pour la noter. Un outil de notation qui ne les unifie pas compte sa'a et saʼa comme deux mots différents, et un outil qui traite l’apostrophe comme une ponctuation coupe saʼa en deux.</p>

      <h2 id="our-rule">Notre règle</h2>
      <p>Chaque WER en hausa publié par le Lab sera donné deux fois, strict et replié, côte à côte. L’écart entre les deux montre dans quelle mesure un résultat dépend de l’orthographe. Nous indiquerons le normaliseur et sa version.</p>
      <p>Le nôtre sera publié sous le nom de normaliseur Maʼauni v1, avec des cas de test, et la figure de cette page fonctionnera avec le même code. Nous n’avons pas encore publié de score hausa qui nous soit propre. Quand nous le ferons, il suivra cette règle.</p>
      <p>Si vous publiez des résultats en hausa et souhaitez recalculer leurs scores avec un normaliseur commun, écrivez-nous à <a href="mailto:contact@namuai.org">contact@namuai.org</a>.</p>
    </>
  ),
};

/* ------------------------------------------------------------------------------------------------ */
/* 4. Winning the Swahili ASR challenge (posts.tsx)                                                   */
/* ------------------------------------------------------------------------------------------------ */

/* First published on namu-ai.org (19 September 2025) by Abdourahamane Ide Salifou.
   Lightly edited for the Lab: section headings added for navigation, the closing lessons set as a
   list, the measurement conditions set as a callout (all facts from the original), one grammar fix. */
const swahiliFr: Post = {
  slug: "swahili-asr-challenge",
  title: "Remporter le défi ASR en swahili sur un seul GPU de 16 Go",
  dek: "Comment une machine apprend à comprendre la parole des bus, des marchés et des bureaux animés. Première place avec un taux d’erreur sur les mots (WER) de 17,81 % au classement privé de la compétition, avec un modèle entraîné sur un seul GPU emprunté.",
  date: "2025-09-19",
  readMinutes: 6,
  kind: "Research",
  authors: ["Abdourahamane Ide Salifou"],
  artefacts: [{ label: "Code", href: "https://github.com/SalifouAbdourahamane/swahili_asr_sota_model" }],
  origin: { label: "Publié pour la première fois sur namu-ai.org", href: "https://www.namu-ai.org/blog/swahili-asr-challenge" },
  sections: [
    { id: "real-speech", title: "La parole réelle" },
    { id: "starting-point", title: "Point de départ" },
    { id: "noise", title: "S’attendre au bruit" },
    { id: "one-gpu", title: "Un seul GPU" },
    { id: "decoding", title: "Le décodage" },
    { id: "what-it-means", title: "Ce que signifie 17,81 %" },
    { id: "lessons", title: "Leçons pour le hausa" },
  ],
  body: (
    <>
      <p>Vous êtes-vous déjà demandé comment une machine apprend à comprendre une langue, non pas à partir d’un texte proprement tapé sur un écran, mais à partir de la vraie parole humaine, celle des bus, des marchés, des bureaux animés ou des maisons tranquilles ? Une parole pleine d’interruptions, de bruits de fond, d’accents, de rires et d’hésitations ?</p>
      <p>C’est à cette question que nous voulions répondre en participant à l’AI for Good Swahili ASR Challenge sur Zindi. Nous avons fini par remporter la compétition.</p>
      <p>Notre système a obtenu un taux d’erreur sur les mots (WER) de 17,81 % au classement privé et de 18,22 % au classement public. Il traitait chaque enregistrement en 1,24 seconde environ et a transcrit l’intégralité du jeu de test, soit 4 089 enregistrements, en une heure et vingt-quatre minutes. Nous avons entraîné tout le système sur un seul GPU emprunté.</p>
      <p>Mais le score n’est pas l’aspect le plus important de ce travail.</p>
      <p>Ce qui comptait pour nous, c’est que ce défi reflétait bon nombre des conditions que nous rencontrons quand nous construisons des technologies de la parole pour les langues africaines : des enregistrements bruités, une puissance de calcul limitée et des langues encore mal représentées dans les plus grands modèles d’IA.</p>

      <h2 id="real-speech">De la parole réelle, pas de la parole lue</h2>
      <p>Le swahili n’est pas le hausa, mais beaucoup de problèmes techniques sont semblables. Une grande partie des données vocales disponibles en ligne est de la parole lue. Quelqu’un s’assoit dans une pièce calme, utilise un bon microphone et lit des phrases préparées. Ces données sont propres et faciles à annoter, mais les modèles entraînés uniquement sur elles ont souvent du mal face à de vraies conversations.</p>
      <p>Dans la réalité, les gens marquent des pauses, s’interrompent, changent d’avis, parlent avec des accents différents et prononcent les mots différemment selon leur région d’origine. Ils parlent aussi dans des lieux où il y a de la circulation, de la musique, du vent, des marchés et d’autres personnes qui parlent à côté.</p>
      <p>C’est pourquoi nous avons entraîné notre modèle sur le jeu de données SALT de Sunbird, un corpus conversationnel en swahili avec plusieurs locuteurs et des dialogues naturels. Ces données étaient plus difficiles à exploiter, mais elles étaient bien plus proches de l’environnement dans lequel le modèle serait finalement utilisé.</p>

      <h2 id="starting-point">Partir d’un modèle distillé</h2>
      <p>Nous n’avons pas entraîné le modèle à partir de zéro. Nous sommes partis d’un checkpoint distillé de Whisper, déjà entraîné sur les données swahili de Common Voice 12. Le modèle avait ainsi une compréhension de base des sonorités du swahili avant que nous commencions à l’affiner.</p>
      <p>Un modèle distillé est un modèle plus petit, entraîné pour reproduire une grande partie des performances d’un modèle plus grand. Il demande moins de mémoire et de puissance de calcul, tout en conservant une grande partie de la précision du modèle d’origine.</p>
      <p>C’était important, car il ne s’agissait pas seulement de construire un système précis. Le système devait aussi être assez petit et efficace pour tourner sur un appareil, au lieu de dépendre d’un grand serveur dans le cloud. Comme le modèle de départ comprenait déjà un peu le swahili, nous pouvions consacrer nos ressources d’entraînement limitées à l’aider à gérer de vraies conversations et un audio difficile.</p>

      <h2 id="noise">Entraîner le modèle à s’attendre au bruit</h2>
      <p>Une façon courante de traiter les enregistrements bruités consiste à nettoyer l’audio avant la transcription. Le système essaie de supprimer le bruit de la circulation, des marchés ou d’autres conversations avant d’envoyer l’enregistrement au modèle de parole.</p>
      <p>Nous avons choisi une autre approche. Au lieu d’essayer de supprimer le bruit, nous avons entraîné le modèle à s’y attendre.</p>
      <p>Pendant l’entraînement, notre collateur de données personnalisé sélectionnait des sons dans une collection de bruits urbains d’Afrique de l’Est, notamment la circulation, les marchés et des conversations proches. Il mélangeait ces sons aux enregistrements d’entraînement à différents niveaux de volume. Le modèle entendait chaque fois une combinaison différente. Il ne pouvait pas se contenter de mémoriser un seul type de bruit de fond. Il devait apprendre à reconnaître la parole même en présence d’autres sons.</p>
      <p>C’est peut-être l’élément le plus important de tout le système. Un modèle qui n’a entendu que des enregistrements de studio propres aura du mal la première fois que quelqu’un essaiera de l’utiliser dans un bus, au bord d’une route ou au milieu d’un marché animé.</p>

      <h2 id="one-gpu">Un seul GPU, emprunté</h2>
      <p>Nous avons entraîné le modèle sur un seul GPU NVIDIA T4 doté de 16 Go de mémoire, dans un notebook Kaggle gratuit. Cette contrainte a façonné la manière dont nous avons construit le système.</p>
      <p>Au lieu de mettre à jour toutes les parties de Whisper, nous avons gelé le modèle principal et entraîné de petits adaptateurs LoRA dans ses couches d’attention. Cela nous a permis d’ajuster le modèle en n’entraînant qu’un faible pourcentage de ses paramètres. Nous avons aussi chargé le modèle en précision 8 bits pour réduire ses besoins en mémoire. L’entraînement en précision mixte et le gradient checkpointing nous ont permis d’économiser encore davantage de mémoire.</p>
      <p>Avec ces changements, nous avons entraîné le modèle avec une taille de lot de quatre et utilisé l’accumulation de gradients pour atteindre une taille de lot effective de huit. Nous avons utilisé un taux d’apprentissage de 1e-5 et 500 étapes d’échauffement, et retenu le checkpoint qui avait l’erreur de validation la plus faible.</p>
      <p>Ces méthodes n’ont rien d’inhabituel ni d’expérimental. Ce sont des outils standards pour entraîner des modèles avec des ressources limitées. C’est justement pour cela qu’elles comptent. Construire un modèle de parole compétitif pour une langue peu dotée n’a pas exigé l’accès à un grand laboratoire de recherche. Nous l’avons entraîné sur du matériel auquel un étudiant pouvait accéder gratuitement. Pour beaucoup de personnes qui travaillent sur les langues africaines, c’est la réalité.</p>

      <h2 id="decoding">Le décodage</h2>
      <p>Pendant la transcription, nous avons utilisé une recherche en faisceau (beam search) avec trois sorties possibles et une pénalité de répétition de 1,2.</p>
      <p>Une méthode plus simple, appelée décodage glouton, choisit à chaque étape le mot suivant le plus probable et ne revient jamais en arrière. Cela peut bien fonctionner sur un audio propre. Sur des enregistrements bruités, en revanche, le modèle peut commettre une erreur dès le début, perdre le fil de la phrase et se mettre à répéter les mêmes mots. La recherche en faisceau garde plusieurs transcriptions possibles ouvertes en même temps. Elle demande un peu plus de calcul, mais elle donne au modèle de meilleures chances de se remettre d’une incertitude.</p>
      <p>Nous n’avons pas utilisé de modèle de langue séparé, ni combiné plusieurs modèles en un ensemble. Ces deux approches auraient peut-être amélioré le score final, mais elles auraient aussi rendu le système plus lourd et plus difficile à déployer. Notre objectif n’était pas seulement de bien figurer au classement. Nous voulions construire quelque chose qui puisse, de façon réaliste, être utilisé.</p>

      <h2 id="what-it-means">Ce que signifie 17,81 %</h2>
      <p>Un WER de 17,81 % signifie qu’environ un mot sur six est mal transcrit. Ce n’est pas assez précis pour des tâches qui exigent une trace écrite parfaite, comme la dictée professionnelle. Mais cela peut quand même être utile lorsque l’objectif est de comprendre ce que quelqu’un demande.</p>
      <p>Même quand un mot est erroné, le reste de la phrase fournit souvent assez de contexte pour comprendre ce que veut dire la personne qui parle. Cette distinction entre produire une transcription parfaite et comprendre la demande d’une personne est importante pour les systèmes que nous construisons.</p>
      <div className="callout"><span className="label">Conditions</span>Ce résultat vaut pour le jeu de test de la compétition : 4 089 enregistrements, 16 kHz mono, d’un peu plus de six secondes en moyenne, évalués par l’organisateur sur le classement privé de Zindi. Nous ne nous attendrions pas au même résultat avec n’importe quel microphone, dialecte, locuteur ou environnement.</div>

      <h2 id="lessons">Quatre leçons que nous appliquons au hausa</h2>
      <ol>
        <li>Les données conversationnelles valent davantage que des enregistrements parfaitement propres lorsque le système sera utilisé dans de vraies conversations.</li>
        <li>Le bruit doit faire partie de l’entraînement. Nous ne pouvons pas supposer que les gens parleront toujours depuis des pièces calmes ou dans des microphones coûteux.</li>
        <li>L’affinage économe en paramètres (parameter-efficient fine-tuning) rend possible une recherche sérieuse sur la parole sans gros budgets de calcul. C’est particulièrement important pour les chercheurs et les communautés les plus proches des langues peu dotées.</li>
        <li>Le décodage compte. Sur un audio difficile, la différence entre le décodage glouton et la recherche en faisceau peut être celle qui sépare une réponse utile d’une phrase répétée qui ne mène nulle part.</li>
      </ol>
      <p>Le hausa fait face à bon nombre des mêmes défis que le swahili, mais avec encore moins de jeux de données, de modèles et de ressources techniques disponibles.</p>
      <p>Le code complet d’entraînement et d’inférence est disponible sur <a href="https://github.com/SalifouAbdourahamane/swahili_asr_sota_model">github.com/SalifouAbdourahamane/swahili_asr_sota_model</a>. Une explication technique plus détaillée de la solution est également disponible sur Zindi.</p>
    </>
  ),
};

export const postsFr: Post[] = [introducingFr, fleursNoteFr, strictFoldedFr, swahiliFr];

/* ------------------------------------------------------------------------------------------------ */
/* 5. About page                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

export const aboutCopyFr: AboutCopy = {
  hero: "Namu AI Lab est l’unité de recherche de Namu, consacrée à la parole en hausa et en zarma.",
  intro: [
    "Namu construit, pour les langues africaines, des modèles, des jeux de données et des produits conçus nativement pour la parole. Les produits se trouvent sur namu-ai.org. Le Lab publie la recherche qui les sous-tend, sous forme de programmes, d’articles, de jeux de données, d’évaluations et de démonstrations de recherche.",
    // Sources: Hausa ≈ 94M (Ethnologue via Wikipedia; voice file: Ethnologue 2026); Zarma ≈ 6.0M (Ethnologue 26th ed., 2023).
    "Nous commençons par le hausa, qui compte environ 94 millions de locuteurs en langue première ou seconde (Ethnologue, 2026), et par le zarma, qui en compte environ six millions (Ethnologue, 26e édition, 2023). Nous travaillons d’abord au Niger, parce que les données vocales publiques en hausa viennent surtout du Nigeria et que le zarma est presque absent des technologies de la parole.",
    "Notre travail s’organise en cinq programmes, de la collecte de parole consentie à la mesure de ce que les modèles en font. Chaque page de programme présente ses prochaines étapes et se termine par ce que nous n’affirmons pas encore.",
  ],
  principles: [
    {
      title: "Le consentement avant la collecte",
      body: "Personne n’enregistre pour le Lab sans un consentement éclairé, donné dans sa propre langue. Les locuteurs choisissent les usages qu’ils autorisent, comme la recherche, la diffusion ouverte ou la synthèse vocale, et ils peuvent se retirer. Leurs choix accompagnent chaque fichier produit à partir de leur voix.",
    },
    {
      title: "Les personnes sont rémunérées, les communautés sont partenaires",
      body: "Toute personne qui enregistre, transcrit ou évalue de la parole pour le Lab sera rémunérée pour son temps, à un tarif que nous publions avant le début de la collecte. Les locuteurs, les relecteurs et les linguistes seront crédités comme des collègues, et comme coauteurs lorsque leur travail le justifie.",
    },
    {
      title: "Un chiffre s’accompagne de ses conditions",
      body: "Chaque résultat indique son jeu de test, son normaliseur et la version de celui-ci, ainsi que ses auditeurs s’il y en a, et dit ce qu’il ne permet pas de montrer. Pour le hausa, chaque taux d’erreur est donné deux fois, « strict » et « replié ». Nous publions aussi les résultats négatifs.",
    },
    {
      title: "Ouvert par défaut, fermé pour une raison précise",
      body: "Nous rendons publics des outils, des jeux de test, des chaînes de traitement et des mesures lorsque le consentement et les licences le permettent. Nous ne diffusons pas une voix au-delà de ce que son locuteur a accepté, ni des données dont la licence l’interdit, ni un modèle avant qu’il ait passé les contrôles de diffusion de Namu. Quand quelque chose reste fermé, nous disons ce que c’est et pourquoi.",
    },
  ],
  founders: [
    {
      name: "Mouhamad Mamane",
      role: "Cofondateur et directeur général, Namu",
      bio: "Mouhamad Mamane a cofondé Namu, qu’il dirige en tant que directeur général. Avec Abdourahamane Ide Salifou, il approuve ce que le Lab publie, y compris les résultats et les décisions concernant les voix et les données.",
    },
    {
      name: "Abdourahamane Ide Salifou",
      role: "Cofondateur, responsable de la recherche en reconnaissance de la parole",
      // Source: posts.tsx (Swahili post, 2025-09-19). Competition result, not a Namu model result.
      bio: "Abdourahamane Ide Salifou a cofondé Namu et y dirige la recherche en reconnaissance de la parole. En 2025, sa solution a remporté l’AI for Good Swahili ASR Challenge sur Zindi, avec un taux d’erreur sur les mots (WER) de 17,81 % au classement privé de la compétition. Il l’a entraînée sur un seul GPU de 16 Go, emprunté, et le code est public.",
    },
  ],
  // Source: the `collaborate` lines in programmes.ts; contact address from site.ts.
  careers: "Chaque page de programme précise l’aide dont le programme a besoin. Nous recherchons aujourd’hui des locuteurs du hausa, rémunérés, pour des enregistrements à deux, des auditeurs et des transcripteurs natifs couvrant les dialectes du hausa, des auteurs et des linguistes de langue zarma, ainsi que des chercheurs qui travaillent sur l’alternance des tours de parole et sur la mesure. Écrivez à contact@namuai.org en indiquant le programme sur lequel vous souhaitez travailler.",
};
