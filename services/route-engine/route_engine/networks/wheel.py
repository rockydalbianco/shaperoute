"""The wheel network: a wheelchair or a stroller (TASK-414, ADR-0343).

The ways of the foot network (FOOT_FILTER, and what `foot_ways` drops: a
barrier closed to people on foot, a way closed to them) that can be pushed
on wheels: the network `wheelcalm` of the bench (docs/sports/wheelchair.md).

- Out: steps; a raised kerb (the node goes and cuts its way, as a locked
  gate on foot); a tagged incline steeper than 8 %; a rough surface
  (gravel, cobbles, sett, grass, dirt...) or a smoothness bad or worse;
  `wheelchair=no`; mountain paths (`sac_scale`); stiles, turnstiles and
  kissing gates; trunk, primary and secondary roads that do not tag a
  sidewalk (their sidewalks drawn apart are footways, kept).
- In: roads and footways, cycleways, pedestrian streets, untagged counted
  as paved; paths and tracks only when they tag a surface (or
  tracktype=grade1): untagged, in the mountains they are trails.
- `wheelchair=yes` or `designated` keeps a way, or a node, whatever the
  rest says.

Every way goes both ways, as on foot.
"""

from __future__ import annotations

import math
import re
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
from route_engine.networks.foot import (
    FOOT_FILTER,
    FOOT_NODE_TAGS,
    FOOT_WAY_TAGS,
    blocks_foot,
    closed_to_foot,
)

WHEEL_NETWORK_NAME = "wheel"
# The foot network's filter: the wheel network is the part of it pushed.
WHEEL_FILTER = FOOT_FILTER
SIDEWALK_TAGS = ("sidewalk", "sidewalk:both", "sidewalk:left", "sidewalk:right")
# The tags `rollable` and `blocks_wheels` read, kept besides OSMnx's own and
# the foot network's.
WHEEL_WAY_TAGS = (
    *FOOT_WAY_TAGS,
    "surface",
    "smoothness",
    "tracktype",
    "incline",
    "wheelchair",
    "kerb",
    "sac_scale",
    *SIDEWALK_TAGS,
)
WHEEL_NODE_TAGS = (*FOOT_NODE_TAGS, "kerb", "wheelchair")

ROADS = frozenset(
    {
        "residential",
        "living_street",
        "service",
        "unclassified",
        "road",
        "tertiary",
        "tertiary_link",
        "secondary",
        "secondary_link",
        "primary",
        "primary_link",
        "trunk",
        "trunk_link",
    }
)
# Roads with fast traffic: pushed only on a sidewalk they tag.
BIG_ROADS = frozenset(
    {
        "secondary",
        "secondary_link",
        "primary",
        "primary_link",
        "trunk",
        "trunk_link",
    }
)
CAR_FREE = frozenset({"cycleway", "footway", "pedestrian", "corridor", "elevator"})
# Ways pushed only when they tag a surface: untagged, they are trails.
UNPAVED_UNLESS_TAGGED = frozenset({"path", "track", "bridleway"})
ROUGH_SURFACE = frozenset(
    {
        "gravel",
        "pebblestone",
        "cobblestone",
        "sett",
        "unhewn_cobblestone",
        "grass",
        "grass_paver",
        "dirt",
        "earth",
        "ground",
        "mud",
        "sand",
        "woodchips",
        "rock",
        "stone",
        "unpaved",
        "stepping_stones",
        "scree",
        "shells",
        "snow",
        "ice",
    }
)
ROUGH_SMOOTHNESS = frozenset(
    {"bad", "very_bad", "horrible", "very_horrible", "impassable"}
)
WHEELS_ALLOWED = frozenset({"yes", "designated"})
SIDEWALK = frozenset({"both", "left", "right", "yes"})
# Barriers a wheelchair or a stroller does not pass.
BLOCKING_BARRIERS = frozenset(
    {"stile", "turnstile", "full-height_turnstile", "kissing_gate", "step"}
)
# A tagged incline steeper than this is out.
MAX_INCLINE = 0.08

_NUMBER = re.compile(r"^\s*(-?\d+(?:[.,]\d+)?)\s*(%|°)?\s*$")


