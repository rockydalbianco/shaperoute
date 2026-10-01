"""The crops in the zone cache: listed, and deleted only when asked
(TASK-136, ADR-0108).

python -m route_engine.prune_crops
python -m route_engine.prune_crops --delete

Until TASK-136 the CLI and the catalog script saved every crop of a cached
zone under its own name, a GraphML and a pickle of 3 to 170 MB for each new
start. The engine no longer does, and no longer needs them: a crop is a
cached graph whose area another cached graph contains, and is made again
from that one without the network. Without `--delete` nothing is deleted.
A crop goes only when a graph that stays contains it; the zones, the files
of named roads and OSMnx's `http` folder are never touched.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from route_engine.network import FOOT_NETWORK_NAME, BBox

# Cache names are rounded to 5 decimals (OsmnxSource.cache_path): the same
# tolerance as OsmnxSource.covering_path.
EPS = 1e-5


@dataclass(frozen=True)
class CachedGraph:
    path: Path  # the GraphML; its pickle, if any, sits beside it
    area: BBox

    @property
    def files(self) -> list[Path]:
        pickle = self.path.with_suffix(".pickle")
        return [self.path, pickle] if pickle.exists() else [self.path]

    @property
    def size(self) -> int:
        return sum(f.stat().st_size for f in self.files)


def cached_graphs(
    cache_dir: Path, network_name: str = FOOT_NETWORK_NAME
) -> list[CachedGraph]:
    """Every `<network>_<s>_<w>_<n>_<e>.graphml` in `cache_dir`, by name."""
    graphs = []
    for path in sorted(cache_dir.glob(f"{network_name}_*.graphml")):
        try:
            south, west, north, east = (float(p) for p in path.stem.split("_")[1:])
        except ValueError:
            continue
        graphs.append(CachedGraph(path, (south, west, north, east)))
    return graphs


def _contains(outer: BBox, inner: BBox) -> bool:
    s, w, n, e = outer
    south, west, north, east = inner
    return s <= south + EPS and w <= west + EPS and n >= north - EPS and e >= east - EPS


def _extent(area: BBox) -> float:
    south, west, north, east = area
    return (north - south) * (east - west)


def crops(graphs: Sequence[CachedGraph]) -> dict[CachedGraph, CachedGraph]:
    """Each crop, with the smallest graph that stays and contains it: the
    one the engine will crop it from.

    A graph that no larger graph contains stays. One that a larger graph
    contains is a crop, but only if a graph that stays contains it too:
    names rounded to 1e-5° could otherwise chain two crops past their zone.
    """

    def larger_container(graph: CachedGraph) -> bool:
        return any(
            _contains(other.area, graph.area)
            and _extent(other.area) > _extent(graph.area)
            for other in graphs
        )

    kept = [g for g in graphs if not larger_container(g)]
    found: dict[CachedGraph, CachedGraph] = {}
    for graph in graphs:
        if graph in kept:
            continue
        containers = [k for k in kept if _contains(k.area, graph.area)]
        if containers:
            found[graph] = min(containers, key=lambda k: _extent(k.area))
    return found


def delete(found: dict[CachedGraph, CachedGraph]) -> int:
    """Deletes the crops' files; the bytes freed."""
    freed = 0
    for graph in found:
        for path in graph.files:
            freed += path.stat().st_size
            path.unlink()
    return freed


def _gb(size: int) -> str:
    return f"{size / 1e9:.1f} GB"


def _crops(count: int) -> str:
    return f"{count} crop" if count == 1 else f"{count} crops"


def report(graphs: Sequence[CachedGraph], found: dict[CachedGraph, CachedGraph]) -> str:
    """How many graphs, how many crops, and inside which zones."""
    total = sum(g.size for g in graphs)
    lines = [f"{len(graphs)} graphs, {_gb(total)}"]
    if not found:
        return "\n".join([*lines, "No crops."])
    zones = sorted(set(found.values()), key=lambda z: z.path.name)
    lines.append(
        f"{_crops(len(found))}, {_gb(sum(g.size for g in found))}, "
        f"made again from {len(zones)} {'zone' if len(zones) == 1 else 'zones'}:"
    )
    for zone in zones:
        inside = [g for g, z in found.items() if z == zone]
        lines.append(
            f"  {_crops(len(inside)):>10}, {_gb(sum(g.size for g in inside)):>7}"
            f"  inside {zone.path.name}"
        )
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m route_engine.prune_crops",
        description=(
            "List the cached graphs that a larger cached graph contains; "
            "delete them with --delete."
        ),
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("data/cache"),
        help="where road graphs are cached (default: data/cache)",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="delete the crops (GraphML and pickle); without it, only list",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if not args.cache_dir.is_dir():
        print(f"error: {args.cache_dir} is not a folder", file=sys.stderr)
        return 2
    graphs = cached_graphs(args.cache_dir)
    found = crops(graphs)
    print(report(graphs, found))
    if found and args.delete:
        print(f"Deleted {_crops(len(found))}, {_gb(delete(found))} freed.")
    elif found:
        print("Nothing deleted: run again with --delete to delete them.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
