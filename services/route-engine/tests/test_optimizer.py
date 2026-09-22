import shutil
from pathlib import Path

import networkx as nx
import numpy as np
import pytest

from route_engine.geo import (
    haversine_m,
    latlon_to_local_array,
    local_to_latlon,
    path_length_m,
)
from route_engine.models import RouteRequest
from route_engine.network import NetworkRoute, OsmnxSource, area_around
from route_engine.optimizer import (
    PHASES,
    SCALE_RANGE,
    START_BEARINGS,
    START_OFFSET_M,
    START_RINGS_M,
    RoadMask,
    ShapeNotDrawableError,
    candidate_starts,
    plan_route,
    reach,
    search,
    zone_area,
)
from route_engine.projection import initial_scale, project_shape
from route_engine.shapes import get_shape

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"
CIRCLE = get_shape("circle")(64)


def _half_grid(spacing_m: float = 50.0, size_m: float = 3000.0) -> nx.MultiDiGraph:
    """A street grid only east of LEVICO (x ≥ 0), both directions."""
    graph = nx.MultiDiGraph()
    n = int(size_m / spacing_m)
    for i in range(n + 1):
        for j in range(-n, n + 1):
            lat, lon = local_to_latlon(LEVICO, i * spacing_m, j * spacing_m)
            graph.add_node((i, j), y=lat, x=lon)
    for i in range(n + 1):
        for j in range(-n, n + 1):
            for b in ((i + 1, j), (i, j + 1)):
                if b in graph:
                    graph.add_edge((i, j), b, length=spacing_m)
                    graph.add_edge(b, (i, j), length=spacing_m)
    return graph


def test_zone_area_holds_the_shape_at_any_rotation_and_phase() -> None:
    south, west, north, east = zone_area(CIRCLE, LEVICO, 5000.0)
    largest = initial_scale(CIRCLE, 5000.0) * SCALE_RANGE[1]
    for rotation in range(0, 360, 30):
        for phase in PHASES:
            for lat, lon in project_shape(CIRCLE, LEVICO, largest, rotation, phase):
                assert south <= lat <= north and west <= lon <= east


def test_reach_of_a_circle_is_its_diameter_from_any_phase() -> None:
    cx = sum(x for x, _ in CIRCLE[:-1]) / (len(CIRCLE) - 1)
    cy = sum(y for _, y in CIRCLE[:-1]) / (len(CIRCLE) - 1)
    radius = sum(np.hypot(x - cx, y - cy) for x, y in CIRCLE[:-1]) / (len(CIRCLE) - 1)
    for phase in PHASES:
        assert reach(CIRCLE, [phase]) == pytest.approx(2 * radius, rel=1e-3)


def test_road_count_prefers_the_rotation_towards_the_roads() -> None:
    graph = _half_grid()
    mask = RoadMask(graph, LEVICO)
    scale = initial_scale(CIRCLE, 5000.0)
    fits = {
        rotation: mask.fit(project_shape(CIRCLE, LEVICO, scale, rotation), 100.0)
        for rotation in range(0, 360, 15)
    }
    best = max(fits, key=lambda r: (fits[r], -r))
    outline = project_shape(CIRCLE, LEVICO, scale, best)
    xy = latlon_to_local_array(LEVICO, np.array(outline))
    assert fits[best] == pytest.approx(1.0)
    assert xy[:, 0].min() > -100.0  # the whole circle lies east of the start
    assert min(fits.values()) < 0.6


def _fake_trace(stretch: float, off_shape_m: float = 0.0):
    """A tracer whose route is the shape itself, `stretch` times longer.

    With `off_shape_m` the route is moved that far north: same length, but
    it no longer covers the shape.
    """

    def trace(projected: list[tuple[float, float]]) -> NetworkRoute:
        lat_shift = off_shape_m / 111_195.0
        points = [(lat + lat_shift, lon) for lat, lon in projected]
        return NetworkRoute(points, path_length_m(projected) * stretch)

    return trace


def test_rescaling_brings_the_distance_within_tolerance() -> None:
    result = search(
        _half_grid(), CIRCLE, LEVICO, 5000.0, trace=_fake_trace(stretch=1.5)
    )
    assert result.converged
    assert len(result.attempts) == 2
    assert result.attempts[0].ratio == pytest.approx(1.5, rel=1e-3)
    assert result.best.ratio == pytest.approx(1.0, abs=0.01)
    assert result.best.scale_m == pytest.approx(
        initial_scale(CIRCLE, 5000.0) / 1.5, rel=1e-3
    )
    assert result.warnings == []


def test_the_trace_budget_is_respected() -> None:
    result = search(
        _half_grid(),
        CIRCLE,
        LEVICO,
        5000.0,
        max_traces=3,
        trace=_fake_trace(stretch=1.5, off_shape_m=2000.0),
    )
    assert len(result.attempts) == 3


def test_without_convergence_the_best_attempt_comes_with_a_warning() -> None:
    result = search(
        _half_grid(),
        CIRCLE,
        LEVICO,
        5000.0,
        trace=_fake_trace(stretch=1.5, off_shape_m=2000.0),
    )
    assert not result.converged
    assert result.best.ratio == pytest.approx(1.0, abs=0.01)
    assert any("shape similarity" in w for w in result.warnings)
    assert not any("distance on roads" in w for w in result.warnings)


