"""Zarma (dje) verbalisation for TTS input: numbers, ordinals, years, clock times, dates and money.

Status: **every output needs native review.** Written 2026-11-01 by the language-pack linguist agent. Every
numeral form below cites where it comes from (``SOURCES``); forms built by analogy are tagged ``CONSTRUCTED``.
How money, years and clock times are *read* in Niger (Zarma words or French; francs or *dala*) is not settled by
any source, so each has a switch, and the native packet ``human_eval/packets/L0-convention/`` asks.

Standard library only. ``prepare_tts_text`` = ``normalize.normalize_chars`` after ``verbalize_text``.

The system (sources in brackets; see ``SOURCES``):

* units 1-10, bound form after a noun / standalone form: fo/afo, hinka/ihinka, hinza/ihinza, taaci/itaaci, gu/igu,
  iddu, iyye, hakku/ahakku, yagga, way/iway [ARR1999, PC2006, GC2007, BIB1989, META2025];
* tens: waranka 20, waranza 30, waytaaci 40, waygu 50, waydu 60, wayye 70, wahakku 80 [BIB1989, META2025],
  wayyagga 90 [META2025 "wayagga/wayyaga", PC2006 "wayyegga"; spelling CONSTRUCTED];
* units after tens with *cindi* ("remainder"): way cindi fo 11, waranka cindi hinka 22 [ARR1999, PC2006];
* 100 zangu, 200 zangu hinka; 1000 zambar fo, 2000 zambar hinka; 10^6 miliyo [PC2006];
* *nda* after hundreds and thousands, followed by the standalone form: zangu nda iway cindi gu 115, zambar fo nda
  zangu taaci nda waygu cindi hinza 1453 [ARR1999], zangu nda afo 101, zangu nda ihinka 102 [PC2006];
* thousands multiplier: "repeat" style, *zambar* before each part (603,000 = zambar zangu iddu nda zambar hinza)
  [BIB1989], which keeps 120,000 (zambar zangu nda zambar waranka) apart from 100,020 (zambar zangu nda waranka);
  "single" style (zambar zangu yagga nda wayyagga cindi yagga … for 999,999) [PC2006] on request;
* optional subtractive 18/19: waranka ihinka si, waranka afo si [ARR1999, PC2006];
* ordinals in -anta: sintina 1st, hinkanta, hinzanta, taacanta, guwanta, iddanta, iyyanta, ahakkanta, yagganta,
  wayanta, way cindi fa 11th, warankanta 20th [BIB1989]; -ante variant [GC2007, GATITOS].
"""

from __future__ import annotations

import importlib.util
import os
import re

VERSION = "dje-verbalize-0.1 (2026-11-01)"
STATUS = "needs native review"

