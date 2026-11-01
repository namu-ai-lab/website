# Use case recordings

## The home page's use cases, in every voice (2026-11-01)

What the home page's use cases play (`src/content/usecases.ts`): one folder per case, one file per voice and language,
`<case>/<voice>-<lang>.m4a`. Each case offers the voices its models carry: Tafiya's cases are said by Nadia (Hausa),
Mouhamad (Hausa and Zarma) and the French voice; Translation by the Hausa voices and the French voice, each followed
by Kora's own translation; Heritage by the Hausa voices, with what Tatsuniya wrote down.

How the lines were written: short, everyday words, no figures, so every voice says them well. The Hausa and French are
new or reworked from the earlier lines; the Zarma is built from phrases in the Peace Corps/Niger Zarma dictionary (rev.
2001, public domain) and spelled in the 1999 alphabet (`kaŋ`, `sohõ`), as zarma-exploration `langs/dje/CONVENTION.md`
asks. **The Zarma waits for a native speaker's check.**

How each recording was chosen: every line was said several times by its voice (Nadia and the French voice through
`namu-voice`, five takes; Mouhamad through C-250 with his reference clips, the engine of `namu-voice-zarma`, at 32, 40,
48 and 64 steps), each take was read back by Meta's omniASR LLM 3B in its language (with half a second of silence
before it, so a clipped first word counts against it), and the take read back most faithfully was kept; among equals,
the one of typical length. The kept takes read back word for word, except for spelling conventions the recogniser has
(Zarma *ceere* for *cere*, *alfaaray* for *alfarey*; Hausa *rigaƙafi*; French *mille* for *mil*). Each file then has
50 ms of lead-in, its loudness evened out (EBU R128, −18 LUFS), a short fade at each end, and is AAC, mono, 24 kHz,
64 kbit/s.

| Case | Hausa (Nadia, Mouhamad) | Zarma (Mouhamad) | French (French voice) |
|---|---|---|---|
| `education` | Sannu da zuwa, yara! Yau za mu koyi karatu tare. Ku saurara da kyau, sannan ku maimaita bayana. | Fofo, zankey! Hunkuna iri ga tira caw cere banda. Wa hangan ay se! | Bonjour les enfants ! Aujourd’hui, nous apprenons à lire ensemble. Écoutez bien, puis répétez après moi. |
| `health` | Kar ki manta: gobe da safe, ki kawo jaririnki asibiti don allurar rigakafi. | Ma si dirgan: suba susubay, ni ma kande ni izo loktoro kwara. | N’oubliez pas : demain matin, amenez votre bébé au centre de santé pour la vaccination. |
| `translation` | Sannu! Nawa ne farashin buhun gero a kasuwa yau? | — | Bonjour ! Combien coûte le sac de mil au marché aujourd’hui ? |
| `farming` | Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa. | Beene haro kaŋ. Sohõ, alfarey ma hayni nda hamo duma. | La saison des pluies est arrivée. C’est le moment de semer le mil et le sorgho. |
| `public` | Sannu da zuwa. Za mu taimaka muku ku cike fom ɗinku, mataki-mataki. | Fofo! Iri ga ni faaba nda ni tira. | Bienvenue. Nous allons vous aider à remplir votre formulaire, étape par étape. |
| `heritage` | Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari. Kowa yana son jin labaransa. | — | — |

Translation's answers are Kora's own (`POST /v1/translate` through the site's live demo, with the speech it returned):
`translation/{nadia,mouhamad}-ha.kora-fr.m4a` say "Bonjour, quel est le prix du sac de mil au marché aujourd'hui ?"
and `translation/fr-fr.kora-ha.m4a` says "Sannu, nawa ne farashin buhun gero a kasuwa a yau?". Kora heard every word
of the questions it answered; one of Nadia's takes it misheard ("géraniums") and another French run opened with a
non-word, so those takes were not used. Heritage shows Tatsuniya's own transcript of each voice's clip.

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
