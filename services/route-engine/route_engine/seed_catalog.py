"""The seed catalogue of recommended routes (TASK-125, ADR-0097).

python -m route_engine.seed_catalog --run

Plans every catalogue shape at 5, 10 and 21 km from the centre of thirteen
Italian cities, as the API plans them (`plan_nearby`), and keeps the routes
that look most like their shape. They seed the "Best near you" screen
(TASK-092) before anyone has drawn a route there.

Every case planned is one JSON line in the run log (`--log`), so a run
stopped half-way resumes where it was; a case that failed on the network is
tried again, one the engine could not draw is not. The selection is then
written one file per city under `--out`, all of it rebuilt from the log.

With `--featured` it plans only a heart, a circle and a star of 5 km for the
cities "Explore" shows first and the seed does not have (TASK-163).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import LatLon, OsmnxSource
from route_engine.optimizer import ShapeNotDrawableError
from route_engine.shapes import SUPPORTED_SHAPES

# A public square in the centre of each city: never a person's position.
CITIES: dict[str, LatLon] = {
    "trento": (46.06700, 11.12150),  # Piazza Duomo
    "levico": (46.01220, 11.29860),  # the centre of Levico Terme
    "milano": (45.46420, 9.19000),  # Piazza del Duomo
    "roma": (41.89600, 12.48260),  # Piazza Venezia
    "torino": (45.07120, 7.68530),  # Piazza Castello
    "bologna": (44.49380, 11.34300),  # Piazza Maggiore
    "firenze": (43.76960, 11.25580),  # Piazza della Signoria
    "napoli": (40.83590, 14.24880),  # Piazza del Plebiscito
    "verona": (45.43850, 10.99280),  # Piazza Bra
    "padova": (45.39840, 11.87670),  # Prato della Valle
    "genova": (44.40720, 8.93390),  # Piazza De Ferrari
    "bari": (41.12060, 16.87000),  # Piazza Umberto I
    "palermo": (38.11570, 13.36150),  # Quattro Canti
    # Asked by the user (2026-10-01): the first city outside Italy.
    "newyork": (40.73590, -73.99110),  # Union Square, on Manhattan's grid
}

# The other cities "Explore" shows first (apps/mobile/src/explore/presets.ts),
# asked by the user (TASK-163, 2026-10-02): a heart, a circle and a star must
# be there before anyone taps the city, instead of being drawn at the tap.
# Only those (`--featured`): they are not in CITIES, so the whole catalogue
# is not planned for them. A public square each, within 5 km of the centre
# the API gives for the name: "Explore" lists what starts that near.
FEATURED: dict[str, LatLon] = {
    "london": (51.50800, -0.12810),  # Trafalgar Square
    "paris": (48.85660, 2.35220),  # Place de l'Hôtel de Ville
    "tokyo": (35.68120, 139.76710),  # Tokyo Station, the Marunouchi square
    "barcelona": (41.38700, 2.17010),  # Plaça de Catalunya
    "dubai": (25.26930, 55.30860),  # Baniyas Square
    "amsterdam": (52.37310, 4.89320),  # Dam Square
    "berlin": (52.51370, 13.39270),  # Gendarmenmarkt
    "lisbon": (38.71390, -9.13940),  # Rossio
    "sydney": (-33.87320, 151.20610),  # Sydney Square, by the Town Hall
    "sanfrancisco": (37.78800, -122.40750),  # Union Square
}
# The simplest shapes at the shortest distance asked for, as the examples the
# app draws for a city without recommended routes (ADR-0116).
FEATURED_SHAPES: tuple[str, ...] = ("heart", "circle", "star")
FEATURED_DISTANCE_M = 5_000
# Where every city starts from: the seed and the featured ones.
STARTS: dict[str, LatLon] = {**CITIES, **FEATURED}

# Words written in each city (asked by the user, 2026-10-01): common and
# famous greetings, in the language used there. The engine writes A-Z only,
# no spaces, at most MAX_PHRASE_LETTERS at 21 km (words.LETTER_DISTANCE_M).
MAX_PHRASE_LETTERS = 7
# Short words only (the user's choice, 2026-10-02, ADR-0130): at the 21 km
# cap, words of more than 4-5 letters do not read on a city's roads.
ITALIAN = ("CIAO", "TIAMO")
PHRASES: dict[str, tuple[str, ...]] = {
    "trento": ITALIAN,
    "levico": ITALIAN,
    "milano": (*ITALIAN, "UELA"),  # uèla: the Milanese hello
    "roma": (*ITALIAN, "AO", "AMOR"),  # Roma backwards: Amor
    "torino": ITALIAN,
    "bologna": ITALIAN,
    "firenze": (*ITALIAN, "BONA"),  # the Tuscan "bye"
    "napoli": ITALIAN,
    "verona": ITALIAN,
    "padova": ITALIAN,
    "genova": ITALIAN,
    "bari": (*ITALIAN, "UE"),  # uè: the hello of Bari
    "palermo": ITALIAN,
    "newyork": ("LOVE", "HEY", "NYC"),
}
STYLES: tuple[str, ...] = ("round", "block")

# Largest first: the zone of 21 km contains those of 10 and 5, which then
# come from the cache instead of another download.
DISTANCES_M: tuple[int, ...] = (21_000, 10_000, 5_000)

# Kept at this similarity or more. The eye judged 0.90 `yes` and 0.88
# `almost` (TASK-076); 0.85 got both (TASK-075).
MIN_SIMILARITY = 0.88

# (city, shape) the user judged by eye and turned down, whatever the
# similarity: they stay out even with a lower threshold.
REJECTED: frozenset[tuple[str, str]] = frozenset(
    {("trento", "fish")}  # 2026-10-01: not a fish on Trento's roads
)

# (city, shape, distance) looked at by eye one by one (TASK-126, 2026-10-01)
# and left out: above the threshold, but the shape does not read. Mostly
# 5 km, where a detailed shape is smaller than the blocks that draw it.
# Trento and Milano are not here: the user judged them, "the rest is fine".
UNREADABLE: frozenset[tuple[str, str, int]] = frozenset(
    {
        *(("roma", s, 5000) for s in ("butterfly", "dog_head", "rabbit_head")),
        *(("roma", s, 5000) for s in ("snail", "moon")),
        ("roma", "dog_head", 10000),
        ("roma", "snail", 10000),
        *(("bologna", s, 5000) for s in ("butterfly", "dog_head", "rabbit_head")),
        *(("bologna", s, 5000) for s in ("snail", "horse", "star")),
        *(("bologna", s, 10000) for s in ("butterfly", "dog_head", "snail")),
        ("bologna", "snail", 21000),
        *(("torino", s, 5000) for s in ("butterfly", "cat", "dog_head")),
        *(("torino", s, 5000) for s in ("rabbit_head", "snail", "fish")),
        ("torino", "snail", 10000),
        *(("levico", "dog_head", d) for d in (5000, 10000, 21000)),
        *(("levico", "rabbit_head", d) for d in (5000, 10000, 21000)),
        *(("levico", "snail", d) for d in (10000, 21000)),
        ("levico", "heart", 21000),
        ("levico", "horse", 5000),
        ("levico", "star", 5000),
        ("levico", "moon", 5000),
        # TASK-128, Firenze: the same fragile shapes, and a heart with a tail.
        *(("firenze", s, 5000) for s in ("butterfly", "cat", "dog_head")),
        *(("firenze", s, 5000) for s in ("horse", "rabbit_head", "snail")),
        ("firenze", "dog_head", 10000),
        ("firenze", "dog_head", 21000),
        ("firenze", "snail", 10000),
        ("firenze", "heart", 21000),
        # TASK-161, the cities of the 2026-10-02 run.
        *(("napoli", s, 5000) for s in ("butterfly", "cat", "dog_head")),
        *(("napoli", s, 5000) for s in ("rabbit_head", "snail")),
        *(("napoli", "dog_head", d) for d in (10000, 21000)),
        ("napoli", "snail", 10000),
        *(("verona", s, 5000) for s in ("butterfly", "cat", "dog_head")),
        *(("verona", s, 5000) for s in ("rabbit_head", "snail")),
        *(("verona", s, 10000) for s in ("dog_head", "rabbit_head", "snail")),
        ("verona", "horse", 10000),
        ("verona", "dog_head", 21000),
        ("verona", "moon", 21000),
        *(("padova", "dog_head", d) for d in (5000, 10000, 21000)),
        *(("padova", "rabbit_head", d) for d in (5000, 10000)),
        ("padova", "snail", 10000),
        ("padova", "moon", 5000),
        *(("genova", "dog_head", d) for d in (5000, 10000, 21000)),
        *(("genova", s, 5000) for s in ("rabbit_head", "snail", "horse")),
        ("genova", "snail", 10000),
        *(("bari", "dog_head", d) for d in (5000, 10000)),
        ("bari", "heart", 10000),
        ("bari", "horse", 10000),
        *(("palermo", "dog_head", d) for d in (5000, 10000)),
        *(("palermo", s, 5000) for s in ("rabbit_head", "snail")),
        ("palermo", "horse", 10000),
        *(("newyork", s, 5000) for s in ("butterfly", "dog_head", "rabbit_head")),
        ("newyork", "snail", 5000),
        ("newyork", "dog_head", 10000),
    }
)

# (city, word, style) looked at by eye (TASK-161, 2026-10-02) and left out:
# above the threshold, but the letters do not read on those roads.
UNREADABLE_WORDS: frozenset[tuple[str, str, str]] = frozenset(
    {
        ("trento", "CIAO", "block"),
        *(("milano", "UELA", s) for s in ("round", "block")),
        ("roma", "AO", "block"),
        *(("roma", "AMOR", s) for s in ("round", "block")),
        ("roma", "CIAO", "block"),
        ("roma", "TIAMO", "round"),
        ("torino", "CIAO", "block"),
        *(("torino", "TIAMO", s) for s in ("round", "block")),
        *(("bologna", w, s) for w in ITALIAN for s in ("round", "block")),
        ("firenze", "CIAO", "round"),
        *(("firenze", "TIAMO", s) for s in ("round", "block")),
        ("firenze", "BONA", "round"),
        *(("napoli", w, "block") for w in ITALIAN),
        ("verona", "CIAO", "block"),
        ("verona", "TIAMO", "round"),
        *(("padova", w, "round") for w in ITALIAN),
        *(("genova", "CIAO", s) for s in ("round", "block")),
        ("genova", "TIAMO", "round"),
        *(("palermo", w, "block") for w in ITALIAN),
        *(("newyork", w, "block") for w in ("HEY", "LOVE", "NYC")),
        ("newyork", "LOVE", "round"),
    }
)

# Coordinates to 6 decimals: 0.1 m, far below what the GPS sees.
DECIMALS = 6

LICENSE = (
    "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, "
    "ODbL 1.0: https://www.openstreetmap.org/copyright"
)

NOT_DRAWABLE = "not_drawable"
FAILED = "failed"


@dataclass(frozen=True)
class Case:
    """A shape of the catalogue, or with a `style` a word (`shape` holds it)."""

    city: str
    shape: str
    distance_m: int
    style: str | None = None

    @property
    def key(self) -> str:
        what = self.shape if self.style is None else f"{self.shape}:{self.style}"
        return f"{self.city}/{what}/{self.distance_m}"


Planner = Callable[[Case, LatLon], RouteResult]
Prepare = Callable[[str, list[Case]], None]
"""Called once before a city's cases: loads the one zone that holds them
all (TASK-128). Overpass stops answering after a few downloads in a row
(MAPS.md); each shape and word asking its own zone made dozens."""

# Around the zones of a city's cases, for the nearby starts and the start
# the search may move (optimizer.START_OFFSET_M, the far search).
PREPARE_MARGIN_DEG = 0.01
# After a download, a pause before the next: gentle with Overpass.
PREPARE_PAUSE_S = 60.0


def cases(
    cities: Iterable[str], shapes: Iterable[str], distances: Iterable[int]
) -> list[Case]:
    """City by city, the largest distance first, then shape by shape."""
    shapes, distances = list(shapes), sorted(distances, reverse=True)
    return [
        Case(city, shape, d) for city in cities for d in distances for shape in shapes
    ]


def word_distance(word: str) -> int:
    """The distance a word is written at: 3.75 km a letter, as CIAO at 15 km
    (words.py), within what the engine needs and the app allows."""
    letters = len(word)
    wanted = -(-letters * 3750 // 1000) * 1000
    return max(5_000, min(21_000, wanted))


def word_cases(
    cities: Iterable[str],
    phrases: dict[str, tuple[str, ...]] = PHRASES,
    styles: Iterable[str] = STYLES,
) -> list[Case]:
    """City by city, phrase by phrase, each style: one distance a word."""
    styles = list(styles)
    return [
        Case(city, word, word_distance(word), style)
        for city in cities
        for word in phrases.get(city, ())
        if len(word) <= MAX_PHRASE_LETTERS
        for style in styles
    ]


def read_runs(path: Path) -> list[dict[str, Any]]:
    """The run log, one dict per line; later lines win for the same case."""
    if not path.exists():
        return []
    latest: dict[str, dict[str, Any]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            run = json.loads(line)
            latest[run["key"]] = run
    return list(latest.values())


def _done(runs: Iterable[dict[str, Any]]) -> set[str]:
    """Cases not to plan again: drawn, or not drawable. A failure on the
    network is tried again."""
    return {r["key"] for r in runs if r.get("error_kind") != FAILED}


def plan_case(case: Case, start: LatLon, planner: Planner) -> dict[str, Any]:
    """One line of the run log for `case`."""
    began = time.monotonic()
    run: dict[str, Any] = {
        "key": case.key,
        "city": case.city,
        "distance_m": case.distance_m,
    }
    if case.style is None:
        run["shape"] = case.shape
    else:
        run.update(word=case.shape, style=case.style)
    try:
        result = planner(case, start)
    except ShapeNotDrawableError as exc:
        run.update(error_kind=NOT_DRAWABLE, error=str(exc))
    except Exception as exc:  # a download, a full disk: tried again next run
        run.update(error_kind=FAILED, error=f"{type(exc).__name__}: {exc}")
    else:
        run.update(
            similarity=round(result.similarity, 4),
            route_m=round(result.distance_m),
            points=[
                [round(lat, DECIMALS), round(lon, DECIMALS)]
                for lat, lon in result.points
            ],
            warnings=list(result.warnings),
        )
        # How far the shape is turned (TASK-232, ADR-0195), only when it is:
        # the API's catalogue says it, and the app draws the route turned back.
        if result.rotation_deg:
            run["rotation_deg"] = round(result.rotation_deg, 2)
    run["seconds"] = round(time.monotonic() - began, 1)
    run["planned_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return run


def run_cases(
    todo: Sequence[Case],
    planner: Planner,
    log: Path,
    starts: dict[str, LatLon] = STARTS,
    say: Callable[[str], None] = print,
    prepare: Prepare | None = None,
) -> int:
    """Plans the cases of `todo` not yet in `log`, appending one line each;
    before a city's first case, `prepare` with all of them; a city whose
    zone does not load is skipped, for the next run. Returns how many were
    planned."""
    done = _done(read_runs(log))
    left = [c for c in todo if c.key not in done]
    log.parent.mkdir(parents=True, exist_ok=True)
    prepared: set[str] = set()
    skipped: set[str] = set()
    planned = 0
    for i, case in enumerate(left, 1):
        if prepare is not None and case.city not in prepared:
            prepared.add(case.city)
            try:
                prepare(case.city, [c for c in left if c.city == case.city])
            except Exception as exc:
                # Without its zone every case would ask Overpass again, which
                # has just refused: the city waits for the next run.
                skipped.add(case.city)
                say(f"{case.city}: zone not loaded ({type(exc).__name__}), skipped")
        if case.city in skipped:
            continue
        planned += 1
        run = plan_case(case, starts[case.city], planner)
        with log.open("a", encoding="utf-8") as f:
            f.write(json.dumps(run, separators=(",", ":")) + "\n")
        what = run.get("error_kind") or f"similarity {run['similarity']:.2f}"
        say(f"[{i}/{len(left)}] {case.key}: {what}, {run['seconds']:.0f} s")
    return planned


def select(
    runs: Iterable[dict[str, Any]], min_similarity: float = MIN_SIMILARITY
) -> list[dict[str, Any]]:
    """Every drawn route at `min_similarity` or more, best first within a
    city. Equally good routes are all kept, even on the same roads: none
    replaces another (TASK-092, point 3). REJECTED and UNREADABLE never,
    nor a word judged unreadable or no longer in the city's PHRASES."""
    kept = [
        r
        for r in runs
        if "error_kind" not in r
        and r["similarity"] >= min_similarity
        and (r["city"], name_of(r)) not in REJECTED
        and (r["city"], name_of(r), r["distance_m"]) not in UNREADABLE
        and ("word" not in r or _word_kept(r))
    ]
    return sorted(kept, key=lambda r: (r["city"], -r["similarity"], r["key"]))


