# Use case recordings

The lines the home page's use cases play (`src/content/usecases.ts`), made through the Namu API on 2026-10-20 and chosen
the way the demo recordings are (`public/demo/README.md`): five takes each, the one Tatsuniya transcribed most
faithfully kept. Healthcare and Farming reuse `public/demo/clinic-nadia.m4a` and `public/demo/farm-salim.m4a`.

| File | Model and voice | Says | Meaning |
|---|---|---|---|
| `education.m4a` | Tafiya, female | Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar. | Let's learn to count together: one, two, three, four, five. |
| `translation-ha.m4a` | Tafiya, male | Nawa ne farashin buhun gero? | How much is a sack of millet? |
| `translation-fr.m4a` | Kora, from `translation-ha.m4a` | Quel est le prix du sac de mil ? | Kora's own output (`POST /v1/translate`, target fr), heard and spoken by the model |
| `public.m4a` | Tafiya, female | Za mu taimaka muku ku cike fom ɗin, mataki-mataki. | We will help you fill in the form, step by step. |
| `heritage.m4a` | Tafiya, male | Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari. | Once, in a village, there lived an old storyteller. |

The heritage card also shows what Tatsuniya wrote down from `heritage.m4a`: "wata rana a wani ƙauye akwai wani tsoho
mai bada labari." The Hausa has not yet been reviewed by a native speaker.
