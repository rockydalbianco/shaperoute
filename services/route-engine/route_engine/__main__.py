"""Command-line entry point: python -m route_engine --shape ... --distance ..."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from route_engine.models import InvalidRequestError, RouteRequest


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
    parser.add_argument("--out", type=Path, help="output GPX file (not used yet)")
    parser.add_argument("--activity", default="running", help="default: running")
    return parser


def parse_request(argv: Sequence[str] | None = None) -> RouteRequest:
    """Parse CLI arguments into a validated RouteRequest.

    Invalid input exits with status 2 and a one-line message, never a traceback.
    """
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        return RouteRequest(
            start=args.start,
            shape=args.shape,
            distance_m=args.distance,
            activity=args.activity,
        )
    except InvalidRequestError as exc:
        parser.error(str(exc))


def main(argv: Sequence[str] | None = None) -> int:
    request = parse_request(argv)
    lat, lon = request.start
    print("Route request:")
    print(f"  shape:    {request.shape}")
    print(f"  distance: {request.distance_m} m")
    print(f"  start:    {lat}, {lon}")
    print(f"  activity: {request.activity}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
