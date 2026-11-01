"""Zarma (dje) text normaliser, v1.0: the language pack's normaliser for scoring, training text and TTS input.

Status: written by the language-pack linguist agent on 2026-11-01 from the 1999 orthography (Arrêté
n°0215/MEN/SP-CNRE, read in full), the 2007 *Grammaire comparée* and measured real-world spelling (research report
02 §B, ``langs/dje/CONVENTION.md``). **No Zarma speaker has approved these rules yet: every rule and every Zarma
string here needs native review** (packet ``human_eval/packets/L0-convention/``). It replaces
``normalize_provisional.py`` (v0.3), which stays frozen with the v0 baselines; numbers scored with 0.3 must say so.

Standard library only. Deterministic, idempotent, NFC-based, Zarma-specific (lives only in ``langs/dje``).

Forms
-----
``normalize_chars(text)`` -- **character fixes only**; keeps case, digits, punctuation and line breaks. For
    tokenizer and LM text and as the first step of TTS input. NFC; invisible format characters deleted; exotic
    spaces -> space; apostrophe look-alikes -> ``'``; true hyphens -> ``-``; look-alikes (Greek η, ƞ -> ŋ; ɳ ȵ -> ɲ);
    ɛ -> e and ɔ -> o (not in Niger's alphabet; SMOL uses them in a few loans); keyboard substitutes for ŋ repaired
    where unambiguous (``ñ`` -> ŋ, but word-initial ``ñ`` + vowel -> ɲ; word-final ``ù`` -> ŋ except French
    ``où``; ``ùw-`` -> ŋw-; word-final ``à``/``q`` -> ŋ only when the result is a known ŋ-final Zarma word);
    legacy-font stand-ins (``$ # £ å æ`` and every ``ù à``) only with ``legacy=True`` or ``legacy="auto"``;
    nasal vowels written in ONE style (``CANONICAL_NASAL``, tilde above by default) and long nasal vowels marked
    on both letters (``sahãadin`` -> ``sahããdin``, the arrêté's ``a̰a̰``).

``strict(text)`` -- the primary scoring form ("as written", alias ``normalize``): ``normalize_chars``, annotation
    tags (``<noise>`` ``<hesitation>`` ``<unintelligible>`` ``<laugh>`` ``<sound>`` ``<music>``…) removed, lower
    case, tokenised apostrophes re-attached (``nd 'a`` -> ``nd'a``), digit groups joined (``1 000 F`` -> ``1000 f``),
    punctuation, symbols **and hyphens** -> space, an apostrophe kept only between two letters (``nd'a``,
    ``kond'a``, ``baar'a``), whitespace collapsed. Keeps ŋ, ɲ, nasal marks, vowel length, geminates, Hausa hooks
    (ɓ ɗ ƙ ƴ in loans) and digits (``digits="keep"``; ``"drop"`` and ``"spell"`` exist for diagnostics).

``fold(text)`` -- **folded**, reported beside strict, never instead: strict, then (cumulative steps, see
    ``FOLD_STEPS``) ŋ -> n and ɲ -> ny; Hausa hooks -> plain letters; every combining mark removed (nasal tildes,
    French accents); elisions expanded for a closed list of hosts (``nd'a`` -> ``nda a``, ``k'a`` -> ``ka a``,
    ``kond'a`` -> ``konda a``) and other apostrophes deleted (``baar'a`` -> ``baara``); doubled vowels collapsed;
    doubled consonants collapsed (``lokkol`` -> ``lokol``).

``nospace(text)`` -- folded with every space removed and vowels and consonants collapsed again across the removed
    spaces (``a ga``/``aga``, ``nda a``/``nda``): the segmentation-free CER.

``fold_steps(text)`` gives every cumulative step (the interface ``core/asrkit/scoring.py`` expects; the step names
of 0.3 are kept so ``scripts/eval/make_baselines_table.py`` still works; ``hausa_hooks`` and ``geminates`` are new).

Helpers: ``to_official`` / ``from_official`` (nasal tilde below <-> above), ``detect_legacy`` / ``repair_legacy``,
``looks_like_ses`` (Koyraboro Senni check via ``lid_rules.py``), ``alphabet_issues`` (QA of a transcript against
the 1999 alphabet), ``canonical_spelling`` (the native-reviewed lexical variant table ``spelling_variants.tsv``;
applies nothing until natives approve rows; training text only, never evaluation references),
``confusion_pairs``, ``ng_only_difference``, ``ng_variant_words``.

Changes from provisional 0.3 (measured on ``dje_omni_v0`` by ``scripts/eval/compare_normalisers.py``):
strict turns hyphens into spaces (0.3 kept ``fondo-fay``); ñ/ù/q/à repairs happen in every form (0.3: ñ in fold
only, ù/q/à only with ``legacy=True``); word-initial ñ + vowel -> ɲ (0.3: ŋ); ɛ ɔ -> e o; long nasal vowels marked
twice; tokenised apostrophes re-attached; folded also folds Hausa hooks, expands listed elisions and collapses
geminate consonants; nospace collapses consonants too.
"""

