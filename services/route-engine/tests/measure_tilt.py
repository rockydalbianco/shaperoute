"""Measure shapes tilted up to 45° against the upright ones (TASK-232).

Not a test: it reads the zone graphs from data/cache/ and plans every case
with each variant of the tilt, one after the other on the same warm graph,
then prints one row per case and variant (docs/MAPS.md, «Forme inclinate»).

    python tests/measure_tilt.py                      # the reference cases
    python tests/measure_tilt.py --catalog --words --json out.json
    python tests/measure_tilt.py --from-json a.json b.json --gpx-dir ../../samples
    python tests/measure_tilt.py --catalog --shard 2/4   # every 4th case, from the 2nd

Variants:

- `before`: as before TASK-232, at most 15° (ADR-0038), block words along
  the streets at most 30°, no tilt cost;
- `after`: the engine as it is (ADR-0195): upright first, the tilts beyond
  only when that gives no good route;
- `after@0.08`: with another TILT_FIT_PENALTY;
- `after+20`: with another TILTED_TRACES.

Columns: similarity, distance ratio, whether the route is good (both
thresholds), the rotation of the result, the routes traced, and time.
With --json the rows also hold the points, for the pages that show the
samples turned as the app shows them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from collections.abc import Callable, Iterator, Sequence
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from measure_better import todo
from measure_snapping import ZONES

from route_engine import optimizer
from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import RouteRequest
from route_engine.network import OsmnxSource, snap_to_network
from route_engine.optimizer import (
    FAR_OFFSET_M,
    SHAPE_POINTS,
    ShapeNotDrawableError,
    plan_route,
    required_area,
    zone_area,
)
from route_engine.projection import project_shape
from route_engine.shapes import SUPPORTED_SHAPES, get_shape
from route_engine.words import compose


@contextmanager
def variant(name: str) -> Iterator[None]:
    """The optimizer's constants as `name` has them, then back."""
    keys = ("MAX_TILT_DEG", "GRID_MAX_TILT_DEG", "TILT_FIT_PENALTY", "W_TILT")
    keep = {key: getattr(optimizer, key) for key in (*keys, "TILTED_TRACES")}
    changes: dict[str, Any] = {}
    name, _, traces = name.partition("+")
    name, _, penalty = name.partition("@")
    if traces:
        changes["TILTED_TRACES"] = int(traces)
    if penalty:
        share = float(penalty)
        changes |= {"TILT_FIT_PENALTY": share, "W_TILT": optimizer.W_SHAPE * share}
    if name == "before":
        changes = {
            "MAX_TILT_DEG": 15.0,
            "GRID_MAX_TILT_DEG": 30.0,
            "TILT_FIT_PENALTY": 0.0,
            "W_TILT": 0.0,
        }
    elif name != "after":
        raise ValueError(f"unknown variant {name!r}")
    for key, value in changes.items():
        setattr(optimizer, key, value)
    try:
        yield
    finally:
        for key, value in keep.items():
            setattr(optimizer, key, value)


def _digest(points: Sequence[tuple[float, float]]) -> str:
    text = repr([(round(a, 9), round(b, 9)) for a, b in points])
    return hashlib.sha256(text.encode()).hexdigest()[:12]


def measure(
    source: OsmnxSource, zone: str, drawn: str, distance: int, variants: Sequence[str]
) -> Iterator[dict[str, Any]]:
    start = ZONES[zone]
    name = f"{drawn}_{distance // 1000}km_{zone}"
    word = None if drawn in SUPPORTED_SHAPES else compose(drawn)
    points = list(word.points) if word else get_shape(drawn)(SHAPE_POINTS)
    area = required_area(points, start, distance, word=word)
    if not source.is_cached(area):
        yield {"case": name, "skipped": "not cached"}
        return
    # Read and trace once on both zones, the start's and the far one, before
    # any clock starts: what is kept per graph (TASK-203) is then there for
    # the first variant as for the others.
    for bbox in (area, zone_area(points, start, distance, FAR_OFFSET_M, word)):
        if source.is_cached(bbox):
            ring = project_shape(get_shape("circle")(16), start, 50.0)
            snap_to_network(source.load(bbox), ring)
    asked = {"word" if word else "shape": drawn}
    request = RouteRequest(start=start, distance_m=distance, **asked)
    for v in variants:
        row: dict[str, Any] = {"case": name, "variant": v, "zone": zone}
        row.update(drawn=drawn, distance_m=distance)
        t0 = time.perf_counter()
        with variant(v):
            try:
                plan = plan_route(request, source)
            except ShapeNotDrawableError as exc:
                row["skipped"] = f"not drawable: {exc}"
                yield row
                continue
        found = plan.far if plan.far is not None else plan.search
        result = plan.result
        traced = len(plan.search.attempts) if plan.search else 0
        if plan.far is not None:
            traced += len(plan.far.attempts)
        row.update(
            similarity=round(result.similarity, 3),
            ratio=round(result.distance_m / distance, 3),
            good=bool(found and found.converged),
            rotation_deg=result.rotation_deg,
            traced=traced,
            seconds=round(time.perf_counter() - t0, 1),
            digest=_digest(result.points),
            points=[list(p) for p in result.points],
            walks=[list(w) for w in result.walks],
            warnings=result.warnings,
        )
        yield row


def write_gpx(row: dict[str, Any], out_dir: Path, task: str, tag: str) -> Path:
    path = out_dir / f"{task}_{row['case']}_{tag}.gpx"
    created = datetime.now(UTC).replace(microsecond=0)
    name = route_name(row["drawn"], row["distance_m"], created)
    points = [(float(p[0]), float(p[1])) for p in row["points"]]
    walks = [(int(a), int(b)) for a, b in row["walks"]]
    path.write_text(to_gpx(points, name, created, walks), encoding="utf-8")
    return path


