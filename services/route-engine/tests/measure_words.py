"""Write words in either style and measure them (TASK-077).

Not a test: it reads the zone graphs from data/cache/ and never downloads
nor saves one (a zone not cached is skipped), plans each word with
`plan_route` and prints one row per case, so the two styles can be
compared on the same numbers.

    python tests/measure_words.py --words CIAO,MAX --style block
    python tests/measure_words.py --words CIAO --zones trento --style block \
        --out-dir ../../samples --tag TASK-077 --version v1

A sample is named by word and style: TASK-077_ciao-block_15km_trento_v1.gpx.

Columns: distance on roads / target, similarity (letter by letter), letter
height, rotation of the word and the directions of the streets around its
start (street_grid), how far the start moved, share of the route on roads
run twice against the share of the drawing drawn twice (TASK-071), routes
traced and time.
"""

from __future__ import annotations

import argparse
import sys
import time
from collections import Counter
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from route_engine.export_gpx import to_gpx
from route_engine.geo import LatLon, latlon_to_local_array
from route_engine.models import RouteRequest
from route_engine.network import BBox, Graph, OsmnxSource, crop, read_graph, twice_drawn
from route_engine.optimizer import ShapeNotDrawableError, plan_route, reach
from route_engine.projection import initial_scale
from route_engine.street_grid import StreetDirections
from route_engine.words import STYLES, compose

ZONES: dict[str, LatLon] = {
    "trento": (46.0671, 11.1214),
    "levico": (46.0122, 11.2986),
    "milano": (45.4642, 9.1900),
}


class CachedZones:
    """Graphs from the cache only: a zone's own file, or cropped in memory
    from a larger cached graph, never written back nor downloaded."""

    def __init__(self, cache_dir: Path) -> None:
        self.source = OsmnxSource(cache_dir)
        self.loaded: list[Graph] = []

    def load(self, bbox: BBox) -> Graph:
        exact = self.source.cache_path(bbox)
        if exact.exists():
            graph = read_graph(exact)
        else:
            covering = self.source.covering_path(bbox)
            if covering is None:
                raise LookupError("zone not in the cache")
            graph = crop(read_graph(covering), bbox)
        self.loaded.append(graph)
        return graph


def route_graph(graphs: Sequence[Graph], nodes: Sequence[Any]) -> Graph:
    """The graph the route was traced on: the near zone or the far one."""
    pairs = list(zip(nodes, nodes[1:], strict=False))
    return next(g for g in graphs if all(g.has_edge(*pair) for pair in pairs))


def twice_share(graph: Graph, nodes: Sequence[Any]) -> float:
    """Share of the route's length on roads it runs twice or more."""
    runs = Counter(frozenset(pair) for pair in zip(nodes, nodes[1:], strict=False))
    lengths = {
        key: min(d["length"] for d in graph.get_edge_data(*tuple(key)).values())
        for key in runs
        if len(key) == 2
    }
    total = sum(lengths[k] * n for k, n in runs.items() if k in lengths)
    twice = sum(lengths[k] * n for k, n in runs.items() if k in lengths and n >= 2)
    return twice / total if total else 0.0


def drawn_twice_share(units: Sequence[tuple[float, float]]) -> float:
    """Share of a word's drawing that it draws twice."""
    xy = np.array(units)
    sides = np.hypot(*np.diff(xy, axis=0).T)
    return float(sides[twice_drawn(xy, near_m=1e-9)].sum() / sides.sum())


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cache-dir", type=Path, default=Path("../../data/cache"))
    parser.add_argument("--words", default="CIAO,BELLO,MAX")
    parser.add_argument("--zones", default=",".join(ZONES))
    parser.add_argument("--style", choices=sorted(STYLES), default="round")
    parser.add_argument("--distance", type=int, default=15000)
    parser.add_argument("--out-dir", type=Path, help="also write GPX samples here")
    parser.add_argument("--tag", default="TASK-077", help="sample prefix")
    parser.add_argument("--version", default="v1", help="sample version, e.g. v1")
    args = parser.parse_args(argv)

    print(
        f"{'case':<30} {'km':>11} {'sim':>5} {'height':>6} {'rot':>4}"
        f" {'streets':>11} {'move':>5} {'twice':>11} {'traces':>6} {'time':>5}"
    )
    for text in args.words.split(","):
        word = compose(text, style=args.style)
        shape = list(word.points)
        for zone in args.zones.split(","):
            case = f"{word.text.lower()}-{args.style}_{args.distance // 1000}km_{zone}"
            zones = CachedZones(args.cache_dir)
            request = RouteRequest(
                start=ZONES[zone], distance_m=args.distance, word=word.text
            )
            began = time.perf_counter()
            try:
                plan = plan_route(request, zones, style=args.style)
            except LookupError:
                print(f"{case:<30} skipped: zone not in the cache")
                continue
            except ShapeNotDrawableError as exc:
                print(f"{case:<30} no route: {exc}")
                continue
            took = time.perf_counter() - began
            assert plan.search is not None
            best = plan.search.best
            height = best.scale_m * word.height
            graph = route_graph(zones.loaded, best.route.nodes)
            origin = ZONES[zone]
            radius = reach(shape, word.phases) * initial_scale(shape, args.distance)
            start_xy = latlon_to_local_array(origin, np.array([best.placement.start]))
            around = StreetDirections(graph, origin).around(start_xy[0], radius)
            result = plan.result
            twice = twice_share(graph, best.route.nodes)
            km = f"{result.distance_m / 1000:.1f}/{args.distance / 1000:g}"
            print(
                f"{case:<30} {km:>11}"
                f" {result.similarity:>5.2f} {height:>5.0f}m"
                f" {best.rotation_deg % 360:>4.0f}"
                f" {','.join(f'{d % 360:.0f}' for d in around):>11}"
                f" {best.offset_m:>4.0f}m"
                f" {twice:>4.0%}/{drawn_twice_share(word.units):<4.0%}"
                f" {len(plan.search.attempts):>6} {took:>4.0f}s"
            )
            for warning in result.warnings:
                print(f"{'':<30} warning: {warning}")
            if args.out_dir is not None:
                path = args.out_dir / f"{args.tag}_{case}_{args.version}.gpx"
                if path.exists():
                    print(f"{'':<30} {path.name} exists: not overwritten")
                    continue
                when = datetime.now(UTC)
                name = f"{word.text} {args.distance // 1000} km {zone} {args.style}"
                path.write_text(to_gpx(result.points, name, when), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
