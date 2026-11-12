"""Bike drawings for the Explore catalogue (TASK-441 B2, ADR-0366).

The catalogue of TASK-419 is drawn on foot, 5 to 21 km. This tool adds the
same shapes by bike, 20 to 30 km (the engine's limit for a ride), on the
bike network, from the squares of the same cities:

    python tools/catalog_bike.py --plan                # the cases, no engine
    python tools/catalog_bike.py --run                 # from the zones in the cache
    python tools/catalog_bike.py --run --downloads 5   # and five cities' zones more
    python tools/catalog_bike.py --page out/bike.html  # what the user looks at
    python tools/catalog_bike.py --propose             # the keys to keep
    python tools/catalog_bike.py --write               # catalog/seed, every log

A run is a line of ``out/TASK-441/bike.jsonl`` as catalog_seed's, with
``activity``; the filter is catalog_seed's own (`reasons`). Nothing here
invents a coordinate: the engine plans, this tool asks, measures and chooses.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
import time
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import catalog_seed as cs
import catalog_words as cw

ACTIVITY = "cycling"
# The engine draws a ride from 10 to 30 km (activities/cycling.py): the
# catalogue takes the long end, what a run does not have.
DISTANCES_M: tuple[int, ...] = (30_000, 25_000, 20_000)
# The shapes that read on a city's roads (catalog_seed.CORE_SHAPES) and the
# animals: at this size every one has room.
SHAPES: tuple[str, ...] = (
    *cs.CORE_SHAPES,
    "horse",
    "cat",
    "fish",
    "snail",
    "dog_head",
)
BIKE_LOG = cs.REPO_ROOT / "out" / "TASK-441" / "bike.jsonl"
SOURCE = "TASK-441 bike"
# No download: a closed local port, so a zone not in the cache fails at once.
CLOSED_OVERPASS = "http://127.0.0.1:9/api"


@dataclass(frozen=True)
class Case:
    city: cs.City
    shape: str
    distance_m: int

    @property
    def key(self) -> str:
        return bike_key(self.city.name, self.shape, self.distance_m)


def bike_key(city: str, shape: str, distance_m: int) -> str:
    """As catalog_seed's keys, the shape marked with the activity: never the
    key of the same shape on foot, and not a word's (catalog_words.is_word_key)."""
    return f"{city}/{shape}@{ACTIVITY}/{distance_m}"


def is_bike_key(key: str) -> bool:
    return key.split("/")[1].endswith(f"@{ACTIVITY}")


def distance_of(city_index: int, shape_index: int) -> int:
    """One distance a shape in a city, in turn: over the cities every shape
    is drawn at every distance, and a city has a third of its shapes at each."""
    return DISTANCES_M[(city_index + shape_index) % len(DISTANCES_M)]


def plan(names: Sequence[str] = ()) -> list[Case]:
    """Every case, city by city, the longest first (its zone holds the
    others'). `names` keeps only those cities; a city keeps its turn."""
    cases: list[Case] = []
    for i, city in enumerate(cs.CITIES):
        if names and city.name not in names:
            continue
        here = [Case(city, s, distance_of(i, j)) for j, s in enumerate(SHAPES)]
        cases += sorted(here, key=lambda c: (-c.distance_m, SHAPES.index(c.shape)))
    return cases


def todo(done: Iterable[str], names: Sequence[str] = ()) -> list[Case]:
    seen = set(done)
    return [c for c in plan(names) if c.key not in seen]


def reasons(run: cs.Run) -> list[str]:
    """Why a bike run stays out: catalog_seed's filter as it is (similarity,
    distance, road run twice beyond what the shape draws twice, no motorway
    or trunk)."""
    return cs.reasons(run)


def keep(bike_runs: Iterable[cs.Run], kept: Sequence[str]) -> list[str]:
    """The keys to keep: those kept that are not by bike, as they are, then
    every bike run that passes the filter, by key. A second run of the same
    case replaces the first (the log is read last line wins)."""
    others = [k for k in kept if not is_bike_key(k)]
    last = {r["key"]: r for r in bike_runs}
    bike = sorted(k for k, r in last.items() if not reasons(r))
    return list(dict.fromkeys([*others, *bike]))


# --- The engine ----------------------------------------------------------------