def test_scale_stays_within_its_bounds() -> None:
    # A route ten times longer than the shape asks for a scale far below
    # the lower bound: the search stops there and says so.
    result = search(
        _half_grid(), CIRCLE, LEVICO, 5000.0, trace=_fake_trace(stretch=10.0)
    )
    base = initial_scale(CIRCLE, 5000.0)
    assert min(a.scale_m for a in result.attempts) == pytest.approx(
        base * SCALE_RANGE[0]
    )
    assert any("distance on roads" in w for w in result.warnings)


def test_real_search_on_a_grid_converges() -> None:
    graph = _half_grid()
    result = search(graph, CIRCLE, LEVICO, 3000.0)
    assert abs(result.best.ratio - 1) <= 0.10
    assert result.best.similarity >= 0.80
    assert len(result.attempts) <= 20


def test_a_zone_graph_in_cache_is_cropped_without_downloading(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import osmnx as ox

    def no_download(*args: object, **kwargs: object) -> None:
        raise AssertionError("graph was downloaded instead of cropped from cache")

    monkeypatch.setattr(ox, "graph_from_bbox", no_download)
    source = OsmnxSource(tmp_path)
    shutil.copy(FIXTURE, source.cache_path(area_around([LEVICO], margin_m=500.0)))
    inner = area_around([LEVICO], margin_m=200.0)
    assert source.is_cached(inner)
    graph = source.load(inner)
    south, west, north, east = inner
    assert len(graph) > 0
    assert all(
        south <= d["y"] <= north and west <= d["x"] <= east
        for _, d in graph.nodes(data=True)
    )
    assert source.cache_path(inner).exists()  # the crop is cached too


def test_polish_uses_the_budget_left_to_fix_the_distance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The distance is not proportional to the scale: 0.5 + 0.8 × scale / base
    # times the target. One trace per placement and one placement leave the
    # distance 30% off; the polish finds the scale (5/8 of the base) where
    # it is right.
    import route_engine.optimizer as optimizer

    monkeypatch.setattr(optimizer, "MAX_RESCALES", 1)
    monkeypatch.setattr(optimizer, "TOP_PLACEMENTS", 1)
    base = initial_scale(CIRCLE, 5000.0)

    def trace(projected: list[tuple[float, float]]) -> NetworkRoute:
        scale = path_length_m(projected) / 5000.0 * base
        return NetworkRoute(projected, 5000.0 * (0.5 + 0.8 * scale / base))

    result = search(_half_grid(), CIRCLE, LEVICO, 5000.0, trace=trace)
    assert result.converged
    assert result.best.ratio == pytest.approx(1.0, abs=0.01)
    assert result.best.scale_m == pytest.approx(base * 5 / 8, rel=0.01)
    # The polish rescales a placement already traced, it does not pick a new one.
    traced = {(a.rotation_deg, a.phase) for a in result.attempts[:2]}
    assert (result.best.rotation_deg, result.best.phase) in traced
    assert len(result.attempts) == 4


def test_candidate_starts_ring_the_requested_point() -> None:
    starts = candidate_starts(LEVICO)
    assert starts[0] == (LEVICO, 0.0)
    assert len(starts) == 1 + len(START_RINGS_M) * START_BEARINGS
    for point, offset in starts:
        assert haversine_m(LEVICO, point) == pytest.approx(offset, abs=0.5)
    assert max(offset for _, offset in starts) == START_OFFSET_M


def _grid_from_x(x0_m: float, spacing_m: float = 50.0) -> nx.MultiDiGraph:
    """A street grid only from x0_m east of LEVICO: no roads near the start."""
    graph = _half_grid(spacing_m)
    return graph.subgraph([n for n in graph if n[0] * spacing_m >= x0_m]).copy()


def test_the_start_moves_where_the_shape_closes_on_the_roads() -> None:
    # Roads begin 400 m east of the requested start: a circle through it
    # always has an arc on empty ground, one through a start 500 m east
    # can lie entirely on the grid.
    graph = _grid_from_x(400.0)
    fixed = search(graph, CIRCLE, LEVICO, 3000.0, move_start=False)
    moved = search(graph, CIRCLE, LEVICO, 3000.0)
    assert moved.best.offset_m > 0
    assert moved.best.similarity > fixed.best.similarity
    assert moved.best.similarity >= 0.90


def test_a_shape_the_roads_cannot_draw_is_refused() -> None:
    # A single straight street: no heart fits on it.
    graph = nx.MultiDiGraph()
    for i in range(41):
        lat, lon = local_to_latlon(LEVICO, i * 50.0 - 1000.0, 0.0)
        graph.add_node(i, y=lat, x=lon)
        if i:
            graph.add_edge(i - 1, i, length=50.0)
            graph.add_edge(i, i - 1, length=50.0)

    class OneStreet:
        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return graph

    request = RouteRequest(start=LEVICO, shape="heart", distance_m=2000)
    with pytest.raises(ShapeNotDrawableError, match="cannot be drawn here"):
        plan_route(request, OneStreet())
