"""Shapes tilted up to 45°, and the rotation in the result (TASK-232,
ADR-0195).

A shape with a top and a bottom turns at most MAX_TILT_DEG either way: the
search tries it upright first, within UPRIGHT_TILT_DEG as before, and the
tilts beyond only when that gives no good route, with TILTED_TRACES traces
more. Tilting beyond UPRIGHT_TILT_DEG costs as much as moving the start: on
a tie the straighter shape wins. The result says how far it turned,
counterclockwise in (-180, 180], so the app can turn the map back; 0 for
the circle, which turns freely.
"""

from pathlib import Path

import networkx as nx
import pytest
from test_optimizer import LEVICO, _fake_trace, _half_grid, _Loader

import route_engine.__main__ as cli
from route_engine.geo import LatLon, haversine_m, local_to_latlon
from route_engine.models import RouteRequest
from route_engine.nearby_starts import ShapeJob, plan_nearby
from route_engine.optimizer import (
    FREE_TILT_DEG,
    MAX_TILT_DEG,
    MAX_TRACES,
    TILTED_TRACES,
    UPRIGHT_TILT_DEG,
    OFFSET_FIT_PENALTY,
    TILT_FIT_PENALTY,
    W_OFFSET,
    W_TILT,
    plan_route,
    plan_shape,
    search,
    shown_rotation,
    tilt_limit,
    tilt_share,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import FREE_ROTATION, SUPPORTED_SHAPES, get_shape

HEART = get_shape("heart")(64)
DISTANCE_M = 3000.0
SCALE_M = initial_scale(HEART, DISTANCE_M)


def _ring(outline: list[LatLon], graph: nx.MultiDiGraph | None = None) -> nx.MultiDiGraph:
    """Roads exactly along `outline`, both ways, added to `graph`."""
    graph = graph if graph is not None else nx.MultiDiGraph()
    nodes = [(round(lat, 7), round(lon, 7)) for lat, lon in outline[:-1]]
    for lat, lon in nodes:
        graph.add_node((lat, lon), y=lat, x=lon)
    for a, b in zip(nodes, nodes[1:] + nodes[:1], strict=True):
        length = haversine_m(a, b)
        graph.add_edge(a, b, length=length)
        graph.add_edge(b, a, length=length)
    return graph


def _hearts(*rotations: float) -> nx.MultiDiGraph:
    """Roads drawing the heart at each of `rotations`, all from LEVICO."""
    graph = nx.MultiDiGraph()
    for rotation in rotations:
        _ring(project_shape(HEART, LEVICO, SCALE_M, rotation), graph)
    return graph


def _tilt(rotation_deg: float) -> float:
    return abs((rotation_deg + 180.0) % 360.0 - 180.0)


# --- How far a shape may tilt ---


def test_a_shape_with_a_top_and_a_bottom_tilts_up_to_45_degrees() -> None:
    assert MAX_TILT_DEG == 45.0
    for name in SUPPORTED_SHAPES:
        expected = FREE_TILT_DEG if name in FREE_ROTATION else MAX_TILT_DEG
        assert tilt_limit(name) == expected


def test_the_tilts_beyond_15_degrees_come_after_the_upright_search() -> None:
    found = search(
        _hearts(0.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG,
        move_start=False, phases=(0.0,), trace=_fake_trace(0.5),
    )  # never good: the search tries all it may
    tilts = [_tilt(a.rotation_deg) for a in found.attempts]
    first = next(i for i, t in enumerate(tilts) if t > UPRIGHT_TILT_DEG)
    assert 0 < first <= MAX_TRACES
    assert max(tilts[:first]) <= UPRIGHT_TILT_DEG  # as before TASK-232
    tilted = tilts[first:]
    assert len(found.attempts) <= MAX_TRACES + TILTED_TRACES
    assert all(UPRIGHT_TILT_DEG < t <= MAX_TILT_DEG for t in tilted)
    assert {30.0, 45.0} & set(tilted)


def test_a_good_upright_route_never_tries_a_tilt() -> None:
    # The same search as before TASK-232, the same route and time.
    found = search(
        _hearts(0.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG,
        move_start=False, phases=(0.0,), trace=_fake_trace(1.0),
    )
    assert found.converged
    assert all(_tilt(a.rotation_deg) <= UPRIGHT_TILT_DEG for a in found.attempts)


def test_the_shape_follows_roads_that_run_30_degrees_off() -> None:
    plan = plan_shape(
        HEART, "heart", LEVICO, int(DISTANCE_M), _Loader(_hearts(30.0))
    )
    assert plan.search is not None
    assert plan.result.rotation_deg == pytest.approx(30.0, abs=5.0)
    assert plan.result.similarity >= 0.9


def test_roads_tilted_beyond_45_degrees_never_tilt_the_shape_beyond_it() -> None:
    found = search(
        _hearts(70.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG
    )
    assert found.attempts
    assert all(_tilt(a.rotation_deg) <= MAX_TILT_DEG for a in found.attempts)


# --- On a tie the straighter shape wins ---


def test_on_a_tie_the_straighter_shape_wins() -> None:
    # Two whole hearts, at 45° and at -30°: the roads draw each as well, and
    # neither upright. Without the tilt's cost the first of the rotations
    # tried would win, 45°; with it the one that leans less.
    found = search(
        _hearts(45.0, -30.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG,
        move_start=False, phases=(0.0,),
    )
    assert found.converged
    assert shown_rotation(found.best.rotation_deg, MAX_TILT_DEG) == -30.0


def test_on_a_tie_the_upright_shape_wins() -> None:
    found = search(
        _hearts(45.0, 0.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG,
        move_start=False, phases=(0.0,), trace=_fake_trace(1.0),
    )
    assert found.converged
    assert found.best.rotation_deg == 0.0


def test_tilting_by_45_degrees_costs_as_much_as_moving_the_start_500_m() -> None:
    assert TILT_FIT_PENALTY == OFFSET_FIT_PENALTY
    assert W_TILT == W_OFFSET
    assert tilt_share(45.0, MAX_TILT_DEG) == 1.0
    assert tilt_share(-30.0, MAX_TILT_DEG) == pytest.approx(0.5)
    assert tilt_share(330.0, MAX_TILT_DEG) == pytest.approx(0.5)
    # Within 15°, as before TASK-232: no cost.
    for rotation in (0.0, 10.0, -15.0, 345.0):
        assert tilt_share(rotation, MAX_TILT_DEG) == 0.0
    # A shape that turns freely has no upright: no cost.
    assert tilt_share(90.0, FREE_TILT_DEG) == 0.0


def test_a_traced_route_pays_for_its_tilt() -> None:
    # Every route is half as long as the shape, never good: the search
    # tries the tilts too, and each pays for its own.
    found = search(
        _hearts(0.0), HEART, LEVICO, DISTANCE_M, max_tilt_deg=MAX_TILT_DEG,
        move_start=False, phases=(0.0,), trace=_fake_trace(0.5),
    )
    tilted = [a for a in found.attempts if _tilt(a.rotation_deg) > UPRIGHT_TILT_DEG]
    assert tilted
    for attempt in found.attempts:
        share = max(0.0, _tilt(attempt.rotation_deg) - 15.0) / 30.0
        shape_and_distance = 3.0 * (1 - attempt.similarity) + abs(attempt.ratio - 1)
        assert attempt.cost == pytest.approx(shape_and_distance + W_TILT * share)


# --- The rotation in the result ---


def test_the_rotation_is_counterclockwise_between_minus_180_and_180() -> None:
    assert shown_rotation(15.0, MAX_TILT_DEG) == 15.0
    assert shown_rotation(345.0, MAX_TILT_DEG) == -15.0
    assert shown_rotation(315.0, MAX_TILT_DEG) == -45.0
    assert shown_rotation(180.0, MAX_TILT_DEG) == 180.0
    assert shown_rotation(-180.0, MAX_TILT_DEG) == 180.0
    assert shown_rotation(0.0, MAX_TILT_DEG) == 0.0
    assert str(shown_rotation(360.0, MAX_TILT_DEG)) == "0.0"  # never -0.0


def test_a_shape_that_turns_freely_says_0() -> None:
    assert shown_rotation(105.0, FREE_TILT_DEG) == 0.0
    # The circle on a half grid turns towards the roads, the map does not.
    request = RouteRequest(start=LEVICO, shape="circle", distance_m=3000)
    plan = plan_route(request, _Loader(_half_grid()))
    assert plan.result.rotation_deg == 0.0


def test_the_result_says_the_rotation_of_the_chosen_route() -> None:
    plan = plan_shape(
        HEART, "heart", LEVICO, int(DISTANCE_M), _Loader(_hearts(30.0))
    )
    assert plan.search is not None
    best = plan.search.best
    assert plan.result.rotation_deg == shown_rotation(best.rotation_deg, MAX_TILT_DEG)


def test_without_a_search_the_shape_is_upright() -> None:
    plan = plan_shape(
        HEART, "heart", LEVICO, int(DISTANCE_M), _Loader(_hearts(30.0)), optimize=False
    )
    assert plan.search is None
    assert plan.result.rotation_deg == 0.0


def test_a_word_says_its_rotation_too() -> None:
    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    request = RouteRequest(start=start, word="io", distance_m=6000)
    plan = plan_route(request, _Loader(_half_grid()))
    assert plan.search is not None
    assert plan.result.word == "IO"
    assert plan.result.rotation_deg == shown_rotation(
        plan.search.best.rotation_deg, MAX_TILT_DEG
    )


def test_every_start_and_alternative_says_its_own_rotation() -> None:
    # The nearby starts plan each from exactly where they are (ShapeJob.here),
    # and their routes are the alternatives (TASK-093).
    request = RouteRequest(start=LEVICO, shape="heart", distance_m=int(DISTANCE_M))
    job = ShapeJob.of_request(request)
    graph = _hearts(30.0, 0.0)
    here = job.here(LEVICO, _Loader(graph))
    assert here.search is not None
    assert here.result.rotation_deg == shown_rotation(
        here.search.best.rotation_deg, MAX_TILT_DEG
    )
    found = plan_nearby(job, LEVICO, _Loader(graph), processes=False)
    for plan in (found.plan, *found.plan.alternatives):
        assert plan.search is not None
        assert plan.result.rotation_deg == shown_rotation(
            plan.search.best.rotation_deg, MAX_TILT_DEG
        )


def test_the_cli_says_how_far_the_shape_is_tilted(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    class Hearts:
        def __init__(self, cache_dir: Path) -> None:
            self.graph = _hearts(30.0)

        def is_cached(self, bbox: tuple[float, float, float, float]) -> bool:
            return True

        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return self.graph

    monkeypatch.setattr(cli, "OsmnxSource", Hearts)
    start = f"--start={LEVICO[0]},{LEVICO[1]}"
    out = tmp_path / "heart.gpx"
    argv = ["--shape=heart", f"--distance={DISTANCE_M:.0f}", start, f"--out={out}"]
    assert cli.main(argv) == 0
    printed = capsys.readouterr().out
    assert "tilted:     +30 deg; the map shows it upright with a bearing of -30" in (
        printed
    )