from __future__ import annotations

import csv
import importlib.util
import os
import re
import unicodedata

VERSION = "dje-1.0 (2026-11-01)"
STATUS = "linguist-written, not native-approved (needs native review)"

# ------------------------------------------------------------------------------------------------------------------
# Owner decision D1 (PLAN.md open decision 4): the nasal mark used inside Namu. Recommendation: "above" (U+0303).
# Every real corpus uses tilde above or nothing; ã ẽ ĩ õ ũ are one code point after NFC, while the official a̰ and o̰
# have no precomposed form (two code points), which skews CER and tokenisation. To follow the 1999 arrêté
# literally, set "below"; to_official() converts either way for display and official text.
CANONICAL_NASAL = "above"
# ------------------------------------------------------------------------------------------------------------------

TILDE_ABOVE = "̃"
TILDE_BELOW = "̰"
_TILDES = (TILDE_ABOVE, TILDE_BELOW)
VOWELS = "aeiou"
_VOWELS_BOTH = "aeiouAEIOU"

# The 1999 alphabet (arrêté §1.1; the arrêté's list prints "i" twice where the grammaire comparée has ḭ).
ALPHABET_1999 = ("a", "a̰", "b", "c", "d", "e", "ḛ", "f", "g", "h", "i", "ḭ", "j", "k", "l", "m", "n",
                 "ŋ", "ɲ", "o", "o̰", "p", "r", "s", "t", "u", "ṵ", "w", "y", "z")
_PLAIN_LETTERS_1999 = set("abcdefghijklmnoprstuwyzŋɲ")
HAUSA_HOOKS = {"ɓ": "b", "ɗ": "d", "ƙ": "k", "ƴ": "y"}

# Annotation tags. Meta Omnilingual ASR corpus tags (card "Special tags"): <laugh> <hesitation> <unintelligible>
# <noise>; <sound> occurs 12 times in its Zarma train transcripts. <music> is Namu's extension for radio.
TAGS = ("<noise>", "<hesitation>", "<unintelligible>", "<laugh>", "<sound>", "<music>")
_TAG_RE = re.compile(r"<[^<>\s]{1,40}>")

_SPACE_CHARS = "              　"
_SPACES = dict.fromkeys(map(ord, _SPACE_CHARS), " ")
_APOSTROPHE_CHARS = "’‘ʼʻ´`′ʹ＇"
_APOSTROPHES = dict.fromkeys(map(ord, _APOSTROPHE_CHARS), "'")
_HYPHENS = dict.fromkeys(map(ord, "‐‑"), "-")  # true hyphens; en/em dashes stay punctuation
_LOOKALIKES = str.maketrans({"η": "ŋ", "ƞ": "ŋ", "Ƞ": "Ŋ", "ɳ": "ɲ", "ȵ": "ɲ", "ɛ": "e", "Ɛ": "E", "ɔ": "o",
                             "Ɔ": "O"})
_WS_RE = re.compile(r"[ \t\r\f\v]+")
_ANY_WS_RE = re.compile(r"\s+")
_LETTER = r"[^\W\d_]"

