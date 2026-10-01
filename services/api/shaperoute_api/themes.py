"""What a themed request asks for: "a romantic heart in Paris, 10 km"
(TASK-129, ADR-0099).

A table of words first, in Italian, English and French: it costs nothing
and answers most requests. Only what the table does not know goes to the AI,
which may only choose a theme of THEMES or none (ADR-0012): it never names a
place nor gives a point. The places come from OpenStreetMap (themed.py).
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass

from route_engine.models import MAX_DISTANCE_M

# The app goes up to 21 km (ADR-0034); a shape smaller than 3 km has room
# for no stop.
MIN_THEMED_M = 3_000
MAX_THEMED_M = min(21_000, MAX_DISTANCE_M)
DEFAULT_THEMED_M = 10_000


@dataclass(frozen=True)
class Theme:
    """Where its places come from (Geoapify categories, OSM data), whether
    only notable ones count (with a Wikidata entry), and the shape drawn
    when the request names none."""

    categories: str
    notable: bool
    shape: str
    label: str


THEMES: dict[str, Theme] = {
    "romantic": Theme(
        "tourism.attraction.viewpoint,leisure.park,tourism.sights.bridge,"
        "tourism.sights.castle,tourism.sights.tower,tourism.sights.city_gate",
        notable=True,
        shape="heart",
        label="romantic spots",
    ),
    "food": Theme(
        "catering.restaurant,catering.cafe",
        notable=False,
        shape="circle",
        label="places to eat",
    ),
    "famous": Theme(
        "tourism.sights,tourism.attraction",
        notable=True,
        shape="star",
        label="famous places",
    ),
    "tourist": Theme(
        "tourism.sights,tourism.attraction,entertainment.museum",
        notable=True,
        shape="star",
        label="sights",
    ),
    "panoramic": Theme(
        "tourism.attraction.viewpoint,leisure.park",
        notable=False,
        shape="circle",
        label="viewpoints and parks",
    ),
    "nature": Theme(
        "leisure.park,natural", notable=False, shape="circle", label="parks and nature"
    ),
    "culture": Theme(
        "entertainment.museum,entertainment.culture",
        notable=False,
        shape="star",
        label="museums and culture",
    ),
    # The categories of "Ask for a route" (TASK-134), each a theme.
    "shopping": Theme(
        "commercial.shopping_mall,commercial.department_store,"
        "commercial.marketplace,commercial.clothing",
        notable=False,
        shape="circle",
        label="shops",
    ),
    "nightlife": Theme(
        "catering.bar,catering.pub,adult.nightclub",
        notable=False,
        shape="moon",
        label="bars and clubs",
    ),
    "hidden": Theme(
        "tourism.attraction,heritage",
        notable=False,
        shape="star",
        label="lesser-known places",
    ),
    "photography": Theme(
        "tourism.attraction.viewpoint,tourism.sights,building.historic",
        notable=True,
        shape="star",
        label="photo spots",
    ),
    "family": Theme(
        "leisure.playground,entertainment.zoo,entertainment.aquarium,"
        "entertainment.theme_park,leisure.park",
        notable=False,
        shape="circle",
        label="places for families",
    ),
    "running": Theme(
        "leisure.park,sport.track", notable=False, shape="circle", label="parks"
    ),
    "walking": Theme(
        "tourism.sights,leisure.park,highway.pedestrian",
        notable=False,
        shape="circle",
        label="places to walk by",
    ),
    "local": Theme(
        "commercial.marketplace,catering.cafe,commercial.food_and_drink",
        notable=False,
        shape="circle",
        label="local spots",
    ),
}

# Words, without accents, in lower case. The first theme whose word is in
# the request wins, in this order: "ristoranti romantici" is food. A word
# that starts with "=" must be the whole word: "bar" is not "Barcelona".
THEME_WORDS: dict[str, tuple[str, ...]] = {
    "food": (
        "ristorant",
        "gastronom",
        "cibo",
        "mangiar",
        "cucina",
        "trattori",
        "pizz",
        "sushi",
        "ramen",
        "food",
        "restaurant",
        "eat",
        "street food",
        "gourmet",
        "nourriture",
        "manger",
    ),
    "nightlife": (
        "nightlife",
        "night life",
        "vita notturna",
        "=bar",
        "=bars",
        "=pub",
        "=pubs",
        "=club",
        "clubs",
        "discotec",
        "aperitiv",
        "cocktail",
        "vie nocturne",
        "vida nocturna",
    ),
    "shopping": ("shopping", "negozi", "=shops", "boutique", "compras", "acquisti"),
    "hidden": (
        "hidden",
        "nascost",
        "segret",
        "secret",
        "insolit",
        "unusual",
        "off the beaten",
        "meno conosciut",
        "cache",
    ),
    "photography": ("photo", "foto", "instagram", "fotograf"),
    "family": (
        "family",
        "famiglia",
        "famiglie",
        "bambini",
        "kids",
        "children",
        "famille",
    ),
    "running": ("running", "=run", "jogging", "=corsa", "correre", "courir", "correr"),
    "walking": ("walking", "=walk", "passeggiat", "camminat", "balade", "paseo"),
    "local": ("=local", "locale", "tipic", "autentic", "authentic", "typique"),
    "panoramic": (
        "panoram",
        "belvedere",
        "vista",
        "view",
        "skyline",
        "point de vue",
    ),
    "nature": (
        "parco",
        "parchi",
        "park",
        "natura",
        "nature",
        "giardin",
        "garden",
        "jardin",
        "verde",
    ),
    "culture": ("muse", "art", "cultur", "chiese", "church", "eglise"),
    "romantic": ("romanti", "amore", "love", "coppia", "san valentino", "amour"),
    "famous": (
        "famos",
        "famous",
        "monument",
        "landmark",
        "celebr",
        "imperdibil",
        "must see",
        "highlight",
        "attrazion",
        "attraction",
        "iconic",
        "iconi",
        "celebre",
    ),
    "tourist": ("turistic", "tourist", "touristique", "sightseeing", "visita", "tour"),
}

# The shapes of the catalogue by their names, as in apps/mobile shapeWords.
SHAPE_WORDS: dict[str, tuple[str, ...]] = {
    "heart": ("cuore", "cuori", "heart", "hearts", "coeur"),
    "star": ("stella", "stelle", "star", "stars", "etoile"),
    "circle": ("cerchio", "circle", "cercle", "anello"),
    "moon": ("luna", "moon", "lune"),
    "cat": ("gatto", "cat", "chat"),
    "fish": ("pesce", "fish", "poisson"),
    "horse": ("cavallo", "horse", "cheval"),
    "butterfly": ("farfalla", "butterfly", "papillon"),
    "snail": ("lumaca", "snail", "escargot"),
}

_KM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:km|chilometri|kilometri|kilometers?)\b")
# "... a Parigi", "in Tokyo, 8 km", "à Paris !": a capitalised place after
# one of these words, at the end of the request or before a comma or a stop.
_CITY = re.compile(
    r"\b(?:a|ad|in|à|at|nella|nel|per|di|to)\s+"
    r"((?:[A-ZÀ-Ý][\w'’.-]*)(?:\s+[A-ZÀ-Ý][\w'’-]*){0,3})\s*(?=[,;.!?]|$)"
)


def plain(text: str) -> str:
    """Lower case, accents off, single spaces: the form the tables use."""
    folded = unicodedata.normalize("NFKD", text)
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    return " ".join(folded.lower().split())


def _first(
    words: dict[str, tuple[str, ...]], text: str, whole: bool = False
) -> str | None:
    """The first name with a word in `text`: a word that starts with one of
    its stems, or with `whole` is one of them; a stem of more words is
    looked for as it is."""
    tokens = text.split()
    padded = f" {text} "
    for name, stems in words.items():
        for stem in stems:
            if " " in stem:
                if f" {stem} " in padded:
                    return name
            elif stem.startswith("="):
                if stem[1:] in tokens:
                    return name
            elif any(t == stem if whole else t.startswith(stem) for t in tokens):
                return name
    return None


@dataclass(frozen=True)
class Reading:
    theme: str | None
    shape: str | None
    distance_m: int
    city: str | None
    # "table", "learned" (TASK-130) or "ai": how the theme was found, for
    # the log, the search events and the tests.
    by: str = "table"


def read_request(text: str) -> Reading:
    """Theme, shape, distance and city from the words, by the tables only."""
    words = plain(text)
    km = _KM.search(words)
    distance = DEFAULT_THEMED_M
    if km is not None:
        distance = round(float(km.group(1).replace(",", ".")) * 1000)
        distance = min(max(distance, MIN_THEMED_M), MAX_THEMED_M)
    found = list(_CITY.finditer(text.strip()))
    city = found[-1] if found else None
    return Reading(
        theme=_first(THEME_WORDS, words),
        shape=_first(SHAPE_WORDS, words, whole=True),
        distance_m=distance,
        city=None if city is None else city.group(1).strip(),
    )


def request_core(text: str) -> str:
    """The words of a request without its city and its km, plain: what the
    learned vocabulary is keyed by (TASK-130), so that "un giro per
    innamorati a Bologna" teaches "un giro per innamorati" for every city."""
    stripped = text.strip()
    found = list(_CITY.finditer(stripped))
    if found:
        city = found[-1]
        # The preposition before the city goes too: "a", "in", "à"...
        stripped = stripped[: city.start()] + stripped[city.end() :]
    words = re.sub(r"[^\w' ]", " ", _KM.sub(" ", plain(stripped)))
    return " ".join(w for w in words.split() if w not in {"di", "da", "of"})


