"""Many more words for the "Explore" catalogue, and the drawings already
made that never entered it (TASK-441, parts A1 and A2).

Usage (from the repository root; `--run` wants the route engine's
environment, everything else the standard library alone):

    python tools/catalog_words.py --plan
    services/api/.venv/bin/python tools/catalog_words.py --run
    python tools/catalog_words.py --propose > out/TASK-441/kept-proposal.json
    python tools/catalog_words.py --write

`tools/catalog_seed.py` (TASK-419) is used as it is: its cities and squares,
its run loop (`run_cities`), its filter and its score. This module only says
which short words are written in which city, never downloads a zone (the
foot zones of `data/cache` are enough), keeps its own run log, and proposes
the keys to add to `tools/catalog_kept.json`:

- **A1**: every drawing of TASK-419's log that passes the filter and is
  not kept yet, of a shape the engine has (`registered_shapes`);
- **A2**: for every city and new word, the better of its two styles, when
  it passes the filter.

Words are short on purpose: on one line the filter passes 2-4 letters nine
times in ten and 5 letters one in five (TASK-311, TASK-419's log).

**Part B1, the pen up.** On one line the letters of a word run into each
other and the word does not read, whatever its similarity: the user had the
702 words of A1 and A2 taken out. With `--pen-up` the words are written as
the app's city examples write them (services/api city_examples.py): round
letters, each drawn on its own, 3 km a letter, the route walking from one to
the next (`walks`). `--pen-up --run` plans them, `--pen-up --propose` takes
the one-line words out of the kept keys and puts in the words that pass,
`--write` reads the three logs.

    services/api/.venv/bin/python tools/catalog_words.py --pen-up --run
    python tools/catalog_words.py --pen-up --propose
"""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import sys
import time
from collections import Counter
from collections.abc import Callable, Iterable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import catalog_seed as cs

REPO_ROOT = cs.REPO_ROOT
DEFAULT_LOG = REPO_ROOT / "out" / "TASK-441" / "runs.jsonl"
PEN_UP_LOG = REPO_ROOT / "out" / "TASK-441" / "pen-up.jsonl"
OLD_LOG = cs.DEFAULT_LOG
SHAPES_PY = (
    REPO_ROOT / "services" / "route-engine" / "route_engine" / "shapes" / "__init__.py"
)

# On one line a word reads up to here (see the module's note).
MAX_LETTERS = 4

# --- The words -----------------------------------------------------------------

# Written anywhere: every city gets `POOL_PER_CITY` of these, in turn, so a
# word shows up in about ten cities and no city has them all.
EVERYWHERE: tuple[str, ...] = (
    "RUN",
    "GO",
    "MUW",
    "WOW",
    "LOVE",
    "YES",
    "HI",
    "OK",
    "FUN",
    "JOY",
    "ZEN",
    "FREE",
    "FAST",
    "GOAL",
    "STAR",
    "COOL",
    "YOLO",
    "HOME",
    "KISS",
    "XOXO",
    "MOM",
    "DAD",
    "BFF",
)
# What people write these months: the season, and words of the moment.
SEASON: tuple[str, ...] = ("XMAS", "NOEL", "SNOW", "SKI")
TRENDS: tuple[str, ...] = (
    "GOAT",
    "SLAY",
    "VIBE",
    "MOOD",
    "AURA",
    "BRO",
    "GG",
    "LOL",
    "OMG",
)
POOL: tuple[str, ...] = EVERYWHERE + SEASON + TRENDS
POOL_PER_CITY = 6