SOURCES = {
    "ARR1999": "Arrêté n°0215/MEN/SP-CNRE of 19 Oct 1999 (Niger orthography), §II.2.5.6 'iway cindi fo' 11, "
               "'waranka afo si' 19, 'zangu nda iway cindi gu' 115; §II.2.5.7 date 'Alarba, zulye 21, 1999'; Texte 2: "
               "'zambar fo nda zangu taaci nda waygu cindi hinza' 1453, 'Susubay … guru iyye', 'Alaasaro, guru taaci', "
               "'Alaamisi, zulye 3, 1999'; §II.4 'S.k.' = silimaŋ kayna.",
    "PC2006": "Peace Corps/Niger, Introduction to Zarma (April 2006), Lesson 10 (1-20, 18/19 subtractive, '8 has no "
              "i-'), Lesson 11 (21-1,000,000: zangu nda afo, zangu nd'ihinka, zambar fo nda zangu hinka, miliyo), "
              "Lesson 12 (money counted in dala = 5 F: dala hinka 10 F … zangu 500 F, zangu hinka 1,000 F, zambar fo "
              "5,000 F; 'after dala wey the word dala is often dropped').",
    "PCD2001": "Peace Corps Niger Zarma-English-French dictionary (bisharat.net): guuru 'time, o'clock' ('… guuru gu' "
               "= at five o'clock), guuru 'iron, metal', guru 'to pull (water)'; dala 'five francs'; zangu (dala) "
               "'five hundred francs'; zambar fo (dala) 'five thousand francs'; 'zambar taci' = 20,000 F.",
    "GC2007": "H. Seydou Hanafiou, Grammaire comparée français/soŋay-zarma (IRSH, Université Abdou Moumouni, 2007) "
              "§3.4.2.3: afo, (i)hinka, (i)hinza, (i)taaci, waranka, waranza; ordinals with -ante: (i)hinkante, "
              "(i)hinzante, (i)taacante; 'premier' (i)jina/sintina.",
    "BIB1989": "Zarma Bible 1989 (OPUS bible-uedin; copyrighted, research use: counts only): waydu 71, wayye 84, "
               "wahakku 40, waytaaci 162, waygu 155; cindi ahakku 45 (no 'cindi hakku'); 'zambar zangu iddu nda zambar "
               "hinza nda zangu gu nda waygu' (603,550); ordinals hinkanta 157, hinzanta 133, taacanta 72, guwanta 46, "
               "iddanta 42, iyyanta 128, ahakkanta 47, yagganta 31, wayanta 24, way cindi fa 19, waranka cindi fa 2, "
               "cindi hinkanta 28, warankanta 8, waranzanta 1, waytaacanta 2, wayguwanta 1; sintina 299; guuru hinza.",
    "META2025": "Meta Omnilingual ASR corpus dje_Latn transcripts (CC-BY-4.0), counting prompts by spk01-spk07: 'afo, "
                "ihinka, ihinza, itaaci, igu, iddu, iyye, ahakku, yagga, iway' (spk03, spk04), 'cindi hakku' (spk01, "
                "spk03, spk04, spk07), 'zangu hakku' (spk01, spk06), waydu / wayye / wahakku / wayagga (spk01, spk06), "
                "'Zangu nda i gu' 105 (spk01), 'zambarfo da zangu' (spk06); money 'dala way', 'dala waranka', 'dala gu' "
                "(spk03); 'ziro' (spk03), 'Ziiro' (spk04), 'Zero' (spk01); 'miliyaŋ' and 'million' (spk01).",
    "CLDR": "Unicode CLDR dje.xml: 'Guuru' (hour), 'Miniti' (minute); day names Alhadi, Atinni, Atalaata, Alarba, "
            "Alhamisi, Alzuma, Asibti (its month names use Mali letters and are not used here).",
    "GATITOS": "Google GATITOS en-dje lexicon (CC-BY-4.0): months Zanviye, Fevriye, Mars, Avril, Juyin, Zulye, Ogustu, "
               "Septambr, Oktobr, Novanbr, Desambr; half -> jare; quarter -> kunkuni; minute -> minit; first -> "
               "sintina; second -> hinkanta; third -> hinzanta/hinzante. Its numerals are unreliable (four -> nay, "
               "seven -> arba, thousand -> zangu) and are not used.",
    "CONSTRUCTED": "Built by the linguist agent by analogy with attested forms; no source attests this exact form.",
}

# number -> (bound form after a noun, standalone form, sources)
UNITS = {
    1: ("fo", "afo", ("ARR1999", "PC2006", "GC2007", "META2025")),
    2: ("hinka", "ihinka", ("ARR1999", "PC2006", "GC2007", "META2025")),
    3: ("hinza", "ihinza", ("ARR1999", "PC2006", "GC2007", "META2025")),
    4: ("taaci", "itaaci", ("ARR1999", "GC2007", "BIB1989", "META2025")),
    5: ("gu", "igu", ("ARR1999", "PC2006", "META2025")),
    6: ("iddu", "iddu", ("PC2006", "BIB1989", "META2025")),
    7: ("iyye", "iyye", ("ARR1999", "PC2006", "META2025")),
    8: ("hakku", "ahakku", ("PC2006", "META2025")),  # Bible: ahakku in every position (eight="ahakku")
    9: ("yagga", "yagga", ("BIB1989", "META2025")),  # spk07, PC2006: i yagga / iyega (nine="iyagga")
    10: ("way", "iway", ("ARR1999", "BIB1989", "META2025")),
}
TENS = {
    20: ("waranka", ("ARR1999", "PC2006", "GC2007", "META2025")),
    30: ("waranza", ("PC2006", "GC2007", "META2025")),
    40: ("waytaaci", ("BIB1989", "META2025")),
    50: ("waygu", ("ARR1999", "BIB1989", "META2025")),
    60: ("waydu", ("BIB1989", "META2025")),
    70: ("wayye", ("BIB1989", "META2025")),
    80: ("wahakku", ("BIB1989", "META2025")),
    90: ("wayyagga", ("META2025", "PC2006", "CONSTRUCTED")),
}
HUNDRED = ("zangu", ("ARR1999", "PC2006", "BIB1989", "META2025"))
THOUSAND = ("zambar", ("ARR1999", "PC2006", "BIB1989", "META2025"))
MILLION = ("miliyo", ("PC2006",))
ZERO = ("ziro", ("META2025", "CONSTRUCTED"))
CINDI = ("cindi", ("ARR1999", "PC2006", "BIB1989", "META2025"))