ThemeChooser = Callable[[str, list[str]], str | None]
"""The AI: the theme of the list the words ask for, or None. Raises
shaperoute_ai.reading.ModelUnavailableError when it cannot answer."""


Learned = Callable[[str], str | None]
"""The learned vocabulary (TASK-130): the theme of a request's core."""

Correct = Callable[[str], str]
"""The learned vocabulary (TASK-130): the words with misspellings fixed."""


def read_with_ai(
    text: str,
    ai: ThemeChooser | None,
    learned: Learned | None = None,
    correct: Correct | None = None,
) -> Reading:
    """The tables, on the words with the learned misspellings fixed; then
    what was learned from past answers (TASK-130); the AI only when neither
    finds a theme. Every answer is checked: a theme not in THEMES counts as
    none."""
    fixed = text if correct is None else correct(text)
    reading = read_request(fixed)
    if reading.theme is not None:
        if fixed != text:
            return Reading(
                reading.theme,
                reading.shape,
                reading.distance_m,
                reading.city,
                by="learned",
            )
        return reading
    if learned is not None:
        known = learned(request_core(text))
        if known in THEMES:
            return Reading(
                known, reading.shape, reading.distance_m, reading.city, by="learned"
            )
    if ai is None:
        return reading
    chosen = ai(text, list(THEMES))
    if chosen not in THEMES:
        return reading
    return Reading(chosen, reading.shape, reading.distance_m, reading.city, by="ai")
