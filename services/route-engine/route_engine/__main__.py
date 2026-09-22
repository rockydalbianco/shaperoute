"""Command-line entry point: python -m route_engine --shape ... --distance ..."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.network import EDGE_REUSE_PENALTY, OsmnxSource
from route_engine.optimizer import SHAPE_POINTS, SIMILARITY, plan_route, required_area
from route_engine.projection import initial_scale
from route_engine.shapes import get_shape


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
    parser.add_argument("--shape", required=True, help="shape name, e.g. circle")
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


def parse_args(
    argv: Sequence[str] | None = None,
) -> tuple[RouteRequest, argparse.Namespace]:
    """Parse CLI arguments into a validated RouteRequest and the output path.

    Invalid input exits with status 2 and a one-line message, never a traceback.
    """
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.out is not None and args.out.exists():
        parser.error(f"{args.out} already exists; samples are never overwritten")
    try:
        request = RouteRequest(
            start=args.start,
            shape=args.shape,
            distance_m=args.distance,
            activity=args.activity,
        )
    except InvalidRequestError as exc:
        parser.error(str(exc))
    return request, args


def parse_request(argv: Sequence[str] | None = None) -> RouteRequest:
    return parse_args(argv)[0]


def main(argv: Sequence[str] | None = None) -> int:
    request, args = parse_args(argv)
    lat, lon = request.start
    print("Route request:")
    print(f"  shape:    {request.shape}")
    print(f"  distance: {request.distance_m} m")
    print(f"  start:    {lat}, {lon}")
    print(f"  activity: {request.activity}")
    if args.out is None:
        return 0

    optimize = not args.no_optimize
    shape = get_shape(request.shape)(SHAPE_POINTS)
    source = OsmnxSource(args.cache_dir)
    bbox = required_area(shape, request.start, request.distance_m, optimize)
    if source.is_cached(bbox):
        print("Road graph: from the cache")
    else:
        print("Road graph: downloading from OpenStreetMap...")
    plan = plan_route(
        request, source, optimize=optimize, reuse_penalty=args.reuse_penalty
    )
    route = plan.result

    when = datetime.now(UTC)
    name = route_name(request.shape, request.distance_m, when)
    args.out.write_text(to_gpx(route.points, name, when), encoding="utf-8")
    print(f"Wrote {args.out}: {len(route.points)} points")
    if plan.search is not None:
        best = plan.search.best
        base = initial_scale(shape, request.distance_m)
        print(
            f"  placement:  rotation {best.rotation_deg:.0f}°, phase {best.phase:.2f}, "
            f"scale {best.scale_m / base:.0%} of the initial one"
        )
        print(f"  attempts:   {len(plan.search.attempts)} routes traced")
    print(f"  similarity: {route.similarity:.2f} ({SIMILARITY})")
    print(f"  on roads:   {route.distance_m:.0f} m (target {request.distance_m} m)")
    for warning in route.warnings:
        print(f"  warning: {warning}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