# ŋ-final words seen at least 4 times in SMOL + Meta train transcripts (open sources, 2026-11-01), used to accept a
# word-final à / q as a stand-in for ŋ outside legacy documents. Words ending in -kaŋ and -yaŋ are accepted too.
KNOWN_NG_FINAL = frozenset("""kaŋ daŋ boŋ araŋ haŋ naŋ baŋ doŋ waŋ salaŋ maŋ taŋ folloŋ afolloŋ jaŋ saŋ caŋ tuŋ
fulaŋ gadaŋ kadaŋ""".split())
_FRENCH_A_GRAVE_WORDS = frozenset({"à", "là", "voilà", "déjà", "delà", "holà", "çà"})
_INITIAL_NTILDE_VOWEL_RE = re.compile(r"(?<![^\W_])([ñÑ])(?=[aeiouAEIOUãẽĩõũÃẼĨÕŨ])")
_FINAL_U_GRAVE_RE = re.compile(r"(?<=" + _LETTER + r")([ùÙ])(?!" + _LETTER + r")")
_INITIAL_U_GRAVE_W_RE = re.compile(r"(?<![^\W_])([ùÙ])(?=[wW])")
# j is a Zarma letter and "haj(j)" an Arabic loan, so word-final j -> ŋ only in legacy documents (bug found in v1.0
# testing: fold("hajj") gave "haj", which a second fold turned into "han"; regression R02).
_WORD_FINAL_STANDIN_RE = re.compile(r"(" + _LETTER + r"+)([àqÀQ])(?!" + _LETTER + r")")

# Legacy fonts (report 02 §B7: reca-niger.org pages, the arrêté's own PDF text layer, bisharat menus).
_LEGACY_MAP = str.maketrans({"$": "ɲ", "#": "Ŋ", "£": "Ɲ", "å": "ŋ", "Å": "Ŋ", "æ": "ɲ", "Æ": "Ɲ"})
_LEGACY_PROBE_RE = re.compile(r"(?<![^\W_])(?:ka|ya|bo|da|ha|na|ara)[ùàq](?![^\W_])", re.IGNORECASE)
_LEGACY_UA_RE = re.compile(r"[ùàÙÀ]")
_LEGACY_FINAL_QJ_RE = re.compile(r"(?<=" + _LETTER + r")([qjQJ])(?!" + _LETTER + r")")


def _ng(ch: str) -> str:
    return "Ŋ" if ch.isupper() else "ŋ"


def _word_at(text: str, i: int) -> str:
    a = i
    while a > 0 and (text[a - 1].isalpha() or unicodedata.combining(text[a - 1])):
        a -= 1
    b = i + 1
    while b < len(text) and (text[b].isalpha() or unicodedata.combining(text[b])):
        b += 1
    return text[a:b]


def _repair_keyboard(t: str) -> str:
    """Unambiguous keyboard substitutes for ŋ (and ñ for ɲ word-initially before a vowel)."""
    t = _INITIAL_NTILDE_VOWEL_RE.sub(lambda m: "Ɲ" if m.group(1) == "Ñ" else "ɲ", t)
    t = t.replace("ñ", "ŋ").replace("Ñ", "Ŋ")
    t = _INITIAL_U_GRAVE_W_RE.sub(lambda m: _ng(m.group(1)), t)
    t = _FINAL_U_GRAVE_RE.sub(lambda m: m.group(1) if _word_at(t, m.start()).lower() == "où" else _ng(m.group(1)), t)

    def final(m: re.Match) -> str:
        stem, ch = m.group(1), m.group(2)
        if (stem + ch).lower() in _FRENCH_A_GRAVE_WORDS:
            return m.group(0)
        cand = (stem + "ŋ").lower()
        if cand in KNOWN_NG_FINAL or (len(cand) > 3 and cand.endswith(("kaŋ", "yaŋ"))):
            return stem + _ng(ch)
        return m.group(0)

    return _WORD_FINAL_STANDIN_RE.sub(final, t)


def detect_legacy(document: str) -> bool:
    """True when a document looks typed in a legacy font: no ŋ at all and at least 3 hits of kaù / yaù / boù / daù /
    haù / naù / araù (or the same with à or q). Decide per document, then pass ``legacy=True``."""
    t = unicodedata.normalize("NFC", document or "")
    return ("ŋ" not in t and "Ŋ" not in t) and len(_LEGACY_PROBE_RE.findall(t)) >= 3


