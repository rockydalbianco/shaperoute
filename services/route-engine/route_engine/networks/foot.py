"""The foot network: runs and walks (ADR-0022, ADR-0054, ADR-0349).

The ways FOOT_FILTER asks Overpass for, less what stops a person on foot
and Overpass cannot tell apart: a barrier node closed to people on foot (a
locked or private gate, a fence drawn across the way; `blocks_foot`) and a
way closed to them (`access=no` with no `foot` tag that opens it,
`foot=private`; `closed_to_foot`). The graph comes unsimplified with the
tags these rules read, the nodes and ways they drop go, then OSMnx joins
the ways into roads as it did before (TASK-421).
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import networkx as nx

from route_engine.networks.base import (
    BBox,
    Filter,
    Graph,
    Network,
    node_tags,
    way_tags,
)

# OSMnx 2.1 "walk" filter without its `cycleway` exclusion: in Trentino most
# cycle paths are shared with pedestrians (ADR-0022). The name keeps these
# graphs apart from the plain "walk" ones cached by TASK-014.
FOOT_NETWORK_NAME = "foot"
FOOT_FILTER = (
    '["highway"]["area"!~"yes"]["access"!~"private"]'
    '["highway"!~"abandoned|bus_guideway|construction|motor|no|planned|platform'
    '|proposed|raceway|razed|rest_area|services"]'
    '["foot"!~"no"]["service"!~"private"]["sidewalk"!~"separate"]'
    '["sidewalk:both"!~"separate"]["sidewalk:left"!~"separate"]'
    '["sidewalk:right"!~"separate"]'
)
# The tags of the nodes `blocks_foot` reads, kept on the nodes besides
# OSMnx's own; and of the ways `closed_to_foot` reads (`access` is OSMnx's).
FOOT_NODE_TAGS = ("barrier", "access", "foot", "locked")
FOOT_WAY_TAGS = ("foot",)
NO_ENTRY = frozenset({"no", "private"})
# A `foot` tag that opens a way or a barrier whatever `access` says.
FOOT_OPEN = frozenset({"yes", "designated", "permissive", "destination"})
# A fence or a wall drawn as a node of the way: nothing passes.
SOLID = frozenset({"fence", "wall"})
# Barriers that stop cars or slow bikes, stepped over or walked around on
# foot: their `access` speaks of vehicles (a bollard with `access=no` is for
# cars). Only a `foot` tag closes them.
PASSED_ON_FOOT = frozenset(
    {
        "bollard",
        "kerb",
        "cycle_barrier",
        "block",
        "kissing_gate",
        "stile",
        "cattle_grid",
        "log",
        "planter",
        "chain",
        "rope",
        "height_restrictor",
        "motorcycle_barrier",
        "jersey_barrier",
        "sump_buster",
        "bus_trap",
        "debris",
    }
)


def blocks_foot(tags: Mapping[str, Any]) -> bool:
    """Whether a node with these tags stops a person on foot: a barrier
    closed to them. `foot` decides first; else a fence or a wall, and a gate
    (or any barrier not in PASSED_ON_FOOT) that is `access=no`, private or
    `locked=yes`. A plain gate, a kissing gate, a bollard pass (ADR-0349)."""
    barrier = tags.get("barrier")
    if barrier is None:
        return False
    foot = tags.get("foot")
    if foot in NO_ENTRY:
        return True
    if foot in FOOT_OPEN:
        return False
    if barrier in SOLID:
        return True
    if barrier in PASSED_ON_FOOT:
        return False
    return tags.get("access") in NO_ENTRY or tags.get("locked") == "yes"


def closed_to_foot(tags: Mapping[str, Any]) -> bool:
    """Whether a way with these tags is closed to people on foot: `foot=no`
    or private, or `access=no` or private without a `foot` tag that opens
    it. FOOT_FILTER already leaves out `foot=no` and `access=private`."""
    foot = tags.get("foot")
    if foot in NO_ENTRY:
        return True
    if foot in FOOT_OPEN:
        return False
    return tags.get("access") in NO_ENTRY


def foot_ways(graph: Graph) -> Graph:
    """An unsimplified OSMnx graph made with network_type="walk" and
    FOOT_NODE_TAGS, every way both ways, turned into the foot network: the
    nodes that block people on foot and the ways closed to them dropped,
    then simplified as OSMnx does. A node dropped cuts the way there: the
    road ends at the gate on both sides."""
    import osmnx as ox

    graph.remove_nodes_from(
        [node for node, data in graph.nodes(data=True) if blocks_foot(data)]
    )
    graph.remove_edges_from(
        [
            (u, v, k)
            for u, v, k, data in graph.edges(keys=True, data=True)
            if closed_to_foot(data)
        ]
    )
    graph.remove_nodes_from(list(nx.isolates(graph)))
    if graph.graph.get("simplified"):
        # Handed in already simplified (a graph read from a file stands in
        # for the download in the tests): its ways are roads already.
        return graph
    # Counted on the ways downloaded: simplify_graph counts them again on
    # the ways kept.
    for _, node in graph.nodes(data=True):
        node.pop("street_count", None)
    return ox.simplify_graph(graph)


def download_foot_graph(bbox: BBox, custom_filter: Filter) -> Graph:
    """The foot network of `bbox` from Overpass, every piece of it."""
    import osmnx as ox

    south, west, north, east = bbox
    # network_type="walk" keeps every edge two-way: one-way
    # streets do not bind pedestrians. The filter picks the ways; the
    # graph comes unsimplified, with the tags `foot_ways` reads, so a
    # barrier is still a node of its own when it is judged.
    with way_tags(FOOT_WAY_TAGS), node_tags(FOOT_NODE_TAGS):
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type="walk",
            custom_filter=custom_filter,
            # Without it OSMnx keeps the largest piece of the whole
            # zone, and an island with fewer roads than the mainland
            # beside it is left with none: Venice (ADR-0148). The
            # largest piece is chosen area by area, in `crop`.
            retain_all=True,
            simplify=False,
        )
    return foot_ways(graph)


NETWORK = Network(FOOT_NETWORK_NAME, FOOT_FILTER, download_foot_graph)
