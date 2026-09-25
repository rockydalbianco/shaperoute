"""Which street an unnamed sidewalk runs along (TASK-053, ADR-0054).

A small graph built here, in metres around a point in Milan: no network,
no saved file needed.
"""

from __future__ import annotations

import math
from pathlib import Path

import networkx as nx
import pytest

from route_engine.directions import Direction
from route_engine.geo import LatLon, local_to_latlon
from route_engine.network import (
    OsmnxSource,
    named_roads_query,
    parse_named_roads,
    read_named_roads,
    write_named_roads,
)
from route_engine.sidewalks import (
    MAX_DISTANCE_M,
    NamedRoad,
    StreetIndex,
    alongs,
    graph_roads,
)

ORIGIN: LatLon = (45.46, 9.19)


def at(x_m: float, y_m: float) -> LatLon:
    return local_to_latlon(ORIGIN, x_m, y_m)


def road(name: str, *points: tuple[float, float]) -> NamedRoad:
    return NamedRoad(name, tuple(at(x, y) for x, y in points))


# Via Dante runs north, left out of the graph (its sidewalks are separate).
DANTE = road("Via Dante", (0, 0), (0, 200))


def street_of(
    *points: tuple[float, float], roads: tuple[NamedRoad, ...] = (DANTE,)
) -> str | None:
    return StreetIndex(roads).street_along([at(x, y) for x, y in points])


def test_a_sidewalk_beside_its_street_runs_along_it() -> None:
    assert street_of((8, 0), (8, 200)) == "Via Dante"
    assert street_of((-6, 180), (-6, 20)) == "Via Dante"  # other side, other way


def test_the_threshold_is_the_distance_limit() -> None:
    near, far = MAX_DISTANCE_M - 1, MAX_DISTANCE_M + 1
    assert street_of((near, 0), (near, 200)) == "Via Dante"
    assert street_of((far, 0), (far, 200)) is None


def test_a_path_further_away_runs_along_nothing() -> None:
    assert street_of((30, 0), (30, 200)) is None


def test_a_crossing_does_not_run_along_the_street_it_crosses() -> None:
    assert street_of((-20, 100), (20, 100)) is None


def test_a_path_at_an_angle_does_not_either() -> None:
    angle = math.radians(40)
    end = (8 + 150 * math.sin(angle), 150 * math.cos(angle))
    assert street_of((8, 0), end) is None


def test_it_must_run_along_the_street_for_most_of_its_length() -> None:
    # 60 m beside Via Dante, then 140 m off to the east.
    assert street_of((8, 140), (8, 200), (148, 200)) is None
    # 140 m beside it, then 60 m away: still along it.
    assert street_of((8, 60), (8, 200), (68, 200)) == "Via Dante"


def test_the_nearest_of_two_parallel_streets_wins() -> None:
    manzoni = road("Via Manzoni", (20, 0), (20, 200))
    assert street_of((6, 0), (6, 200), roads=(DANTE, manzoni)) == "Via Dante"
    assert street_of((15, 0), (15, 200), roads=(DANTE, manzoni)) == "Via Manzoni"


def test_an_empty_index_names_nothing() -> None:
    assert StreetIndex([]).street_along([at(0, 0), at(0, 100)]) is None


def graph() -> nx.MultiDiGraph:
    """Corso Magenta (named, walkable) and an unnamed sidewalk beside Via
    Dante, which is not in the graph; a sidewalk beside Corso Magenta."""
    g = nx.MultiDiGraph(crs="epsg:4326")
    places = {
        "d0": (8, 0),
        "d1": (8, 200),
        "m0": (8, 260),
        "m1": (200, 260),
        "s0": (8, 266),
        "s1": (200, 266),
    }
    for node, (x, y) in places.items():
        lat, lon = at(x, y)
        g.add_node(node, x=lon, y=lat)

    def edge(u: str, v: str, **tags: str) -> None:
        length = math.dist(places[u], places[v])
        g.add_edge(u, v, length=length, **tags)
        g.add_edge(v, u, length=length, **tags)

    edge("d0", "d1", highway="footway")
    edge("d1", "m0", highway="footway")
    edge("m0", "m1", highway="secondary", name="Corso Magenta")
    edge("m0", "s0", highway="footway")
    edge("s0", "s1", highway="footway")
    return g