def _word_kept(run: dict[str, Any]) -> bool:
    city, word = run["city"], run["word"]
    return (
        word in PHRASES.get(city, ())
        and (city, word, run["style"]) not in UNREADABLE_WORDS
    )


def name_of(run: dict[str, Any]) -> str:
    """The shape, or the word."""
    return str(run["shape"] if "shape" in run else run["word"])


def drawn(run: dict[str, Any]) -> dict[str, Any]:
    """What a catalogue route draws: {"shape"} or {"word", "style"}."""
    if "shape" in run:
        return {"shape": run["shape"]}
    return {"word": run["word"], "style": run["style"]}


def catalogue_files(
    selected: Iterable[dict[str, Any]], min_similarity: float
) -> dict[str, str]:
    """One JSON text per city, by file name. Same input, same text."""
    by_city: dict[str, list[dict[str, Any]]] = {}
    for r in selected:
        by_city.setdefault(r["city"], []).append(r)
    files = {}
    for city, routes in sorted(by_city.items()):
        lat, lon = STARTS.get(city, (None, None))
        body = {
            "city": city,
            "centre": [lat, lon],
            "min_similarity": min_similarity,
            "license": LICENSE,
            "routes": [
                {
                    **drawn(r),
                    "distance_m": r["distance_m"],
                    "route_m": r["route_m"],
                    "similarity": r["similarity"],
                    "planned_at": r["planned_at"],
                    "points": r["points"],
                    **(
                        {"rotation_deg": r["rotation_deg"]}
                        if r.get("rotation_deg")
                        else {}
                    ),
                }
                for r in routes
            ],
        }
        files[f"{city}.json"] = json.dumps(body, separators=(",", ":")) + "\n"
    return files


