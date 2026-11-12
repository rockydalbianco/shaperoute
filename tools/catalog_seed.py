"""The big "Explore" catalogue: a thousand drawings, filtered, for the user to
choose from (TASK-419, ADR-0347).

Usage (from the repository root; `--run` wants the route engine's
environment, everything else the standard library alone):

    services/api/.venv/bin/python tools/catalog_seed.py --plan
    services/api/.venv/bin/python tools/catalog_seed.py --run --group seed
    python tools/catalog_seed.py --import-log out/seed_catalog/runs.jsonl
    python tools/catalog_seed.py --preselect > out/TASK-419/preselected.json
    python tools/catalog_seed.py --write

Plans about a thousand cases, city x shape (or word) x distance, as
`route_engine.seed_catalog` plans the seed (`plan_case`, `engine_planner`),
one zone per city downloaded with the slot wait of Overpass's status page,
in small batches. Every case is one JSON line of the run log (the format of
`seed_catalog`, plus `extra_doubled`, `road_shares` and `source`), so a run
stopped half-way goes on where it was. The automatic filter keeps the
drawings that look right (`reasons`); the review page
(`tools/catalog_review.py`) shows them all with a preselection; the keys the
user ticks go to `tools/catalog_kept.json`, and `--write` rebuilds
`catalog/seed/<city>.json` from them, in the format of `catalog/README.md`.

The engine is never changed here: this module imports it only inside
`--run`, and the filter, the score, the preselection and the city files are
pure functions tested without it (`tools/test_catalog_seed.py`).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.request
from collections import Counter
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

LatLon = tuple[float, float]
Run = dict[str, Any]

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LOG = REPO_ROOT / "out" / "TASK-419" / "runs.jsonl"
DEFAULT_KEPT = Path(__file__).resolve().with_name("catalog_kept.json")
DEFAULT_SEED = REPO_ROOT / "catalog" / "seed"
DEFAULT_CACHE = REPO_ROOT / "data" / "cache"

# --- The cities --------------------------------------------------------------

# Every shape the engine draws today (route_engine.shapes.SUPPORTED_SHAPES);
# the six after `snail` came after the seed of 2026-10 and were never seeded.
ALL_SHAPES: tuple[str, ...] = (
    "circle",
    "heart",
    "star",
    "horse",
    "moon",
    "cat",
    "fish",
    "butterfly",
    "snail",
    "dog_head",
    "rabbit_head",
    "pumpkin",
    "christmas_tree",
    "smiley",
    "ghost",
    "donut",
    "sun",
)
SEEDED_2026_10: tuple[str, ...] = ALL_SHAPES[:11]
NEW_SHAPES: tuple[str, ...] = ALL_SHAPES[11:]
# In a city new to the catalogue: the shapes that read on a town's roads at
# 5 and 10 km, the three simplest at 21 km (ADR-0132), one greeting.
CORE_SHAPES: tuple[str, ...] = (
    "circle",
    "heart",
    "star",
    "moon",
    "butterfly",
    "smiley",
    "sun",
)
SIMPLE_SHAPES: tuple[str, ...] = ("circle", "heart", "star")
DISTANCES_M: tuple[int, ...] = (21_000, 10_000, 5_000)
STYLES: tuple[str, ...] = ("round", "block")


@dataclass(frozen=True)
class City:
    """A public square in the centre of a city: never a person's position.
    `group` says when it is planned ("seed", "featured", "italy", "europe")
    and `words` what is written there (A-Z only, as the engine writes)."""

    name: str
    square: LatLon
    group: str
    words: tuple[str, ...] = ()
    # Shapes planned here instead of the group's rule (an island, a hill).
    shapes: tuple[str, ...] | None = None
    distances: tuple[int, ...] = DISTANCES_M


# The words the user approved for the catalogue (TASK-418, 2026-11-08):
# CIAO as in the seed, a greeting in the city's language where one is
# approved, LOVE elsewhere, or the city's own name when it is short.
ITALIAN_WORDS = ("CIAO",)
HELLO = {
    "es": ("HOLA",),
    "pt": ("OLA",),
    "fr": ("SALUT",),
    "de": ("HALLO",),
    "scan": ("HEJ",),
    "love": ("LOVE",),
}


def _seed(name: str, lat: float, lon: float) -> City:
    # The squares of route_engine.seed_catalog.CITIES, the same to the metre:
    # their words were seeded in 2026-10 (PHRASES) and are imported, so none
    # here.
    return City(name, (lat, lon), "seed")


def _featured(name: str, lat: float, lon: float, *words: str) -> City:
    # The squares of route_engine.seed_catalog.FEATURED.
    return City(name, (lat, lon), "featured", words)


def _italy(name: str, lat: float, lon: float, **kw: Any) -> City:
    return City(name, (lat, lon), "italy", ITALIAN_WORDS, **kw)


def _europe(
    name: str, lat: float, lon: float, lang: str, words: tuple[str, ...] = (), **kw: Any
) -> City:
    return City(name, (lat, lon), "europe", words or HELLO[lang], **kw)


CITIES: tuple[City, ...] = (
    # The seed of ADR-0097: all shapes at every distance.
    _seed("trento", 46.06700, 11.12150),  # Piazza Duomo
    _seed("levico", 46.01220, 11.29860),  # the centre of Levico Terme
    _seed("milano", 45.46420, 9.19000),  # Piazza del Duomo
    _seed("roma", 41.89600, 12.48260),  # Piazza Venezia
    _seed("torino", 45.07120, 7.68530),  # Piazza Castello
    _seed("bologna", 44.49380, 11.34300),  # Piazza Maggiore
    _seed("firenze", 43.76960, 11.25580),  # Piazza della Signoria
    _seed("napoli", 40.83590, 14.24880),  # Piazza del Plebiscito
    _seed("verona", 45.43850, 10.99280),  # Piazza Bra
    _seed("padova", 45.39840, 11.87670),  # Prato della Valle
    _seed("genova", 44.40720, 8.93390),  # Piazza De Ferrari
    _seed("bari", 41.12060, 16.87000),  # Piazza Umberto I
    _seed("palermo", 38.11570, 13.36150),  # Quattro Canti
    _seed("newyork", 40.73590, -73.99110),  # Union Square
    # The cities "Explore" shows first (ADR-0132): the core, one greeting.
    _featured("london", 51.50800, -0.12810, "LOVE"),  # Trafalgar Square
    _featured("paris", 48.85660, 2.35220, "SALUT"),  # Hôtel de Ville
    _featured("tokyo", 35.68120, 139.76710, "LOVE"),  # Tokyo Station square
    _featured("barcelona", 41.38700, 2.17010, "HOLA"),  # Plaça de Catalunya
    _featured("dubai", 25.26930, 55.30860, "LOVE"),  # Baniyas Square
    _featured("amsterdam", 52.37310, 4.89320, "LOVE"),  # Dam Square
    _featured("berlin", 52.51370, 13.39270, "HALLO"),  # Gendarmenmarkt
    _featured("lisbon", 38.71390, -9.13940, "OLA"),  # Rossio
    _featured("sydney", -33.87320, 151.20610, "LOVE"),  # Sydney Square
    _featured("sanfrancisco", 37.78800, -122.40750, "LOVE"),  # Union Square
    # Other Italian cities of prefetch_zones.ITALY, the most visited first.
    # Venice: the island alone, where 21 km has no room (MAPS.md, TASK-180).
    _italy("venezia", 45.43400, 12.33880, distances=(10_000, 5_000)),  # S. Marco
    _italy("trieste", 45.65030, 13.76800),  # Piazza Unità d'Italia
    _italy("bolzano", 46.49830, 11.35480),  # Piazza Walther
    _italy("rovereto", 45.89080, 11.04030),  # Piazza Rosmini
    _italy("bergamo", 45.69500, 9.66900),  # Piazza Matteotti, the lower town
    _italy("brescia", 45.53920, 10.22000),  # Piazza della Loggia
    _italy("parma", 44.80120, 10.32790),  # Piazza Garibaldi
    _italy("modena", 44.64580, 10.92570),  # Piazza Grande
    _italy("ferrara", 44.83580, 11.61970),  # Piazza Trento e Trieste
    _italy("ravenna", 44.41650, 12.20100),  # Piazza del Popolo
    _italy("rimini", 44.05970, 12.56670),  # Piazza Cavour
    _italy("pisa", 43.71970, 10.40030),  # Piazza dei Cavalieri
    _italy("lucca", 43.84220, 10.50270),  # Piazza Napoleone
    _italy("siena", 43.31860, 11.33170),  # Piazza del Campo
    _italy("perugia", 43.11220, 12.38880),  # Piazza IV Novembre
    _italy("lecce", 40.35270, 18.17180),  # Piazza Sant'Oronzo
    _italy("catania", 37.50220, 15.08730),  # Piazza del Duomo
    _italy("cagliari", 39.21670, 9.11100),  # Piazza Yenne
    # Capitals and tourist cities of Europe, one at a time.
    _europe("vienna", 48.20850, 16.37250, "de", words=("WIEN",)),  # Stephansplatz
    _europe("prague", 50.08750, 14.42130, "love", words=("PRAHA",)),  # Old Town Sq.
    _europe("budapest", 47.49630, 19.05070, "love"),  # Vörösmarty tér
    _europe("munich", 48.13740, 11.57550, "de"),  # Marienplatz
    _europe("zurich", 47.36990, 8.53900, "de"),  # Paradeplatz
    _europe("brussels", 50.84670, 4.35250, "fr"),  # Grand-Place
    _europe("copenhagen", 55.67590, 12.56900, "scan"),  # Rådhuspladsen
    _europe("stockholm", 59.33260, 18.06490, "scan"),  # Sergels torg
    _europe("dublin", 53.34430, -6.25960, "love"),  # College Green
    _europe("edinburgh", 55.95420, -3.19270, "love"),  # St Andrew Square
    _europe("madrid", 40.41690, -3.70350, "es"),  # Puerta del Sol
    _europe("seville", 37.38910, -5.99550, "es"),  # Plaza Nueva
    _europe("valencia", 39.46990, -0.37630, "es"),  # Plaza del Ayuntamiento
    _europe("porto", 41.14660, -8.61100, "pt", words=("PORTO",)),  # Pr. da Liberdade
    _europe("athens", 37.97550, 23.73480, "love"),  # Syntagma Square
    _europe("krakow", 50.06170, 19.93730, "love"),  # Rynek Główny
    _europe("ljubljana", 46.05140, 14.50600, "love"),  # Prešeren Square
    _europe("zagreb", 45.81310, 15.97750, "love"),  # Ban Jelačić Square
    _europe("nice", 43.69750, 7.27000, "fr"),  # Place Masséna
    _europe("lyon", 45.75780, 4.83200, "fr"),  # Place Bellecour
    _europe("hamburg", 53.55110, 9.99370, "de"),  # Rathausmarkt
)
GROUPS: tuple[str, ...] = ("seed", "featured", "italy", "europe")
BY_NAME: dict[str, City] = {c.name: c for c in CITIES}

# As seed_catalog.word_distance: 3.75 km a letter, whole km, 5-21 km.
MAX_WORD_LETTERS = 7


def word_distance(word: str) -> int:
    wanted = -(-len(word) * 3750 // 1000) * 1000
    return max(5_000, min(21_000, wanted))


@dataclass(frozen=True)
class Case:
    """A shape of the catalogue, or with a `style` a word (`shape` holds
    it): the same fields and key as seed_catalog.Case. With `outline`, a
    shape read from that JSON file instead (the candidates of TASK-418,
    not in the engine's catalogue yet), named after the file."""

    city: str
    shape: str
    distance_m: int
    style: str | None = None
    outline: str | None = None

    @property
    def key(self) -> str:
        what = self.shape if self.style is None else f"{self.shape}:{self.style}"
        return f"{self.city}/{what}/{self.distance_m}"


def city_shapes(city: City, distance_m: int) -> tuple[str, ...]:
    """What is planned in `city` at `distance_m`: the seed cities only the
    shapes never seeded (the rest is imported from 2026-10), the others the
    core at 5 and 10 km and the simple three at 21 km."""
    if city.shapes is not None:
        return city.shapes
    if city.group == "seed":
        return NEW_SHAPES
    return SIMPLE_SHAPES if distance_m >= 21_000 else CORE_SHAPES


def plan(cities: Iterable[City] = CITIES) -> list[Case]:
    """Every case, city by city, the largest distance first (its zone holds
    the smaller ones), then the words that fit the city's distances."""
    cases: list[Case] = []
    for city in cities:
        for d in sorted(city.distances, reverse=True):
            cases += [Case(city.name, s, d) for s in city_shapes(city, d)]
        for word in city.words:
            d = word_distance(word)
            if len(word) <= MAX_WORD_LETTERS and d <= max(city.distances):
                cases += [Case(city.name, word, d, s) for s in STYLES]
    return cases


OUTLINE_DISTANCES_M: tuple[int, ...] = (10_000, 5_000)
OUTLINE_SOURCE = "TASK-418 outline"


def outline_cases(
    cities: Iterable[City],
    outlines: Iterable[Path],
    distances: Sequence[int] = OUTLINE_DISTANCES_M,
) -> list[Case]:
    """A case per city, outline file and distance, the largest first: the
    shapes drawn for TASK-418 tried on real roads before they are in the
    engine's catalogue. The key names the shape after the file."""
    files = sorted(outlines, key=lambda f: f.name)
    return [
        Case(city.name, f.stem, d, outline=str(f))
        for city in cities
        for d in sorted(distances, reverse=True)
        for f in files
        if d <= max(city.distances)
    ]


def select_cities(
    groups: Sequence[str] = GROUPS, names: Sequence[str] = ()
) -> list[City]:
    """The cities of `groups`, in catalogue order, or just `names`."""
    if names:
        unknown = [n for n in names if n not in BY_NAME]
        if unknown:
            raise ValueError(f"unknown city: {', '.join(unknown)}")
        return [BY_NAME[n] for n in names]
    return [c for c in CITIES if c.group in groups]


# --- Geometry, standard library only ----------------------------------------

EARTH_RADIUS_M = 6_371_000.0  # as route_engine/geo.py
# A piece of road is the same when its two ends agree to about 10 cm.
DIGITS = 6


def local_xy(origin: LatLon, points: Sequence[LatLon]) -> list[tuple[float, float]]:
    """Metres east and north of `origin`, equirectangular (geo.py)."""
    lat0, lon0 = origin
    k = EARTH_RADIUS_M * math.cos(math.radians(lat0))
    return [
        (math.radians(lon - lon0) * k, math.radians(lat - lat0) * EARTH_RADIUS_M)
        for lat, lon in points
    ]


def path_length_m(points: Sequence[LatLon]) -> float:
    if len(points) < 2:
        return 0.0
    xy = local_xy(points[0], points)
    return sum(math.dist(a, b) for a, b in zip(xy, xy[1:], strict=False))


def _piece(a: LatLon, b: LatLon) -> frozenset[LatLon]:
    return frozenset(
        (
            (round(a[0], DIGITS), round(a[1], DIGITS)),
            (round(b[0], DIGITS), round(b[1], DIGITS)),
        )
    )


def doubled_share(points: Sequence[LatLon]) -> float:
    """The share of the route's length on pieces of road run more than
    once, either way (route_engine.retracing.doubled_share)."""
    if len(points) < 2:
        return 0.0
    keys = [_piece(a, b) for a, b in zip(points, points[1:], strict=False)]
    counts = Counter(keys)
    xy = local_xy(points[0], points)
    lengths = [math.dist(a, b) for a, b in zip(xy, xy[1:], strict=False)]
    total = sum(lengths)
    if total == 0:
        return 0.0
    doubled = sum(
        length
        for key, length in zip(keys, lengths, strict=True)
        if len(key) == 2 and counts[key] > 1
    )
    return doubled / total


def road_shares(
    points: Sequence[LatLon], roads: dict[frozenset[LatLon], str]
) -> dict[str, float]:
    """How much of the route's length runs on each kind of road (`highway`
    of OpenStreetMap), by the pieces of road in `roads`; a piece not there
    (a straight line between letters) is "unknown". Shares sum to 1."""
    if len(points) < 2:
        return {}
    xy = local_xy(points[0], points)
    by_kind: Counter[str] = Counter()
    for a, b, p, q in zip(points, points[1:], xy, xy[1:], strict=False):
        by_kind[roads.get(_piece(a, b), "unknown")] += math.dist(p, q)
    total = sum(by_kind.values())
    if total == 0:
        return {}
    return {kind: round(share / total, 4) for kind, share in sorted(by_kind.items())}


# --- The filter, the score, the preselection --------------------------------

MIN_SIMILARITY = 0.90  # the eye says "yes" from here (TASK-076)
MAX_DISTANCE_OFF = 0.10  # the engine's own tolerance (ADR-0025)
MAX_EXTRA_DOUBLED = 0.10  # the heart judged "yes" had 0%, the rest 4-23% (ADR-0107)
# What a route run twice over the same street costs, shape by shape, as the
# engine's optimizer.W_DOUBLED (ADR-0107, ADR-0109, ADR-0118): nothing for
# the shapes drawn with strokes, whose routes the user preferred as they are.
W_DOUBLED: dict[str, float] = {
    name: 1.5
    for name in ("heart", "circle", "star", "horse", "moon", "butterfly", "snail")
}
# Every measure of a run carries this; `--enrich` redoes older ones.
MEASURE_VERSION = 2
# Roads nobody runs on: the foot network leaves them out already; a check.
BAD_ROADS: frozenset[str] = frozenset(
    {"motorway", "motorway_link", "trunk", "trunk_link"}
)
# Big roads: shown on the review page, never a reason to reject.
BIG_ROADS: frozenset[str] = frozenset(
    {"primary", "primary_link", "secondary", "secondary_link"}
)
PER_CITY = 8
AT_LEAST = 3
# The cities "Explore" shows first (FEATURED_CITIES in the app, by the
# names used here) keep a heart, a circle and a star of 5 km whatever the
# eye says (ADR-0132, tools/test_featured_catalog.py).
APP_FEATURED: frozenset[str] = frozenset(
    {
        "newyork",
        "london",
        "paris",
        "tokyo",
        "roma",
        "milano",
        "torino",
        "barcelona",
        "dubai",
        "amsterdam",
        "berlin",
        "lisbon",
        "sydney",
        "sanfrancisco",
    }
)
FEATURED_KEEP: frozenset[str] = frozenset(SIMPLE_SHAPES)
FEATURED_DISTANCE_M = 5_000


def name_of(run: Run) -> str:
    return str(run["shape"] if "shape" in run else run["word"])


def drawn(run: Run) -> bool:
    return "error_kind" not in run and "points" in run


def distance_off(run: Run) -> float:
    """The route's length against the distance asked, signed: 0.08 is 8%
    longer."""
    return run["route_m"] / run["distance_m"] - 1


def reasons(run: Run) -> list[str]:
    """Why the automatic filter leaves `run` out; empty when it passes. A
    run without `extra_doubled` or `road_shares` (the 2026-10 log, whose
    zones are gone) is judged on what it has."""
    if not drawn(run):
        return [str(run.get("error_kind") or "not drawn")]
    out = []
    if run["similarity"] < MIN_SIMILARITY:
        out.append(f"similarity {run['similarity']:.2f} < {MIN_SIMILARITY:.2f}")
    off = distance_off(run)
    if abs(off) > MAX_DISTANCE_OFF:
        out.append(f"distance {off:+.0%} off")
    extra = run.get("extra_doubled")
    if extra is not None and extra > MAX_EXTRA_DOUBLED:
        out.append(f"retraced {extra:.0%} > {MAX_EXTRA_DOUBLED:.0%}")
    shares = run.get("road_shares") or {}
    bad = sum(s for kind, s in shares.items() if kind in BAD_ROADS)
    if bad > 0:
        out.append(f"{bad:.0%} on motorway or trunk")
    return out


def big_roads(run: Run) -> float | None:
    shares = run.get("road_shares")
    if shares is None:
        return None
    return round(sum(s for kind, s in shares.items() if kind in BIG_ROADS), 4)


def score(run: Run) -> float:
    """To order the candidates: the engine's cost with its sign changed,
    without the start's offset (similarity, retraced where the shape weighs
    it, distance)."""
    if not drawn(run):
        return -math.inf
    extra = run.get("extra_doubled") or 0.0
    weight = W_DOUBLED.get(str(run.get("shape")), 0.0)
    return run["similarity"] - weight * extra - abs(distance_off(run))


def passing(runs: Iterable[Run]) -> list[Run]:
    return [r for r in runs if not reasons(r)]


def preselect(
    runs: Iterable[Run], per_city: int = PER_CITY, at_least: int = AT_LEAST
) -> list[str]:
    """The keys proposed to the user: in every city the `per_city` best of
    those passing the filter, by score, and at least `at_least` drawn ones
    even below it, best first; in the cities "Explore" shows first, the
    three simple shapes of 5 km always."""
    by_city: dict[str, list[Run]] = {}
    for r in runs:
        if drawn(r):
            by_city.setdefault(r["city"], []).append(r)
    chosen: list[str] = []
    for city in sorted(by_city):
        ranked = sorted(by_city[city], key=lambda r: (-score(r), r["key"]))
        good = [r for r in ranked if not reasons(r)][:per_city]
        keys = [r["key"] for r in good]
        for r in ranked:
            if len(keys) >= at_least:
                break
            if r["key"] not in keys:
                keys.append(r["key"])
        if city in APP_FEATURED:
            for r in ranked:
                if (
                    r.get("shape") in FEATURED_KEEP
                    and r["distance_m"] == FEATURED_DISTANCE_M
                    and r["key"] not in keys
                    and not any(
                        k.startswith(f"{city}/{r['shape']}/{FEATURED_DISTANCE_M}")
                        for k in keys
                    )
                ):
                    keys.append(r["key"])
        chosen += keys
    return chosen


# --- The run log --------------------------------------------------------------

FAILED = "failed"


def read_runs(path: Path) -> list[Run]:
    """One dict per line; later lines win for the same key, in first-seen
    order (as seed_catalog.read_runs)."""
    if not path.exists():
        return []
    latest: dict[str, Run] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            run = json.loads(line)
            latest[run["key"]] = run
    return list(latest.values())


def read_logs(paths: Sequence[Path]) -> list[Run]:
    runs: dict[str, Run] = {}
    for path in paths:
        for run in read_runs(path):
            runs[run["key"]] = run
    return list(runs.values())


def append_run(path: Path, run: Run) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(run, separators=(",", ":")) + "\n")