# In the language spoken in the city, all of them.
LOCAL: dict[str, tuple[str, ...]] = {
    "it": ("CIAO", "VAI", "DAI", "BACI", "PACE", "AMO", "TVB", "SI"),
    "en": ("HEY", "HI", "RUN", "LOVE"),
    "es": ("HOLA", "OLE", "AMOR", "VIDA"),
    "pt": ("OLA", "AMOR", "VIDA"),
    "fr": ("OUI", "VIVE", "BISE"),
    "de": ("JA", "LOS", "HEY"),
    "nl": ("HOI", "JA"),
    "scan": ("HEJ", "SKOL"),
    "int": ("LOVE", "HEY"),
}
# The cities that do not speak Italian; every other city of catalog_seed
# does. "int": a language whose greeting the user has not approved.
LANGUAGE: dict[str, str] = {
    "newyork": "en",
    "london": "en",
    "sydney": "en",
    "sanfrancisco": "en",
    "dublin": "en",
    "edinburgh": "en",
    "tokyo": "int",
    "dubai": "int",
    "prague": "int",
    "budapest": "int",
    "athens": "int",
    "krakow": "int",
    "ljubljana": "int",
    "zagreb": "int",
    "barcelona": "es",
    "madrid": "es",
    "seville": "es",
    "valencia": "es",
    "lisbon": "pt",
    "porto": "pt",
    "paris": "fr",
    "nice": "fr",
    "lyon": "fr",
    "brussels": "fr",
    "berlin": "de",
    "vienna": "de",
    "munich": "de",
    "zurich": "de",
    "hamburg": "de",
    "amsterdam": "nl",
    "copenhagen": "scan",
    "stockholm": "scan",
}
# A word of one city alone: its short name, or how it greets.
OWN: dict[str, tuple[str, ...]] = {
    "roma": ("ROMA", "DAJE", "AO"),
    "pisa": ("PISA",),
    "bari": ("BARI", "UE"),
    "napoli": ("UE",),
    "milano": ("UELA",),
    "firenze": ("BONA",),
    "vienna": ("WIEN",),
    "nice": ("NICE",),
    "lyon": ("LYON",),
    "hamburg": ("MOIN",),
    "newyork": ("NYC",),
    "sanfrancisco": ("SF",),
}


def language_of(city: str) -> str:
    return LANGUAGE.get(city, "it")


def words_of(city: str, index: int) -> tuple[str, ...]:
    """What is written in `city`, the `index`-th of the catalogue: its own
    words, those of its language, then its turn of the pool. No word twice,
    none longer than MAX_LETTERS."""
    start = index * POOL_PER_CITY
    turn = tuple(POOL[(start + k) % len(POOL)] for k in range(POOL_PER_CITY))
    words = OWN.get(city, ()) + LOCAL[language_of(city)] + turn
    return tuple(dict.fromkeys(w for w in words if len(w) <= MAX_LETTERS))


def word_keys(city: cs.City, word: str) -> list[str]:
    d = cs.word_distance(word)
    return [cs.Case(city.name, word, d, s).key for s in cs.STYLES]


def cities(done: Iterable[str] = (), names: Sequence[str] = ()) -> list[cs.City]:
    """The cities of catalog_seed with the words of this module and no
    shape; a word whose two styles are both in `done` (drawn for TASK-419)
    is left out. `names` narrows them."""
    done = set(done)
    out = []
    for i, c in enumerate(cs.CITIES):
        if names and c.name not in names:
            continue
        words = tuple(
            w
            for w in words_of(c.name, i)
            if not all(k in done for k in word_keys(c, w))
        )
        out.append(cs.City(c.name, c.square, c.group, words, (), c.distances))
    return out


def plan(done: Iterable[str] = (), names: Sequence[str] = ()) -> list[cs.Case]:
    return cs.plan(cities(done, names))


# --- What to add ---------------------------------------------------------------


def registered_shapes(source: str | None = None) -> frozenset[str]:
    """The names in the engine's SHAPES, read from its source: this module
    must run without the engine."""
    text = SHAPES_PY.read_text(encoding="utf-8") if source is None else source
    body = text.split("SHAPES:", 1)[1].split("\n}\n", 1)[0]
    return frozenset(re.findall(r'^\s+"([a-z_]+)":', body, flags=re.M))