def incline_grade(value: Any) -> float | None:
    """The grade of an `incline` tag (0.08 for "8%" or "-8%"), None when it
    gives no number (up, down, yes) or nothing."""
    if not isinstance(value, str):
        return None
    match = _NUMBER.match(value)
    if match is None:
        return None
    number = abs(float(match.group(1).replace(",", ".")))
    if match.group(2) == "°":
        return math.tan(math.radians(number))
    return number / 100.0


def _first(value: Any) -> Any:
    """OSMnx keeps a list when merged ways disagree: on an unsimplified
    graph it is rare, the first is enough."""
    return value[0] if isinstance(value, list) else value


def _tags(data: Mapping[str, Any]) -> dict[str, Any]:
    return {key: _first(value) for key, value in data.items()}


def rollable(tags: Mapping[str, Any]) -> bool:
    """Whether a wheelchair or a stroller is pushed on a way with these tags
    (ADR-0343)."""
    wheelchair = tags.get("wheelchair")
    if wheelchair == "no":
        return False
    if wheelchair in WHEELS_ALLOWED:
        return True
    highway = tags.get("highway")
    if highway == "steps" or closed_to_foot(tags) or tags.get("sac_scale"):
        return False
    if tags.get("smoothness") in ROUGH_SMOOTHNESS:
        return False
    grade = incline_grade(tags.get("incline"))
    if grade is not None and grade > MAX_INCLINE:
        return False
    if tags.get("kerb") == "raised":
        return False
    surface = tags.get("surface")
    if surface in ROUGH_SURFACE:
        return False
    if highway in BIG_ROADS:
        return bool({tags.get(key) for key in SIDEWALK_TAGS} & SIDEWALK)
    if highway in ROADS or highway in CAR_FREE:
        return True
    if highway in UNPAVED_UNLESS_TAGGED:
        if surface is not None:
            return True
        return highway == "track" and tags.get("tracktype") == "grade1"
    return False


def blocks_wheels(tags: Mapping[str, Any]) -> bool:
    """Whether a node with these tags stops a wheelchair or a stroller: what
    stops a person on foot (`blocks_foot`), a raised kerb, a stile, a
    turnstile, a kissing gate; `wheelchair` decides first."""
    wheelchair = tags.get("wheelchair")
    if wheelchair in WHEELS_ALLOWED:
        return False
    if wheelchair == "no":
        return True
    if tags.get("kerb") == "raised" or tags.get("barrier") in BLOCKING_BARRIERS:
        return True
    return blocks_foot(tags)


def wheel_ways(graph: Graph) -> Graph:
    """An unsimplified OSMnx graph made with network_type="walk", every way
    both ways, turned into the wheel network: the nodes that stop wheels and
    the ways not pushed dropped, then simplified as OSMnx does and named so
    (network.check_network). A node dropped cuts its way there."""
    import osmnx as ox

    graph.remove_nodes_from(
        [node for node, data in graph.nodes(data=True) if blocks_wheels(_tags(data))]
    )
    graph.remove_edges_from(
        [
            (u, v, k)
            for u, v, k, data in graph.edges(keys=True, data=True)
            if not rollable(_tags(data))
        ]
    )
    graph.remove_nodes_from(list(nx.isolates(graph)))
    # Counted on the ways downloaded: simplify_graph counts them again on
    # the ways kept.
    for _, node in graph.nodes(data=True):
        node.pop("street_count", None)
    graph = ox.simplify_graph(graph)
    graph.graph["network"] = WHEEL_NETWORK_NAME
    return graph


def download_wheel_graph(bbox: BBox, custom_filter: Filter) -> Graph:
    """The wheel network of `bbox` from Overpass, every piece of it.

    network_type="walk" keeps every way two-way, as on foot; the graph
    comes unsimplified, with WHEEL_WAY_TAGS and WHEEL_NODE_TAGS, so
    `wheel_ways` decides on each way and each node before the ways are
    joined into roads."""
    import osmnx as ox

    south, west, north, east = bbox
    with way_tags(WHEEL_WAY_TAGS), node_tags(WHEEL_NODE_TAGS):
        graph = ox.graph_from_bbox(
            bbox=(west, south, east, north),
            network_type="walk",
            custom_filter=custom_filter,
            # Every piece, as on foot: the largest is chosen area by area.
            retain_all=True,
            simplify=False,
        )
    return wheel_ways(graph)


NETWORK = Network(WHEEL_NETWORK_NAME, WHEEL_FILTER, download_wheel_graph)