ORDINAL_FIRST = ("sintina", ("BIB1989", "GC2007", "GATITOS"))
ORDINAL_ONE_IN_COMPOUNDS = ("fa", ("BIB1989",))
# last word of the cardinal -> ordinal, all attested in the 1989 Bible (counts in SOURCES["BIB1989"])
ORDINAL_BY_WORD = {"hinka": "hinkanta", "hinza": "hinzanta", "taaci": "taacanta", "gu": "guwanta", "iddu": "iddanta",
                   "iyye": "iyyanta", "hakku": "ahakkanta", "ahakku": "ahakkanta", "yagga": "yagganta",
                   "way": "wayanta", "waranka": "warankanta", "waranza": "waranzanta", "waytaaci": "waytaacanta",
                   "waygu": "wayguwanta", "wayye": "wayyanta"}

WEEKDAYS = {  # Monday = 0
    0: ("atinni", ("CLDR", "PC2006")), 1: ("atalaata", ("CLDR",)), 2: ("alarba", ("ARR1999", "CLDR", "PC2006")),
    3: ("alaamisi", ("ARR1999",)), 4: ("alzuma", ("CLDR", "PC2006")), 5: ("asibti", ("CLDR", "PC2006")),
    6: ("alhadi", ("CLDR", "PC2006")),
}
MONTHS = {  # Zarma loan forms; only zulye is in the arrêté. People may simply say the French name (packet L0 H3).
    1: ("zanviye", ("GATITOS",)), 2: ("fevriye", ("GATITOS",)), 3: ("mars", ("GATITOS",)),
    4: ("avril", ("GATITOS",)), 5: ("me", ("CONSTRUCTED",)), 6: ("juyin", ("GATITOS",)),
    7: ("zulye", ("ARR1999", "GATITOS")), 8: ("ogustu", ("GATITOS",)), 9: ("septambr", ("GATITOS",)),
    10: ("oktobr", ("GATITOS",)), 11: ("novanbr", ("GATITOS",)), 12: ("desambr", ("GATITOS",)),
}
FR_WEEKDAYS = ("lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche")
FR_MONTHS = ("janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
             "novembre", "décembre")
# Clock: guuru 'hour' [PCD2001, CLDR, BIB1989 'guuru hinza']; the arrêté's Texte 2 writes 'guru iyye' (packet L0 I1).
HOUR_WORD = ("guuru", ("PCD2001", "CLDR", "BIB1989"))
MINUTE_WORD = ("miniti", ("CLDR", "GATITOS", "CONSTRUCTED"))
# Period words before the hour (12-hour reading), as in the arrêté's 'Susubay … guru iyye' and 'Alaasaro, guru taaci'.
PERIODS = (  # (from hour, to hour exclusive, word, sources)
    (4, 12, "susubay", ("ARR1999", "GATITOS")),
    (12, 15, "zaari", ("PC2006",)),
    (15, 19, "alaasar", ("ARR1999", "CONSTRUCTED")),
    (19, 24, "cin", ("GATITOS", "CONSTRUCTED")),
    (0, 4, "cin", ("GATITOS", "CONSTRUCTED")),
)
ABBREVIATIONS = {  # None = no documented reading; left in place with a note
    "s.k.": ("silimaŋ kayna", ("ARR1999",)),
    "w.k.c.": (None, ("ARR1999",)),  # 'etc.'; its full form is not given in the arrêté
}