def write_samples(
    rows: list[dict[str, Any]], out_dir: Path, task: str, tags: dict[str, str]
) -> list[Path]:
    """The GPX samples of the cases whose route the variants of `tags`
    changed, one per variant, and ``<task>_rotations.json`` beside them with
    the rotation of those of `after`, the engine as it is: the app turns
    their map (tools/preview_turned.py reads it). The others are shown as
    the app of before TASK-232 shows them, north-up."""
    by_case: dict[str, dict[str, dict[str, Any]]] = {}
    for r in rows:
        if "variant" in r and "skipped" not in r and r["variant"] in tags:
            by_case.setdefault(r["case"], {})[r["variant"]] = r
    written: list[Path] = []
    rotations_path = out_dir / f"{task}_rotations.json"
    rotations: dict[str, float] = {}
    if rotations_path.exists():
        rotations = json.loads(rotations_path.read_text(encoding="utf-8"))
    for case in by_case.values():
        if len(case) < len(tags) or len({r["digest"] for r in case.values()}) == 1:
            continue  # not drawn by every variant, or the same route
        for v, row in case.items():
            path = write_gpx(row, out_dir, task, tags[v])
            if v == "after":
                rotations[path.stem] = row["rotation_deg"]
            written.append(path)
    text = json.dumps(dict(sorted(rotations.items())), indent=1)
    rotations_path.write_text(text + "\n", encoding="utf-8")
    return written


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cache-dir", type=Path, default=Path("../../data/cache"))
    parser.add_argument("--catalog", action="store_true")
    parser.add_argument("--words", action="store_true")
    parser.add_argument("--only", help="substring of the case name, e.g. levico")
    parser.add_argument("--variants", default="before,after")
    parser.add_argument(
        "--shard", default="1/1", help="this share of the cases, e.g. 2/4"
    )
    parser.add_argument("--json", type=Path, help="also write the rows here")
    parser.add_argument(
        "--gpx-dir",
        type=Path,
        help="also write here the GPX samples of the cases the variants changed",
    )
    parser.add_argument(
        "--from-json",
        type=Path,
        nargs="+",
        help="read the rows of an earlier run instead of planning again",
    )
    parser.add_argument("--task", default="TASK-232")
    parser.add_argument(
        "--tags",
        default="before:v1,after:v2",
        help="sample version of each variant written, e.g. before:v1,after:v2",
    )
    args = parser.parse_args(argv)
    variants = args.variants.split(",")
    tags = dict(pair.split(":") for pair in args.tags.split(","))
    rows: list[dict[str, Any]] = []
    if args.from_json:
        for path in args.from_json:
            rows += json.loads(path.read_text(encoding="utf-8"))
        if args.gpx_dir is not None:
            written = write_samples(rows, args.gpx_dir, args.task, tags)
            print(f"Wrote {len(written)} samples in {args.gpx_dir}")
        _summary(rows, variants)
        return 0
    source = OsmnxSource(args.cache_dir)
    show: Callable[[dict[str, Any]], str] = lambda r: (  # noqa: E731
        f"{r['case']:<26} {r['variant']:<8} {r['similarity']:.2f}"
        f" {r['ratio']:4.2f}x {'ok' if r['good'] else 'no'}"
        f" {r['rotation_deg']:+5.0f}°  {r['traced']:2d} traced"
        f" {r['seconds']:5.1f}s  {r['digest']}"
    )
    shard, shards = (int(n) for n in args.shard.split("/"))
    for k, (zone, drawn, distance) in enumerate(todo(args.catalog, args.words)):
        if args.only and args.only not in f"{drawn}_{distance // 1000}km_{zone}":
            continue
        if k % shards != shard - 1:
            continue
        for row in measure(source, zone, drawn, distance, variants):
            rows.append(row)
            if "skipped" in row:
                print(
                    f"{row['case']:<26} {row.get('variant', '')}"
                    f" {row['skipped'][:90]}",
                    flush=True,
                )
                continue
            print(show(row), flush=True)
        if args.json is not None:
            args.json.write_text(json.dumps(rows), encoding="utf-8")
    if args.gpx_dir is not None:
        written = write_samples(rows, args.gpx_dir, args.task, tags)
        print(f"Wrote {len(written)} samples in {args.gpx_dir}")
    _summary(rows, variants)
    return 0


def _summary(rows: list[dict[str, Any]], variants: Sequence[str]) -> None:
    by_case: dict[str, dict[str, dict[str, Any]]] = {}
    for r in rows:
        if "variant" in r and "skipped" not in r:
            by_case.setdefault(r["case"], {})[r["variant"]] = r
    both = [c for c in by_case.values() if all(v in c for v in variants)]
    print(f"\n{len(both)} cases drawn by every variant")
    for v in variants:
        sims = [c[v]["similarity"] for c in both]
        secs = [c[v]["seconds"] for c in both]
        good = sum(c[v]["good"] for c in both)
        tilted = sum(abs(c[v]["rotation_deg"]) > 15.0 + 1e-9 for c in both)
        if not both:
            continue
        line = (
            f"{v:<8} similarity {sum(sims) / len(both):.3f}  good {good}"
            f"  beyond 15° {tilted}  mean {sum(secs) / len(both):.1f}s"
        )
        if v != variants[0]:
            base = variants[0]
            worse = sum(c[v]["similarity"] < c[base]["similarity"] - 1e-9 for c in both)
            same = sum(c[v]["digest"] == c[base]["digest"] for c in both)
            line += f"  worse than {base} {worse}  same route {same}"
        print(line)


if __name__ == "__main__":
    sys.exit(main())
