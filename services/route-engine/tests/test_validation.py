import networkx as nx
import pytest

from route_engine.geo import local_to_latlon, path_length_m
from route_engine.network import _node_latlon, prune_parallel_spurs
from route_engine.validation import (
    InvalidRouteError,
    check_closed,
    exact_reuse,
    measure,
    usability,
    validate,
    visual_retrace,
)

LEVICO = (46.0122, 11.2986)


def _street(graph: nx.MultiDiGraph, a: str, b: str, **tags: object) -> None:
    pa, pb = _node_latlon(graph, a), _node_latlon(graph, b)
    length = path_length_m([pa, pb])
    graph.add_edge(a, b, length=length, **tags)
    graph.add_edge(b, a, length=length, **tags)


def _spike_town() -> nx.MultiDiGraph:
    """A 1 km square block (corners c0–c3) with a dead-end street going
    150 m east from c1 (s1–s3) and a footway 15 m north of it coming back
    (f3–f1) to f0, a node 15 m north of c1 on the block's east side."""
    graph = nx.MultiDiGraph()
    places = {
        "c0": (0, 0), "c1": (1000, 0), "c2": (1000, 1000), "c3": (0, 1000),
        "f0": (1000, 15),
        "s1": (1050, 0), "s2": (1100, 0), "s3": (1150, 0),
        "f1": (1050, 15), "f2": (1100, 15), "f3": (1150, 15),
    }  # fmt: skip
    for name, (x, y) in places.items():
        lat, lon = local_to_latlon(LEVICO, x, y)
        graph.add_node(name, y=lat, x=lon)
    for a, b in [("c0", "c1"), ("c1", "f0"), ("f0", "c2"), ("c2", "c3"), ("c3", "c0")]:
        _street(graph, a, b, highway="residential")
    for a, b in [("c1", "s1"), ("s1", "s2"), ("s2", "s3")]:
        _street(graph, a, b, highway="residential")
    for a, b in [("s3", "f3"), ("f3", "f2"), ("f2", "f1"), ("f1", "f0")]:
        _street(graph, a, b, highway="footway")
    return graph


SPIKED = ["c0", "c1", "s1", "s2", "s3", "f3", "f2", "f1", "f0", "c2", "c3", "c0"]


def _points(graph: nx.MultiDiGraph, nodes: list[str]) -> list[tuple[float, float]]:
    return [_node_latlon(graph, n) for n in nodes]


def test_exact_reuse_is_the_share_on_edges_travelled_twice() -> None:
    graph = _spike_town()
    back_and_forth = ["c0", "c1", "s1", "c1", "f0", "c2", "c3", "c0"]
    assert exact_reuse(graph, back_and_forth) == pytest.approx(50 / 4100, rel=1e-3)
    assert exact_reuse(graph, ["c0", "c1", "f0", "c2", "c3", "c0"]) == 0.0


def test_an_out_and_back_on_parallel_roads_counts_as_retraced() -> None:
    graph = _spike_town()
    points = _points(graph, SPIKED)
    # About 280 m of the 4.3 km run beside the other side of the spike.
    assert visual_retrace(points) == pytest.approx(0.065, abs=0.01)
    assert visual_retrace(_points(graph, ["c0", "c1", "f0", "c2", "c3", "c0"])) == 0.0
    # Near a corner of the shape the spike is meant to be there.
    tip = local_to_latlon(LEVICO, 1150, 0)
    assert visual_retrace(points, [tip], 200.0) < 0.02


def test_usability_counts_steps_main_roads_and_tunnels() -> None:
    graph = _spike_town()
    for a, b in [("c0", "c1"), ("c1", "c0")]:
        graph[a][b][0]["highway"] = ["primary", "residential"]
    for a, b in [("c2", "c3"), ("c3", "c2")]:
        graph[a][b][0]["highway"] = "steps"
        graph[a][b][0]["tunnel"] = "yes"
    metres = usability(graph, ["c0", "c1", "f0", "c2", "c3", "c0"])
    expected = {"steps": 1000.0, "busy": 1000.0, "tunnel": 1000.0}
    assert metres == pytest.approx(expected, rel=1e-3)


def test_issues_come_only_above_their_limits() -> None:
    graph = _spike_town()
    clean = ["c0", "c1", "f0", "c2", "c3", "c0"]
    assert validate(measure(graph, _points(graph, clean), clean)) == []
    below = {"reuse": 0.05, "retrace": 0.10, "steps": 0.0, "busy": 0.0, "tunnel": 0.0}
    assert validate(below) == []
    above = {"reuse": 0.06, "retrace": 0.12, "steps": 30.0, "busy": 0.0, "tunnel": 0.0}
    issues = validate(above)
    assert [i.code for i in issues] == ["reuse", "retrace", "steps"]
    assert "limit 5%" in issues[0].message
    assert "limit 10%" in issues[1].message
    assert "30 m of the route on steps" == issues[2].message


def test_a_route_that_does_not_close_or_start_right_is_refused() -> None:
    graph = _spike_town()
    loop = _points(graph, ["c0", "c1", "f0", "c2", "c3", "c0"])
    first = loop[0]
    check_closed(loop, first, LEVICO, LEVICO, 500.0)
    with pytest.raises(InvalidRouteError, match="does not end"):
        check_closed(loop[:-1], first, LEVICO, LEVICO, 500.0)
    with pytest.raises(InvalidRouteError, match="does not begin"):
        check_closed(loop, loop[1], LEVICO, LEVICO, 500.0)
    far = local_to_latlon(LEVICO, 600, 0)
    with pytest.raises(InvalidRouteError, match="600 m"):
        check_closed(loop, first, LEVICO, far, 500.0)


def test_parallel_spur_is_pruned_unless_it_leads_to_a_corner() -> None:
    graph = _spike_town()
    pruned = prune_parallel_spurs(graph, SPIKED)
    assert pruned == ["c0", "c1", "f0", "c2", "c3", "c0"]
    assert prune_parallel_spurs(graph, SPIKED, keep={"s3"}) == SPIKED