def done_keys(runs: Iterable[Run]) -> set[str]:
    """Not to plan again: drawn, or not drawable; a network failure is."""
    return {r["key"] for r in runs if r.get("error_kind") != FAILED}


def imported(runs: Iterable[Run], source: str) -> list[Run]:
    """The drawn runs of another log, marked with where they come from, with
    `extra_doubled` as `doubled_share` where the shape draws nothing twice
    on purpose (the rest is filled by `--run --enrich`, with the engine)."""
    out = []
    for r in runs:
        if not drawn(r):
            continue
        run = dict(r)
        run["source"] = source
        if "word" not in run and run.get("shape") in ("circle", "heart", "star"):
            run.setdefault("extra_doubled", round(doubled_share(run["points"]), 4))
        out.append(run)
    return out


# --- The city files -----------------------------------------------------------

LICENSE = (
    "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, "
    "ODbL 1.0: https://www.openstreetmap.org/copyright"
)


def read_kept(path: Path) -> list[str]:
    """The keys the user kept: {"kept": [...]}, or a JSON list."""
    body = json.loads(path.read_text(encoding="utf-8"))
    keys = body["kept"] if isinstance(body, dict) else body
    if not isinstance(keys, list) or not all(isinstance(k, str) for k in keys):
        raise ValueError(f"{path}: not a list of keys")
    return list(dict.fromkeys(keys))


