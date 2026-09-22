"""Command-line entry point: python -m route_engine --shape ... --distance ..."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

from route_engine.export_gpx import route_name, to_gpx
from route_engine.geo import path_length_m
from route_engine.models import InvalidRequestError, RouteRequest
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

# Starting value from docs/ROUTE_ENGINE.md §2, to be tuned.
N_POINTS = 64


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
    return parser


def parse_args(
    argv: Sequence[str] | None = None,
) -> tuple[RouteRequest, Path | None]:
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
    return request, args.out


def parse_request(argv: Sequence[str] | None = None) -> RouteRequest:
    return parse_args(argv)[0]


def main(argv: Sequence[str] | None = None) -> int:
    request, out = parse_args(argv)
    lat, lon = request.start
    print("Route request:")
    print(f"  shape:    {request.shape}")
    print(f"  distance: {request.distance_m} m")
    print(f"  start:    {lat}, {lon}")
    print(f"  activity: {request.activity}")
    if out is not None:
        shape = get_shape(request.shape)(N_POINTS)
        points = project_shape(
            shape, request.start, initial_scale(shape, request.distance_m)
        )
        when = datetime.now(UTC)
        name = route_name(request.shape, request.distance_m, when)
        out.write_text(to_gpx(points, name, when), encoding="utf-8")
        print(f"Wrote {out}: {len(points)} points, {path_length_m(points):.0f} m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
