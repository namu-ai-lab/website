# Use case recordings

The lines the home page's use cases play (`src/content/usecases.ts`), made through the Namu API on 2026-10-20 and chosen
the way the demo recordings are (`public/demo/README.md`): five takes each, the one Tatsuniya transcribed most
faithfully kept. Healthcare and Farming reuse `public/demo/clinic-nadia.m4a` and `public/demo/farm-nadia.m4a`.

**To replace.** The voices `salim` (male) and `fr` (French) were withdrawn on 2026-10-31: there is no consent record
for either speaker. `translation-ha.m4a` and `heritage.m4a` are in the male voice, and the three `translation-fr*.m4a`
clips in the French voice. They are fixed sentences, not a voice anyone can make say something else, but the site
still plays those speakers until the clips are remade in a cleared voice or removed.

| File | Model and voice | Says | Meaning |
|---|---|---|---|
| `education.m4a` | Tafiya, female | Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar. | Let's learn to count together: one, two, three, four, five. |
| `translation-ha.m4a` | Tafiya, male | Nawa ne farashin buhun gero? | How much is a sack of millet? |
| `translation-fr.m4a` | Kora, from `translation-ha.m4a` | Quel est le prix du sac de mil ? | Kora's own output (`POST /v1/translate`, target fr), heard and spoken by the model |
| `public.m4a` | Tafiya, female | Za mu taimaka muku ku cike fom ɗin, mataki-mataki. | We will help you fill in the form, step by step. |
| `heritage.m4a` | Tafiya, male | Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari. | Once, in a village, there lived an old storyteller. |

The home page playground's French samples (Translate, French → Hausa) were made on 2026-10-21 the same way as
`translation-fr.m4a`: Kora's own spoken output (`POST /v1/translate`, target fr, `include_audio`), loudness-normalised
to −18 LUFS. Each was checked by sending it back (target ha): Kora heard the French exactly.

| File | Made from | Says | Sent back, Kora heard |
|---|---|---|---|
| `translation-fr-story.m4a` | `heritage.m4a` | Un jour, dans un village, il y avait un vieux conteur. | the same sentence |
| `translation-fr-form.m4a` | `public.m4a` | Nous allons vous aider à remplir le formulaire étape par étape. | the same sentence |

The heritage card also shows what Tatsuniya wrote down from `heritage.m4a`: "wata rana a wani ƙauye akwai wani tsoho
mai bada labari." The Hausa has not yet been reviewed by a native speaker.
