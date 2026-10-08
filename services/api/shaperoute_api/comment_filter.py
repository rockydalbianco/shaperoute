"""No negative comments (TASK-213, ADR-0176).

The user's rule: in Sgrava nobody writes a negative or nasty comment. A
comment that is one is not published, and the app says so with an alert.
TASK-120 calls check_comment before saving a comment and answers 422
comment_rejected with the reason.

The check is a list of words, Italian and English, with no AI and no
network: the same text always gets the same answer. It catches insults,
swearing and plainly negative words, also written in capitals, with letters
held long ("bruttissimooo"), digits for letters ("str0nz0") or one letter
at a time ("m e r d a"). A criticism said politely ("a bit dull") passes:
reports (TASK-121) are there for what the list misses.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from itertools import groupby

NEGATIVE = "negative"


def _each(stem: str, endings: str = "o a i e") -> frozenset[str]:
    """An Italian word in its forms: stronzo, stronza, stronzi, stronze."""
    return frozenset(stem + ending for ending in endings.split())


# Negative whatever comes before them: insults, swearing, slurs.
INSULTS: frozenset[str] = frozenset().union(
    # Italian
    _each("stronz"),
    {"stronzata", "stronzate"},
    {"merda", "merde", "merdaccia"},
    _each("merdos"),
    {"cazzo", "cazzi", "cazzata", "cazzate"},
    _each("cazzon"),
    _each("incazzat"),
    {"coglione", "cogliona", "coglioni", "coglionata", "coglionate"},
    {"rompicoglioni", "rompipalle"},
    {"fanculo", "vaffanculo", "affanculo", "vaffa"},
    {"fottiti"},
    _each("fottut"),
    {"idiota", "idiote", "idioti", "idiozia", "idiozie"},
    {"imbecille", "imbecilli"},
    _each("cretin"),
    {"deficiente", "deficienti"},
    _each("scem"),
    {"scemenza", "scemenze"},
    _each("stupid"),
    {"stupidaggine", "stupidaggini"},
    {"puttana", "puttane", "puttanata", "puttanate"},
    {"troia", "troie", "zoccola", "zoccole"},
    _each("bastard"),
    {"frocio", "froci", "ricchione", "ricchioni", "mongoloide", "mongoloidi"},
    {"cesso", "ciccione", "cicciona", "ciccioni"},
    {"minchia", "minchione", "minchioni"},
    {"cagare", "cagata", "cagate"},
    _each("sfigat"),
    {"porcodio", "porcoddio", "diocane", "dioporco", "diobestia", "porcamadonna"},
    # English
    {"fuck", "fucks", "fucked", "fucker", "fuckers", "fucking", "fuckin"},
    {"motherfucker", "motherfuckers", "fck", "fuk", "stfu"},
    {"shit", "shits", "shitty", "bullshit", "shithead", "crap", "crappy"},
    {"bitch", "bitches", "bastard", "bastards", "asshole", "assholes"},
    {"dumbass", "jackass", "dickhead"},
    {"idiot", "idiots", "idiotic", "moron", "morons", "moronic", "stupid"},
    {"loser", "losers", "retard", "retarded"},
    {"cunt", "cunts", "wanker", "wankers", "twat", "slut", "sluts"},
    {"whore", "whores", "faggot", "faggots", "nigger", "niggers", "kys"},
)

# Negative unless a negation comes just before: "non è brutto", "not bad".
NEGATIVE_WORDS: frozenset[str] = frozenset().union(
    # Italian
    _each("brutt"),
    _each("bruttissim"),
    _each("bruttin"),
    {"orribile", "orribili"},
    _each("orrend"),
    _each("pessim"),
    {"schifo", "schifezza", "schifezze"},
    _each("schifos"),
    _each("noios"),
    {"noia", "deludente", "deludenti", "delusione"},
    _each("penos"),
    {"patetico", "patetica", "patetici", "patetiche"},
    _each("ridicol"),
    _each("squallid"),
    {"scarsone", "scarsona", "scarsoni"},
    _each("fallit"),
    _each("imbranat"),
    {"incapace", "incapaci"},
    {"odio", "odiare"},
    _each("odios"),
    {"vergogna", "vergognati"},
    _each("vergognos"),
    # English
    {"ugly", "uglier", "ugliest", "awful", "terrible", "horrible"},
    {"disgusting", "pathetic", "boring", "worst", "useless", "disappointing"},
    {"trash", "trashy", "garbage", "sucks", "sucked"},
    {"hate", "hated", "hates", "hateful", "bad"},
)

# Negative as a whole, made of words that alone are not.
PHRASES: tuple[tuple[str, ...], ...] = (
    ("fai", "pena"),
    ("fa", "pena"),
    ("fate", "pena"),
    ("che", "palle"),
    ("porco", "dio"),
    ("porca", "madonna"),
    ("dio", "cane"),
    ("dio", "porco"),
    ("dio", "bestia"),
    ("kill", "yourself"),
    ("piss", "off"),
    ("go", "to", "hell"),
)

# In the three words before a negative word they turn it around. "t" is
# what is left of "isn't" and "don't".
NEGATIONS = frozenset(
    {"non", "nemmeno", "neanche", "neppure", "mica", "niente", "nulla"}
    | {"not", "never", "nothing", "nor", "t"}
)

# Listed words that are also places: Troia (Foggia), Bastardo (Perugia), Bad
# Ischl and the other spa towns, Crap Sogn Gion (Laax), Boring (Oregon),
# Noia (Galicia). With a capital in the middle of a sentence they are the
# place, and pass.
ALSO_PLACES = frozenset({"troia", "bastardo", "bad", "crap", "boring", "noia"})

NEGATIVE_EMOJI = ("🖕", "👎", "💩", "🤮", "🤢", "😡", "🤬", "😠")

# Digits and signs written for letters: "str0nz0", "$hit".
_LEET = str.maketrans("013457@$", "oieastas")
_WORD = re.compile(r"[\w@$]+")
# A letter held long: three or more times the same.
_HELD = re.compile(r"(.)\1{2,}")
_SENTENCE_END = ".!?…\n"
# Spelled out one letter at a time, a word needs at least four letters to be
# told apart from a run of short words.
_SPELLABLE = sorted(word for word in INSULTS | NEGATIVE_WORDS if len(word) >= 4)


@dataclass(frozen=True)
class _Word:
    plain: str  # lower case, no accents, digits read as letters
    forms: frozenset[str]  # plain, and with each held letter once and twice
    place: bool  # capital in the middle of a sentence: maybe a place's name


def check_comment(text: str) -> str | None:
    """None if the comment can be published, otherwise why not: "negative"."""
    if any(emoji in text for emoji in NEGATIVE_EMOJI):
        return NEGATIVE
    words = _words(text)
    if any(_negative_at(words, i) for i in range(len(words))):
        return NEGATIVE
    if _spelled_out(words):
        return NEGATIVE
    return None


def _negative_at(words: list[_Word], i: int) -> bool:
    if any(_phrase_at(words, i, phrase) for phrase in PHRASES):
        return True
    word = words[i]
    if word.place and word.forms & ALSO_PLACES:
        return False
    if word.forms & INSULTS:
        return True
    return bool(word.forms & NEGATIVE_WORDS) and not _negated(words, i)


def _phrase_at(words: list[_Word], i: int, phrase: tuple[str, ...]) -> bool:
    if i + len(phrase) > len(words):
        return False
    return all(part in words[i + k].forms for k, part in enumerate(phrase))


def _negated(words: list[_Word], i: int) -> bool:
    return any(words[j].forms & NEGATIONS for j in range(max(0, i - 3), i))


def _spelled_out(words: list[_Word]) -> bool:
    """A listed word typed one letter at a time: "m e r d a", "s.t.r.o.n.z.o"."""
    for single, run in groupby(words, key=lambda word: len(word.plain) == 1):
        if single:
            letters = "".join(word.plain for word in run)
            if any(word in letters for word in _SPELLABLE):
                return True
    return False


def _words(text: str) -> list[_Word]:
    text = unicodedata.normalize("NFKC", text)
    words = []
    for match in _WORD.finditer(text):
        written = match.group()
        plain = _plain(written)
        if not plain:
            continue
        forms = frozenset({plain, _HELD.sub(r"\1", plain), _HELD.sub(r"\1\1", plain)})
        place = (
            written[0].isupper()
            and not written.isupper()
            and not _starts_sentence(text, match.start())
        )
        words.append(_Word(plain, forms, place))
    return words


def _plain(written: str) -> str:
    lower = written.lower().replace("_", "")
    bare = "".join(
        char
        for char in unicodedata.normalize("NFKD", lower)
        if not unicodedata.combining(char)
    )
    if bare.isdigit() and len(bare) > 1:
        return bare  # a number, "10" or "2026", not letters
    return bare.translate(_LEET)


def _starts_sentence(text: str, start: int) -> bool:
    before = text[:start].rstrip(" \t\"'«“")
    return not before or before[-1] in _SENTENCE_END
