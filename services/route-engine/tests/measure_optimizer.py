"""Measure the optimizer on the 12 reference cases (TASK-015).

Not a test: it reads the zone graphs from data/cache/ and prints one row
per case, so changes to the search can be compared on the same numbers.

    python tests/measure_optimizer.py
    python tests/measure_optimizer.py --no-optimize
    python tests/measure_optimizer.py --only levico --out-dir ../../samples --tag v1

Columns: distance on roads / target, coverage and fit (docs/MAPS.md), where
the shape was placed (rotation, phase, scale as a share of the initial one),
routes traced, whether the search converged, and time.
"""

from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from measure_snapping import cases

from route_engine.export_gpx import route_name, to_gpx
from route_engine.metrics import SIMILARITIES
from route_engine.models import RouteRequest
from route_engine.network import OsmnxSource
from route_engine.optimizer import (
    SHAPE_POINTS,
    ShapeNotDrawableError,
    plan_route,
    required_area,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cache-dir", type=Path, default=Path("../../data/cache"))
    parser.add_argument("--only", help="substring of the case name, e.g. _5km_")
    parser.add_argument("--no-optimize", action="store_true")
    parser.add_argument("--out-dir", type=Path, help="also write GPX samples here")
    parser.add_argument("--tag", default="v1", help="sample version, e.g. v1")
    args = parser.parse_args(argv)
    optimize = not args.no_optimize

    source = OsmnxSource(args.cache_dir)
    print(
        f"{'case':<22} {'km':>11} {'ratio':>6} {'cover':>6} {'fit':>5}"
        f" {'move':>4} {'rot':>4} {'phase':>5} {'scale':>5} {'traces':>6}"
        f"  {'reuse':>5} {'twice':>5} {'steps':>5} {'busy':>5} {'tunnel':>6}"
    )
    rows: list[tuple[float, float, bool]] = []
    for name, shape_name, distance, start in cases(args.only):
        shape = get_shape(shape_name)(SHAPE_POINTS)
        if not source.is_cached(
            required_area(shape, start, distance, optimize=optimize)
        ):
            print(f"{name:<22} not cached")
            continue
        request = RouteRequest(start=start, shape=shape_name, distance_m=distance)
        t0 = time.perf_counter()
        try:
            plan = plan_route(request, source, optimize=optimize)
        except ShapeNotDrawableError as exc:
            print(f"{name:<22} not drawable: {exc}")
            continue
        elapsed = time.perf_counter() - t0
        result = plan.result
        if plan.search is not None:
            best = plan.search.best
            outline = best.shape
            status = "ok" if plan.search.converged else "no"
            placement = (
                f"{best.offset_m:4.0f} {best.rotation_deg:4.0f} {best.phase:5.2f}"
                f" {best.scale_m / initial_scale(shape, distance):5.0%}"
                f" {len(plan.search.attempts):4d} {status}"
            )
        else:
            outline = project_shape(shape, start, initial_scale(shape, distance))
            placement = f"{'-':>4} {'-':>4} {'-':>5} {'-':>5} {'-':>6}"
        ratio = result.distance_m / distance
        cover = SIMILARITIES["coverage"](result.points, outline)
        fit = SIMILARITIES["fit"](result.points, outline)
        rows.append((ratio, cover, abs(ratio - 1) <= 0.10))
        print(
            f"{name:<22} {result.distance_m / 1000:5.1f}/{distance / 1000:<5.1f}"
            f" {ratio:5.2f}x {cover:5.0%} {fit:5.0%} {placement}"
            f"  {plan.checks['reuse']:5.0%} {plan.checks['retrace']:5.0%}"
            f" {plan.checks['steps']:4.0f}m {plan.checks['busy']:4.0f}m"
            f" {plan.checks['tunnel']:5.0f}m  {elapsed:4.1f}s"
        )
        for warning in result.warnings:
            print(f"{'':<22} warning: {warning}")
        if args.out_dir is not None:
            out = args.out_dir / f"TASK-015_{name}_{args.tag}.gpx"
            if out.exists():
                print(f"{'':<22} {out.name} exists, not overwritten")
                continue
            when = datetime.now(UTC)
            gpx = to_gpx(result.points, route_name(shape_name, distance, when), when)
            out.write_text(gpx, encoding="utf-8")
    if rows:
        ratios, covers, within = zip(*rows, strict=True)
        print(
            f"distance within +-10%: {sum(within)}/{len(rows)}"
            f"  cover >= 80%: {sum(c >= 0.8 for c in covers)}/{len(rows)}"
            f"  median ratio {np.median(ratios):.2f}x"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