def repair_legacy(text: str) -> str:
    """Legacy-font stand-ins (only for documents flagged by :func:`detect_legacy`): $ # £ å æ, every ù and à
    except the French words où, à, là…, word-final q and j."""
    t = unicodedata.normalize("NFC", text or "").translate(_LEGACY_MAP)

    def ua(m: re.Match) -> str:
        w = _word_at(t, m.start()).lower()
        return m.group(0) if (w == "où" or w in _FRENCH_A_GRAVE_WORDS) else _ng(m.group(0))

    t = _LEGACY_UA_RE.sub(ua, t)
    return _LEGACY_FINAL_QJ_RE.sub(lambda m: _ng(m.group(1)), t)


def _canon_nasal(t: str, style: str) -> str:
    """One nasal mark style on vowels; duplicate tildes dropped; a long nasal vowel marked on both letters."""
    if style not in ("above", "below"):
        raise ValueError(f"nasal style must be 'above' or 'below', not {style!r}")
    mark = TILDE_ABOVE if style == "above" else TILDE_BELOW
    d = unicodedata.normalize("NFD", t)
    clusters: list[list] = []  # [base, [marks]]
    for ch in d:
        if unicodedata.combining(ch) and clusters:
            clusters[-1][1].append(ch)
        else:
            clusters.append([ch, []])
    for c in clusters:
        if c[0] in _VOWELS_BOTH and any(m in _TILDES for m in c[1]):
            c[1] = [m for m in c[1] if m not in _TILDES] + [mark]
    for k in range(len(clusters) - 1):  # long nasal vowel: same vowel twice, one marked -> both marked
        a, b = clusters[k], clusters[k + 1]
        if a[0] in _VOWELS_BOTH and a[0].lower() == b[0].lower():
            na, nb = mark in a[1], mark in b[1]
            if na != nb:
                (b if na else a)[1].append(mark)
    return unicodedata.normalize("NFC", "".join(c[0] + "".join(c[1]) for c in clusters))


def normalize_chars(text: str, *, nasal: str | None = None, legacy: bool | str = False) -> str:
    """Character-level fixes only (see the module docstring). Keeps case, digits, punctuation and line breaks.

    ``nasal``: "above" or "below" (default ``CANONICAL_NASAL``). ``legacy``: False, True, or "auto" (apply the
    legacy-font repair when :func:`detect_legacy` says so for this text)."""
    t = unicodedata.normalize("NFC", text or "")
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Cf")  # ZWSP, BOM, soft hyphen, bidi marks
    t = t.translate(_SPACES).translate(_APOSTROPHES).translate(_HYPHENS).translate(_LOOKALIKES)
    if legacy == "auto":
        legacy = detect_legacy(t)
    if legacy:
        t = repair_legacy(t)
    t = _repair_keyboard(t)
    return _canon_nasal(t, nasal or CANONICAL_NASAL)


# ------------------------------------------------------------------------------------------------- strict


# Elision hosts: the clipped particle and its full form. Arrêté §II.3.3 (kond'a, kond'ey, nd'a) and Texte 1
# (wong'a); the arrêté's other -nda amalgams (§II.3.2: gonda sinda fanda kanda yenda nonda donda), added after
# Meta spk01 wrote "kand'a ni se" (regression R08); k' g' m' d' b' s' from SMOL and Meta transcripts (k'a, g'a,
# m'iri, d'a, b'a). n' t' w' y' are ambiguous (na/ni, ti/te, wo/wa, ye/ya) and are only deleted. Needs native review.
ELISION_HOSTS = {"nd": "nda", "kond": "konda", "gond": "gonda", "sind": "sinda", "fand": "fanda", "kand": "kanda",
                 "yend": "yenda", "nond": "nonda", "dond": "donda", "wong": "wongu", "k": "ka", "g": "ga", "m": "ma",
                 "d": "da", "b": "ba", "s": "si"}
_MOSES_RE = re.compile(r"(?<![^\W_])(" + "|".join(sorted(ELISION_HOSTS, key=len, reverse=True)) + r") '(?=" +
                       _LETTER + r")", re.IGNORECASE)
# Digit groups. Bug found in v1.0 testing (regression R10): joining every "d ddd" made strict non-idempotent, since
# punctuation removed in a first pass ("50×100") created new groups ("50 100") for a second pass. Now: typographic
# separators (NBSP, narrow NBSP, thin space, dot, comma) are joined in the raw text; a plain space only before a money
# unit (1 000 F), at the end of strict.
_DIGIT_SEP_RE = re.compile(r"(?<=\d)[\u00a0\u202f\u2009.,](?=\d{3}(?!\d))")
_DIGIT_SPACE_MONEY_RE = re.compile(r"(?<!\d)(\d{1,3})((?: \d{3})+)(?= (?:f|fcfa|cfa|francs?)(?![^\W\d_]))")


