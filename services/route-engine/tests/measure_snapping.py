"""Measure road snapping on the 12 reference cases (TASK-017).

Not a test: it reads the zone graphs from data/cache/ (downloaded in
TASK-014) and prints one row per case, so every snapping variant can be
compared against the same numbers.

    python tests/measure_snapping.py
    python tests/measure_snapping.py --network walk --corridor 0 --zone-radius 0
    python tests/measure_snapping.py --only levico --out-dir ../../samples --tag v1

Columns:
- ratio:   distance on roads / target distance;
- reused:  share of the route length on stretches already travelled;
- dev:     mean and max distance of the route from the theoretical shape (m);
- cover:   share of the shape outline with the route within 2% of the
           target distance (100 m at 5 km): a route that skips part of the
           shape has a low cover even if its length looks right;
- wp:      zones reached / shape points.

The options change the snapping parameters (docs/MAPS.md); `--network walk`
reads the graphs cached by TASK-014, without cycle paths.
"""

from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from route_engine.export_gpx import route_name, to_gpx
from route_engine.geo import LatLon, haversine_m, latlon_to_local
from route_engine.network import (
    CORRIDOR_BAND,
    CORRIDOR_WEIGHT,
    EDGE_REUSE_PENALTY,
    FOOT_NETWORK_NAME,
    ZONE_RADIUS,
    NetworkRoute,
    OsmnxSource,
    area_around,
    distance_to_polyline,
    snap_to_network,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

N_POINTS = 64  # same as the CLI
COVER_TOLERANCE = 0.02  # of the target distance
ZONES = {
    "trento": (46.0671, 11.1214),
    "levico": (46.0122, 11.2986),
    "valsugana": (46.0533, 11.4483),
    # Comparison only (TASK-015): a big city with a very dense network.
    "milano": (45.4642, 9.1900),
}
SHAPES = ("heart", "circle")
DISTANCES = (5000, 15000)


def reused_share(points: Sequence[LatLon]) -> float:
    """Fraction of the route length on stretches already travelled before."""
    seen: set[frozenset[tuple[float, float]]] = set()
    total = reused = 0.0
    for p, q in zip(points, points[1:], strict=False):
        length = haversine_m(p, q)
        key = frozenset((tuple(np.round(p, 6)), tuple(np.round(q, 6))))
        total += length
        if key in seen:
            reused += length
        seen.add(key)
    return reused / total if total else 0.0


def _local(origin: LatLon, points: Sequence[LatLon]) -> np.ndarray:
    return np.array([latlon_to_local(origin, p) for p in points])


def _closed(xy: np.ndarray) -> np.ndarray:
    return xy if np.allclose(xy[0], xy[-1]) else np.vstack([xy, xy[:1]])


def _densify(polyline: np.ndarray, step_m: float) -> np.ndarray:
    out = [polyline[0]]
    for a, b in zip(polyline, polyline[1:], strict=False):
        n = max(1, int(np.hypot(*(b - a)) // step_m))
        out.extend(a + (b - a) * k / n for k in range(1, n + 1))
    return np.array(out)


def shape_fit(
    route: Sequence[LatLon], shape: Sequence[LatLon], tolerance_m: float
) -> tuple[float, float, float]:
    """Mean and max route → outline distance (m), and outline cover."""
    origin = shape[0]
    outline = _closed(_local(origin, shape))
    route_xy = _local(origin, route)
    d = distance_to_polyline(outline, route_xy)
    back = distance_to_polyline(route_xy, _densify(outline, 10.0))
    return float(d.mean()), float(d.max()), float((back <= tolerance_m).mean())


def cases(only: str | None) -> list[tuple[str, str, int, LatLon]]:
    result = []
    for zone, start in ZONES.items():
        for shape in SHAPES:
            for distance in DISTANCES:
                name = f"{shape}_{distance // 1000}km_{zone}"
                if only is None or only in name:
                    result.append((name, shape, distance, start))
    return result


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cache-dir", type=Path, default=Path("../../data/cache"))
    parser.add_argument("--only", help="substring of the case name, e.g. levico")
    parser.add_argument("--out-dir", type=Path, help="also write GPX samples here")
    parser.add_argument("--tag", default="v1", help="sample version, e.g. v1")
    parser.add_argument("--zone-radius", type=float, default=ZONE_RADIUS)
    parser.add_argument("--corridor", type=float, default=CORRIDOR_WEIGHT)
    parser.add_argument("--band", type=float, default=CORRIDOR_BAND)
    parser.add_argument(
        "--network", default=FOOT_NETWORK_NAME, help="cache name: foot or walk"
    )
    parser.add_argument("--penalty", type=float, default=EDGE_REUSE_PENALTY)
    args = parser.parse_args(argv)

    source = OsmnxSource(args.cache_dir, network_name=args.network)
    header = (
        f"{'case':<22} {'km':>11} {'ratio':>6} {'reused':>7}"
        f" {'dev':>11} {'cover':>6} {'wp':>6}"
    )
    print(header)
    print("-" * len(header))
    ratios: list[float] = []
    covers: list[float] = []
    for name, shape_name, distance, start in cases(args.only):
        shape = get_shape(shape_name)(N_POINTS)
        projected = project_shape(shape, start, initial_scale(shape, distance))
        bbox = area_around(projected)
        if not source.is_cached(bbox):
            print(f"{name:<22} not cached: run the CLI once to download it")
            continue
        graph = source.load(bbox)
        t0 = time.perf_counter()
        route: NetworkRoute = snap_to_network(
            graph,
            projected,
            reuse_penalty=args.penalty,
            zone_radius=args.zone_radius,
            corridor=args.corridor,
            band=args.band,
        )
        elapsed = time.perf_counter() - t0
        ratio = route.distance_m / distance
        mean_dev, max_dev, cover = shape_fit(
            route.points, projected, COVER_TOLERANCE * distance
        )
        ratios.append(ratio)
        covers.append(cover)
        print(
            f"{name:<22} {route.distance_m / 1000:5.1f}/{distance / 1000:<5.1f}"
            f" {ratio:5.2f}x {reused_share(route.points):6.0%}"
            f" {mean_dev:4.0f}/{max_dev:<6.0f} {cover:5.0%}"
            f" {len(route.waypoints):>2}/{N_POINTS}  {elapsed:4.1f}s"
        )
        for warning in route.warnings:
            print(f"{'':<22} warning: {warning}")
        if args.out_dir is not None:
            out = args.out_dir / f"TASK-017_{name}_{args.tag}.gpx"
            if out.exists():
                print(f"{'':<22} {out.name} exists, not overwritten")
                continue
            when = datetime.now(UTC)
            gpx = to_gpx(route.points, route_name(shape_name, distance, when), when)
            out.write_text(gpx, encoding="utf-8")
    if ratios:
        within = sum(r <= 1.5 for r in ratios)
        print(
            f"within 1.5x: {within}/{len(ratios)}"
            f"  median ratio {np.median(ratios):.2f}x"
            f"  mean cover {np.mean(covers):.0%}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
