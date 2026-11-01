# Zarma text frontend (copied)

`verbalize.py`, `normalize.py` and `spelling_variants.tsv` are copied unchanged from the Zarma programme's language
pack, `namu-ai-lab/zarma-exploration` `langs/dje/` at commit `f3ddfa5` (language pack dje-1.0, a draft that waits for
native review). `namu_voice_zarma.py` runs every Zarma text through `verbalize.prepare_tts_text` before speaking it:
digits and symbols spelled out in Zarma, canonical characters. The speech model was evaluated on text prepared this
way.

Change them there first, then copy them here again and update the commit above.