def direction(node: str, street: str | None) -> Direction:
    return Direction(
        node=node,
        point=(0.0, 0.0),
        distance_m=0.0,
        turn="left",
        angle_deg=-90.0,
        street=street,
        road_type="footway",
        branches=3,
    )


def test_the_named_roads_of_the_graph_count_too() -> None:
    names = {r.name for r in graph_roads(graph())}
    assert names == {"Corso Magenta"}


def test_each_unnamed_direction_gets_the_street_its_road_runs_along() -> None:
    g = graph()
    index = StreetIndex([DANTE, *graph_roads(g)])
    nodes = ["d0", "d1", "m0", "s0", "s1"]
    said = [
        direction("d0", None),
        direction("m0", None),  # onto the short link to s0: along nothing
        direction("s0", None),
    ]
    assert alongs(g, nodes, said, index) == [
        "Via Dante",
        None,
        "Corso Magenta",
    ]


def test_a_direction_with_a_name_of_its_own_gets_no_along() -> None:
    g = graph()
    index = StreetIndex([DANTE, *graph_roads(g)])
    assert alongs(g, ["d0", "d1"], [direction("d0", "Viale Uno")], index) == [None]


ANSWER = {
    "elements": [
        {
            "type": "way",
            "tags": {"highway": "secondary", "name": "Via Dante"},
            "geometry": [{"lat": 45.46, "lon": 9.19}, {"lat": 45.462, "lon": 9.19}],
        },
        {"type": "way", "tags": {"highway": "primary"}, "geometry": []},
        {
            "type": "way",
            "tags": {"highway": "tertiary", "name": "  "},
            "geometry": [{"lat": 45.46, "lon": 9.19}, {"lat": 45.47, "lon": 9.19}],
        },
    ]
}


def test_the_overpass_answer_gives_only_named_lines() -> None:
    assert parse_named_roads(ANSWER) == [
        NamedRoad("Via Dante", ((45.46, 9.19), (45.462, 9.19)))
    ]


def test_the_query_asks_for_named_roads_with_separate_sidewalks() -> None:
    query = named_roads_query((45.4, 9.1, 45.5, 9.2))
    assert '["name"]' in query
    assert 'sidewalk(:both|:left|:right)?$"~"separate"' in query
    assert "(45.4,9.1,45.5,9.2)" in query
    assert "out tags geom" in query


def test_named_roads_come_from_a_covering_cached_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = OsmnxSource(tmp_path)
    inside = road("Via Dante", (0, 0), (0, 200))
    outside = road("Via Lontana", (5000, 5000), (5000, 5200))
    write_named_roads([inside, outside], source.names_path((45.4, 9.1, 45.6, 9.3)))

    def no_network(query: str) -> dict[str, object]:
        raise AssertionError("no download when a cached file covers the area")

    monkeypatch.setattr("route_engine.network._overpass", no_network)
    roads = source.named_roads((45.45, 9.18, 45.47, 9.20))
    assert [r.name for r in roads] == ["Via Dante"]


def test_named_roads_are_downloaded_once_and_saved(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = OsmnxSource(tmp_path)
    calls: list[str] = []

    def overpass(query: str) -> dict[str, object]:
        calls.append(query)
        return ANSWER

    monkeypatch.setattr("route_engine.network._overpass", overpass)
    bbox = (45.45, 9.18, 45.47, 9.20)
    first = source.named_roads(bbox)
    again = source.named_roads(bbox)
    assert first == again == read_named_roads(source.names_path(bbox))
    assert len(calls) == 1