def run(
    cases: Sequence[Case],
    log: Path,
    cache_dir: Path,
    *,
    downloads: int = 0,
    slot_wait_max_s: float = 3600,
    mirror: str | None = None,
    say: Callable[[str], None] = print,
) -> int:
    """Plans `cases` on the bike network as the API plans a ride and appends
    one line each to `log`, with `extra_doubled` and `road_shares` as
    catalog_seed measures them. A city whose zone is not in `cache_dir` is
    downloaded, one zone a city, while `downloads` last (after a free slot of
    Overpass); with none left its cases are planned on an older, tighter
    zone when there is one (what fails is tried again at the next run), or
    skipped and not logged. `mirror` is another Overpass to download from:
    it is not asked for a free slot (a mirror may have no status page), and
    the pause between two cities is the only rate limit. The engine is
    imported here. Returns how many cases were planned."""
    import numpy as np
    import osmnx as ox
    from route_engine.errors import ShapeNotDrawableError
    from route_engine.models import RouteRequest
    from route_engine.nearby_starts import ShapeJob, plan_nearby
    from route_engine.network import OsmnxSource, twice_drawn
    from route_engine.optimizer import SHAPE_POINTS, planned_distance, required_area
    from route_engine.seed_catalog import DECIMALS, NOT_DRAWABLE
    from route_engine.shapes import get_shape
    from route_engine.stops import union

    open_url = mirror or ox.settings.overpass_url
    source = OsmnxSource.for_activity(cache_dir, ACTIVITY)

    def overpass(is_open: bool) -> None:
        ox.settings.overpass_url = open_url if is_open else CLOSED_OVERPASS
        ox.settings.overpass_rate_limit = is_open and mirror is None
        ox.settings.requests_timeout = 180 if is_open else 5

    def area_of(case: Case) -> tuple[float, float, float, float]:
        outline = get_shape(case.shape)(SHAPE_POINTS)
        box: tuple[float, float, float, float] = required_area(
            outline, case.city.square, planned_distance(case.distance_m, False)
        )
        return box

    expected: dict[tuple[str, int], float] = {}

    def expected_doubled(case: Case) -> float:
        # As catalog_seed.run_cities: the share of its own length the shape
        # draws twice on purpose, at the size planned.
        at = (case.shape, case.distance_m)
        if at not in expected:
            xy = np.array(get_shape(case.shape)(SHAPE_POINTS), dtype=float)
            total = float(np.hypot(*np.diff(xy, axis=0).T).sum())
            if total == 0:
                expected[at] = 0.0
            else:
                xy = xy * (planned_distance(case.distance_m, False) / total)
                sides = np.hypot(*np.diff(xy, axis=0).T)
                expected[at] = float(sides[twice_drawn(xy)].sum() / sides.sum())
        return expected[at]

    def plan_one(case: Case, roads: dict[Any, str]) -> None:
        began = time.monotonic()
        row: dict[str, Any] = {
            "key": case.key,
            "city": case.city.name,
            "shape": case.shape,
            "activity": ACTIVITY,
            "distance_m": case.distance_m,
            "source": SOURCE,
        }
        try:
            request = RouteRequest(
                start=case.city.square,
                shape=case.shape,
                distance_m=case.distance_m,
                activity=ACTIVITY,  # type: ignore[arg-type]
            )
            result = plan_nearby(
                ShapeJob.of_request(request), case.city.square, source
            ).plan.result
        except ShapeNotDrawableError as exc:
            row.update(error_kind=NOT_DRAWABLE, error=str(exc))
        except Exception as exc:  # a nearby start out of the zone: next run
            row.update(error_kind=cs.FAILED, error=f"{type(exc).__name__}: {exc}"[:300])
        else:
            points = [
                [round(lat, DECIMALS), round(lon, DECIMALS)]
                for lat, lon in result.points
            ]
            latlon = [(lat, lon) for lat, lon in points]
            row.update(
                similarity=round(result.similarity, 4),
                route_m=round(result.distance_m),
                points=points,
                warnings=list(result.warnings),
                extra_doubled=round(
                    max(0.0, cs.doubled_share(latlon) - expected_doubled(case)), 4
                ),
                road_shares=cs.road_shares(latlon, roads),
                measured=cs.MEASURE_VERSION,
            )
            if result.rotation_deg:
                row["rotation_deg"] = round(result.rotation_deg, 2)
        row["seconds"] = round(time.monotonic() - began, 1)
        row["planned_at"] = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        cs.append_run(log, row)
        what = row.get("error_kind") or (
            f"similarity {row['similarity']:.2f}, retraced {row['extra_doubled']:.0%}"
        )
        say(f"{case.key}: {what}, {row['seconds']:.0f} s")

    by_city: dict[str, list[Case]] = {}
    for case in cases:
        by_city.setdefault(case.city.name, []).append(case)
    planned = 0
    overpass(False)
    for name, here in by_city.items():
        tight = union([area_of(c) for c in here])
        s, w, n, e = tight
        m = cs.ZONE_MARGIN_DEG
        # With the margin a nearby start has its roads too (catalog_seed).
        zone = (s - m, w - m, n + m, e + m)
        if not source.is_cached(zone):
            if downloads <= 0 or (
                mirror is None
                and slot_wait_max_s > 0
                and not cs.wait_for_slot(say=say, max_s=slot_wait_max_s)
            ):
                if not source.is_cached(tight):
                    say(f"{name}: no bike zone to use, {len(here)} cases skipped")
                    continue
                # An older zone, without the margin: what fails is tried
                # again when the whole zone may be downloaded.
                zone = tight
            else:
                box = tuple(round(x, 3) for x in zone)
                say(f"{name}: downloading the bike zone {box}")
                overpass(True)
                try:
                    source.load(zone)
                except Exception as exc:
                    say(f"{name}: zone not loaded ({type(exc).__name__}), skipped")
                    continue
                finally:
                    overpass(False)
                downloads -= 1
                time.sleep(cs.PAUSE_S)
        roads = cs.road_index(source.load(zone))  # one city's roads at a time
        for case in here:
            plan_one(case, roads)
            planned += 1
    return planned