def write_catalogue(files: dict[str, str], out: Path) -> None:
    """Rewrites the city files: they are rebuilt from the log every time."""
    out.mkdir(parents=True, exist_ok=True)
    for name, text in files.items():
        (out / name).write_text(text, encoding="utf-8")


def summary(runs: Sequence[dict[str, Any]], selected: Sequence[dict[str, Any]]) -> str:
    drawn = [r for r in runs if "error_kind" not in r]
    lines = [
        f"{len(runs)} cases planned: {len(drawn)} drawn, "
        f"{len(runs) - len(drawn)} not; {len(selected)} kept"
    ]
    for city in sorted({r["city"] for r in runs}):
        mine = [r for r in drawn if r["city"] == city]
        kept = [r for r in selected if r["city"] == city]
        best = max((r["similarity"] for r in mine), default=0.0)
        lines.append(
            f"  {city:<12} {len(kept):>3} kept of {len(mine):>3} drawn, best {best:.2f}"
        )
    return "\n".join(lines)


def gpx_files(selected: Iterable[dict[str, Any]]) -> dict[str, str]:
    """The kept routes as GPX, to look at with tools/preview_samples.py."""
    files = {}
    for r in selected:
        when = datetime.strptime(r["planned_at"], "%Y-%m-%dT%H:%M:%SZ")
        when = when.replace(tzinfo=UTC)
        km = r["distance_m"] // 1000
        what = r["shape"] if "shape" in r else f"{r['word']}-{r['style']}"
        name = f"{r['city']}_{what}_{km}km.gpx"
        points = [(lat, lon) for lat, lon in r["points"]]
        files[name] = to_gpx(points, route_name(what, r["distance_m"], when), when)
    return files


