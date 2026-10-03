"""The zones the phone downloads and draws on (TASK-214, ADR-0177).

A zone travels as data only: gzipped JSON with the graph's nodes and edges,
all their attributes, and the named roads beside it. Not the server's pickle:
a pickle ties the NetworkX versions of server and phone (ADR-0104) and runs
code when it is read. The server writes one file beside each cached zone
(phone_zone_api.py); the phone keeps the files as they arrive and reads them
here. No FastAPI and no OSMnx: this module also runs in Pyodide.

The graph read back is the same graph, in the same order: nodes, each node's
successors and predecessors, the keys of parallel edges, every attribute and
its type. The engine's ties are broken by that order (ADR-0162).
"""

from __future__ import annotations

import gzip
import json
import os
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
from route_engine.network import BBox, Graph
from route_engine.sidewalks import NamedRoad
from shapely.geometry import LineString

from shaperoute_api.graphs import MapDataUnavailableError

FORMAT = "sgrava-zone"
VERSION = 1
SUFFIX = ".zone.json.gz"
# A value that is not plain JSON is written as a one-key object with a tag.
LINE = "$line"
TUPLE = "$tuple"

NOT_ON_PHONE = "this zone is not on the phone"


class ZoneFormatError(ValueError):
    """A file that is not a zone of this format and version."""


def zone_name(network: str, bbox: BBox) -> str:
    """The name of a zone, as OsmnxSource names its cache files."""
    south, west, north, east = bbox
    return f"{network}_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}"


def zone_bbox(path: Path) -> BBox | None:
    """The area in the name of a zone file, None if it is not one."""
    if not path.name.endswith(SUFFIX):
        return None
    parts = path.name[: -len(SUFFIX)].split("_")[1:]
    try:
        south, west, north, east = (float(p) for p in parts)
    except ValueError:
        return None
    return south, west, north, east


def write_zone(
    graph: Graph,
    names: Sequence[NamedRoad],
    network: str,
    bbox: BBox,
    path: Path,
) -> None:
    """Writes the zone at `path` whole or not at all: a phone never gets
    half a file."""
    if not isinstance(graph, nx.MultiDiGraph):
        raise TypeError(f"a zone is a MultiDiGraph, not {type(graph).__name__}")
    floats: dict[str, set[str]] = {"node": set(), "edge": set()}
    nodes = [[_value(n), _attrs(d, floats["node"])] for n, d in graph.nodes(data=True)]
    edges = [
        [_value(u), _value(v), _value(k), _attrs(graph.succ[u][v][k], floats["edge"])]
        for u, v in _edge_order(graph)
        for k in graph.succ[u][v]
    ]
    document = {
        "format": FORMAT,
        "version": VERSION,
        "network": network,
        "bbox": list(bbox),
        "graph": _attrs(graph.graph, set()),
        "float64": {scope: sorted(names) for scope, names in floats.items()},
        "nodes": nodes,
        "edges": edges,
        "names": [
            {"name": r.name, "points": [list(p) for p in r.points]} for r in names
        ],
    }
    text = json.dumps(document, ensure_ascii=False, separators=(",", ":"))
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with gzip.open(temporary, "wt", encoding="utf-8", compresslevel=6) as file:
            file.write(text)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def read_zone(path: Path) -> tuple[Graph, list[NamedRoad]]:
    with gzip.open(path, "rt", encoding="utf-8") as file:
        document = json.load(file)
    if document.get("format") != FORMAT or document.get("version") != VERSION:
        raise ZoneFormatError(f"{path.name} is not a {FORMAT} file of version 1")
    floats = {scope: set(names) for scope, names in document["float64"].items()}
    graph = nx.MultiDiGraph(**_read_attrs(document["graph"], set()))
    graph.add_nodes_from(
        (_read(n), _read_attrs(d, floats["node"])) for n, d in document["nodes"]
    )
    for u, v, k, d in document["edges"]:
        graph.add_edge(
            _read(u), _read(v), key=_read(k), **_read_attrs(d, floats["edge"])
        )
    names = [
        NamedRoad(row["name"], tuple((float(a), float(b)) for a, b in row["points"]))
        for row in document["names"]
    ]
    return graph, names