# --- The page ------------------------------------------------------------------

PAGE_W, PAGE_H, PAGE_PAD = 720, 520, 28
PAGE = """<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title><style>
:root{--bg:#f6f5f1;--card:#fff;--ink:#1c1c1a;--soft:#6b6b66;--pen:#1f7a8c;
--out:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1f1f1d;
--ink:#f1f0ea;--soft:#a3a29b;--pen:#5cc8dc;--out:#ff8a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.45 -apple-system,system-ui,sans-serif}
main{max-width:1500px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:26px;margin:0 0 8px}h2{font-size:20px;margin:36px 0 4px}
h3{font-size:14px;font-weight:600;color:var(--soft);margin:20px 0 8px;
text-transform:uppercase;letter-spacing:.04em}
p.lead{color:var(--soft);max-width:70ch;margin:0 0 8px}
.grid{display:grid;gap:16px;
grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr))}
article{background:var(--card);border-radius:14px;padding:12px 14px 14px}
svg{display:block;width:100%;height:auto}
polyline{fill:none;stroke:var(--pen);stroke-width:4;stroke-linecap:round;
stroke-linejoin:round}
.name{display:flex;justify-content:space-between;gap:12px;align-items:baseline;
margin-top:6px}
.name b{font-size:19px}.name span{color:var(--soft);font-size:14px;text-align:right}
.why{color:var(--out);font-size:14px;margin:4px 0 0}
</style></head><body><main><h1>__TITLE__</h1>__BODY__</main></body></html>
"""
# In each band of a shape's sample: the least alike, the middle, the most.
PER_BAND = 2


def route_svg(run: cs.Run) -> str:
    """The route large, turned back as the app shows it (catalog_words._upright)."""
    xy = cw._upright(run)
    xs, ys = [p[0] for p in xy], [p[1] for p in xy]
    x0, y1 = min(xs), max(ys)
    w, h = max(max(xs) - x0, 1e-9), max(y1 - min(ys), 1e-9)
    k = min((PAGE_W - 2 * PAGE_PAD) / w, (PAGE_H - 2 * PAGE_PAD) / h)
    ox, oy = (PAGE_W - w * k) / 2, (PAGE_H - h * k) / 2
    coords = " ".join(f"{ox + (x - x0) * k:.1f},{oy + (y1 - y) * k:.1f}" for x, y in xy)
    return (
        f'<svg viewBox="0 0 {PAGE_W} {PAGE_H}" role="img">'
        f'<polyline points="{coords}"/></svg>'
    )


def _it(number: float, digits: int) -> str:
    return f"{number:.{digits}f}".replace(".", ",")


def _card(run: cs.Run) -> str:
    why = reasons(run)
    return (
        f'<article>{route_svg(run)}<div class="name">'
        f"<b>{html.escape(run['shape'])} · {html.escape(run['city'])}</b>"
        f"<span>{_it(run['route_m'] / 1000, 1)} km su {run['distance_m'] // 1000} · "
        f"somiglianza {_it(run['similarity'], 2)}</span></div>"
        + (f'<p class="why">{html.escape("; ".join(why))}</p>' if why else "")
        + "</article>"
    )


def sample(
    runs: Sequence[cs.Run], per_band: int = PER_BAND
) -> list[tuple[str, list[cs.Run]]]:
    """Of one shape's runs: the least alike, the middle ones and the most
    alike, `per_band` each; all of them when they are few. Not chosen by hand."""
    ranked = sorted(runs, key=lambda r: (r["similarity"], r["key"]))
    if len(ranked) <= 3 * per_band:
        return [("tutti, dal meno somigliante", ranked)]
    mid = len(ranked) // 2 - per_band // 2
    return [
        ("i meno somiglianti", ranked[:per_band]),
        ("quelli di mezzo", ranked[mid : mid + per_band]),
        ("i più somiglianti", ranked[-per_band:]),
    ]