def _is_letterish(ch: str) -> bool:
    return unicodedata.category(ch)[0] in "LM"


def _join_digit_groups(t: str) -> str:
    prev = None
    while prev != t:
        prev, t = t, _DIGIT_SEP_RE.sub("", t)
    return t


def strict(text: str, *, legacy: bool | str = False, digits: str = "keep") -> str:
    """As-written scoring form (see the module docstring). ``digits``: "keep" (default), "drop" or "spell" (spell
    digit runs out with ``verbalize.cardinal``, a diagnostic only: number readings are not native-approved)."""
    t = _join_digit_groups(unicodedata.normalize("NFC", text or ""))
    t = _TAG_RE.sub(" ", normalize_chars(t, legacy=legacy)).lower()
    t = _MOSES_RE.sub(lambda m: m.group(1) + "'", t)
    if digits == "drop":
        t = re.sub(r"\d+", " ", t)
    elif digits == "spell":
        V = _load_sibling("verbalize")
        t = re.sub(r"\d+", lambda m: " " + V.cardinal(int(m.group(0))) + " ", t)
    elif digits != "keep":
        raise ValueError(f"digits must be keep, drop or spell, not {digits!r}")
    out = []
    n = len(t)
    for i, ch in enumerate(t):
        cat = unicodedata.category(ch)
        if ch == "'":
            ok = 0 < i < n - 1 and _is_letterish(t[i - 1]) and _is_letterish(t[i + 1])
            out.append("'" if ok else " ")
        elif ch == "_" or cat[0] in "PSZC":
            out.append(" ")
        else:
            out.append(ch)
    t = _ANY_WS_RE.sub(" ", "".join(out)).strip()
    return _DIGIT_SPACE_MONEY_RE.sub(lambda m: m.group(1) + m.group(2).replace(" ", ""), t)


def normalize(text: str, *, keep_digits: bool = True, legacy: bool | str = False) -> str:
    """Strict form, with the same call shape as ``langs/hau/normalize.py:normalize``."""
    return strict(text, legacy=legacy, digits="keep" if keep_digits else "drop")


# ------------------------------------------------------------------------------------------------- folding steps

_LONG_VOWEL_RE = re.compile(r"([aeiou])\1+")
_GEMINATE_RE = re.compile(r"([bcdfghjklmnpqrstvwxyzŋɲ])\1+")


def _step_letters(t: str) -> str:
    return t.replace("ŋ", "n").replace("ɲ", "ny")


def _step_hooks(t: str) -> str:
    return "".join(HAUSA_HOOKS.get(c, c) for c in t)


def _step_marks(t: str) -> str:
    d = unicodedata.normalize("NFD", t)
    return unicodedata.normalize("NFC", "".join(c for c in d if not unicodedata.combining(c)))


def _expand_token(tok: str) -> str:
    if "'" in tok:
        host, rest = tok.split("'", 1)
        if host in ELISION_HOSTS and rest:
            tok = ELISION_HOSTS[host] + " " + rest
    return tok.replace("'", "")


def _step_apostrophes(t: str) -> str:
    t = t.replace("-", " ")
    return _ANY_WS_RE.sub(" ", " ".join(_expand_token(w) for w in t.split())).strip()


def _step_length(t: str) -> str:
    return _LONG_VOWEL_RE.sub(r"\1", t)


def _step_geminates(t: str) -> str:
    t = _GEMINATE_RE.sub(r"\1", t)
    while "nyny" in t:
        t = t.replace("nyny", "ny")
    return t


FOLD_STEPS = (
    ("letters_ng_ny", _step_letters),  # ŋ -> n, ɲ -> ny (keyboard substitutes were repaired in normalize_chars)
    ("hausa_hooks", _step_hooks),  # ɓ ɗ ƙ ƴ -> b d k y (Hausa words in code-switched speech)
    ("nasal_and_marks", _step_marks),  # tilde above/below and every other combining mark removed
    ("hyphen_apostrophe", _step_apostrophes),  # listed elisions expanded, other apostrophes deleted
    ("vowel_length", _step_length),  # doubled vowels collapsed
    ("geminates", _step_geminates),  # doubled consonants collapsed
)


