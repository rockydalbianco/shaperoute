"""A zone graph cropped many times, fast (TASK-087, ADR-0082).

`network.crop` goes through NetworkX subgraph views twice: once to find the
largest connected piece, once to copy it. On a zone as dense as Milan that
takes seconds, at every request of the API. `ZoneCrop` gives the same graph
from the zone's own dicts: the same nodes and edges in the same order, with
their own attribute dicts, so the engine may change it (the sink node of
`_route_through_zones`) and the zone stays as it was read.

The order matters: the routes depend on it wherever two roads cost the
same. It follows what NetworkX does in `crop`, step by step; the tests
compare the two, and a NetworkX that changes its order makes them fail.
"""

from __future__ import annotations

from typing import Any

import networkx as nx
import numpy as np

from route_engine.network import BBox, Graph, crop


class ZoneCrop:
    """A zone graph and what cropping it needs, worked out once.

    The zone must not change afterwards. Crops of the same zone may be made
    from several threads at once: the zone is only read.
    """

    def __init__(self, zone: Graph) -> None:
        self.zone = zone
        self._ids = list(zone.nodes)
        self._lat = np.array([d["y"] for d in zone.nodes.values()], dtype=float)
        self._lon = np.array([d["x"] for d in zone.nodes.values()], dtype=float)
        # The most neighbours a node has, in either direction: below half of
        # it the views of `network.crop` list the neighbours in another order.
        self._most_neighbours = max(
            (max(len(zone._succ[n]), len(zone._pred[n])) for n in self._ids),
            default=0,
        )

    def crop(self, bbox: BBox) -> Graph:
        """What `network.crop(zone, bbox)` gives, node for node and edge for
        edge, in the same order."""
        zone = self.zone
        south, west, north, east = bbox
        rows = np.flatnonzero(
            (south <= self._lat)
            & (self._lat <= north)
            & (west <= self._lon)
            & (self._lon <= east)
        )
        ids = self._ids
        inside = set(zone.nbunch_iter([ids[i] for i in rows.tolist()]))
        if 2 * len(inside) < self._most_neighbours or not inside:
            return crop(zone, bbox)  # too few nodes for the order kept here
        piece = _largest_piece(zone, inside)
        if 2 * len(piece) < self._most_neighbours:
            return crop(zone, bbox)
        kept = set(zone.nbunch_iter(piece))
        nodes = _in_view_order(zone, kept)

        zone_node, zone_succ = zone._node, zone._succ
        node = {n: dict(zone_node[n]) for n in nodes}
        succ: dict[Any, dict[Any, dict[Any, dict[str, Any]]]] = {}
        pred: dict[Any, dict[Any, dict[Any, dict[str, Any]]]] = {n: {} for n in nodes}
        for u in nodes:
            out = {}
            for v, keys in zone_succ[u].items():
                if v in kept and keys:
                    # One dict for u→v, shared by both directions of the
                    # adjacency, as in any MultiDiGraph.
                    out[v] = pred[v][u] = {k: dict(d) for k, d in keys.items()}
            succ[u] = out
        graph: Graph = zone.__class__()
        graph.graph.update(zone.graph)
        graph._node.update(node)
        graph._succ.update(succ)
        graph._pred.update(pred)
        nx._clear_cache(graph)
        return graph


def _in_view_order(zone: Graph, shown: set[Any]) -> list[Any]:
    """The nodes of `zone.subgraph(shown)` in the order the view lists them
    (NetworkX's FilterAtlas): the set's own order when it holds less than
    half of the zone, else the zone's."""
    if 2 * len(shown) < len(zone):
        return list(shown)
    return [n for n in zone._node if n in shown]


def _largest_piece(zone: Graph, inside: set[Any]) -> set[Any]:
    """`max(nx.weakly_connected_components(zone.subgraph(inside)), key=len)`:
    the pieces in the same order, so the first of the largest ones, and each
    piece a set filled in the same order (the order its nodes come out in
    depends on it)."""
    succ, pred = zone._succ, zone._pred
    best: set[Any] = set()
    visited: set[Any] = set()
    for source in _in_view_order(zone, inside):
        if source in visited:
            continue
        if len(best) >= len(inside) - len(visited):
            break  # no later piece can be larger than the largest so far
        seen = {source}
        level = [source]
        while level:
            this_level, level = level, []
            for v in this_level:
                for w, keys in succ[v].items():
                    if w in inside and keys and w not in seen:
                        seen.add(w)
                        level.append(w)
                for w, keys in pred[v].items():
                    if w in inside and keys and w not in seen:
                        seen.add(w)
                        level.append(w)
        visited |= seen
        if len(seen) > len(best):
            best = seen
    return best