class Spoken(str):
    """A verbalised string that remembers its sources (``.sources``) and status (always needs native review)."""

    sources: tuple
    status = STATUS

    def __new__(cls, text: str, sources):
        s = super().__new__(cls, text)
        s.sources = tuple(sorted(set(sources)))
        return s


# ------------------------------------------------------------------------------------------------ cardinals


def _unit(n: int, form: str, eight: str | None, nine: str | None):
    bound, alone, src = UNITS[n]
    w = alone if form == "standalone" else bound
    if n == 8 and eight:
        w, src = eight, src + ("BIB1989",)
    if n == 9 and nine and form == "standalone":
        w, src = nine, src + ("PC2006",)
    return w, set(src)


def _card(n: int, form: str, opts: dict):
    """Words and sources for 0 <= n < 10^9."""
    if n < 0 or n >= 10 ** 9:
        raise ValueError(f"cardinal() covers 0 to 999,999,999, not {n}")
    if n == 0:
        return ZERO[0], set(ZERO[1])
    j = opts["joiner"]
    jsrc = {"ARR1999", "PC2006"} if j == "nda" else {"BIB1989", "META2025"}
    if n >= 10 ** 6:
        m, r = divmod(n, 10 ** 6)
        w, s = _card(m, "bound", opts)
        head, src = MILLION[0] + " " + w, set(MILLION[1]) | s | {"CONSTRUCTED"}
        if r == 0:
            return head, src
        rest, s2 = _card(r, "standalone", opts)
        return f"{head} {j} {rest}", src | s2 | jsrc
    if n >= 1000:
        th, r = divmod(n, 1000)
        src = set(THOUSAND[1])
        if opts["thousands"] == "repeat" and th >= 100 and th % 100:
            h_part, s1 = _card(th - th % 100, "bound", opts)
            t_part, s2 = _card(th % 100, "bound", opts)
            head = f"{THOUSAND[0]} {h_part} {j} {THOUSAND[0]} {t_part}"
            src |= s1 | s2 | jsrc | {"BIB1989"}
        else:
            w, s1 = _card(th, "bound", opts)
            head = f"{THOUSAND[0]} {w}"
            src |= s1
            if th >= 100 and th % 100:
                src |= {"PC2006"}  # the single style is PC2006's 999,999
        if r == 0:
            return head, src
        rest, s3 = _card(r, "standalone", opts)
        return f"{head} {j} {rest}", src | s3 | jsrc
    if n >= 100:
        h, r = divmod(n, 100)
        if h == 1:
            head, src = HUNDRED[0], set(HUNDRED[1])
        else:
            w, s = _unit(h, "bound", opts["eight"], None)
            head, src = f"{HUNDRED[0]} {w}", set(HUNDRED[1]) | s
        if r == 0:
            return head, src
        rest, s2 = _card(r, "standalone", opts)
        return f"{head} {j} {rest}", src | s2 | jsrc
    if n <= 10:
        return _unit(n, form, opts["eight"], opts["nine"])
    t, u = divmod(n, 10)
    t *= 10
    if opts["subtractive"] and u in (8, 9) and t == 10:
        sub = "ihinka" if u == 8 else "afo"
        return f"{TENS[20][0]} {sub} si", {"ARR1999", "PC2006"}
    if t == 10:
        tw, src = _unit(10, form, None, None)
    else:
        tw, src = TENS[t][0], set(TENS[t][1])
    if u == 0:
        return tw, src
    uw, s2 = _unit(u, "bound", opts["eight"], None)
    return f"{tw} {CINDI[0]} {uw}", src | s2 | set(CINDI[1])