def page(runs: Sequence[cs.Run], whole: bool = False) -> str:
    """What the user looks at before the bike drawings enter the catalogue:
    the count by distance, then shape by shape a large sample of those that
    pass (`sample`); with `whole` every run, the rejected ones with why."""
    last = {r["key"]: r for r in runs}
    drawn = [r for r in last.values() if cs.drawn(r)]
    passing = [r for r in drawn if not reasons(r)]
    rows = "".join(
        f"<tr><td>{d // 1000} km</td>"
        f"<td>{sum(1 for r in passing if r['distance_m'] == d)}</td>"
        f"<td>{sum(1 for r in drawn if r['distance_m'] == d)}</td></tr>"
        for d in sorted(DISTANCES_M)
    )
    body = (
        f'<p class="lead">{len(passing)} disegni in bici passano il filtro su '
        f"{len(drawn)} disegnati, in {len({r['city'] for r in passing})} città.</p>"
        "<table><tr><th>A</th><th>passano</th><th>disegnati</th></tr>"
        f"{rows}</table>"
    )
    shown = 0
    for shape in SHAPES:
        of_shape = [r for r in (drawn if whole else passing) if r["shape"] == shape]
        if not of_shape:
            continue
        body += f"<h2>{html.escape(shape)} · {len(of_shape)}</h2>"
        bands = (
            [("tutti", sorted(of_shape, key=lambda r: (r["similarity"], r["key"])))]
            if whole
            else sample(of_shape)
        )
        for label, band in bands:
            shown += len(band)
            cards = "".join(_card(r) for r in band)
            body += f'<h3>{label}</h3><div class="grid">{cards}</div>'
    title = f"Disegni in bici · {'tutti' if whole else 'campione grande'} ({shown})"
    return PAGE.replace("__TITLE__", html.escape(title)).replace("__BODY__", body)


# --- Command line ----------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python tools/catalog_bike.py",
        description="Bike drawings for the Explore catalogue (TASK-441 B2).",
    )
    p.add_argument("--plan", action="store_true", help="print the cases and stop")
    p.add_argument("--run", action="store_true", help="plan the cases not in the log")
    p.add_argument(
        "--downloads",
        type=int,
        default=0,
        help="how many cities' bike zones this run may download (default: none)",
    )
    p.add_argument(
        "--overpass-url", help="a mirror of Overpass instead of overpass-api.de"
    )
    p.add_argument("--page", type=Path, help="write the page of the sample here")
    p.add_argument("--whole", action="store_true", help="with --page: every run")
    p.add_argument("--propose", action="store_true", help="print the keys to keep")
    p.add_argument(
        "--write", action="store_true", help="rebuild catalog/seed from every log"
    )
    p.add_argument("--cities", nargs="*", default=[], help="only these cities")
    p.add_argument("--log", type=Path, default=BIKE_LOG)
    p.add_argument("--old-log", type=Path, default=cw.OLD_LOG)
    p.add_argument("--words-log", type=Path, default=cw.DEFAULT_LOG)
    p.add_argument("--pen-up-log", type=Path, default=cw.PEN_UP_LOG)
    p.add_argument("--kept", type=Path, default=cs.DEFAULT_KEPT)
    p.add_argument("--out", type=Path, default=cs.DEFAULT_SEED)
    p.add_argument("--cache-dir", type=Path, default=cs.DEFAULT_CACHE)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    unknown = [n for n in args.cities if n not in cs.BY_NAME]
    if unknown:
        print(f"unknown city: {', '.join(unknown)}", file=sys.stderr)
        return 2
    cases = todo(cs.done_keys(cs.read_runs(args.log)), args.cities)
    if args.plan:
        for c in cases:
            print(c.key)
        print(f"{len(cases)} bike cases", file=sys.stderr)
        return 0
    if args.run:
        planned = run(
            cases,
            args.log,
            args.cache_dir,
            downloads=args.downloads,
            mirror=args.overpass_url,
        )
        print(f"{planned} bike cases planned")
    runs = cs.read_runs(args.log)
    if args.page:
        args.page.write_text(page(runs, args.whole), encoding="utf-8")
    if args.propose:
        print(json.dumps({"kept": keep(runs, cs.read_kept(args.kept))}, indent=1))
        return 0
    if args.write:
        kept = cs.read_kept(args.kept)
        logs = cs.read_logs([args.old_log, args.words_log, args.pen_up_log, args.log])
        cs.write_files(cs.city_files(logs, kept), args.out)
        print(cs.summary(logs, kept), file=sys.stderr)
        return 0
    last = {r["key"]: r for r in runs}
    passing = sum(1 for r in last.values() if not reasons(r))
    print(f"{passing} pass of {len(last)} drawn by bike", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