def engine_planner(cache_dir: Path) -> Planner:
    """Plans as the API does: the start and the nearby starts, the best kept."""
    from route_engine.nearby_starts import ShapeJob, plan_nearby

    source = OsmnxSource(cache_dir)

    def plan(case: Case, start: LatLon) -> RouteResult:
        if case.style is None:
            request = RouteRequest(
                start=start, shape=case.shape, distance_m=case.distance_m
            )
        else:
            request = RouteRequest(
                start=start,
                word=case.shape,
                style=case.style,  # type: ignore[arg-type]
                distance_m=case.distance_m,
            )
        return plan_nearby(ShapeJob.of_request(request), start, source).plan.result

    return plan


def engine_prepare(
    cache_dir: Path,
    starts: dict[str, LatLon] = STARTS,
    pause: Callable[[float], None] = time.sleep,
) -> Prepare:
    """Loads, once per city, the zone of all its cases with a margin: then
    every case's zone is cut from the cache, without another download."""
    from route_engine.optimizer import SHAPE_POINTS, planned_distance, required_area
    from route_engine.shapes import get_shape
    from route_engine.stops import union
    from route_engine.words import compose

    source = OsmnxSource(cache_dir)

    def prepare(city: str, todo: list[Case]) -> None:
        start = starts[city]
        boxes = []
        for case in todo:
            if case.style is None:
                outline, word = get_shape(case.shape)(SHAPE_POINTS), None
            else:
                word = compose(case.shape, style=case.style)  # type: ignore[arg-type]
                outline = list(word.points)
            planned = planned_distance(case.distance_m, False)
            boxes.append(required_area(outline, start, planned, word=word))
        # Every case's own zone already cached (a zone built elsewhere, e.g.
        # from the server's Geofabrik extract): nothing to download.
        if all(source.is_cached(box) for box in boxes):
            return
        south, west, north, east = union(boxes)
        m = PREPARE_MARGIN_DEG
        zone = (south - m, west - m, north + m, east + m)
        if source.is_cached(zone):
            return
        source.load(zone)
        pause(PREPARE_PAUSE_S)

    return prepare


