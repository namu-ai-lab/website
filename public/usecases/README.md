# Use case recordings

## The home page's use cases, in every voice (2026-11-01, second set)

What the home page's use cases play (`src/content/usecases.ts`): one folder per case, one file per voice and language,
`<case>/<voice>-<lang>.m4a`. Every case is said the same four ways, in the menu's order: Zarma (voice 1), Hausa
(voices 1 and 2), French (voice 3). The page numbers the voices instead of naming them. Translation follows each line
with its translation; Heritage shows, for Hausa, what Tatsuniya wrote down.

**How the lines were chosen.** Two or four candidate lines per case, each in Zarma, Hausa and French, were said three
times by every voice (Nadia and the French voice through `namu-voice`; voice 1 through C-250 with the founder's
reference clips, the engine of `namu-voice-zarma`, at 32, 40 and 48 steps), and every take was read back by Meta's
omniASR LLM 3B in its language, with half a second of silence before it so a clipped first word counts. Each case
kept the candidate whose worst voice read back best, and each voice its best take (among equals, the one of typical
length). Kept takes read back word for word or within spelling conventions (Zarma *lokol* for *lokkol*, *albarey* for
*alberey*; Hausa *kwanan* for *kwanon*): at most 3.2 % of characters. One Hausa line was changed after the read-back:
*Yau gari ya yi hadari* (storm clouds) came back as *haɗari* (danger), so it says *Yau akwai gajimare* (there are
clouds).

**The Zarma** is built only from phrases written by native speakers: SMOL (Google, CC-BY-4.0: "Ma si humburu… Ay
g'araŋ gaa", "ifo no ni ga baa ay ma tee ni se hunkuna?", "Kaayi… deede", "deeda", "lokkol") and the Peace Corps/Niger
Zarma dictionary (rev. 2001, public domain: "Marje no ji litar go sohon?", "Hunkuna beena hirri", "Nda ni sinda bani",
"Konni no a ga", "Kwara alberey", "mo taasa"), spelled in the 1999 alphabet (zarma-exploration
`langs/dje/CONVENTION.md`). **It waits for a native speaker's check**, as does the Hausa.

Each file: 50 ms of lead-in, loudness evened out (EBU R128, −18 LUFS), a short fade at each end, AAC, mono, 24 kHz,
64 kbit/s.

| Case | Zarma | Hausa | French | Meaning |
|---|---|---|---|---|
| `education` | Zankey ga koy lokkol ka dondon caw nda hantum. | Yara suna zuwa makaranta domin su koyi karatu da rubutu. | Les enfants vont à l’école pour apprendre à lire et à écrire. | Children go to school to learn to read and write. |
| `health` | Nda ni izo gonda konni, ma a kondi loktoro kwara hunkuna. | Idan ɗanku yana da zazzaɓi, ku kai shi asibiti yau. | Si votre enfant a de la fièvre, emmenez-le au centre de santé aujourd’hui. | If your child has a fever, take them to the clinic today. |
| `translation` | Marje no mo taasa go hunkuna? | Nawa ne kwanon shinkafa yau? | Combien coûte le bol de riz aujourd’hui ? | How much is a bowl of rice today? |
| `farming` | Hunkuna beene hirri. Suba hari ga kaŋ: wa hayni duma. | Yau akwai gajimare. Gobe za a yi ruwan sama: ku shuka gero. | Le ciel est nuageux aujourd’hui. Demain, il va pleuvoir : semez votre mil. | The sky is cloudy today. Rain will fall tomorrow: sow your millet. |
| `public` | Fofo! Ifo no ni ga ba iri ma te ni se hunkuna? | Sannu! Me kuke so mu yi muku yau? | Bonjour ! Que pouvons-nous faire pour vous aujourd’hui ? | Hello! What can we do for you today? |
| `heritage` | Kwara alberey ga deeda boobo bay. | Dattawan ƙauye sun san labarai da yawa. | Les anciens du village connaissent beaucoup d’histoires. | The village elders know many stories. |

**Translation's answers.** From Hausa and French they are Kora's own (`POST /v1/translate` through the site's live
demo, with the speech it returned): `translation/{mouhamad,nadia}-ha.kora-fr.m4a` say "Combien coûte le bol de riz
aujourd'hui ?" and `translation/fr-fr.kora-ha.m4a` says "Nawa ne kwanon shinkafa yau?". Kora heard the questions it
answered word for word; one take it rendered as "sac de riz", so that take was not used. Kora does not translate Zarma
yet: after the Zarma question the page plays `translation/fr-fr.m4a`, the French line said by Tafiya's French voice,
and labels it Tafiya. **Heritage** shows Tatsuniya's own transcript of each Hausa clip (it writes *kauye* without the
hook for one of them). The home playground's Translate samples are `translation/mouhamad-ha.m4a` and
`heritage/mouhamad-ha.m4a`; sent as they are, Kora heard and translated both exactly.

## Earlier recordings

What the home page's use cases played until 2026-11-01, made through the Namu API on 2026-10-20 and chosen the way the
demo recordings are (`public/demo/README.md`): five takes each, the one Tatsuniya transcribed most faithfully kept.
Other pages still use the ones below (the console Playground, Create's ideas, the agent templates, the Interpreter).

**Removed on 2026-11-01:** `translation-ha.m4a` and `heritage.m4a`, in the voice `salim`, withdrawn on 2026-10-31 with
no consent record for its speaker. The home playground's Translate samples and the console Playground's Aïr sample
now use Mouhamad's clips above (`translation/mouhamad-ha.m4a`, `heritage/mouhamad-ha.m4a`). The French voice's clips
(`translation-fr*.m4a`, Kora's own French output) stay: that voice's consent was confirmed on 2026-11-01.

| File | Model and voice | Says | Meaning |
|---|---|---|---|
| `education.m4a` | Tafiya, female | Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar. | Let's learn to count together: one, two, three, four, five. |
| `translation-fr.m4a` | Kora, from the removed `translation-ha.m4a` ("Nawa ne farashin buhun gero?") | Quel est le prix du sac de mil ? | Kora's own output (`POST /v1/translate`, target fr), heard and spoken by the model |
| `public.m4a` | Tafiya, female | Za mu taimaka muku ku cike fom ɗin, mataki-mataki. | We will help you fill in the form, step by step. |

The home page playground's French samples (Translate, French → Hausa) were made on 2026-10-21 the same way as
`translation-fr.m4a`: Kora's own spoken output (`POST /v1/translate`, target fr, `include_audio`), loudness-normalised
to −18 LUFS. Each was checked by sending it back (target ha): Kora heard the French exactly.

| File | Made from | Says | Sent back, Kora heard |
|---|---|---|---|
| `translation-fr-story.m4a` | `heritage.m4a` | Un jour, dans un village, il y avait un vieux conteur. | the same sentence |
| `translation-fr-form.m4a` | `public.m4a` | Nous allons vous aider à remplir le formulaire étape par étape. | the same sentence |

`translation-fr-story.m4a` is Kora's French, in the French voice, from the removed `heritage.m4a`; the Hausa it was
made from is no longer played anywhere.
