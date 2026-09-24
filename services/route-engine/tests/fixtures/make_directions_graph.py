"""Regenerate directions_junctions.graphml, the made-up graph of the
directions tests (TASK-047). No internet needed; run by hand:

    python tests/fixtures/make_directions_graph.py

Nodes are placed in metres east (x) and north (y) of ORIGIN. Every road is
two-way, an edge each way, as in the foot graphs:

- T, a T junction: Via Roma from W, on to E; Via Verdi north to P.
  Via Roma bends 90° half-way to E, 150 m from both, beyond
  HEADING_PROBE_M: seen from T it goes straight on, its chord does not.
- P, two roads only, like a node left by a cut: Via Verdi turns 90° east
  to Q. Q, two roads only: Via Verdi becomes Via Bianchi, on to R.
- E, three roads: Via Roma arrives heading south and goes on straight as
  Corso Italia to F; a footway with no name goes east to S.
- F, four roads: Corso Italia goes on south as one simplified edge named
  both "Corso Italia" and "Viale Dante" to G; west, a road with only a
  ref, SP12, to H; Via Gialli to K, 30° east of north: a sharp left.
- S, a fork: the footway splits into two footways with no name, 20° left
  and 20° right of straight ahead, to U1 and U2.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import networkx as nx
import osmnx as ox
from shapely.geometry import LineString

from route_engine.geo import local_to_latlon, path_length_m

FIXTURES = Path(__file__).parent
ORIGIN = (46.0, 11.0)


def _towards(x: float, y: float, bearing_deg: float, m: float) -> tuple[float, float]:
    b = math.radians(bearing_deg)
    return round(x + m * math.sin(b), 1), round(y + m * math.cos(b), 1)


# Node id → (x, y) in metres. Ids are integers, as OSMnx loads them.
W, T, E, F, S, P, Q, R, G, H, K, U1, U2 = range(1, 14)
NODES: dict[int, tuple[float, float]] = {
    W: (-200.0, 0.0),
    T: (0.0, 0.0),
    E: (200.0, -200.0),
    F: (200.0, -400.0),
    S: (400.0, -200.0),
    P: (0.0, 200.0),
    Q: (200.0, 200.0),
    R: (400.0, 200.0),
    G: (200.0, -600.0),
    H: (0.0, -400.0),
    K: _towards(200.0, -400.0, 30.0, 150.0),
    U1: _towards(400.0, -200.0, 70.0, 150.0),
    U2: _towards(400.0, -200.0, 110.0, 150.0),
}

# (u, v, tags, bends between u and v in metres).
ROADS: list[tuple[int, int, dict[str, Any], list[tuple[float, float]]]] = [
    (W, T, {"name": "Via Roma", "highway": "residential"}, []),
    (
        T,
        E,
        {"name": "Via Roma", "highway": "residential"},
        [(150.0, 0.0), (200.0, -50.0)],
    ),
    (E, F, {"name": "Corso Italia", "highway": "residential"}, []),
    (E, S, {"highway": "footway"}, []),
    (T, P, {"name": "Via Verdi", "highway": "residential"}, []),
    (P, Q, {"name": "Via Verdi", "highway": "residential"}, []),
    (Q, R, {"name": "Via Bianchi", "highway": "residential"}, []),
    (
        F,
        G,
        {"name": ["Corso Italia", "Viale Dante"], "highway": "residential"},
        [],
    ),
    (F, H, {"ref": "SP12", "highway": "tertiary"}, []),
    (F, K, {"name": "Via Gialli", "highway": "residential"}, []),
    (S, U1, {"highway": "footway"}, []),
    (S, U2, {"highway": "footway"}, []),
]


def build() -> nx.MultiDiGraph:
    graph = nx.MultiDiGraph(crs="epsg:4326", simplified=True)
    for node, (x, y) in NODES.items():
        lat, lon = local_to_latlon(ORIGIN, x, y)
        graph.add_node(node, y=lat, x=lon)
    for osmid, (u, v, tags, bends) in enumerate(ROADS, start=1):
        points = [
            local_to_latlon(ORIGIN, x, y) for x, y in [NODES[u], *bends, NODES[v]]
        ]
        for a, b, line, backwards in (
            (u, v, points, False),
            (v, u, points[::-1], True),
        ):
            data: dict[str, Any] = dict(
                tags,
                osmid=osmid,
                oneway=False,
                reversed=backwards,
                length=path_length_m(line),
            )
            if bends:
                data["geometry"] = LineString([(lon, lat) for lat, lon in line])
            graph.add_edge(a, b, **data)
    return graph


def main() -> None:
    path = FIXTURES / "directions_junctions.graphml"
    ox.save_graphml(build(), path)
    print(f"{path.name}: {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