def cardinal(n: int, *, form: str = "standalone", subtractive: bool = False, thousands: str = "repeat",
             joiner: str = "nda", eight: str | None = None, nine: str | None = None) -> Spoken:
    """Zarma cardinal for 0 <= n < 10^9 (10^6 and above: CONSTRUCTED from PC2006's 'miliyo').

    ``form``: "standalone" (counting, after *nda*: afo, ihinka, iway …) or "bound" (after a noun: boro hinka).
    ``subtractive``: 18/19 as *waranka ihinka si* / *waranka afo si*. ``thousands``: "repeat" or "single".
    ``joiner``: "nda" (arrêté) or "da" (Bible, Meta spk06). ``eight="ahakku"``: the Bible's 8 in every position.
    ``nine="iyagga"``: standalone 9 with i- (spk07, Peace Corps)."""
    if form not in ("standalone", "bound") or thousands not in ("repeat", "single") or joiner not in ("nda", "da"):
        raise ValueError("bad option")
    opts = {"subtractive": subtractive, "thousands": thousands, "joiner": joiner, "eight": eight, "nine": nine}
    w, s = _card(int(n), form, opts)
    return Spoken(w, s)


def ordinal(n: int, *, suffix: str = "anta") -> Spoken:
    """Zarma ordinal (it follows the noun: *jiiri hinkanta* 'the second year'). ``suffix``: "anta" (Bible 1989,
    GATITOS) or "ante" (grammaire comparée 2007). 1st = *sintina*; 11th = *way cindi fa*; 12th = *way cindi
    hinkanta* (Bible). Forms not in ``ORDINAL_BY_WORD`` are CONSTRUCTED by analogy (-gu -> -guwanta, else the final
    vowel is dropped before -anta)."""
    if suffix not in ("anta", "ante"):
        raise ValueError("suffix must be anta or ante")
    if n < 1:
        raise ValueError("ordinal() starts at 1")
    if n == 1:
        return Spoken(ORDINAL_FIRST[0], ORDINAL_FIRST[1])
    base = cardinal(n, form="bound")
    words = base.split()
    last = words[-1]
    src = set(base.sources)
    if last in ("fo", "afo"):
        o = ORDINAL_ONE_IN_COMPOUNDS[0]
        src |= set(ORDINAL_ONE_IN_COMPOUNDS[1]) if words[-2:-1] == ["cindi"] else {"CONSTRUCTED"}
    elif last in ORDINAL_BY_WORD:
        o = ORDINAL_BY_WORD[last]
        src |= {"BIB1989"}
    else:
        o = (last + "wanta") if last.endswith("gu") else ((last[:-1] if last[-1] in "aeiou" else last) + "anta")
        src |= {"CONSTRUCTED"}
    if suffix == "ante" and o.endswith("anta"):
        o = o[:-1] + "e"
        src |= {"GC2007"} if o in ("hinkante", "hinzante", "taacante") else {"CONSTRUCTED"}
    words[-1] = o
    return Spoken(" ".join(words), src)


# ------------------------------------------------------------------------------------------------ French