def _nospace_of(folded: str) -> str:
    t = folded.replace(" ", "")
    prev = None
    while prev != t:
        prev, t = t, _step_geminates(_step_length(t))
    return t


def fold_steps(text: str, *, legacy: bool | str = False, digits: str = "keep") -> list[tuple[str, str]]:
    """``[("strict", s0), ("letters_ng_ny", s1), …, ("geminates", folded), ("nospace", s)]``, each step applied on
    top of the previous ones (the interface of ``core/asrkit/scoring.py``)."""
    t = strict(text, legacy=legacy, digits=digits)
    out = [("strict", t)]
    for name, fn in FOLD_STEPS:
        t = fn(t)
        out.append((name, t))
    out.append(("nospace", _nospace_of(t)))
    return out


def fold(text: str, *, legacy: bool | str = False, digits: str = "keep") -> str:
    """Folded scoring form (see the module docstring)."""
    t = strict(text, legacy=legacy, digits=digits)
    for _, fn in FOLD_STEPS:
        t = fn(t)
    return t


def nospace(text: str, *, legacy: bool | str = False, digits: str = "keep") -> str:
    """Segmentation-free form: folded, spaces removed, vowels and consonants collapsed again."""
    return _nospace_of(fold(text, legacy=legacy, digits=digits))


# ------------------------------------------------------------------------------------------------- conversions


def to_official(text: str) -> str:
    """Nasal vowels with the tilde below (the 1999 arrêté's a̰ ḛ ḭ o̰ ṵ), for display and official text. Only the
    nasal mark changes; run ``normalize_chars`` first for the other character fixes."""
    return _canon_nasal(unicodedata.normalize("NFC", text or ""), "below")


def from_official(text: str) -> str:
    """Nasal vowels with the tilde above (Namu's recommended internal form)."""
    return _canon_nasal(unicodedata.normalize("NFC", text or ""), "above")


# ------------------------------------------------------------------------------------------------- QA helpers


def alphabet_issues(text: str) -> list[tuple[str, str]]:
    """Characters of a transcript that the 1999 convention does not use, as (character, kind) pairs in order of
    first appearance: ``hausa_hook`` (ɓ ɗ ƙ ƴ), ``non_niger_letter`` (š ž x q v ç é …), ``digit`` (references
    spell numbers out), ``nasal_style`` (a tilde in the non-canonical style), ``tag`` (unknown <tag>)."""
    raw = unicodedata.normalize("NFC", text or "")
    issues: list[tuple[str, str]] = []
    seen = set()

    def add(ch, kind):
        if (ch, kind) not in seen:
            seen.add((ch, kind))
            issues.append((ch, kind))

    canon = TILDE_ABOVE if CANONICAL_NASAL == "above" else TILDE_BELOW
    other = TILDE_BELOW if CANONICAL_NASAL == "above" else TILDE_ABOVE
    if other in unicodedata.normalize("NFD", raw):
        add(other, "nasal_style")
    for tag in _TAG_RE.findall(raw):
        if tag.lower() not in TAGS:
            add(tag, "tag")
    d = unicodedata.normalize("NFD", _TAG_RE.sub(" ", normalize_chars(raw)).lower())
    i = 0
    while i < len(d):
        base, j = d[i], i + 1
        while j < len(d) and unicodedata.combining(d[j]):
            j += 1
        marks = d[i + 1:j]
        letter = unicodedata.normalize("NFC", d[i:j])
        if base.isdigit():
            add(base, "digit")
        elif base in HAUSA_HOOKS:
            add(base, "hausa_hook")
        elif base.isalpha():
            ok_marks = marks in ("", canon) and (marks == "" or base in VOWELS)
            if base not in _PLAIN_LETTERS_1999 or not ok_marks:
                add(letter, "non_niger_letter")
        i = j
    return issues


_SIBLINGS: dict = {}