def write_kept(path: Path, keys: Sequence[str], note: str = "") -> None:
    body: dict[str, Any] = {"kept": list(keys)}
    if note:
        body["note"] = note
    path.write_text(json.dumps(body, indent=1) + "\n", encoding="utf-8")


def city_files(
    runs: Iterable[Run],
    kept: Iterable[str],
    centres: dict[str, LatLon] | None = None,
    min_similarity: float = MIN_SIMILARITY,
) -> dict[str, str]:
    """One JSON text per city with a kept route, by file name, in the format
    of catalog/README.md: best first. Same input, same text. A kept key
    without a run raises."""
    by_key = {r["key"]: r for r in runs}
    centres = centres if centres is not None else {c.name: c.square for c in CITIES}
    missing = [k for k in kept if k not in by_key]
    if missing:
        raise KeyError(f"kept but not in the log: {', '.join(missing)}")
    by_city: dict[str, list[Run]] = {}
    for k in kept:
        by_city.setdefault(by_key[k]["city"], []).append(by_key[k])
    files = {}
    for city, routes in sorted(by_city.items()):
        routes.sort(key=lambda r: (-r["similarity"], r["key"]))
        lat, lon = centres.get(city, (None, None))
        body = {
            "city": city,
            "centre": [lat, lon],
            "min_similarity": min_similarity,
            "license": LICENSE,
            "routes": [_route_body(r) for r in routes],
        }
        files[f"{city}.json"] = json.dumps(body, separators=(",", ":")) + "\n"
    return files


