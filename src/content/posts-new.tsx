import type { Post } from "./posts";
import { FigureSlot } from "@/components/FigureSlot";

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

export const introducing: Post = {
  slug: "introducing-namu-ai-lab",
  title: "Introducing Namu AI Lab",
  dek: "Namu AI Lab is the research unit of Namu. We study speech technology for Hausa and Zarma in five research programmes, and we publish how we measure the work.",
  date: "2026-10-13",
  readMinutes: 4,
  kind: "Story",
  authors: ["Mouhamad Mamane", "Abdourahamane Ide Salifou"],
  artefacts: [],
  sections: [
    { id: "what-the-lab-is", title: "What the Lab is" },
    { id: "why-the-sahel", title: "Why the Sahel" },
    { id: "programmes", title: "Five programmes" },
    { id: "how-we-work", title: "How we work" },
    { id: "what-comes-next", title: "What comes next" },
  ],
  body: (
    <>
      <p>Namu AI Lab is the research unit of Namu. We study speech technology for Hausa and Zarma, two languages of the Sahel, and we publish that work here with the way we measured it.</p>

      <h2 id="what-the-lab-is">What the Lab is</h2>
      <p>Namu builds speech-native models, datasets and products for African languages. The products live at <a href="https://www.namu-ai.org">namu-ai.org</a>. The Lab publishes the research underneath them.</p>
      <p>We start with Hausa, and Zarma comes next. Every programme page ends with what we do not claim yet.</p>

      <h2 id="why-the-sahel">Why the Sahel’s languages</h2>
      {/* Speaker counts: Hausa ≈ 94M L1+L2 (Ethnologue via Wikipedia: 58M + 36M; the parent voice file gives
          "Ethnologue 2026: 94.5 million"). Zarma ≈ 6.0M (Ethnologue 26th ed., via Wikipedia). "One of the main
          languages of Niamey": SALAN §3, as in programmes.ts. Founders: confirm the Ethnologue edition for Hausa. */}
      <p>Hausa has about 94 million first- and second-language speakers (Ethnologue, 2026). Zarma has about six million (Ethnologue, 26th edition, 2023) and is one of the main languages of Niamey.</p>
      <p>Speech technology has not kept up with either language. Most public Hausa speech data was read aloud from a script, in Nigeria. In the Hausa test set of FLEURS, a benchmark many papers report, 620 of 621 utterances are labelled female. As far as we can find, Zarma has no Common Voice collection, no FLEURS test set and no adapter in Meta’s MMS recogniser.</p>
      <p>Namu holds that access to technology should not depend on speaking a global language or being able to read and write. So the Lab works on speech, and it starts with Niger, which public Hausa datasets mostly leave out.</p>

      <h2 id="programmes">Five programmes</h2>
      <p>The work is organised in five programmes. Rumbu and Tankaɗe bring data in and make it usable. Hira and the Zarma programme build on that data. Maʼauni measures all of it.</p>
      {/* NATIVE-REVIEW: gloss "Hira (conversation)". Source: research-programmes.md ("conversation, chat"). */}
      <p><a href="/programmes/hira">Hira</a> (conversation) is active. It studies full-duplex speech in Hausa, with models that listen while they speak. Our working system, Aïr, has an ear, a brain and a mouth. The brain is AfriqueQwen3.5-9B from McGill NLP (CC BY 4.0), and we do not retrain its weights. The mouth is built on Kyutai’s Moshi (weights under CC BY 4.0). Aïr’s live hearing still goes through a written transcript, so it is not yet end-to-end speech-to-speech.</p>
      {/* NATIVE-REVIEW: gloss "Rumbu (granary)". Source: research-programmes.md. */}
      <p><a href="/programmes/rumbu">Rumbu</a> (granary) is opening. It will build a consented Hausa speech commons, Niger first, including two-person conversations on separate channels, ordinary phone calls and speakers who do not read. Nothing has been collected yet. The consent design and the pay rate will be published before recording starts.</p>
      <p><a href="/programmes/zarma">Zarma from the ground up</a> is starting. Namu has no Zarma data, model or measurement yet. The programme begins with a written convention vetted by Zarma writers and a small consented test set, and only then turns to models.</p>
      {/* NATIVE-REVIEW: name "Tankaɗe" and gloss "(sifting)". Source: research-programmes.md ("sifting", from tankaɗe da rairaya). */}
      <p><a href="/programmes/tankade">Tankaɗe</a> (sifting) is active. It studies how radio archives, field recordings and crowd audio become data a model can learn from and a reader can trust. Our pipelines run internally. Their yields and thresholds will appear in a write-up before we quote them.</p>
      {/* NATIVE-REVIEW: name "Maʼauni" (U+02BC) and gloss "(measure)". Source: research-programmes.md ("measure, scale"). */}
      <p><a href="/programmes/maauni">Maʼauni</a> (measure) is active. It builds the test sets, text normalisation and listening protocols that make a Hausa or Zarma result mean something. Every Hausa error rate we report will come twice, strict and folded.</p>

      <h2 id="how-we-work">How we work</h2>
      <p>Consent comes before collection. Speakers will be told in their own language what a recording is for, and they will choose the uses they allow. They can withdraw. Everyone who records, transcribes or rates speech for us will be paid, and the rate will be public.</p>
      <p>We publish methods and failures along with results. Hira exists because our first design, one model learning everything at once, picked up the rhythm of conversation and missed its sense. We will write that up as a finding.</p>
      {/* Competition result kept apart from model results (claims gate 1). Source: posts.tsx, Swahili post:
          17.81% WER, Zindi private leaderboard, 4,089 test recordings, published 2025-09-19. */}
      <p>Every number we publish will state its conditions and what it cannot show. Namu has not yet published a measured benchmark for any of its models. The one public result from our team comes from a competition. Abdourahamane Ide Salifou’s entry won the AI for Good Swahili ASR Challenge on Zindi in 2025, with a 17.81% word error rate on the private leaderboard (<a href="/research/swahili-asr-challenge">read the write-up</a>). We keep competition results apart from model results.</p>
      <p>We release tools, test sets and measurements where consent and licences allow. When something stays closed, we say what it is and why.</p>

      <h2 id="what-comes-next">What comes next</h2>
      <p>Next, Maʼauni will publish its Hausa normaliser as v1, with test cases, then re-score open Hausa models on public test sets. Tankaɗe will write up its pipelines and their yields. Rumbu will publish its consent design and pay rate. Hira’s current step is an ear trained on real phone audio, so that Aïr’s hearing no longer goes through a transcript.</p>
      <p>Two research notes appear alongside this one: <a href="/research/who-is-in-the-fleurs-hausa-test-set">Who is in the FLEURS Hausa test set</a> and <a href="/research/why-we-report-every-hausa-score-twice">Why we report every Hausa score twice</a>.</p>
      <p>If you speak Hausa or Zarma, or you write, transcribe or study either language, each programme page says what help it needs. Write to us at <a href="mailto:contact@namuai.org">contact@namuai.org</a>.</p>
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

export const fleursNote: Post = {
  slug: "who-is-in-the-fleurs-hausa-test-set",
  title: "Who is in the FLEURS Hausa test set",
  dek: "The Hausa test split of FLEURS holds 621 read utterances, about 3.3 hours of audio. Its metadata labels 620 of them female and one male.",
  date: "2026-10-13",
  readMinutes: 3,
  kind: "Research",
  programme: "maauni",
  authors: [],
  team: "Namu AI Lab",
  artefacts: [{ label: "FLEURS on Hugging Face", href: "https://huggingface.co/datasets/google/fleurs" }],
  sections: [
    { id: "contents", title: "What it contains" },
    { id: "why-it-matters", title: "Why it matters" },
    { id: "limits", title: "Its limits" },
    { id: "what-we-do", title: "What we do with it" },
  ],
  body: (
    <>
      <p>FLEURS is a speech benchmark from Google that covers 102 languages (<a href="https://arxiv.org/abs/2205.12446">Conneau et al., 2022</a>). Many papers report Hausa results on it. Its Hausa configuration is named ha_ng, for Hausa as spoken in Nigeria. We looked at who is in its test split, because a test set decides what a score can claim.</p>

      <h2 id="contents">What the test split contains</h2>
      <p>We read the split’s metadata file, data/ha_ng/test.tsv in the google/fleurs repository on Hugging Face (CC BY 4.0), on 12 October 2026. It lists 621 utterances, about 3.3 hours of audio in total. The shortest lasts 6.1 seconds and the longest 78.9 seconds. The median is 17.9 seconds.</p>
      <p>Each utterance carries a gender label. 620 are labelled female. One is labelled male, utterance 505 in file order, which lasts 12.8 seconds. The metadata gives no speaker identifier, so it cannot tell us how many different people were recorded.</p>
      {/* Alt text (for FigureSlot): "621 thin vertical marks in rows, one per utterance of the FLEURS Hausa
          test split in file order. 620 marks share one colour. One mark, utterance 505, is highlighted and
          labelled as the only utterance recorded as male." */}
      <FigureSlot
        name="test-set"
        caption="620 of the 621 utterances in the FLEURS Hausa test split are labelled female. One mark per utterance, in file order; the highlighted mark is utterance 505, the only one labelled male. Source: google/fleurs, data/ha_ng/test.tsv (CC BY 4.0), read 12 October 2026."
      />

      <h2 id="why-it-matters">Why it matters</h2>
      <p>A word error rate on this split describes how a model hears read Hausa from voices labelled female, in a set labelled Nigerian Hausa. That is useful, and it is the limit of what the split can show.</p>
      <p>The split cannot support a separate score for men. One utterance is an example, and a rate computed on it would mean nothing. It also says nothing direct about Hausa from Niger. When a paper reports a single Hausa number on FLEURS, these limits travel with the number, whether or not the paper states them.</p>

      <h2 id="limits">Its limits</h2>
      <ul>
        <li><strong>Read speech.</strong> FLEURS speakers read sentences from FLoRes-101, a translation benchmark built from English Wikimedia articles (Conneau et al., 2022). The register is written Hausa read aloud. Spontaneous conversation is absent.</li>
        <li><strong>One variety.</strong> The configuration is labelled Nigerian Hausa. Nothing in it is labelled as Hausa from Niger.</li>
        <li><strong>One gender label, almost entirely.</strong> 620 of 621 utterances carry the same label, so gender cannot be studied with it.</li>
        <li><strong>Speakers unknown.</strong> Without speaker identifiers we cannot check how many voices the 3.3 hours contain, or whether a few speakers dominate.</li>
        <li><strong>Spelling not yet checked.</strong> We have not yet checked how consistently its transcripts write the hooked letters ɓ ɗ ƙ ƴ. That check matters for scoring, and it will be part of our re-scoring note.</li>
      </ul>

      <h2 id="what-we-do">What we do with it</h2>
      <p>FLEURS is still worth reporting, because it lets results be compared with published work. When we report on it, we will name the split, the normaliser and its version, and the limits above.</p>
      <p>For the claims FLEURS cannot support, we need other test sets. <a href="/programmes/rumbu">Rumbu</a> plans a speaker-disjoint Hausa test set that states its dialects, genders and phone conditions, frozen before any training data is collected. Until it exists, we will say which questions we cannot yet answer.</p>
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

export const strictFolded: Post = {
  slug: "why-we-report-every-hausa-score-twice",
  title: "Why we report every Hausa score twice",
  dek: "A Hausa word error rate depends on how the text is cleaned before scoring. We will report each result strict, with the hooked letters kept, and folded, with them removed.",
  date: "2026-10-13",
  readMinutes: 3,
  kind: "Research",
  programme: "maauni",
  authors: [],
  team: "Namu AI Lab",
  artefacts: [],
  sections: [
    { id: "two-scores", title: "Two scores" },
    { id: "worked-example", title: "A worked example" },
    { id: "what-folding-hides", title: "What folding hides" },
    { id: "our-rule", title: "Our rule" },
  ],
  body: (
    <>
      <p>Word error rate counts the words a recogniser got wrong, as substitutions, deletions and insertions, and divides by the number of words in the reference. Before counting, the scorer cleans both texts. For Hausa, that cleaning step can change the score without any change to the model.</p>

      <h2 id="two-scores">Two scores</h2>
      <p>Both of our scores start the same way. Capital letters and punctuation are conventions of writing, so we remove them from both texts and write every apostrophe-like mark as one character, ʼ.</p>
      <p>Strict scoring then keeps the hooked letters ɓ ɗ ƙ ƴ and the apostrophe. A word written with k where the reference has ƙ counts as an error.</p>
      <p>Folded scoring maps ɓ ɗ ƙ ƴ to b d k y and drops the apostrophe before counting.</p>
      <p>Folding exists for a fair reason. Hausa is often typed on keyboards without these letters, so many transcripts leave the hooks out or put an apostrophe before a plain letter. If a reference has lost a hook that the model wrote, strict scoring counts the model’s correct spelling as a mistake.</p>

      <h2 id="worked-example">A worked example</h2>
      <p>The pair below is constructed to show the arithmetic. The second line is not output from any model.</p>
      {/* NATIVE-REVIEW: reference sentence, hypothesis and English gloss. Sentence and hypothesis were supplied
          in the brief; the gloss is ours. Confirm a founder wrote or approved the sentence. */}
      <blockquote>
        <p lang="ha">Reference: Ana yin allurar rigakafi kowace Talata da Alhamis, daga ƙarfe takwas na safe.</p>
        <p lang="ha">Hypothesis: ana yin allurar rigakafi kowace talata da alhamis daga karfe takwas da safe</p>
        <p>Vaccinations are given every Tuesday and Thursday, from eight o’clock in the morning.</p>
      </blockquote>
      {/* NATIVE-REVIEW: the words ƙarfe, karfe, na, da as cited from the example. */}
      <p>After cleaning, each line has 13 words, and two differences remain. The model wrote karfe without the hook on ƙ, and it wrote da where the reference has na.</p>
      <p>Strict scoring counts both, 2 errors in 13 words, a word error rate of 15.4%. Folded scoring turns ƙarfe and karfe into the same word, which leaves 1 error in 13, or 7.7%.</p>
      {/* NATIVE-REVIEW: Ana, Talata, Alhamis, safe as cited from the example. */}
      <p>Without any cleaning, the same pair scores 6 errors in 13 words, or 46.2%. Four correct words, Ana, Talata, Alhamis and safe, count as errors because of a capital letter or a punctuation mark.</p>
      {/* Alt text (for FigureSlot): "The reference and the hypothesis aligned word by word. In strict mode, two
          words are marked as errors: ƙarfe written as karfe, and na written as da. In folded mode, only na
          written as da is marked. A readout shows 2 of 13 words, 15.4%, strict, and 1 of 13, 7.7%, folded." */}
      <FigureSlot
        name="strict-folded"
        caption="On this constructed pair, strict scoring counts 2 errors in 13 words (15.4%) and folded scoring counts 1 (7.7%). Folding removes the missing hook on ƙarfe. Neither line is model output."
      />

      <h2 id="what-folding-hides">What folding hides</h2>
      <p>In this example, folding halves the score. The error it removes is the missing hook, the kind of error a Hausa reader notices first.</p>
      {/* NATIVE-REVIEW: kasa / ƙasa and the gloss "(land, country)". Source for the pair: programmes.ts (Maʼauni). */}
      <p>In Hausa, ɓ ɗ ƙ ƴ are separate letters for separate sounds. A transcript that writes kasa for ƙasa (land, country) is wrong to a Hausa reader, and folded scoring calls it right. A recogniser that never writes a hooked letter can score well folded and still produce text that a Hausa speaker has to correct by hand.</p>
      {/* NATIVE-REVIEW: saʼa and sa'a (U+02BC vs U+0027) as cited. Source: programmes.ts (Maʼauni description). */}
      <p>The apostrophe raises the same question. Writers use several different characters for it. A scorer that does not unify them counts sa'a and saʼa as different words, and one that treats the apostrophe as punctuation splits saʼa in two.</p>

      <h2 id="our-rule">Our rule</h2>
      <p>Every Hausa word error rate the Lab publishes will come twice, strict and folded, side by side. The gap between the two shows how much of a result depends on spelling. We will name the normaliser and its version.</p>
      <p>Ours will be published as Maʼauni normaliser v1, with test cases, and the figure on this page will run on the same code. We have not yet published a Hausa score of our own. When we do, it will follow this rule.</p>
      <p>If you report Hausa results and want to re-score them with a shared normaliser, write to us at <a href="mailto:contact@namuai.org">contact@namuai.org</a>.</p>
    </>
  ),
};

/* ------------------------------------------------------------------------------------------------ */
/* 4. About page                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

export type AboutCopy = {
  hero: string;
  intro: string[];
  principles: { title: string; body: string }[];
  founders: { name: string; role: string; bio: string }[];
  careers: string;
};

export const aboutCopy: AboutCopy = {
  hero: "Namu AI Lab is the research unit of Namu, working on speech in Hausa and Zarma.",
  intro: [
    "Namu builds speech-native models, datasets and products for African languages. The products live at namu-ai.org. The Lab publishes the research underneath them, as programmes, papers, datasets, evaluations and research demos.",
    // Sources: Hausa ≈ 94M (Ethnologue via Wikipedia; voice file: Ethnologue 2026); Zarma ≈ 6.0M (Ethnologue 26th ed., 2023).
    "We start with Hausa, which has about 94 million first- and second-language speakers (Ethnologue, 2026), and Zarma, which has about six million (Ethnologue, 26th edition, 2023). We work in Niger first, because public Hausa speech data mostly comes from Nigeria and Zarma is almost absent from speech technology.",
    "Our work runs in five programmes, from collecting consented speech to measuring what models do with it. Each programme page lists its next steps and ends with what we do not claim yet.",
  ],
  principles: [
    {
      title: "Consent before collection",
      body: "No one records for the Lab without informed consent, given in their own language. Speakers choose which uses they allow, such as research, open release or voice synthesis, and they can withdraw. Their choices travel with every file made from their voice.",
    },
    {
      title: "People are paid, and communities are partners",
      body: "Everyone who records, transcribes or rates speech for the Lab will be paid for their time, at a rate we publish before collection starts. Speakers, reviewers and linguists will be credited as colleagues, and as co-authors where their work earns it.",
    },
    {
      title: "A number comes with its conditions",
      body: "Every result names its test set, its normaliser and version, and its listeners where there are any, and says what it cannot show. Hausa error rates come twice, strict and folded. We publish negative results too.",
    },
    {
      title: "Open by default, closed for a reason",
      body: "We release tools, test sets, pipelines and measurements where consent and licences allow. We do not release a voice beyond what its speaker agreed to, data whose licence forbids it, or a model before it passes Namu’s release checks. When something stays closed, we say what it is and why.",
    },
  ],
  founders: [
    {
      name: "Mouhamad Mamane",
      role: "Co-founder and CEO, Namu",
      bio: "Mouhamad Mamane co-founded Namu and leads it as chief executive. He and Abdourahamane Ide Salifou approve what the Lab publishes, including results and decisions about voices and data.",
    },
    {
      name: "Abdourahamane Ide Salifou",
      role: "Co-founder, speech recognition research lead",
      // Source: posts.tsx (Swahili post, 2025-09-19). Competition result, not a Namu model result.
      bio: "Abdourahamane Ide Salifou co-founded Namu and leads its speech recognition research. In 2025 his entry won the AI for Good Swahili ASR Challenge on Zindi, with a 17.81% word error rate on the competition’s private leaderboard. He trained it on a single borrowed 16 GB GPU, and the code is public.",
    },
  ],
  // Source: the `collaborate` lines in programmes.ts; contact address from site.ts.
  careers: "Each programme page says what help it needs. Today we are looking for paid Hausa speakers for two-person recordings, native listeners and transcribers across Hausa dialects, Zarma writers and linguists, and researchers working on turn-taking and measurement. Write to contact@namuai.org and name the programme you want to work on.",
};
