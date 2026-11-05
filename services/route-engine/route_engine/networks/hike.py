"""The hike network: hikes (TASK-377, ADR-0321).

The foot network without the roads cars use (trunk, primary, secondary,
tertiary and their links) and without the trails beyond sac_scale T3,
"demanding mountain hiking": alpine routes stay out (the user's choices of
2026-11-05). Nor via ferratas, climbs with a harness whatever their grade,
which the foot network keeps: a few km in the mountains of the bench. Away
from towns it is mostly tracks and paths. Every way goes both ways, as on
foot.
"""

from __future__ import annotations

from route_engine.networks.base import BBox, Filter, Graph, Network
from route_engine.networks.foot import download_foot_graph

HIKE_NETWORK_NAME = "hike"
# The roads cars use, left out; unanchored, so their links go too.
CAR_ROADS = "trunk|primary|secondary|tertiary"
# A climb on fixed cables, never a hike (decided by the agent on the user's
# behalf: the user chose trails up to T3).
CLIMBS = "via_ferrata"
# The grades of sac_scale beyond T3 (T4 to T6).
ALPINE = "alpine_hiking|demanding_alpine_hiking|difficult_alpine_hiking"
# FOOT_FILTER with CAR_ROADS and CLIMBS among the ways left out, and ALPINE.
HIKE_FILTER = (
    '["highway"]["area"!~"yes"]["access"!~"private"]'
    '["highway"!~"abandoned|bus_guideway|construction|motor|no|planned|platform'
    f'|proposed|raceway|razed|rest_area|services|{CAR_ROADS}|{CLIMBS}"]'
    '["foot"!~"no"]["service"!~"private"]["sidewalk"!~"separate"]'
    '["sidewalk:both"!~"separate"]["sidewalk:left"!~"separate"]'
    '["sidewalk:right"!~"separate"]'
    f'["sac_scale"!~"{ALPINE}"]'
)


def download_hike_graph(bbox: BBox, custom_filter: Filter) -> Graph:
    """The hike network of `bbox` from Overpass, every piece of it, two-way
    as the foot network, and named so (network.check_network)."""
    graph = download_foot_graph(bbox, custom_filter)
    graph.graph["network"] = HIKE_NETWORK_NAME
    return graph


NETWORK = Network(HIKE_NETWORK_NAME, HIKE_FILTER, download_hike_graph)