def _names(value: str, known: Iterable[str], what: str) -> list[str]:
    names, known = value.split(","), set(known)
    unknown = [n for n in names if n not in known]
    if unknown:
        raise argparse.ArgumentTypeError(f"unknown {what}: {', '.join(unknown)}")
    return names


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m route_engine.seed_catalog",
        description="Plan the seed catalogue of recommended routes and keep the best.",
    )
    parser.add_argument(
        "--run", action="store_true", help="plan the cases not yet in the log first"
    )
    parser.add_argument(
        "--cities",
        type=lambda v: _names(v, STARTS, "city"),
        default=list(CITIES),
        help="comma-separated (default: the cities of the seed, not the featured)",
    )
    parser.add_argument(
        "--shapes",
        type=lambda v: _names(v, SUPPORTED_SHAPES, "shape"),
        default=list(SUPPORTED_SHAPES),
        help="comma-separated (default: the whole catalogue)",
    )
    parser.add_argument(
        "--distances",
        type=lambda v: [int(d) for d in v.split(",")],
        default=list(DISTANCES_M),
        help="comma-separated metres (default: 21000,10000,5000)",
    )
    parser.add_argument(
        "--kinds",
        choices=("all", "shapes", "words"),
        default="all",
        help="shapes of the catalogue, the phrases of PHRASES, or both (default)",
    )
    parser.add_argument(
        "--featured",
        action="store_true",
        help="the featured cities: a heart, a circle and a star of 5 km each, "
        "instead of --cities, --shapes, --distances and --kinds",
    )
    parser.add_argument("--min-similarity", type=float, default=MIN_SIMILARITY)
    parser.add_argument(
        "--log",
        type=Path,
        default=Path("out/seed_catalog/runs.jsonl"),
        help="the run log (default: out/seed_catalog/runs.jsonl)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("catalog/seed"),
        help="where the city files go (default: catalog/seed)",
    )
    parser.add_argument(
        "--gpx",
        type=Path,
        metavar="DIR",
        help="also write the kept routes as GPX here, to look at them",
    )
    parser.add_argument("--cache-dir", type=Path, default=Path("data/cache"))
    return parser


def main(argv: Sequence[str] | None = None, planner: Planner | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.featured:
        args.cities = list(FEATURED)
        args.shapes = list(FEATURED_SHAPES)
        args.distances = [FEATURED_DISTANCE_M]
        args.kinds = "shapes"
    if args.run:
        todo = []
        if args.kinds != "words":
            todo += cases(args.cities, args.shapes, args.distances)
        if args.kinds != "shapes":
            todo += word_cases(args.cities)
        run_cases(
            todo,
            planner or engine_planner(args.cache_dir),
            args.log,
            # A planner given (the tests) needs no zone.
            prepare=None if planner is not None else engine_prepare(args.cache_dir),
        )
    runs = [r for r in read_runs(args.log) if r["city"] in args.cities]
    selected = select(runs, args.min_similarity)
    write_catalogue(catalogue_files(selected, args.min_similarity), args.out)
    if args.gpx is not None:
        write_catalogue(gpx_files(selected), args.gpx)
    print(summary(runs, selected))
    return 0


if __name__ == "__main__":
    sys.exit(main())