_FR_UNITS = ("zéro un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize").split()
_FR_TENS = {20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante"}


def _fr_100(n: int) -> str:
    if n < 17:
        return _FR_UNITS[n]
    if n < 20:
        return "dix-" + _FR_UNITS[n - 10]
    if n < 70:
        t, u = divmod(n, 10)
        tw = _FR_TENS[t * 10]
        return tw if u == 0 else (tw + " et un" if u == 1 else tw + "-" + _FR_UNITS[u])
    if n < 80:
        return "soixante et onze" if n == 71 else "soixante-" + _fr_100(n - 60)
    return "quatre-vingts" if n == 80 else "quatre-vingt-" + _fr_100(n - 80)


def _fr_1000(n: int) -> str:
    h, r = divmod(n, 100)
    if h == 0:
        return _fr_100(r)
    hw = "cent" if h == 1 else _FR_UNITS[h] + " cent"
    return (hw + ("s" if h > 1 else "")) if r == 0 else hw + " " + _fr_100(r)


def french_cardinal(n: int, *, feminine: bool = False) -> str:
    """French cardinal (traditional spelling) for 0 <= n < 10^9, for the French readings of years, money and time."""
    if n < 0 or n >= 10 ** 9:
        raise ValueError("french_cardinal covers 0 to 999,999,999")
    if n == 0:
        return "zéro"
    parts = []
    m, r = divmod(n, 10 ** 6)
    if m:
        parts.append(("un million" if m == 1 else _fr_1000(m) + " millions"))
    th, r = divmod(r, 1000)
    if th:
        w = _fr_1000(th)
        if w.endswith(("cents", "vingts")):
            w = w[:-1]  # 'deux cent mille', 'quatre-vingt mille'
        parts.append("mille" if th == 1 else w + " mille")
    if r:
        parts.append(_fr_1000(r))
    out = " ".join(parts)
    if feminine and out.endswith("un"):
        out += "e"
    return out


# ------------------------------------------------------------------------------------------------ years, time, dates


def year(y: int, *, style: str = "zarma", jiiri: bool = False) -> Spoken:
    """A year: "zarma" (cardinal: 1999 -> zambar fo nda zangu yagga nda wayyagga cindi yagga) or "french" (mille
    neuf cent quatre-vingt-dix-neuf). ``jiiri=True`` prefixes *jiiri* 'year' (SMOL writes 'jiiri 2011'). Which
    reading natives use is unknown (packet L0 H1-H2)."""
    if style == "french":
        return Spoken(french_cardinal(y), ("CONSTRUCTED",))
    c = cardinal(y)
    return Spoken(("jiiri " if jiiri else "") + c, set(c.sources) | {"CONSTRUCTED"})


def _period(h: int):
    for a, b, w, s in PERIODS:
        if a <= h < b:
            return w, s
    raise ValueError(h)


def clock(h: int, m: int = 0, *, style: str = "zarma", period: bool = True, hour_word: str | None = None,
          half: bool = False) -> Spoken:
    """A clock time. "zarma": 12-hour reading *guuru N* with a period word (``susubay guuru iyye`` 07:00,
    ``alaasar guuru taaci`` 16:00, as in the arrêté's Texte 2), minutes as *nda miniti N* (CONSTRUCTED: no source
    gives a Zarma reading of minutes), ``half=True`` reads :30 as *nda jare* (CONSTRUCTED from GATITOS 'half').
    "french": *sept heures trente*. ``hour_word="guru"`` follows the arrêté's spelling."""
    if not (0 <= h < 24 and 0 <= m < 60):
        raise ValueError("bad time")
    if style == "french":
        hw = "une heure" if h == 1 else ("zéro heure" if h == 0 else french_cardinal(h, feminine=True) + " heures")
        return Spoken(hw if m == 0 else f"{hw} {french_cardinal(m, feminine=True)}", ("CONSTRUCTED",))
    h12 = h % 12 or 12
    c = cardinal(h12, form="bound")
    src = set(c.sources) | set(HOUR_WORD[1])
    words = [hour_word or HOUR_WORD[0], c]
    if hour_word == "guru":
        src |= {"ARR1999"}
    if period:
        pw, ps = _period(h)
        words.insert(0, pw)
        src |= set(ps)
    if m:
        if half and m == 30:
            words += ["nda", "jare"]
            src |= {"GATITOS", "CONSTRUCTED"}
        else:
            mc = cardinal(m, form="bound")
            words += ["nda", MINUTE_WORD[0], mc]
            src |= set(mc.sources) | set(MINUTE_WORD[1])
    return Spoken(" ".join(words), src)


def date(y: int | None, mo: int, d: int, *, weekday: int | None = None, style: str = "zarma",
         month_names: str = "zarma") -> Spoken:
    """A date in the arrêté's order (weekday, month day, year: *Alarba, zulye 21, 1999*). "zarma": numbers in Zarma
    (day as a bound cardinal after the month: CONSTRUCTED), month in its loan form (``month_names="french"`` for the
    French name); "french": *mercredi vingt et un juillet mille neuf cent quatre-vingt-dix-neuf*."""
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        raise ValueError("bad date")
    if style == "french":
        parts = []
        if weekday is not None:
            parts.append(FR_WEEKDAYS[weekday])
        parts.append("premier" if d == 1 else french_cardinal(d))
        parts.append(FR_MONTHS[mo - 1])
        if y is not None:
            parts.append(french_cardinal(y))
        return Spoken(" ".join(parts), ("CONSTRUCTED",))
    src = {"ARR1999", "CONSTRUCTED"}
    parts = []
    if weekday is not None:
        w, s = WEEKDAYS[weekday]
        parts.append(w + ",")
        src |= set(s)
    mname, ms = MONTHS[mo] if month_names == "zarma" else (FR_MONTHS[mo - 1], ("CONSTRUCTED",))
    dc = cardinal(d, form="bound")
    parts.append(f"{mname} {dc}" + ("," if y is not None else ""))
    src |= set(ms) | set(dc.sources)
    if y is not None:
        yc = year(y)
        parts.append(yc)
        src |= set(yc.sources)
    return Spoken(" ".join(parts), src)


# ------------------------------------------------------------------------------------------------ money


def money(amount: int, *, reading: str = "dala", say_dala: str = "always", subtractive: bool = False,
          cfa: bool = False) -> Spoken:
    """An FCFA amount read aloud. **How Niger reads prices is the native question (packet L0 G1-G4).**

    * ``reading="dala"``: counted in *dala* = 5 F (PC2006 Lesson 12; META2025 spk03 'dala waranka'): 1,000 F ->
      *dala zangu hinka*. ``say_dala="up_to_50"`` drops the word *dala* above 50 F, as PC2006 says people often do
      (*zangu hinka*). The amount must be a multiple of 5.
    * ``reading="franc"``: a franc count in Zarma words, *fraŋ zambar fo* (CONSTRUCTED; CLDR names the currency
      'CFA Fraŋ (BCEAO)').
    * ``reading="french"``: *mille francs* (``cfa=True``: *mille francs CFA*).
    A dala reading of a franc amount, or the reverse, is off by a factor of five."""
    if amount < 0:
        raise ValueError("negative amount")
    if reading == "dala":
        if amount % 5:
            raise ValueError(f"{amount} F is not a whole number of dala (5 F)")
        k = amount // 5
        src = {"PC2006", "PCD2001", "META2025"}
        if k == 1:
            return Spoken("dala", src)
        c = cardinal(k, form="bound", subtractive=subtractive)
        if say_dala == "up_to_50" and amount > 50:
            return Spoken(str(c), src | set(c.sources))
        if say_dala not in ("always", "up_to_50"):
            raise ValueError("say_dala must be always or up_to_50")
        return Spoken(f"dala {c}", src | set(c.sources))
    if reading == "franc":
        c = cardinal(amount, form="bound")
        return Spoken(f"fraŋ {c}", set(c.sources) | {"CLDR", "CONSTRUCTED"})
    if reading == "french":
        w = french_cardinal(amount)
        unit = "francs" if amount > 1 else "franc"
        de = "de " if amount >= 10 ** 6 and amount % 10 ** 6 == 0 else ""
        return Spoken(f"{w} {de}{unit}" + (" CFA" if cfa else ""), ("CONSTRUCTED",))
    raise ValueError("reading must be dala, franc or french")


# ------------------------------------------------------------------------------------------------ running text

_NUM = r"\d{1,3}(?:[   .]\d{3})+|\d+"
_MONEY_RE = re.compile(r"(?<![\w.,])(" + _NUM + r")\s*(F\s?CFA|FCFA|CFA|francs?\s+CFA|francs?|F)(?![^\W\d_])",
                       re.IGNORECASE)
_TIME_RE = re.compile(r"(?i)(?:(?<![^\W\d_])(guu?ru)\s+)?(?<![\w:])([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?(?![\w:])")
_DATE_RE = re.compile(r"(?<![\w/])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?![\w/])")
_ORD_RE = re.compile(r"(?<!\w)(\d{1,3})\s?(er|re|e|è|ème|eme)(?![^\W\d_])")
_YEAR_AFTER_JIIRI_RE = re.compile(r"(?i)(?<!\w)(jiiri)\s+(\d{4})(?!\d)")
_PERCENT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s?%")
_BARE_RE = re.compile(r"(?<![\w.,])(" + _NUM + r")(?![\w])(?!\s?%)")
_ABBR_RE = re.compile(r"(?i)(?<!\w)(s\.\s?k\.|w\.\s?k\.\s?c\.)")


def _int(s: str) -> int:
    return int(re.sub(r"[   .]", "", s))


def verbalize_text(text: str, *, money_reading: str = "dala", say_dala: str = "always", years: str = "zarma",
                   times: str = "zarma", dates: str = "zarma", ordinal_suffix: str = "anta") -> tuple[str, list[dict]]:
    """Spell out the numbers, times, dates, money and documented abbreviations in a Zarma text. Returns the new text
    and one note per replacement or per item left alone (``status`` is always "needs native review").

    Order: dates d/m/yyyy, clock times (7h30, 07:30), money (500 F, 1 000 FCFA), ordinals (2e, 1er), 'jiiri 2011',
    other 4-digit numbers 1000-2099 as years, then plain numbers (standalone cardinals). Percentages and
    'w.k.c.' have no documented reading and are left in place with a note."""
    notes: list[dict] = []

    def note(kind, src_text, out, sources=(), status=STATUS):
        notes.append({"kind": kind, "text": src_text, "spoken": out, "sources": sorted(set(sources)),
                      "status": status})

    def sub_date(m):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if not (1 <= mo <= 12 and 1 <= d <= 31):
            return m.group(0)
        out = date(y, mo, d, style=dates)
        note("date", m.group(0), out, out.sources)
        return out

    def sub_time(m):
        word, h, mi = m.group(1), int(m.group(2)), int(m.group(3) or 0)
        if word and times == "zarma":  # 'guuru 7h' already has the hour word: no period word, no second guuru
            out = clock(h, mi, style=times, period=False, hour_word=word.lower())
            out = Spoken((word + str(out)[len(word):]) if str(out).lower().startswith(word.lower()) else out,
                         out.sources)
        else:
            out = clock(h, mi, style=times)
            if word:
                out = Spoken(word + " " + out, out.sources)
        note("time", m.group(0), out, out.sources)
        return out

    def sub_money(m):
        amount = _int(m.group(1))
        reading = money_reading
        try:
            out = money(amount, reading=reading, say_dala=say_dala, cfa="cfa" in m.group(2).lower())
        except ValueError:
            reading = "franc"
            out = money(amount, reading="franc")
            note("money_fallback", m.group(0), out, out.sources,
                 status=STATUS + "; not a multiple of 5 F, read as francs")
            return out
        note(f"money_{reading}", m.group(0), out, out.sources)
        return out

    def sub_ord(m):
        out = ordinal(int(m.group(1)), suffix=ordinal_suffix)
        note("ordinal", m.group(0), out, out.sources)
        return out

    def sub_jiiri(m):
        out = year(int(m.group(2)), style=years)
        note("year", m.group(0), out, out.sources)
        return f"{m.group(1)} {out}"

    def sub_bare(m):
        n = _int(m.group(1))
        if len(m.group(1)) == 4 and 1000 <= n <= 2099:
            out = year(n, style=years)
            note("year_guess", m.group(0), out, out.sources, status=STATUS + "; 4-digit number read as a year")
            return out
        out = cardinal(n)
        note("cardinal", m.group(0), out, out.sources)
        return out

    def sub_abbr(m):
        key = re.sub(r"\s", "", m.group(1)).lower()
        reading, src = ABBREVIATIONS[key]
        if reading is None:
            note("abbreviation_unknown", m.group(0), m.group(0), src, status=STATUS + "; no documented reading")
            return m.group(0)
        note("abbreviation", m.group(0), reading, src)
        return reading

    t = text or ""
    t = _ABBR_RE.sub(sub_abbr, t)
    t = _DATE_RE.sub(sub_date, t)
    t = _TIME_RE.sub(sub_time, t)
    t = _MONEY_RE.sub(sub_money, t)
    t = _ORD_RE.sub(sub_ord, t)
    t = _YEAR_AFTER_JIIRI_RE.sub(sub_jiiri, t)
    for m in _PERCENT_RE.finditer(t):
        note("percent_unknown", m.group(0), m.group(0), (), status=STATUS + "; no documented Zarma reading of %")
    t = _BARE_RE.sub(sub_bare, t)
    return t, notes


def _normalizer():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "normalize.py")
    spec = importlib.util.spec_from_file_location("dje_normalize_for_verbalize", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def prepare_tts_text(text: str, **kw) -> str:
    """TTS input: verbalise, then ``normalize_chars`` (canonical nasal mark, ŋ repairs). Case and punctuation stay
    for prosody. Options as for :func:`verbalize_text`."""
    return _normalizer().normalize_chars(verbalize_text(text, **kw)[0])
