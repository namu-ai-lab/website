# Voice samples

What a voice sounds like in each language it speaks, for the platform's voice pickers and the Voices page
(`src/lib/catalog/voices.ts`, `samples`). One folder per voice, one file per language code. Nadia's Hausa and the
French voice keep their older samples elsewhere (`public/converse/nadia/hello.m4a`, `public/usecases/`).

## mouhamad

The founder's own voice, with his consent (2026-11-01). Spoken by Tafiya's Zarma engine (`platform/modal/
namu_voice_zarma.py`, C-250 at `Namuorg/zarma-tts-c250-mouhamad` @ `148b7e9e`) on 2026-11-01, one take (the engine
uses a fixed seed). The sentences are his own, from the recordings he made for the voice, not the parts used as its
reference clips.

| File | Text | English |
|---|---|---|
| `mouhamad/dje.m4a` | Fofo! Mate ni go? Ay ya Niger laabu boro no. Ay ga ba ay laabu, ay kwaara, nda ay borey gumo. | Hello! How are you? I am from Niger. I love my country, my town and my people very much. |
| `mouhamad/ha.m4a` | Sannu! Yaya kuke? Ina son koyon sababbin abubuwa, musamman abubuwan da za su taimaka wa mutane a cikin al'ummarmu. | Hello! How are you? I like learning new things, especially things that will help people in our community. |

Each file: leading silence cut to 50 ms, loudness evened out (EBU R128, -18 LUFS), a short fade at each end, AAC,
mono, 24 kHz, 64 kbit/s, as `public/demo/README.md` describes. The outline in the catalog is 40 peaks of the file
decoded to mono 16 kHz, scaled to 0–100. If the voice or its engine changes, make them again.