def spare(
    runs: Iterable[cs.Run], kept: Iterable[str], shapes: Iterable[str]
) -> list[str]:
    """A1: the keys of the runs passing the filter and not kept, of a word
    or of a shape among `shapes`, the best first."""
    kept, shapes = set(kept), set(shapes)
    good = [
        r
        for r in cs.passing(runs)
        if r["key"] not in kept and ("word" in r or r["shape"] in shapes)
    ]
    good.sort(key=lambda r: (-cs.score(r), r["key"]))
    return [r["key"] for r in good]


def best_words(runs: Iterable[cs.Run], kept: Iterable[str] = ()) -> list[str]:
    """A2: for every city and word, the key of the better style among those
    passing the filter; none for a word that city already has kept."""
    have = {tuple(k.split("/")[:2]) for k in kept}
    have = {(city, what.split(":")[0]) for city, what in have}
    best: dict[tuple[str, str], cs.Run] = {}
    for r in cs.passing(runs):
        if "word" not in r:
            continue
        at = (r["city"], r["word"])
        if at in have:
            continue
        old = best.get(at)
        if old is None or (-cs.score(r), r["key"]) < (-cs.score(old), old["key"]):
            best[at] = r
    return [best[at]["key"] for at in sorted(best)]


def propose(
    old_runs: Sequence[cs.Run],
    word_runs: Sequence[cs.Run],
    kept: Sequence[str],
    shapes: Iterable[str],
) -> list[str]:
    """The kept keys, then A1, then A2, none twice."""
    a1 = spare(old_runs, kept, shapes)
    a2 = best_words(word_runs, list(kept) + a1)
    return list(dict.fromkeys([*kept, *a1, *a2]))


# --- The pen up (part B1) --------------------------------------------------------

# What a key holds where a one-line word holds its style.
PEN_UP = "pen_up"
# As the city examples (city_examples.word_request): round letters, 3 km each
# (route_engine.words.LETTER_DISTANCE_M).
PEN_UP_STYLE = "round"
LETTER_M = 3000
# Seven letters stayed under the filter in every city tried (0.85-0.89), six
# passed in the large ones: the trial of 2026-11-11 (docs/tasks/TASK-441.md).
PEN_UP_MAX_LETTERS = 6
PEN_UP_SOURCE = "TASK-441 pen up"

# Longer words, of the language of the city: `LONG_PER_CITY` of its list, in
# turn, and `LONG_POOL_PER_CITY` of the ones written anywhere.
LONG_LOCAL: dict[str, tuple[str, ...]] = {
    "it": (
        "AMORE",
        "TIAMO",
        "FORZA",
        "GRAZIE",
        "AUGURI",
        "NATALE",
        "MAMMA",
        "NONNA",
        "BRAVO",
    ),
    "es": ("VAMOS",),
    "fr": ("ALLEZ", "SALUT", "AMOUR"),
    "de": ("DANKE", "HALLO"),
}
LONG_POOL: tuple[str, ...] = (
    "HELLO",
    "HAPPY",
    "SMILE",
    "DREAM",
    "PEACE",
    "FAMILY",
    "BESTIE",
    "RUNNER",
    "CHEERS",
    "HOHOHO",
)
LONG_PER_CITY = 5
LONG_POOL_PER_CITY = 2
# The name of the city, where six letters hold it.
LONG_OWN: dict[str, tuple[str, ...]] = {
    "milano": ("MILANO",),
    "torino": ("TORINO",),
    "napoli": ("NAPOLI",),
    "verona": ("VERONA",),
    "trento": ("TRENTO",),
    "genova": ("GENOVA",),
    "paris": ("PARIS",),
    "london": ("LONDON",),
    "berlin": ("BERLIN",),
    "madrid": ("MADRID",),
    "lisbon": ("LISBOA",),
    "prague": ("PRAHA",),
    "athens": ("ATHENS",),
    "dublin": ("DUBLIN",),
}


