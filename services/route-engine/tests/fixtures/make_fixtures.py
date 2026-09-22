"""Regenerate the small real-graph fixtures. Needs internet; run by hand.

    python tests/fixtures/make_fixtures.py

Fixtures are versioned (ADR-0020): regenerate only on purpose, and note the
date in docs/MAPS.md, because OSM data changes over time.
"""

from __future__ import annotations

from pathlib import Path

import osmnx as ox

from route_engine.geo import local_to_latlon

FIXTURES = Path(__file__).parent
LEVICO = (46.0122, 11.2986)
HALF_SIDE_M = 500.0


def main() -> None:
    south, west = local_to_latlon(LEVICO, -HALF_SIDE_M, -HALF_SIDE_M)
    north, east = local_to_latlon(LEVICO, HALF_SIDE_M, HALF_SIDE_M)
    ox.settings.use_cache = False
    graph = ox.graph_from_bbox(bbox=(west, south, east, north), network_type="walk")
    path = FIXTURES / "levico_walk_1km.graphml"
    ox.save_graphml(graph, path)
    print(f"{path.name}: {len(graph)} nodes, {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
