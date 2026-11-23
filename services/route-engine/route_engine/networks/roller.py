"""The roller network: inline skating (TASK-380, ADR-0324).

The smooth paved ways (docs/sports/roller.md, the network `roller` of the
bench): cycleways, footways, pedestrian streets and the roads up to the
tertiary ones, whose surface, when tagged, is smooth; paths and tracks only
when they tag a smooth surface (or tracktype=grade1). Never primary or
secondary roads, nor a way rough by its smoothness. inline_skates=no leaves
a way out, yes or designated keeps it whatever its surface says. A skater is
a person on foot (Codice della strada, art. 190): every way goes both ways,
and there is nothing to walk, skated or not passed (the user's choices of
2026-11-06).
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import networkx as nx

from route_engine.networks.base import BBox, Filter, Graph, Network, way_tags

ROLLER_NETWORK_NAME = "roller"
# Roads skated where their surface is smooth or untagged: no primary or
# secondary ones, their traffic is too fast.
ROLLER_ROADS = frozenset(
    {
        "residential",
        "living_street",
        "service",
        "unclassified",
        "road",
        "tertiary",
        "tertiary_link",
    }
)
# Ways without cars, skated as the roads.
CAR_FREE = frozenset({"cycleway", "footway", "pedestrian"})
# Ways skated only when they tag a smooth surface: untagged, they are dirt.
UNPAVED_UNLESS_TAGGED = frozenset({"path", "track", "bridleway"})
SMOOTH = frozenset(
    {
        "asphalt",
        "concrete",
        "concrete:plates",
        "paved",
        "paving_stones",
        "tartan",
        "rubber",
        "acrylic",
        "metal",
    }
)
ROUGH = frozenset({"bad", "very_bad", "horrible", "very_horrible", "impassable"})
NO_ENTRY = frozenset({"no", "private"})
ALLOWED = frozenset({"yes", "designated", "permissive", "destination"})
SKATES_ALLOWED = frozenset({"yes", "designated"})
# Two Overpass filters, as the bike network's (networks/bike.py): the roads,
# cycleways and tracks, closed when private; the ways for walking. Wider
# than `skateable`, which decides on the tags kept.
ROLLER_FILTER = [
    f'["highway"~"^({"|".join(sorted(ROLLER_ROADS | {"cycleway", "track"}))})$"]'
    '["area"!~"yes"]["access"!~"private"]["service"!~"private"]',
    '["highway"~"^(bridleway|footway|path|pedestrian)$"]["area"!~"yes"]',
]
# The tags `skateable` reads, kept on the edges besides OSMnx's own.
ROLLER_TAGS = ("surface", "smoothness", "tracktype", "foot", "inline_skates")


def closed(tags: Mapping[str, Any]) -> bool:
    """Whether a way is closed to people on foot: `foot=no`, or `access=no`
    or private without a `foot` tag that opens it."""
    return tags.get("foot") in NO_ENTRY or (
        tags.get("access") in NO_ENTRY and tags.get("foot") not in ALLOWED
    )


def skateable(tags: Mapping[str, Any]) -> bool:
    """Whether a skater may skate a way with these tags (ADR-0324)."""
    skates = tags.get("inline_skates")
    if skates == "no":
        return False
    if skates in SKATES_ALLOWED:
        return True
    if closed(tags) or tags.get("smoothness") in ROUGH:
        return False
    highway, surface = tags.get("highway"), tags.get("surface")
    if highway in ROLLER_ROADS or highway in CAR_FREE:
        return surface is None or surface in SMOOTH
    if highway in UNPAVED_UNLESS_TAGGED:
        if surface is not None:
            return surface in SMOOTH
        return highway == "track" and tags.get("tracktype") == "grade1"
    return False


def skate_ways(graph: Graph) -> Graph:
    """An unsimplified OSMnx graph made with network_type="walk", every way
    both ways, turned into the roller network: the ways a skater may not
    skate dropped, then simplified as OSMnx does and named so
    (network.check_network)."""
    import osmnx as ox

    graph.remove_edges_from(
        [
            (u, v, k)
            for u, v, k, data in graph.edges(keys=True, data=True)
            if not skateable(data)
        ]
    )
    graph.remove_nodes_from(list(nx.isolates(graph)))
    # Counted on the ways downloaded: simplify_graph counts them again on
    # the ways kept.
    for _, node in graph.nodes(data=True):
        node.pop("street_count", None)
    graph = ox.simplify_graph(graph)
    graph.graph["network"] = ROLLER_NETWORK_NAME
    return graph


def download_roller_graph(bbox: BBox, custom_filter: Filter) -> Graph:
    """The roller network of `bbox` from Overpass, every piece of it.

    network_type="walk" keeps every way two-way, as on foot; the graph
    comes unsimplified, with ROLLER_TAGS, so `skate_ways` decides on each
    way's own tags before the ways are joined into roads."""
    import osmnx as ox

    south, west, north, east = bbox
    with way_tags(ROLLER_TAGS):
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type="walk",
            custom_filter=custom_filter,
            retain_all=True,
            simplify=False,
        )
    return skate_ways(graph)


NETWORK = Network(ROLLER_NETWORK_NAME, ROLLER_FILTER, download_roller_graph)