def _turn(words: Sequence[str], index: int, size: int) -> tuple[str, ...]:
    if not words:
        return ()
    size = min(size, len(words))
    return tuple(words[(index * size + k) % len(words)] for k in range(size))


def long_words_of(city: str, index: int) -> tuple[str, ...]:
    """The words of 5-6 letters of `city`, the `index`-th of the catalogue:
    its name, a turn of its language's, a turn of the pool."""
    words = (
        LONG_OWN.get(city, ())
        + _turn(LONG_LOCAL.get(language_of(city), ()), index, LONG_PER_CITY)
        + _turn(LONG_POOL, index, LONG_POOL_PER_CITY)
    )
    return tuple(dict.fromkeys(words))


def is_word_key(key: str) -> bool:
    return ":" in key.split("/")[1]


def word_of_key(key: str) -> tuple[str, str]:
    """(city, word) of a word's key, whatever its style."""
    city, what, _ = key.split("/")
    return city, what.split(":")[0]


def pen_up_key(city: str, word: str) -> str:
    return f"{city}/{word}:{PEN_UP}/{len(word) * LETTER_M}"


def pen_up_words(city: cs.City, index: int, kept: Iterable[str] = ()) -> list[str]:
    """What is written in `city` with the pen up: its short words, its long
    ones, and every word it has among the `kept` keys (written again, the
    one-line ones going out); none longer than PEN_UP_MAX_LETTERS or than
    the city has room for."""
    again = tuple(
        w for c, w in map(word_of_key, filter(is_word_key, kept)) if c == city.name
    )
    words = words_of(city.name, index) + long_words_of(city.name, index) + again
    room = max(city.distances)
    return [
        w
        for w in dict.fromkeys(words)
        if len(w) <= PEN_UP_MAX_LETTERS and len(w) * LETTER_M <= room
    ]


def pen_up_plan(
    done: Iterable[str] = (), names: Sequence[str] = (), kept: Iterable[str] = ()
) -> list[tuple[cs.City, str]]:
    """Every (city, word) to write with the pen up whose key is not `done`."""
    done, kept = set(done), list(kept)
    return [
        (c, w)
        for i, c in enumerate(cs.CITIES)
        if not names or c.name in names
        for w in pen_up_words(c, i, kept)
        if pen_up_key(c.name, w) not in done
    ]


Points = Sequence[Sequence[float]]


def pieces(
    points: Points, walks: Iterable[Sequence[int]]
) -> tuple[list[Points], list[Points]]:
    """The route cut at its walks (RouteResult.walks, pairs of indices of
    `points`): the pieces drawn, and the pieces walked with the pen up."""
    drawn, walked, at = [], [], 0
    for a, b in sorted(tuple(w) for w in walks):
        drawn.append(points[at : a + 1])
        walked.append(points[a : b + 1])
        at = b
    drawn.append(points[at:])
    return [d for d in drawn if len(d) > 1], [w for w in walked if len(w) > 1]


def drawn_m(points: Points, walks: Iterable[Sequence[int]]) -> float:
    """The length of the drawing alone: the route without its walks."""
    return sum(
        cs.path_length_m([(p[0], p[1]) for p in d]) for d in pieces(points, walks)[0]
    )


def doubled_share(points: Points, walks: Iterable[Sequence[int]]) -> float:
    """The share of the drawing on pieces of road it runs more than once,
    either way (as catalog_seed.doubled_share, over the pieces drawn)."""
    lengths: Counter[frozenset[tuple[float, float]]] = Counter()
    times: Counter[frozenset[tuple[float, float]]] = Counter()
    for piece in pieces(points, walks)[0]:
        for a, b in zip(piece, piece[1:], strict=False):
            ends = frozenset(
                (round(p[0], cs.DIGITS), round(p[1], cs.DIGITS)) for p in (a, b)
            )
            if len(ends) == 2:
                lengths[ends] += cs.path_length_m([(a[0], a[1]), (b[0], b[1])])
                times[ends] += 1
    total = sum(lengths.values())
    if total == 0:
        return 0.0
    return sum(m for ends, m in lengths.items() if times[ends] > 1) / total


