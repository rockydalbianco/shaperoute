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
}

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
    city: str
    shape: str
    distance_m: int

    @property
    def key(self) -> str:
        return f"{self.city}/{self.shape}/{self.distance_m}"


Planner = Callable[[Case, LatLon], RouteResult]


def cases(
    cities: Iterable[str], shapes: Iterable[str], distances: Iterable[int]
) -> list[Case]:
    """City by city, the largest distance first, then shape by shape."""
    shapes, distances = list(shapes), sorted(distances, reverse=True)
    return [
        Case(city, shape, d) for city in cities for d in distances for shape in shapes
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
        "shape": case.shape,
        "distance_m": case.distance_m,
    }
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
    run["seconds"] = round(time.monotonic() - began, 1)
    run["planned_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return run


def run_cases(
    todo: Sequence[Case],
    planner: Planner,
    log: Path,
    starts: dict[str, LatLon] = CITIES,
    say: Callable[[str], None] = print,
) -> int:
    """Plans the cases of `todo` not yet in `log`, appending one line each.
    Returns how many were planned."""
    done = _done(read_runs(log))
    left = [c for c in todo if c.key not in done]
    log.parent.mkdir(parents=True, exist_ok=True)
    for i, case in enumerate(left, 1):
        run = plan_case(case, starts[case.city], planner)
        with log.open("a", encoding="utf-8") as f:
            f.write(json.dumps(run, separators=(",", ":")) + "\n")
        what = run.get("error_kind") or f"similarity {run['similarity']:.2f}"
        say(f"[{i}/{len(left)}] {case.key}: {what}, {run['seconds']:.0f} s")
    return len(left)


def select(
    runs: Iterable[dict[str, Any]], min_similarity: float = MIN_SIMILARITY
) -> list[dict[str, Any]]:
    """Every drawn route at `min_similarity` or more, best first within a
    city. Equally good routes are all kept, even on the same roads: none
    replaces another (TASK-092, point 3). REJECTED pairs never."""
    kept = [
        r
        for r in runs
        if "error_kind" not in r
        and r["similarity"] >= min_similarity
        and (r["city"], r["shape"]) not in REJECTED
    ]
    return sorted(kept, key=lambda r: (r["city"], -r["similarity"], r["key"]))


def catalogue_files(
    selected: Iterable[dict[str, Any]], min_similarity: float
) -> dict[str, str]:
    """One JSON text per city, by file name. Same input, same text."""
    by_city: dict[str, list[dict[str, Any]]] = {}
    for r in selected:
        by_city.setdefault(r["city"], []).append(r)
    files = {}
    for city, routes in sorted(by_city.items()):
        lat, lon = CITIES.get(city, (None, None))
        body = {
            "city": city,
            "centre": [lat, lon],
            "min_similarity": min_similarity,
            "license": LICENSE,
            "routes": [
                {
                    "shape": r["shape"],
                    "distance_m": r["distance_m"],
                    "route_m": r["route_m"],
                    "similarity": r["similarity"],
                    "planned_at": r["planned_at"],
                    "points": r["points"],
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
            f"  {city:<8} {len(kept):>3} kept of {len(mine):>3} drawn, best {best:.2f}"
        )
    return "\n".join(lines)


def gpx_files(selected: Iterable[dict[str, Any]]) -> dict[str, str]:
    """The kept routes as GPX, to look at with tools/preview_samples.py."""
    files = {}
    for r in selected:
        when = datetime.strptime(r["planned_at"], "%Y-%m-%dT%H:%M:%SZ")
        when = when.replace(tzinfo=UTC)
        km = r["distance_m"] // 1000
        name = f"{r['city']}_{r['shape']}_{km}km.gpx"
        points = [(lat, lon) for lat, lon in r["points"]]
        files[name] = to_gpx(
            points, route_name(r["shape"], r["distance_m"], when), when
        )
    return files


def engine_planner(cache_dir: Path) -> Planner:
    """Plans as the API does: the start and the nearby starts, the best kept."""
    from route_engine.nearby_starts import ShapeJob, plan_nearby

    source = OsmnxSource(cache_dir)

    def plan(case: Case, start: LatLon) -> RouteResult:
        request = RouteRequest(
            start=start, shape=case.shape, distance_m=case.distance_m
        )
        return plan_nearby(ShapeJob.of_request(request), start, source).plan.result

    return plan


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
        type=lambda v: _names(v, CITIES, "city"),
        default=list(CITIES),
        help="comma-separated (default: all thirteen)",
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
    if args.run:
        todo = cases(args.cities, args.shapes, args.distances)
        run_cases(todo, planner or engine_planner(args.cache_dir), args.log)
    runs = [r for r in read_runs(args.log) if r["city"] in args.cities]
    selected = select(runs, args.min_similarity)
    write_catalogue(catalogue_files(selected, args.min_similarity), args.out)
    if args.gpx is not None:
        write_catalogue(gpx_files(selected), args.gpx)
    print(summary(runs, selected))
    return 0


if __name__ == "__main__":
    sys.exit(main())