def _load_sibling(name: str):
    if name not in _SIBLINGS:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"{name}.py")
        spec = importlib.util.spec_from_file_location(f"dje_{name}", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _SIBLINGS[name] = mod
    return _SIBLINGS[name]


def looks_like_ses(text: str) -> bool:
    """True when the text looks like Koyraboro Senni (Gao Songhay), not Zarma: š or ž (absent from Niger's
    alphabet), or ``lid_rules.check`` gives the verdict "ses". For data filtering, not for scoring."""
    if any(ch in unicodedata.normalize("NFC", text or "") for ch in "šžŠŽ"):
        return True
    return _load_sibling("lid_rules").check(text)["verdict"] == "ses"


_VARIANTS_CACHE: dict = {}


def spelling_variants(path: str | None = None) -> list[dict]:
    """Rows of ``spelling_variants.tsv`` (variant -> canonical spelling, with status and evidence)."""
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "spelling_variants.tsv")
    if path not in _VARIANTS_CACHE:
        with open(path, encoding="utf-8", newline="") as f:
            rows = [r for r in csv.DictReader((ln for ln in f if not ln.startswith("#")), delimiter="\t")]
        _VARIANTS_CACHE[path] = rows
    return _VARIANTS_CACHE[path]


def canonical_spelling(text: str, *, include_unreviewed: bool = False, path: str | None = None) -> str:
    """Rewrite known non-standard spellings as the convention's spelling (``kan`` -> ``kaŋ``, ``nise`` ->
    ``ni se`` …), word by word, case of the first letter kept. **Training and LM text only; never applied to
    evaluation references.** Only rows whose status is ``approved`` apply, unless ``include_unreviewed`` (for
    building review packets and experiments). Rows with status ``do_not_map`` never apply."""
    rows = [r for r in spelling_variants(path)
            if r["status"] == "approved" or (include_unreviewed and r["status"] == "needs_native_review")]
    table = {normalize_chars(r["variant"]).lower(): normalize_chars(r["canonical"]) for r in rows}
    t = normalize_chars(text)
    if not table:
        return t

    def keep_case(w: str, rep: str) -> str:
        return rep[:1].upper() + rep[1:] if w[:1].isupper() else rep

    wc = r"(?:[^\W\d_]|[̀-ͯ])"
    for key in sorted((k for k in table if " " in k), key=len, reverse=True):  # multi-word entries first
        pat = re.compile(r"(?<!" + wc + r")" + r"\s+".join(map(re.escape, key.split())) + r"(?!" + wc + r")",
                         re.IGNORECASE)
        t = pat.sub(lambda m, k=key: keep_case(m.group(0), table[k]), t)

    def sub(m: re.Match) -> str:
        w = m.group(0)
        rep = table.get(w.lower())
        return w if rep is None or " " in w else keep_case(w, rep)

    return re.sub(wc + r"+(?:'" + wc + r"+)*", sub, t)


# ------------------------------------------------------------------------------------------------- scorer helpers


def confusion_pairs() -> dict[str, str]:
    """Letter-level distinctions the folded form erases, for confusion counts (strict form on both sides). With the
    tilde below as canonical, the nasal keys are two code points and per-character counters will not see them."""
    nas = {v + (TILDE_ABOVE if CANONICAL_NASAL == "above" else TILDE_BELOW): v for v in VOWELS}
    out = {"ŋ": "n", "ɲ": "ny"}
    out.update({unicodedata.normalize("NFC", k): v for k, v in nas.items()})
    return out


def ng_only_difference(a: str, b: str) -> bool:
    """True when two strict words differ only by ŋ <-> n at one or more positions (kan / kaŋ, aran / araŋ). Note:
    haŋ 'drink' / han 'day' and daŋ 'put' / dan 'forge' are real ŋ/n pairs (Peace Corps dictionary), not variants."""
    if a == b or len(a) != len(b):
        return False
    return all(x == y or {x, y} == {"ŋ", "n"} for x, y in zip(a, b))


def ng_variant_words() -> dict[str, str]:
    """Frequent ŋ words and their n-spellings in the Meta corpus (report 02 §B7, report 03 §2.2), for counting how
    each transcriber and each model writes them. Same list as 0.3, so counts stay comparable."""
    return {"kaŋ": "kan", "araŋ": "aran", "boŋ": "bon", "yaŋ": "yan", "ŋwa": "nwa", "iŋga": "inga", "daŋ": "dan"}
