"""Measure how often the engine advises a better distance (TASK-234).

Not a test: it reads the zone graphs from data/cache/ and prints one row
per case, as measure_optimizer.py does, then how many cases the advice
fires in at margins of 5, 4 and 3 points (docs/MAPS.md, «Viene meglio a N
km»).

    python tests/measure_better.py                 # the reference cases
    python tests/measure_better.py --catalog       # + every shape, Trento, Levico
    python tests/measure_better.py --words --json out.json

Columns: the chosen route's similarity and distance ratio, whether it was
good, the whole km the search tried besides the one asked for, the best of
them with similarity at least SIMILARITY_THRESHOLD and its margin (the
chosen route's shape_cost less its own), and the advice itself.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from measure_snapping import ZONES, cases

from route_engine.models import DISTANCE_LIMITS_M, RouteRequest
from route_engine.network import OsmnxSource
from route_engine.optimizer import (
    SHAPE_POINTS,
    SIMILARITY_THRESHOLD,
    W_SHAPE,
    ShapeNotDrawableError,
    better_distance,
    plan_route,
    required_area,
    shape_cost,
)
from route_engine.shapes import SUPPORTED_SHAPES, get_shape
from route_engine.words import LETTER_DISTANCE_M, compose

WORDS = ("ciao", "io", "run")
POINTS = (5, 4, 3)  # margins tried, in points of similarity


def todo(catalog: bool, words: bool) -> list[tuple[str, str, int]]:
    """(zone, shape or word, distance) of each case."""
    out = [(zone, shape, d) for _, shape, d, zone in _reference()]
    if catalog:
        out += [
            (zone, shape, d)
            for zone in ("trento", "levico")
            for shape in SUPPORTED_SHAPES
            for d in (5000, 10000, 15000)
            if shape not in ("heart", "circle") or d == 10000
        ]
    if words:
        out += [
            (zone, word, d)
            for zone in ("trento", "levico", "milano")
            for word in WORDS
            for d in (9000, 12000, 15000)
            if d >= LETTER_DISTANCE_M * len(word)
        ]
    return out


def _reference() -> list[tuple[str, str, int, str]]:
    return [(n, s, d, n.rsplit("_", 1)[1]) for n, s, d, _ in cases(None)]


def measure(source: OsmnxSource, zone: str, drawn: str, distance: int) -> Any:
    start = ZONES[zone]
    name = f"{drawn}_{distance // 1000}km_{zone}"
    word = None if drawn in SUPPORTED_SHAPES else compose(drawn)
    points = list(word.points) if word else get_shape(drawn)(SHAPE_POINTS)
    if not source.is_cached(required_area(points, start, distance, word=word)):
        return {"case": name, "skipped": "not cached"}
    asked = {"word" if word else "shape": drawn}
    request = RouteRequest(start=start, distance_m=distance, **asked)
    t0 = time.perf_counter()
    try:
        plan = plan_route(request, source)
    except ShapeNotDrawableError as exc:
        return {"case": name, "skipped": f"not drawable: {exc}"}
    found = plan.search
    assert found is not None
    low, high = DISTANCE_LIMITS_M["running"]
    if word is not None:
        low = max(low, LETTER_DISTANCE_M * len(word.letters))
    chosen = shape_cost(found.best)
    kms: dict[int, tuple[float, float]] = {}  # km: (margin, similarity)
    for a in found.attempts:
        km = round(a.ratio * distance / 1000) * 1000
        if km == distance or not low <= km <= high:
            continue
        if a.similarity >= SIMILARITY_THRESHOLD:
            margin = chosen - shape_cost(a)
            if km not in kms or margin > kms[km][0]:
                kms[km] = (margin, a.similarity)
        else:
            kms.setdefault(km, (float("-inf"), a.similarity))
    top = max(kms.items(), key=lambda kv: kv[1][0], default=None)
    advice = better_distance(found, distance, word=word)
    assert advice == plan.result.better_distance_m
    return {
        "case": name,
        "similarity": round(found.best.similarity, 3),
        "ratio": round(found.best.ratio, 3),
        "good": found.converged,
        "kms": sorted(kms),
        "top": None if top is None or top[1][0] == float("-inf") else top,
        "advice": advice,
        "seconds": round(time.perf_counter() - t0, 1),
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cache-dir", type=Path, default=Path("../../data/cache"))
    parser.add_argument("--catalog", action="store_true")
    parser.add_argument("--words", action="store_true")
    parser.add_argument("--json", type=Path, help="also write the rows here")
    args = parser.parse_args(argv)
    source = OsmnxSource(args.cache_dir)
    rows = []
    for zone, drawn, distance in todo(args.catalog, args.words):
        row = measure(source, zone, drawn, distance)
        rows.append(row)
        if "skipped" in row:
            print(f"{row['case']:<28} {row['skipped']}", flush=True)
            continue
        top = row["top"]
        best = "-" if top is None else f"{top[0] // 1000} km {top[1][0]:+.3f}"
        print(
            f"{row['case']:<28} {row['similarity']:.2f} {row['ratio']:4.2f}x"
            f" {'ok' if row['good'] else 'no'}  tried {len(row['kms']):2d} km"
            f"  best {best:<16} advice {row['advice']}  {row['seconds']:4.1f}s",
            flush=True,
        )
    drawn = [r for r in rows if "skipped" not in r]
    for points in POINTS:
        margin = W_SHAPE * points / 100 - 1e-9
        fired = sum(1 for r in drawn if r["top"] and r["top"][1][0] >= margin)
        print(f"margin {points} points: {fired}/{len(drawn)}")
    if args.json is not None:
        args.json.write_text(json.dumps(rows, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
