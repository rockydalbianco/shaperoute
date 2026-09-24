"""Command-line entry point: python -m route_engine --shape ... --distance ...

`--outline FILE` takes the shape from a JSON outline instead (TASK-032), and
`--word TEXT` writes a word one letter at a time (TASK-050).
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import (
    InvalidRequestError,
    RouteRequest,
    check_activity,
    check_distance,
    check_start,
)
from route_engine.network import EDGE_REUSE_PENALTY, OsmnxSource
from route_engine.optimizer import (
    SHAPE_POINTS,
    SIMILARITY,
    ShapeNotDrawableError,
    plan_shape,
    planned_distance,
    required_area,
    tilt_limit,
)
from route_engine.projection import initial_scale
from route_engine.shapes import get_shape
from route_engine.shapes.outline import InvalidOutlineError, Outline, read_outline
from route_engine.words import LETTERS, InvalidWordError, Word, compose


@dataclass(frozen=True)
class OutlineRequest:
    """A RouteRequest whose shape is an outline read from a file (TASK-032).

    Not part of the contract: outline shapes are tried from the CLI only,
    until the shape catalogue (TASK-033).
    """

    start: tuple[float, float]
    outline: Outline
    distance_m: int
    activity: str = "running"

    def __post_init__(self) -> None:
        check_start(self.start)
        check_distance(self.distance_m)
        check_activity(self.activity)

    @property
    def shape(self) -> str:
        return self.outline.name


@dataclass(frozen=True)
class WordRequest:
    """A RouteRequest whose shape is a word, written with the letters of
    letters.json (TASK-050). From the CLI only, like outlines."""

    start: tuple[float, float]
    word: Word
    distance_m: int
    activity: str = "running"

    def __post_init__(self) -> None:
        check_start(self.start)
        check_distance(self.distance_m)
        check_activity(self.activity)

    @property
    def shape(self) -> str:
        return self.word.text


def _parse_start(value: str) -> tuple[float, float]:
    parts = value.split(",")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError(
            f"expected LAT,LON (e.g. 46.0122,11.2986), got {value!r}"
        )
    try:
        return float(parts[0]), float(parts[1])
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"LAT and LON must be numbers, got {value!r}"
        ) from None


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m route_engine",
        description="Generate a real route that draws a shape on the map.",
    )
    what = parser.add_mutually_exclusive_group(required=True)
    what.add_argument("--shape", help="shape name, e.g. circle")
    what.add_argument(
        "--outline",
        type=Path,
        metavar="FILE",
        help="a shape read from a JSON outline, e.g. "
        "route_engine/shapes/outlines/house.json",
    )
    what.add_argument(
        "--word",
        metavar="TEXT",
        help="a word written one letter at a time, e.g. CIAO",
    )
    parser.add_argument(
        "--distance", required=True, type=int, help="target distance in metres"
    )
    parser.add_argument(
        "--start",
        required=True,
        type=_parse_start,
        metavar="LAT,LON",
        help="start point in WGS84, e.g. 46.0122,11.2986; "
        "write --start=-33.9,18.4 when LAT is negative",
    )
    parser.add_argument(
        "--out", type=Path, help="write the route to this GPX file (never overwritten)"
    )
    parser.add_argument("--activity", default="running", help="default: running")
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("data/cache"),
        help="where road graphs are cached (default: data/cache)",
    )
    parser.add_argument(
        "--no-optimize",
        action="store_true",
        help="trace the shape once at its initial placement (as in TASK-017)",
    )
    parser.add_argument(
        "--reuse-penalty",
        type=float,
        default=EDGE_REUSE_PENALTY,
        help=f"weight multiplier on already used roads (default: {EDGE_REUSE_PENALTY})",
    )
    return parser


Request = RouteRequest | OutlineRequest | WordRequest


def parse_args(
    argv: Sequence[str] | None = None,
) -> tuple[Request, argparse.Namespace]:
    """Parse CLI arguments into a validated request and the output path.

    Invalid input exits with status 2 and a one-line message, never a traceback.
    """
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.out is not None and args.out.exists():
        parser.error(f"{args.out} already exists; samples are never overwritten")
    request: Request
    try:
        if args.word is not None:
            request = WordRequest(
                start=args.start,
                word=compose(args.word),
                distance_m=args.distance,
                activity=args.activity,
            )
        elif args.outline is None:
            request = RouteRequest(
                start=args.start,
                shape=args.shape,
                distance_m=args.distance,
                activity=args.activity,
            )
        else:
            request = OutlineRequest(
                start=args.start,
                outline=read_outline(args.outline),
                distance_m=args.distance,
                activity=args.activity,
            )
    except InvalidOutlineError as exc:
        parser.error(f"{args.outline}: {exc}")
    except InvalidWordError as exc:
        parser.error(f"--word {args.word}: {exc}")
    except InvalidRequestError as exc:
        parser.error(str(exc))
    return request, args


def parse_request(argv: Sequence[str] | None = None) -> Request:
    return parse_args(argv)[0]


def main(argv: Sequence[str] | None = None) -> int:
    request, args = parse_args(argv)
    lat, lon = request.start
    print("Route request:")
    if isinstance(request, OutlineRequest):
        print(f"  shape:    {request.shape} (outline from {args.outline})")
        print(f"            {request.outline.source}; {request.outline.license}")
        shape = request.outline(SHAPE_POINTS)
    elif isinstance(request, WordRequest):
        print(f"  shape:    {request.shape} (word, letters from {LETTERS.name})")
        shape = list(request.word.points)
    else:
        print(f"  shape:    {request.shape}")
        shape = get_shape(request.shape)(SHAPE_POINTS)
    print(f"  distance: {request.distance_m} m")
    print(f"  start:    {lat}, {lon}")
    print(f"  activity: {request.activity}")
    if args.out is None:
        return 0

    optimize = not args.no_optimize
    source = OsmnxSource(args.cache_dir)
    one_way = isinstance(request, OutlineRequest) and request.outline.one_way
    word = request.word if isinstance(request, WordRequest) else None
    planned_m = planned_distance(request.distance_m, one_way)
    bbox = required_area(shape, request.start, planned_m, optimize, word)
    if source.is_cached(bbox):
        print("Road graph: from the cache")
    else:
        print("Road graph: downloading from OpenStreetMap...")
    try:
        plan = plan_shape(
            shape,
            request.shape,
            request.start,
            request.distance_m,
            source,
            optimize=optimize,
            reuse_penalty=args.reuse_penalty,
            max_tilt_deg=tilt_limit(request.shape),
            one_way=one_way,
            word=word,
        )
    except ShapeNotDrawableError as exc:
        print(f"No route: {exc}", file=sys.stderr)
        return 1
    route = plan.result

    when = datetime.now(UTC)
    name = route_name(request.shape, request.distance_m, when)
    args.out.write_text(to_gpx(route.points, name, when), encoding="utf-8")
    print(f"Wrote {args.out}: {len(route.points)} points")
    if plan.search is not None:
        best = plan.search.best
        base = initial_scale(shape, planned_m)
        print(
            f"  placement:  rotation {best.rotation_deg:.0f} deg, "
            f"phase {best.phase:.2f}, "
            f"scale {best.scale_m / base:.0%} of the initial one"
        )
        if best.offset_m > 0:
            start_lat, start_lon = best.placement.start
            print(
                f"  start:      {start_lat:.5f}, {start_lon:.5f}"
                f" ({best.offset_m:.0f} m away)"
            )
        if word is not None and best.shifts:
            height_m = best.scale_m * word.height
            moves = ", ".join(
                f"{letter.char} {dx * height_m:+.0f}/{dy * height_m:+.0f}"
                for letter, (dx, dy) in zip(word.letters, best.shifts, strict=True)
            )
            print(f"  letters:    {height_m:.0f} m high; moved (m, along/up) {moves}")
        print(f"  attempts:   {len(plan.search.attempts)} routes traced")
    measure_name = SIMILARITY if word is None else "letters"
    print(f"  similarity: {route.similarity:.2f} ({measure_name})")
    print(f"  on roads:   {route.distance_m:.0f} m (target {request.distance_m} m)")
    checks = plan.checks
    print(
        f"  checks:     {checks['reuse']:.0%} on roads already travelled, "
        f"{checks['retrace']:.0%} running beside itself; "
        f"{checks['steps']:.0f} m on steps, {checks['busy']:.0f} m on main roads, "
        f"{checks['tunnel']:.0f} m in tunnels"
    )
    for warning in route.warnings:
        print(f"  warning: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
