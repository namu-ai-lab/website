"""namu-voice-zarma's request rules, checked without Modal or a GPU.

    python3 -m pytest platform/tests -q
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
import namu_gateway as gw  # noqa: E402
import namu_voice_zarma as zarma  # noqa: E402

LOW, HIGH = zarma.NUM_STEP_RANGE


@pytest.mark.parametrize("requested", [None, 0, "", "many", [], {}, float("inf"), float("nan")])
def test_num_step_falls_back_to_the_default(requested):
    assert zarma.clamp_num_step(requested) == zarma.NUM_STEP_DEFAULT


@pytest.mark.parametrize("requested, expected", [(16, 16), ("16", 16), (10**9, HIGH), (1, LOW), (-5, LOW)])
def test_num_step_is_held_inside_the_range(requested, expected):
    assert zarma.clamp_num_step(requested) == expected


@pytest.mark.parametrize("language, name", [("dje", "mouhamad"), ("ha", "mouhamad"), (None, "mouhamad"),
                                            ("dje", None), (None, None)])
def test_mouhamad_speaks_zarma_and_hausa(language, name):
    assert zarma.served(language, name)


@pytest.mark.parametrize("language, name", [("fr", "mouhamad"), ("dje", "nadia"), ("ha", "salim"),
                                            (["dje"], "mouhamad"), ("dje", ["mouhamad"])])
def test_other_voices_and_languages_are_refused(language, name):
    assert not zarma.served(language, name)


def test_a_request_without_language_gets_zarma():
    assert next(iter(zarma.VOICES[zarma.DEFAULT_VOICE])) == "dje"


def test_long_text_is_cut_into_units_of_thirty_words_at_most():
    text = " ".join(f"w{i}" for i in range(75))            # no punctuation at all: the hard cut
    units = zarma.split_units(text, zarma.UNIT_MAX_WORDS)
    assert [len(u.split()) for u in units] == [30, 30, 15]
    assert " ".join(units) == text
    assert zarma.split_units("Fofo. Mate ni go?", 30) == ["Fofo. Mate ni go?"]


def test_the_gateway_and_this_service_agree_on_the_voice():
    # the gateway sends a voice here only in a language this service speaks it in
    for v in gw.VOICES.values():
        if v.get("service") == "voice_zarma":
            assert v["upstream"] in zarma.VOICES
            assert list(v["languages"]) == list(zarma.VOICES[v["upstream"]])