def _route_body(r: Run) -> dict[str, Any]:
    body: dict[str, Any] = (
        {"shape": r["shape"]}
        if "shape" in r
        else {"word": r["word"], "style": r["style"]}
    )
    body.update(
        distance_m=r["distance_m"],
        route_m=r["route_m"],
        similarity=r["similarity"],
        planned_at=r["planned_at"],
        points=r["points"],
    )
    if r.get("rotation_deg"):
        body["rotation_deg"] = r["rotation_deg"]
    # A word written with the pen up (TASK-441): where it walks unseen.
    if r.get("walks"):
        body["walks"] = r["walks"]
    return body


def write_files(files: dict[str, str], out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for name, text in files.items():
        (out / name).write_text(text, encoding="utf-8")


def summary(runs: Sequence[Run], kept: Sequence[str] = ()) -> str:
    kept_set = set(kept)
    good = passing(runs)
    lines = [
        f"{len(runs)} cases: {sum(drawn(r) for r in runs)} drawn, "
        f"{len(good)} pass the filter, {len(kept_set)} kept"
    ]
    for city in sorted({r["city"] for r in runs}):
        mine = [r for r in runs if r["city"] == city]
        d = [r for r in mine if drawn(r)]
        g = [r for r in good if r["city"] == city]
        k = [r for r in mine if r["key"] in kept_set]
        best = max((r["similarity"] for r in d), default=0.0)
        lines.append(
            f"  {city:<13} {len(k):>3} kept, {len(g):>3} pass of {len(d):>3} drawn "
            f"({len(mine)} planned), best {best:.2f}"
        )
    return "\n".join(lines)


# --- The run, with the engine -----------------------------------------------

OVERPASS_STATUS = "https://overpass-api.de/api/status"
USER_AGENT = "ShapeRoute catalogue seed (https://github.com/rockydalbianco/shaperoute)"
MAX_SLOT_WAIT_S = 300.0
PAUSE_S = 60.0
POLL_S = 300.0
# Around the zone of a city's cases, for the nearby and the moved starts.
ZONE_MARGIN_DEG = 0.01


def slot_wait_s(status: str) -> float | None:
    """From Overpass's status page (as prefetch_zones.slot_wait_s)."""
    import re

    if "slots available now" in status or "slot available now" in status:
        return 0.0
    waits = [float(s) for s in re.findall(r"in (\d+) seconds", status)]
    return min(waits) if waits else None


def overpass_wait_s(
    url: str = OVERPASS_STATUS, timeout_s: float = 20.0
) -> float | None:
    """Seconds until a slot is free; None when Overpass does not answer or
    says nothing usable (the 502 "at capacity" page, for one). Through the
    address of Overpass that accepts connections, when the engine is here
    to pick it (overpass_address, ADR-0100)."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        from route_engine.overpass_address import reachable
    except ImportError:  # the standard library alone: the first address
        reachable = None
    try:
        if reachable is None:
            with urllib.request.urlopen(request, timeout=timeout_s) as r:
                text = r.read().decode("utf-8", "replace")
        else:
            with (
                reachable(url),
                urllib.request.urlopen(request, timeout=timeout_s) as r,
            ):
                text = r.read().decode("utf-8", "replace")
    except Exception:
        return None
    wait = slot_wait_s(text)
    return wait if wait is not None and wait <= MAX_SLOT_WAIT_S else None


def wait_for_slot(
    wait: Callable[[], float | None] = overpass_wait_s,
    sleep: Callable[[float], None] = time.sleep,
    say: Callable[[str], None] = print,
    max_s: float = 6 * 3600,
) -> bool:
    """Waits until Overpass has a free slot; False after `max_s`."""
    waited = 0.0
    while waited < max_s:
        w = wait()
        if w == 0.0:
            return True
        pause = POLL_S if w is None else max(w, 5.0)
        state = "no answer" if w is None else f"slot in {w:.0f} s"
        say(f"Overpass: {state}, waiting {pause:.0f} s")
        sleep(pause)
        waited += pause
    return False


def road_index(graph: Any) -> dict[frozenset[LatLon], str]:
    """Every piece of road of `graph` by its two ends, with its `highway`
    (the first when OSMnx kept several): the route's points follow the edge
    geometries, so each of its pieces is found here."""
    roads: dict[frozenset[LatLon], str] = {}
    for u, v, data in graph.edges(data=True):
        kind = data.get("highway", "unknown")
        if isinstance(kind, list):
            kind = kind[0] if kind else "unknown"
        geometry = data.get("geometry")
        if geometry is None:
            coords = [
                (graph.nodes[u]["y"], graph.nodes[u]["x"]),
                (graph.nodes[v]["y"], graph.nodes[v]["x"]),
            ]
        else:
            coords = [(lat, lon) for lon, lat in geometry.coords]
        for a, b in zip(coords, coords[1:], strict=False):
            roads.setdefault(_piece(a, b), str(kind))
    return roads


def run_cities(
    cities: Sequence[City],
    log: Path,
    cache_dir: Path,
    *,
    max_downloads: int | None = None,
    overpass_url: str | None = None,
    enrich: bool = False,
    outlines: Sequence[Path] = (),
    slot_wait_max_s: float = 6 * 3600,
    say: Callable[[str], None] = print,
) -> int:
    """Plans the cases of `cities` not yet in `log`, one city at a time:
    first the cases whose area is already in the cache, then, when the
    city's one zone may be downloaded (at most `max_downloads` in this run,
    after a free slot of Overpass), the rest. Every case is planned as the
    API plans it and appended to `log` with `extra_doubled` and
    `road_shares`. With `enrich`, measures those two again for every run of
    the city not measured this way yet (the imported ones) whose area is
    here. `outlines` adds the cases of those JSON outline files
    (`outline_cases`). A download waits for a free slot of Overpass's status
    page up to `slot_wait_max_s`; with 0 it is tried at once, one attempt
    (MAPS.md: when Overpass does not answer, skip and try later, not in a
    loop). Returns how many cases were planned."""
    import numpy as np
    import osmnx as ox
    from route_engine import seed_catalog
    from route_engine.nearby_starts import ShapeJob, plan_nearby
    from route_engine.network import OsmnxSource, twice_drawn
    from route_engine.optimizer import (
        SHAPE_POINTS,
        planned_distance,
        required_area,
        tilt_limit,
    )
    from route_engine.shapes import get_shape
    from route_engine.shapes.outline import read_outline
    from route_engine.stops import union
    from route_engine.words import compose

    if overpass_url:
        ox.settings.overpass_url = overpass_url
    source = OsmnxSource(cache_dir)
    planner = seed_catalog.engine_planner(cache_dir)
    runs = read_runs(log)
    done = done_keys(runs)
    downloads = 0
    planned = 0

    outline_files: dict[str, Any] = {}

    def outline_of(case: Case) -> tuple[list[Any], Any]:
        if case.outline is not None:
            if case.outline not in outline_files:
                outline_files[case.outline] = read_outline(Path(case.outline))
            return outline_files[case.outline](SHAPE_POINTS), None
        if case.style is None:
            return get_shape(case.shape)(SHAPE_POINTS), None
        word = compose(case.shape, style=case.style)  # type: ignore[arg-type]
        return list(word.points), word

    def outline_planner(case: Case) -> Callable[[Any, LatLon], Any]:
        # As the CLI plans `--outline FILE` with the nearby starts: the
        # outline's points as the shape, upright within the usual tilt.
        outline, _ = outline_of(case)

        def plan_outline(_: Any, start: LatLon) -> Any:
            job = ShapeJob(
                tuple(outline),
                case.shape,
                case.distance_m,
                max_tilt_deg=tilt_limit(case.shape),
            )
            return plan_nearby(job, start, source).plan.result

        return plan_outline

    def area_of(case: Case, start: LatLon) -> tuple[float, float, float, float]:
        outline, word = outline_of(case)
        return required_area(
            outline, start, planned_distance(case.distance_m, False), word=word
        )

    expected_cache: dict[str, float] = {}

    def expected_doubled(case: Case) -> float:
        # The share of the shape's own length it draws twice on purpose
        # (strokes out and back, ADR-0118), at the size planned: a side
        # whose middle lies within TWICE_NEAR_M of a side going the other
        # way, as the engine sees it (network.twice_drawn).
        what = case.key.split("/", 1)[1]
        if what not in expected_cache:
            outline, _ = outline_of(case)
            xy = np.array(outline, dtype=float)
            sides = np.hypot(*np.diff(xy, axis=0).T)
            total = float(sides.sum())
            if total == 0:
                expected_cache[what] = 0.0
            else:
                xy = xy * (planned_distance(case.distance_m, False) / total)
                sides = np.hypot(*np.diff(xy, axis=0).T)
                twice = twice_drawn(xy)
                expected_cache[what] = float(sides[twice].sum() / sides.sum())
        return expected_cache[what]

    roads_cache: dict[
        tuple[float, float, float, float], dict[frozenset[LatLon], str]
    ] = {}

    def roads_of(
        area: tuple[float, float, float, float],
    ) -> dict[frozenset[LatLon], str]:
        if area not in roads_cache:
            roads_cache.clear()  # one area's roads at a time: Milano's are big
            roads_cache[area] = road_index(source.load(area))
        return roads_cache[area]

    def measure(run: Run, case: Case, area: tuple[float, float, float, float]) -> None:
        run["extra_doubled"] = round(
            max(0.0, doubled_share(run["points"]) - expected_doubled(case)), 4
        )
        run["road_shares"] = road_shares(run["points"], roads_of(area))
        run["measured"] = MEASURE_VERSION

    def plan_one(
        case: Case, start: LatLon, area: tuple[float, float, float, float]
    ) -> None:
        seed_case = seed_catalog.Case(
            case.city, case.shape, case.distance_m, case.style
        )
        if case.outline is None:
            run = seed_catalog.plan_case(seed_case, start, planner)
            run["source"] = "TASK-419"
        else:
            run = seed_catalog.plan_case(seed_case, start, outline_planner(case))
            run["source"] = OUTLINE_SOURCE
            run["outline"] = Path(case.outline).name
        if drawn(run):
            measure(run, case, area)
        append_run(log, run)
        done.add(case.key)
        what = run.get("error_kind") or (
            f"similarity {run['similarity']:.2f}, retraced {run['extra_doubled']:.0%}"
        )
        say(f"{case.key}: {what}, {run['seconds']:.0f} s")

    for city in cities:
        all_cases = plan([city]) + outline_cases([city], outlines)
        todo = [c for c in all_cases if c.key not in done]
        areas = {c.key: area_of(c, city.square) for c in all_cases}
        here = [c for c in todo if source.is_cached(areas[c.key])]
        away = [c for c in todo if not source.is_cached(areas[c.key])]
        if here:
            say(f"{city.name}: {len(here)} cases from the cache")
        for case in here:
            plan_one(case, city.square, areas[case.key])
            planned += 1
        if away:
            s, w, n, e = union([areas[c.key] for c in all_cases])
            m = ZONE_MARGIN_DEG
            zone = (s - m, w - m, n + m, e + m)
            if max_downloads is not None and downloads >= max_downloads:
                say(f"{city.name}: {len(away)} cases want the zone, no download left")
            elif slot_wait_max_s > 0 and not wait_for_slot(
                say=say, max_s=slot_wait_max_s
            ):
                say(f"{city.name}: Overpass closed, {len(away)} cases skipped")
            else:
                box = tuple(round(x, 3) for x in zone)
                say(f"{city.name}: downloading the zone {box}")
                try:
                    source.load(zone)
                except Exception as exc:
                    say(f"{city.name}: zone not loaded ({type(exc).__name__}), skipped")
                else:
                    downloads += 1
                    time.sleep(PAUSE_S)
                    for case in away:
                        plan_one(case, city.square, areas[case.key])
                        planned += 1
        if enrich:
            to_enrich = [
                r
                for r in runs
                if r["city"] == city.name
                and drawn(r)
                and r.get("measured") != MEASURE_VERSION
            ]
            enriched = 0
            for run in to_enrich:
                outline = run.get("outline")
                if outline is not None:
                    found = [f for f in outlines if f.name == outline]
                    if not found:
                        continue
                    outline = str(found[0])
                case = Case(
                    run["city"],
                    name_of(run),
                    run["distance_m"],
                    run.get("style"),
                    outline,
                )
                area = area_of(case, city.square)
                if not source.is_cached(area):
                    continue
                run = dict(run)
                measure(run, case, area)
                append_run(log, run)
                enriched += 1
            if to_enrich:
                say(f"{city.name}: {enriched}/{len(to_enrich)} imported runs measured")
    return planned


# --- Command line -------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python tools/catalog_seed.py",
        description="Plan, filter and write the big Explore catalogue (TASK-419).",
    )
    p.add_argument("--plan", action="store_true", help="print the cases and stop")
    p.add_argument(
        "--run",
        action="store_true",
        help="plan the cases not yet in the log (the engine)",
    )
    p.add_argument(
        "--enrich",
        action="store_true",
        help="with --run: measure retraced and road shares in older runs too",
    )
    p.add_argument(
        "--import-log",
        type=Path,
        metavar="JSONL",
        help="copy the drawn runs of another log (seed_catalog's) into --log",
    )
    p.add_argument(
        "--preselect", action="store_true", help="print the preselected keys"
    )
    p.add_argument(
        "--write",
        action="store_true",
        help="rebuild catalog/seed from --kept and the log",
    )
    p.add_argument(
        "--group", action="append", choices=GROUPS, help="which cities (repeatable)"
    )
    p.add_argument(
        "--cities", type=lambda v: v.split(","), default=[], help="comma-separated"
    )
    p.add_argument(
        "--max-downloads", type=int, default=1, help="zones to download (default 1)"
    )
    p.add_argument(
        "--slot-wait-hours",
        type=float,
        default=6.0,
        help="how long to wait for a free slot of Overpass before a download "
        "(default 6; 0 tries at once, one attempt)",
    )
    p.add_argument(
        "--overpass-url", help="a mirror of Overpass instead of overpass-api.de"
    )
    p.add_argument(
        "--outlines",
        type=Path,
        metavar="DIR",
        help="with --plan or --run: also the JSON outlines of this folder (TASK-418)",
    )
    p.add_argument("--log", type=Path, default=DEFAULT_LOG)
    p.add_argument("--kept", type=Path, default=DEFAULT_KEPT)
    p.add_argument("--out", type=Path, default=DEFAULT_SEED)
    p.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        cities = select_cities(args.group or GROUPS, args.cities)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2
    outlines = sorted(args.outlines.glob("*.json")) if args.outlines else []
    if args.plan:
        cases = plan(cities) + outline_cases(cities, outlines)
        for c in cases:
            print(c.key)
        print(f"{len(cases)} cases in {len(cities)} cities", file=sys.stderr)
        return 0
    if args.import_log is not None:
        have = done_keys(read_runs(args.log))
        new = [
            r
            for r in imported(read_runs(args.import_log), "2026-10")
            if r["key"] not in have
        ]
        for r in new:
            append_run(args.log, r)
        print(f"{len(new)} runs imported from {args.import_log}")
    if args.run:
        planned = run_cities(
            cities,
            args.log,
            args.cache_dir,
            max_downloads=args.max_downloads,
            overpass_url=args.overpass_url,
            enrich=args.enrich,
            outlines=outlines,
            slot_wait_max_s=args.slot_wait_hours * 3600,
        )
        print(f"{planned} cases planned")
    runs = read_runs(args.log)
    if args.preselect:
        print(json.dumps({"kept": preselect(runs)}, indent=1))
        return 0
    kept: list[str] = []
    if args.write:
        kept = read_kept(args.kept)
        write_files(city_files(runs, kept), args.out)
    print(summary(runs, kept), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
