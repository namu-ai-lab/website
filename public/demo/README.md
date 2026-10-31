# Demo recordings

Real output of Tafiya (`POST /v1/speech`), generated through the Namu API on 2026-10-20: `<script>-<voice>.m4a`,
for the scripts in `src/content/playground.ts` and the voice `nadia` (shown as Female). The male voice, `salim`, was
withdrawn on 2026-10-31 (no consent record for its speaker) and its recordings were removed.

| Script | Hausa | English |
|---|---|---|
| `greet` | Sannu da zuwa! Muna farin cikin jin muryarku. | Welcome! We are glad to hear your voice. |
| `weather` | Ina kwana? Yau za a yi zafi sosai, don haka ku sha ruwa da yawa. | Good morning! It will be very hot today, so drink plenty of water. |
| `clinic` | Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi. | Don't forget: tomorrow morning, bring your baby to the clinic for the vaccination. |
| `farm` | Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa. | The rainy season has set in. It is time for farmers to start sowing millet and sorghum. |

How each file was chosen: Tafiya says a sentence a little differently each time, so each script was generated five
times per voice, each take was transcribed by Tatsuniya (with silence added before it, so a clipped first word
counts against the voice), and the take whose transcript was closest to the script was kept; among equals, the one
whose length was most typical. The male voice dropped the first sound of "Barka da safiya" in every take, so the
weather script opens with "Ina kwana?" instead. Each file then has 50 ms of lead-in, its loudness evened out
(EBU R128, -18 LUFS), a short fade at each end, and is AAC, mono, 64 kbit/s.

The Hausa has not yet been reviewed by a native speaker. The home console plays these first and falls back to the
live demo for anything not recorded here; if a script's text changes, regenerate its file.
