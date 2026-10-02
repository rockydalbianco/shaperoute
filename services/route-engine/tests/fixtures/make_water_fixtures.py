"""Write the hand-built water fixtures of TASK-191: a piece of coast and a
piece of lake, in the format of the water cache (route_engine/water.py).

No network: every element is drawn here in metres around a made-up origin
and written in (lat, lon). Run from services/route-engine:

    python tests/fixtures/make_water_fixtures.py

The coast (water_coast.json), around 44.0 N 12.65 E:
- the coastline runs west to east near y = 0, land to the north (on its
  left, as OpenStreetMap draws it), sea to the south;
- a beach from x = -900 to 900, the only shore reachable on foot besides
  a pier at x = 500 (a footway) and a slipway at x = -2500;
- a promenade 120 m inland (too far to reach the water from) and a
  motorway along the shore from x = 1500 to 2000 (not walkable);
- a detached breakwater 220 m out, from x = -1600 to -1200;
- a rock: a closed coastline of 25 m radius at (1500, -700), land too
  small to be a shore;
- a marina in the sea at x = 2200..2500, and a river mouth at
  x = -300..-260 that pokes 40 m into the sea.

The lake (water_lake.json), around 45.0 N 10.0 E:
- an ellipse 6 km by 1.8 km centred at (0, -1100), drawn as a
  multipolygon relation of two outer ways, with an island of 120 m radius
  at (1500, -1100) as its inner way;
- a lakeside road 15 m from the north shore, from x = -1500 to 0, the only
  way to the water; a pier into the lake at x = -800;
- a marina on the north shore at x = -2100..-1900, and a pond on land.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from pathlib import Path

from route_engine.geo import local_to_latlon

HERE = Path(__file__).parent
COAST_ORIGIN = (44.0, 12.65)
LAKE_ORIGIN = (45.0, 10.0)

XY = tuple[float, float]


def _geometry(origin: tuple[float, float], xy: Sequence[XY]) -> list[dict[str, float]]:
    rows = []
    for x, y in xy:
        lat, lon = local_to_latlon(origin, x, y)
        rows.append({"lat": round(lat, 7), "lon": round(lon, 7)})
    return rows


def _way(
    origin: tuple[float, float], ident: int, tags: dict[str, str], xy: Sequence[XY]
) -> dict[str, object]:
    return {
        "type": "way",
        "id": ident,
        "tags": tags,
        "geometry": _geometry(origin, xy),
    }


def _ring(cx: float, cy: float, rx: float, ry: float, n: int) -> list[XY]:
    """Counter-clockwise, closed."""
    points = [
        (
            cx + rx * math.cos(2 * math.pi * i / n),
            cy + ry * math.sin(2 * math.pi * i / n),
        )
        for i in range(n)
    ]
    return [*points, points[0]]


def _bbox(
    origin: tuple[float, float], x0: float, y0: float, x1: float, y1: float
) -> list[float]:
    south, west = local_to_latlon(origin, x0, y0)
    north, east = local_to_latlon(origin, x1, y1)
    return [round(south, 6), round(west, 6), round(north, 6), round(east, 6)]


def coastline_y(x: float) -> float:
    """The coast, piecewise straight: the tests read the sea from it."""
    knots = COAST_KNOTS
    for (xa, ya), (xb, yb) in zip(knots, knots[1:], strict=False):
        if xa <= x <= xb:
            return ya + (yb - ya) * (x - xa) / (xb - xa)
    raise ValueError(x)


COAST_KNOTS: list[XY] = [
    (-3600.0, 50.0),
    (-2000.0, 0.0),
    (-1000.0, 20.0),
    (0.0, 0.0),
    (1000.0, -30.0),
    (2000.0, 0.0),
    (3600.0, 40.0),
]


def coast() -> dict[str, object]:
    o = COAST_ORIGIN
    beach = [(x, coastline_y(x) - 2.0) for x in range(-900, 901, 100)]
    beach += [(x, coastline_y(x) + 60.0) for x in range(900, -901, -100)]
    beach.append(beach[0])
    elements = [
        _way(o, 1, {"natural": "coastline"}, COAST_KNOTS),
        _way(o, 2, {"natural": "beach"}, beach),
        _way(
            o,
            3,
            {"man_made": "pier", "highway": "footway"},
            [(500.0, coastline_y(500) + 20.0), (500.0, -150.0)],
        ),
        {
            "type": "node",
            "id": 4,
            "tags": {"leisure": "slipway"},
            **_geometry(o, [(-2500.0, coastline_y(-2500) + 5.0)])[0],
        },
        _way(o, 5, {"highway": "footway"}, [(-3000.0, 120.0), (3000.0, 120.0)]),
        _way(
            o,
            6,
            {"highway": "motorway"},
            [(1500.0, coastline_y(1500) + 10.0), (2000.0, coastline_y(2000) + 10.0)],
        ),
        _way(
            o,
            7,
            {"man_made": "breakwater"},
            [(-1600.0, -220.0), (-1200.0, -220.0)],
        ),
        _way(o, 8, {"natural": "coastline"}, _ring(1500.0, -700.0, 25.0, 25.0, 16)),
        _way(
            o,
            9,
            {"leisure": "marina", "natural": "water"},
            [
                (2200.0, -200.0),
                (2500.0, -200.0),
                (2500.0, 5.0),
                (2200.0, 5.0),
                (2200.0, -200.0),
            ],
        ),
        _way(
            o,
            10,
            {"natural": "water", "water": "river"},
            [
                (-300.0, -40.0),
                (-260.0, -40.0),
                (-260.0, 400.0),
                (-300.0, 400.0),
                (-300.0, -40.0),
            ],
        ),
    ]
    return {"bbox": _bbox(o, -3000.0, -2500.0, 3000.0, 1000.0), "elements": elements}


LAKE_CENTRE: XY = (0.0, -1100.0)
LAKE_AXES: XY = (3000.0, 900.0)
ISLAND: tuple[float, float, float] = (1500.0, -1100.0, 120.0)


def lake() -> dict[str, object]:
    o = LAKE_ORIGIN
    cx, cy = LAKE_CENTRE
    rx, ry = LAKE_AXES
    ring = _ring(cx, cy, rx, ry, 96)
    # Two outer ways, one reversed: a relation's ways need not run one way.
    first, second = ring[:49], list(reversed(ring[48:]))
    ix, iy, ir = ISLAND
    island = list(reversed(_ring(ix, iy, ir, ir, 24)))

    def north_shore(x: float) -> float:
        return cy + ry * math.sqrt(max(0.0, 1.0 - (x / rx) ** 2))

    relation = {
        "type": "relation",
        "id": 100,
        "tags": {"type": "multipolygon", "natural": "water", "water": "lake"},
        "members": [
            {
                "type": "way",
                "ref": 101,
                "role": "outer",
                "geometry": _geometry(o, first),
            },
            {
                "type": "way",
                "ref": 102,
                "role": "outer",
                "geometry": _geometry(o, second),
            },
            {
                "type": "way",
                "ref": 103,
                "role": "inner",
                "geometry": _geometry(o, island),
            },
        ],
    }
    road = [(float(x), north_shore(x) + 15.0) for x in range(-1500, 1, 100)]
    pier_x = -800.0
    shore_y = north_shore(pier_x)
    pier = [
        (pier_x - 4, shore_y + 10),
        (pier_x + 4, shore_y + 10),
        (pier_x + 4, shore_y - 60),
        (pier_x - 4, shore_y - 60),
        (pier_x - 4, shore_y + 10),
    ]
    marina = [
        (-2100.0, north_shore(-2100) + 10),
        (-1900.0, north_shore(-1900) + 10),
        (-1900.0, north_shore(-1900) - 120),
        (-2100.0, north_shore(-2100) - 120),
        (-2100.0, north_shore(-2100) + 10),
    ]
    elements = [
        relation,
        _way(o, 2, {"highway": "residential", "name": "Lungolago"}, road),
        _way(o, 3, {"man_made": "pier"}, pier),
        _way(o, 4, {"leisure": "marina", "natural": "water"}, marina),
        _way(o, 5, {"natural": "water"}, _ring(-3000.0, 500.0, 50.0, 50.0, 16)),
    ]
    return {"bbox": _bbox(o, -4000.0, -2600.0, 4000.0, 800.0), "elements": elements}


def main() -> None:
    for name, data in (("water_coast.json", coast()), ("water_lake.json", lake())):
        text = json.dumps(data, indent=1)
        (HERE / name).write_text(text + "\n", encoding="utf-8")
        print(f"Wrote {name}")


if __name__ == "__main__":
    main()
