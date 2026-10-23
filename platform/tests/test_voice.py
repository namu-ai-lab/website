"""namu-voice's request rules, checked without Modal or a GPU.

    python3 -m pytest platform/tests -q
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
import namu_voice as voice  # noqa: E402

LOW, HIGH = voice.NUM_STEP_RANGE


@pytest.mark.parametrize("requested", [None, 0, "", "many", [], {}, float("inf"), float("nan")])
def test_num_step_falls_back_to_the_default(requested):
    assert voice.clamp_num_step(requested, 32) == 32


@pytest.mark.parametrize("requested, expected", [
    (16, 16), ("16", 16), (12.9, 12),
    (10**9, HIGH), (HIGH + 1, HIGH), (1, LOW), (-5, LOW),
])
def test_num_step_is_held_inside_the_range(requested, expected):
    assert voice.clamp_num_step(requested, 32) == expected


def test_the_default_is_used_as_it_is():
    # the Hausa default comes from the model card; the clamp is for callers, not for it
    assert voice.clamp_num_step(None, 100) == 100