def pen_up_reasons(run: cs.Run) -> list[str]:
    """Why a word with the pen up stays out; empty when it passes. As
    catalog_seed.reasons, but the distance is the drawing's: the walks
    between the letters come on top of what was asked."""
    if not cs.drawn(run):
        return [str(run.get("error_kind") or "not drawn")]
    out = []
    if run["similarity"] < cs.MIN_SIMILARITY:
        out.append(f"similarity {run['similarity']:.2f} < {cs.MIN_SIMILARITY:.2f}")
    off = run["drawn_m"] / run["distance_m"] - 1
    if abs(off) > cs.MAX_DISTANCE_OFF:
        out.append(f"drawing {off:+.0%} off")
    shares = run.get("road_shares") or {}
    bad = sum(s for kind, s in shares.items() if kind in cs.BAD_ROADS)
    if bad > 0:
        out.append(f"{bad:.0%} on motorway or trunk")
    return out


def reasons(run: cs.Run) -> list[str]:
    return pen_up_reasons(run) if run.get(PEN_UP) else cs.reasons(run)


def pen_up_keep(pen_up_runs: Iterable[cs.Run], kept: Sequence[str]) -> list[str]:
    """The kept keys without the words on one line, then every word with
    the pen up that passes, by city and word."""
    shapes = [k for k in kept if not is_word_key(k) or f":{PEN_UP}/" in k]
    words = sorted(r["key"] for r in pen_up_runs if not pen_up_reasons(r))
    return list(dict.fromkeys([*shapes, *words]))


def _bbox(points: Points, margin: float = 0.002) -> tuple[float, float, float, float]:
    lats, lons = [p[0] for p in points], [p[1] for p in points]
    return (
        min(lats) - margin,
        min(lons) - margin,
        max(lats) + margin,
        max(lons) + margin,
    )