class PhoneZones:
    """The ZoneSource of ZoneGraphs on the phone: the zone files of one
    network in `directory`, read with `read` (pass it to ZoneGraphs). Nothing
    is downloaded here; the app downloads the files."""

    def __init__(self, directory: Path, network: str) -> None:
        self.directory = directory
        self.network = network
        self._names: dict[Path, list[NamedRoad]] = {}

    def cache_path(self, bbox: BBox) -> Path:
        return self.directory / f"{zone_name(self.network, bbox)}{SUFFIX}"

    def covering_path(self, bbox: BBox) -> Path | None:
        """Smallest zone file of this network whose area contains `bbox`."""
        south, west, north, east = bbox
        eps = 1e-5  # names are rounded to 5 decimals
        best: tuple[float, Path] | None = None
        for path in self.directory.glob(f"{self.network}_*{SUFFIX}"):
            area = zone_bbox(path)
            if area is None:
                continue
            s, w, n, e = area
            if (
                s <= south + eps
                and w <= west + eps
                and n >= north - eps
                and e >= east - eps
            ):
                size = (n - s) * (e - w)
                if best is None or size < best[0]:
                    best = (size, path)
        return None if best is None else best[1]

    def load(self, bbox: BBox) -> Graph:
        # ZoneGraphs calls it only when no file covers `bbox`: the server
        # draws that route (ADR-0177).
        raise MapDataUnavailableError(NOT_ON_PHONE)

    def read(self, path: Path) -> Graph:
        graph, names = read_zone(path)
        self._names = {path: names}
        return graph

    def named_roads(self, bbox: BBox, download: bool = False) -> list[NamedRoad]:
        """The names around `bbox`, from the zone that covers it, as
        OsmnxSource.named_roads gives them from its file."""
        path = self.covering_path(bbox)
        if path is None:
            return []
        if path not in self._names:
            self._names = {path: read_zone(path)[1]}
        south, west, north, east = bbox
        return [
            road
            for road in self._names[path]
            if any(
                south <= lat <= north and west <= lon <= east
                for lat, lon in road.points
            )
        ]


def _edge_order(graph: Graph) -> list[tuple[Any, Any]]:
    """The pairs (u, v) in an order that, added one after the other, gives
    every node its successors and its predecessors in the order `graph` has
    them. The order they were first added in is one such order, so one
    always exists."""
    before = nx.DiGraph()
    before.add_nodes_from((u, v) for u, v in graph.edges(keys=False))
    for u in graph:
        after = list(graph.succ[u])
        before.add_edges_from(
            ((u, a), (u, b)) for a, b in zip(after, after[1:], strict=False)
        )
    for v in graph:
        after = list(graph.pred[v])
        before.add_edges_from(
            ((a, v), (b, v)) for a, b in zip(after, after[1:], strict=False)
        )
    return list(nx.topological_sort(before))


def _attrs(data: dict[str, Any], floats: set[str]) -> dict[str, Any]:
    for name, value in data.items():
        if isinstance(value, np.float64):
            floats.add(name)
    return {name: _value(value) for name, value in data.items()}


def _value(value: Any) -> Any:
    if isinstance(value, bool | str | int | float) or value is None:
        # np.float64 is a float: written as one, read back as np.float64.
        return float(value) if isinstance(value, np.float64) else value
    if isinstance(value, np.bool_ | np.integer):
        return value.item()
    if isinstance(value, list):
        return [_value(v) for v in value]
    if isinstance(value, tuple):
        return {TUPLE: [_value(v) for v in value]}
    if isinstance(value, LineString):
        return {LINE: [list(c) for c in value.coords]}
    raise TypeError(f"a zone cannot hold a {type(value).__name__}")


def _read_attrs(data: dict[str, Any], floats: set[str]) -> dict[str, Any]:
    return {
        name: (
            np.float64(value)
            if name in floats and isinstance(value, float)
            else _read(value)
        )
        for name, value in data.items()
    }


def _read(value: Any) -> Any:
    if isinstance(value, list):
        return [_read(v) for v in value]
    if isinstance(value, dict):
        if LINE in value:
            return LineString(value[LINE])
        if TUPLE in value:
            return tuple(_read(v) for v in value[TUPLE])
    return value