def run_pen_up(
    todo: Sequence[tuple[cs.City, str]],
    log: Path,
    cache_dir: Path,
    say: Callable[[str], None] = print,
) -> int:
    """Plans every (city, word) of `todo` as the app's city examples ask
    them and appends one line each to `log`. The engine is imported here.
    Nothing is downloaded: Overpass points at a closed port, so a word whose
    zone is not in `cache_dir` fails (and is tried again at the next run)."""
    import osmnx as ox
    from route_engine.errors import ShapeNotDrawableError
    from route_engine.models import RouteRequest
    from route_engine.nearby_starts import ShapeJob, plan_nearby
    from route_engine.network import OsmnxSource
    from route_engine.seed_catalog import DECIMALS, NOT_DRAWABLE

    ox.settings.overpass_url = "http://127.0.0.1:9/api"
    ox.settings.overpass_rate_limit = False
    ox.settings.requests_timeout = 5
    source = OsmnxSource(cache_dir)
    planned = 0
    for city, word in todo:
        began = time.monotonic()
        run: dict[str, Any] = {
            "key": pen_up_key(city.name, word),
            "city": city.name,
            "word": word,
            "style": PEN_UP_STYLE,
            PEN_UP: True,
            "distance_m": len(word) * LETTER_M,
            "source": PEN_UP_SOURCE,
        }
        try:
            request = RouteRequest(
                start=city.square,
                word=word,
                style=PEN_UP_STYLE,  # type: ignore[arg-type]
                pen_up=True,
                distance_m=run["distance_m"],
            )
            result = plan_nearby(
                ShapeJob.of_request(request), city.square, source
            ).plan.result
        except ShapeNotDrawableError as exc:
            run.update(error_kind=NOT_DRAWABLE, error=str(exc))
        except Exception as exc:  # no zone in the cache: tried again next run
            run.update(error_kind=cs.FAILED, error=f"{type(exc).__name__}: {exc}"[:300])
        else:
            points = [
                [round(lat, DECIMALS), round(lon, DECIMALS)]
                for lat, lon in result.points
            ]
            walks = [[int(a), int(b)] for a, b in result.walks]
            run.update(
                similarity=round(result.similarity, 4),
                route_m=round(result.distance_m),
                drawn_m=round(drawn_m(points, walks)),
                points=points,
                walks=walks,
                warnings=list(result.warnings),
                doubled=round(doubled_share(points, walks), 4),
            )
            if result.rotation_deg:
                run["rotation_deg"] = round(result.rotation_deg, 2)
            box = _bbox(points)
            if source.is_cached(box):
                roads = cs.road_index(source.load(box))
                run["road_shares"] = cs.road_shares(
                    [(lat, lon) for lat, lon in points], roads
                )
        run["seconds"] = round(time.monotonic() - began, 1)
        run["planned_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        cs.append_run(log, run)
        planned += 1
        what = run.get("error_kind") or (
            f"similarity {run['similarity']:.2f}, drawing {run['drawn_m']} m"
            f" + {run['route_m'] - run['drawn_m']} m walked"
        )
        say(f"{run['key']}: {what}, {run['seconds']:.0f} s")
    return planned


# --- The page the user judges the words on ----------------------------------------

PAGE_W, PAGE_H, PAGE_PAD = 320, 150, 8
PAGE_POINTS = 90  # of each piece: a letter of 3 km reads with fewer

PAGE = """<!doctype html><html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root { --bg:#fafaf7; --fg:#16181d; --mute:#667085; --card:#fff; --line:#e4e4e0;
  --pen:#e4572e; --walk:#b9bcc4; }
@media (prefers-color-scheme: dark) { :root { --bg:#111317; --fg:#eceef2;
  --mute:#98a0ae; --card:#1a1d23; --line:#2a2e36; --pen:#ff7a52; --walk:#565c68; } }
body { margin:0; padding:24px 16px 48px; background:var(--bg); color:var(--fg);
  font:16px/1.45 -apple-system, system-ui, sans-serif; }
main { max-width:1120px; margin:0 auto; }
h1 { font-size:26px; margin:0 0 6px; }
.lead { color:var(--mute); margin:0 0 20px; max-width:66ch; }
h2 { font-size:19px; margin:36px 0 12px; }
table { border-collapse:collapse; font-size:14px; margin:0 0 8px; }
td, th { padding:4px 14px 4px 0; text-align:left; font-variant-numeric:tabular-nums; }
th { color:var(--mute); font-weight:500; }
section { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));
  gap:12px; }
section h2 { grid-column:1/-1; }
article { background:var(--card); border:1px solid var(--line); border-radius:14px;
  padding:12px 14px; }
article.out { opacity:.55; }
h3 { margin:0; font-size:16px; letter-spacing:.06em; }
h3 small { font-weight:400; letter-spacing:0; color:var(--mute); margin-left:8px; }
article p { margin:2px 0 0; font-size:13px; color:var(--mute); }
.why { color:var(--pen); }
svg { width:100%; height:auto; display:block; margin:6px 0 2px; }
.pen { fill:none; stroke:var(--pen); stroke-width:2.2; stroke-linejoin:round;
  stroke-linecap:round; }
.walk { fill:none; stroke:var(--walk); stroke-width:1.1; stroke-dasharray:3 4; }
</style><main>
<h1>__TITLE__</h1>
<p class="lead">Ogni lettera è disegnata da sola; il tratteggio grigio è il tratto
fra una lettera e l'altra, che si percorre ma non fa parte del disegno. Ogni parola
è girata come la mostra l'app, non col nord in alto. Quelle sbiadite non passano
il filtro e non entrano.</p>
__BODY__
</main></html>
"""


def _upright(run: cs.Run) -> list[tuple[float, float]]:
    """The route in metres around its first point, turned back as the app
    shows it (bearingOf, turnedMap.ts): a shape turned `rotation_deg`
    counterclockwise is drawn turned as much clockwise."""
    xy = cs.local_xy(run["points"][0], run["points"])
    turn = math.radians(run.get("rotation_deg") or 0.0)
    cos, sin = math.cos(turn), math.sin(turn)
    return [(x * cos + y * sin, -x * sin + y * cos) for x, y in xy]


def _thin(piece: Sequence[Any], size: int = PAGE_POINTS) -> list[Any]:
    if len(piece) <= size:
        return list(piece)
    step = (len(piece) - 1) / (size - 1)
    return [piece[round(i * step)] for i in range(size)]


def word_svg(run: cs.Run) -> str:
    """The word as the app's card draws it: the letters, upright, and the
    walks between them dashed."""
    xy = _upright(run)
    xs, ys = [p[0] for p in xy], [p[1] for p in xy]
    x0, y1 = min(xs), max(ys)
    w, h = max(max(xs) - x0, 1e-9), max(y1 - min(ys), 1e-9)
    k = min((PAGE_W - 2 * PAGE_PAD) / w, (PAGE_H - 2 * PAGE_PAD) / h)
    ox, oy = (PAGE_W - w * k) / 2, (PAGE_H - h * k) / 2

    def line(piece: Points, name: str) -> str:
        coords = " ".join(
            f"{ox + (x - x0) * k:.1f},{oy + (y1 - y) * k:.1f}" for x, y in _thin(piece)
        )
        return f'<polyline class="{name}" points="{coords}"/>'

    drawn, walked = pieces(xy, run.get("walks") or ())
    return (
        f'<svg viewBox="0 0 {PAGE_W} {PAGE_H}" role="img">'
        + "".join(line(p, "walk") for p in walked)
        + "".join(line(p, "pen") for p in drawn)
        + "</svg>"
    )


def _it(number: float, digits: int) -> str:
    return f"{number:.{digits}f}".replace(".", ",")


def pen_up_page(runs: Sequence[cs.Run], title: str = "Parole a penna alzata") -> str:
    """Every word drawn with the pen up, by length and by city, with how
    many pass: what the user looks at before the words enter the catalogue."""
    shown = [r for r in runs if cs.drawn(r)]
    by_length: dict[int, list[cs.Run]] = {}
    for r in sorted(shown, key=lambda r: (r["city"], r["word"])):
        by_length.setdefault(len(r["word"]), []).append(r)
    rows = "".join(
        f"<tr><td>{n} lettere</td><td>{sum(1 for r in rs if not pen_up_reasons(r))}"
        f"</td><td>{len(rs)}</td></tr>"
        for n, rs in sorted(by_length.items())
    )
    body = (
        "<table><tr><th>Parole di</th><th>passano</th><th>disegnate</th></tr>"
        f"{rows}</table>"
    )
    for n, rs in sorted(by_length.items()):
        cards = []
        for r in rs:
            why = pen_up_reasons(r)
            walked = r["route_m"] - r["drawn_m"]
            cards.append(
                f'<article class="{"out" if why else "in"}">'
                f'<h3>{html.escape(r["word"])}<small>{html.escape(r["city"])}</small></h3>'
                f"{word_svg(r)}"
                f'<p>{_it(r["drawn_m"] / 1000, 1)} km di disegno + '
                f"{_it(walked / 1000, 1)} km fra le lettere · "
                f'somiglianza {_it(r["similarity"], 2)}</p>'
                + (f'<p class="why">{html.escape("; ".join(why))}</p>' if why else "")
                + "</article>"
            )
        body += f"<section><h2>{n} lettere</h2>{''.join(cards)}</section>"
    return PAGE.replace("__TITLE__", html.escape(title)).replace("__BODY__", body)


# --- Command line ---------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python tools/catalog_words.py",
        description="More words for the Explore catalogue (TASK-441).",
    )
    p.add_argument("--plan", action="store_true", help="print the cases and stop")
    p.add_argument(
        "--run",
        action="store_true",
        help="plan the cases not yet in the log (the engine; no download)",
    )
    p.add_argument(
        "--propose",
        action="store_true",
        help="print the keys to keep: the kept ones, A1 and A2",
    )
    p.add_argument(
        "--write",
        action="store_true",
        help="rebuild catalog/seed from --kept and the two logs",
    )
    p.add_argument(
        "--pen-up",
        action="store_true",
        help="with --plan, --run or --propose: the words with the pen up",
    )
    p.add_argument(
        "--cities", type=lambda v: v.split(","), default=[], help="comma-separated"
    )
    p.add_argument("--log", type=Path, default=DEFAULT_LOG)
    p.add_argument("--old-log", type=Path, default=OLD_LOG)
    p.add_argument("--pen-up-log", type=Path, default=PEN_UP_LOG)
    p.add_argument(
        "--page", type=Path, help="with --pen-up: write the page of the words drawn"
    )
    p.add_argument("--kept", type=Path, default=cs.DEFAULT_KEPT)
    p.add_argument("--out", type=Path, default=cs.DEFAULT_SEED)
    p.add_argument("--cache-dir", type=Path, default=cs.DEFAULT_CACHE)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    unknown = [n for n in args.cities if n not in cs.BY_NAME]
    if unknown:
        print(f"unknown city: {', '.join(unknown)}", file=sys.stderr)
        return 2
    if args.pen_up:
        return _pen_up(args)
    old_runs = cs.read_runs(args.old_log)
    todo = cities(cs.done_keys(old_runs), args.cities)
    if args.plan:
        cases = cs.plan(todo)
        for c in cases:
            print(c.key)
        print(f"{len(cases)} cases in {len(todo)} cities", file=sys.stderr)
        return 0
    if args.run:
        planned = cs.run_cities(
            todo, args.log, args.cache_dir, max_downloads=0, slot_wait_max_s=0
        )
        print(f"{planned} cases planned")
    word_runs = cs.read_runs(args.log)
    if args.propose:
        keys = propose(
            old_runs, word_runs, cs.read_kept(args.kept), registered_shapes()
        )
        print(json.dumps({"kept": keys}, indent=1))
        return 0
    if args.write:
        kept = cs.read_kept(args.kept)
        logs = cs.read_logs([args.old_log, args.log, args.pen_up_log])
        cs.write_files(cs.city_files(logs, kept), args.out)
        print(cs.summary(logs, kept), file=sys.stderr)
        return 0
    print(cs.summary(word_runs), file=sys.stderr)
    return 0


def _pen_up(args: argparse.Namespace) -> int:
    kept = cs.read_kept(args.kept)
    done = cs.done_keys(cs.read_runs(args.pen_up_log))
    todo = pen_up_plan(done, args.cities, kept)
    if args.plan:
        for city, word in todo:
            print(pen_up_key(city.name, word))
        print(f"{len(todo)} words with the pen up", file=sys.stderr)
        return 0
    if args.run:
        print(f"{run_pen_up(todo, args.pen_up_log, args.cache_dir)} words planned")
    runs = cs.read_runs(args.pen_up_log)
    if args.page:
        shown = [r for r in runs if not args.cities or r["city"] in args.cities]
        args.page.write_text(pen_up_page(shown), encoding="utf-8")
    if args.propose:
        print(json.dumps({"kept": pen_up_keep(runs, kept)}, indent=1))
        return 0
    ok = sum(1 for r in runs if not pen_up_reasons(r))
    print(f"{ok} pass of {len(runs)} written with the pen up", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
