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
    FAR_BEARINGS,
    FAR_OFFSET_M,
    FAR_RINGS_M,
    FREE_TILT_DEG,
    LETTER_BAND,
    MAX_TILT_DEG,
    PHASES,
    SCALE_RANGE,
    START_BEARINGS,
    START_OFFSET_M,
    START_RINGS_M,
    RoadMask,
    ShapeNotDrawableError,
    candidate_starts,
    far_starts,
    fit_letters,
    plan_route,
    plan_shape,
    reach,
    search,
    shift_grid,
    tilt_limit,
    word_similarity,
    zone_area,
)
from route_engine.projection import (
    initial_scale,
    perimeter,
    project_shape,
    start_at_phase,
)
from route_engine.shapes import OUTLINES, SUPPORTED_SHAPES, get_shape
from route_engine.shapes.outline import read_outline
from route_engine.words import MAX_SHIFT, compose

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
    with pytest.raises(ShapeNotDrawableError, match="cannot be drawn here") as refused:
        plan_route(request, OneStreet())
    assert refused.value.best_distance_m is None


def test_a_shape_too_far_from_the_distance_is_refused(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The search's best follows the shape but is 3 km too long: beyond the
    # 2 km a non-conforming route may miss the target by.
    import route_engine.optimizer as optimizer

    real_search = optimizer.search

    def long_search(*args: object, **kwargs: object) -> optimizer.Search:
        result = real_search(*args, trace=_fake_trace(stretch=1.0), **kwargs)
        best = result.best
        best.route = NetworkRoute(best.route.points, 5000.0)
        return result

    monkeypatch.setattr(optimizer, "search", long_search)

    class Grid:
        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return _half_grid()

    request = RouteRequest(start=LEVICO, shape="circle", distance_m=2000)
    with pytest.raises(
        ShapeNotDrawableError, match=r"\+3\.0 km from the target"
    ) as refused:
        plan_route(request, Grid())
    assert refused.value.best_distance_m == 5000.0


@pytest.mark.parametrize("name", SUPPORTED_SHAPES)
def test_every_catalogue_shape_is_planned_on_a_street_grid(name: str) -> None:
    # 1500 m east of LEVICO the half grid surrounds the start on every side.
    start = local_to_latlon(LEVICO, 1500.0, 0.0)

    class Grid:
        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return _half_grid()

    request = RouteRequest(start=start, shape=name, distance_m=3000)
    result = plan_route(request, Grid()).result
    assert result.shape == name
    assert result.points[0] == result.points[-1]
    assert result.similarity >= 0.60


def _tilt(rotation_deg: float) -> float:
    return min(rotation_deg % 360.0, 360.0 - rotation_deg % 360.0)


def test_an_upright_search_never_tilts_beyond_the_limit() -> None:
    heart = get_shape("heart")(64)
    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    result = search(_half_grid(), heart, start, 3000.0, max_tilt_deg=MAX_TILT_DEG)
    assert result.attempts
    assert all(_tilt(a.rotation_deg) <= MAX_TILT_DEG for a in result.attempts)


def test_the_circle_turns_freely_every_other_shape_stays_upright() -> None:
    assert tilt_limit("circle") == FREE_TILT_DEG
    for name in SUPPORTED_SHAPES:
        if name != "circle":
            assert tilt_limit(name) == MAX_TILT_DEG


def test_plan_route_keeps_a_catalogue_shape_upright() -> None:
    start = local_to_latlon(LEVICO, 1500.0, 0.0)

    class Grid:
        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return _half_grid()

    plan = plan_route(RouteRequest(start=start, shape="star", distance_m=3000), Grid())
    assert plan.search is not None
    assert all(_tilt(a.rotation_deg) <= MAX_TILT_DEG for a in plan.search.attempts)


class _Loader:
    """A graph source that hands out one graph, whatever the area."""

    def __init__(self, graph: nx.MultiDiGraph) -> None:
        self.graph = graph

    def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
        return self.graph


def test_far_starts_ring_the_requested_point_up_to_two_km() -> None:
    starts = far_starts(LEVICO)
    assert len(starts) == len(FAR_RINGS_M) * FAR_BEARINGS
    for point, offset in starts:
        assert haversine_m(LEVICO, point) == pytest.approx(offset, abs=0.5)
    assert min(offset for _, offset in starts) > START_OFFSET_M
    assert max(offset for _, offset in starts) == FAR_OFFSET_M == 2000.0


def test_a_shape_that_fits_near_the_start_does_not_look_farther() -> None:
    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    request = RouteRequest(start=start, shape="circle", distance_m=3000)
    plan = plan_route(request, _Loader(_half_grid()))
    assert plan.search is not None and plan.search.converged
    assert plan.far is None


def test_a_shape_that_does_not_fit_near_the_start_finds_its_place() -> None:
    # Roads only from 1400 m east: within 500 m no circle closes on them,
    # from 1.5 or 2 km east it does.
    request = RouteRequest(start=LEVICO, shape="circle", distance_m=3000)
    plan = plan_route(request, _Loader(_grid_from_x(1400.0)))
    assert plan.far is not None and plan.search is plan.far
    moved = haversine_m(LEVICO, plan.result.points[0])
    assert 1000.0 - 50.0 <= moved <= FAR_OFFSET_M + 50.0
    assert plan.result.similarity >= 0.90
    assert plan.result.warnings[0].startswith("start moved 1")
    assert " km east of the requested point" in plan.result.warnings[0]
    # No attempt of either search starts more than 2 km away.
    for attempt in plan.far.attempts:
        assert attempt.offset_m <= FAR_OFFSET_M
        assert haversine_m(LEVICO, attempt.placement.start) <= FAR_OFFSET_M + 0.5


def test_a_far_place_wins_only_when_its_route_is_good(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Near the start the route is drawable but, say, not good enough: the
    # far one replaces it only if it is good.
    import route_engine.optimizer as optimizer

    real_search = optimizer.search

    def searching(far_good: bool) -> object:
        def fake(*args: object, **kwargs: object) -> optimizer.Search:
            result = real_search(*args, **kwargs)
            result.converged = far_good if kwargs.get("starts") else False
            return result

        return fake

    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    request = RouteRequest(start=start, shape="circle", distance_m=3000)
    for far_good in (False, True):
        monkeypatch.setattr(optimizer, "search", searching(far_good))
        plan = plan_route(request, _Loader(_half_grid()))
        assert plan.far is not None
        moved = haversine_m(start, plan.result.points[0])
        if far_good:
            assert plan.search is plan.far and moved >= 1000.0 - 50.0
        else:
            assert plan.search is not plan.far and moved <= START_OFFSET_M + 50.0


def test_a_refusal_says_the_place_was_looked_for_nearby_too() -> None:
    # No roads at all within 2.5 km: nothing to draw here or farther away.
    request = RouteRequest(start=LEVICO, shape="circle", distance_m=3000)
    graph = _grid_from_x(2600.0)
    with pytest.raises(ShapeNotDrawableError, match="here, nor within 2 km"):
        plan_route(request, _Loader(graph))


def test_a_search_enters_the_shape_only_at_the_given_phases() -> None:
    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    result = search(_half_grid(), CIRCLE, start, 3000.0, phases=(0.0,))
    assert result.attempts
    assert {a.phase for a in result.attempts} == {0.0}


def test_a_one_way_word_ends_away_from_its_start_after_the_distance() -> None:
    # «CIAO» written once, left to right (TASK-041), on the half grid.
    outline = read_outline(OUTLINES / "ciao_open.json")
    assert outline.one_way
    start = local_to_latlon(LEVICO, 1500.0, 0.0)

    class Grid:
        def load(self, bbox: tuple[float, float, float, float]) -> nx.MultiDiGraph:
            return _half_grid()

    plan = plan_shape(outline(64), outline.name, start, 3000, Grid(), one_way=True)
    result = plan.result
    assert plan.search is not None
    assert {a.phase for a in plan.search.attempts} == {0.0}
    # It ends at the far end of the word as placed: under the O, some 450 m
    # from the tip of the C where it starts.
    far_end = start_at_phase(plan.search.best.shape, 0.5)[0]
    assert haversine_m(result.points[-1], far_end) < 100.0
    assert haversine_m(result.points[0], result.points[-1]) > 300.0
    assert result.distance_m == pytest.approx(3000.0, rel=0.25)
    assert result.distance_m == pytest.approx(path_length_m(result.points))


# --- Words, one letter at a time (TASK-050) ---

II = compose("II")
LETTER_M = 1000.0  # letters 1 km high
II_SCALE = LETTER_M / II.height  # metres per normalized unit


def _north_road(x_m: float) -> nx.MultiDiGraph:
    """A single road running north, x_m east of LEVICO, from 500 m south of
    it to 1500 m north."""
    graph = nx.MultiDiGraph()
    for j in range(41):
        lat, lon = local_to_latlon(LEVICO, x_m, -500.0 + 50.0 * j)
        graph.add_node(j, y=lat, x=lon)
        if j:
            graph.add_edge(j - 1, j, length=50.0)
            graph.add_edge(j, j - 1, length=50.0)
    return graph


def _fit_ii(road_x_m: float) -> tuple[np.ndarray, np.ndarray]:
    """«II» drawn from the middle of its gap at LEVICO, upright, letters 1 km
    high and 600 m apart, fitted to a single road: its points in metres
    around LEVICO, and the moves of the letters in letter heights."""
    mask = RoadMask(_north_road(road_x_m), LEVICO)
    band = LETTER_BAND * LETTER_M
    drawn, shifts = fit_letters(II, 0, 0.0, II_SCALE, np.zeros(2), mask, band)
    xy = (np.array(drawn) - drawn[0]) * II_SCALE
    return xy, shifts


def test_a_letter_moves_to_the_road_beside_it() -> None:
    # The I on the right stands 300 m east of the start; the road runs
    # 180 m farther east, within a quarter of a letter height.
    xy, shifts = _fit_ii(480.0)
    assert shifts[0] == pytest.approx((0.0, 0.0))  # the other I is too far
    along, up = shifts[1]
    assert 0.0 < along <= MAX_SHIFT and up == 0.0
    right_i = xy[np.isclose(xy[:, 1], LETTER_M)]
    assert abs(right_i[0, 0] - 480.0) <= LETTER_BAND * LETTER_M
    # The start stays half-way between the letters.
    assert np.allclose(xy[0], 0.0) and np.allclose(xy[-1], 0.0)


def test_a_letter_does_not_move_beyond_its_limit() -> None:
    # 500 m east of the I, twice the farthest move: it stays where it is.
    _, shifts = _fit_ii(800.0)
    assert not shifts.any()
    for road_x in (480.0, 800.0, -300.0, 300.0):
        _, shifts = _fit_ii(road_x)
        assert np.hypot(shifts[:, 0], shifts[:, 1]).max() <= MAX_SHIFT + 1e-9


def test_the_moves_a_letter_tries_start_with_staying_put() -> None:
    grid = shift_grid()
    assert tuple(grid[0]) == (0.0, 0.0)
    lengths = np.hypot(grid[:, 0], grid[:, 1])
    assert np.all(np.diff(lengths) >= 0) and lengths.max() == MAX_SHIFT
    assert len(grid) == len({tuple(m) for m in grid})


def test_a_word_is_planned_from_its_gaps_with_its_letters_moved() -> None:
    word = compose("IO")
    start = local_to_latlon(LEVICO, 1500.0, 0.0)
    plan = plan_shape(
        list(word.points), word.text, start, 2000, _Loader(_half_grid()), word=word
    )
    assert plan.search is not None
    assert {a.phase for a in plan.search.attempts} <= set(word.phases)
    assert all(len(a.shifts) == 2 for a in plan.search.attempts)
    result = plan.result
    assert result.shape == "IO"
    assert haversine_m(result.points[0], result.points[-1]) < 1.0
    assert result.distance_m == pytest.approx(2000.0, rel=0.25)


def test_a_word_zone_holds_the_word_moved_from_any_of_its_gaps() -> None:
    word = compose("CIAO")
    shape = list(word.points)
    south, west, north, east = zone_area(shape, LEVICO, 15000.0, word=word)
    largest = initial_scale(shape, 15000.0) * SCALE_RANGE[1]
    for k in range(len(word.phases)):
        for rotation in (-MAX_TILT_DEG, 0.0, MAX_TILT_DEG):
            for sign in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
                shifts = np.tile(np.array(sign) * MAX_SHIFT / np.sqrt(2), (4, 1))
                moved = word.moved(k, shifts)
                drawn = project_shape(moved, LEVICO, largest, rotation)
                for lat, lon in drawn:
                    assert south < lat < north and west < lon < east


def test_a_word_without_one_of_its_letters_is_judged_by_that_letter() -> None:
    word = compose("CIAO")
    height_m = 700.0
    outline = project_shape(list(word.points), LEVICO, height_m / word.height)
    assert word_similarity(word, 0, outline, outline, height_m) == pytest.approx(1.0)
    # The route skips the I, which is an eighth of the line: the letters'
    # coverage drops by nearly a quarter.
    no_i = [
        point
        for point, place in zip(outline, word.places, strict=True)
        if place.index != 1 or place.along is not None
    ]
    similarity = word_similarity(word, 0, no_i, outline, height_m)
    assert 0.80 < similarity < 0.90


def test_a_placement_where_the_letters_have_roads_ranks_first() -> None:
    # «II», 1 km high, over a single road: the upright placement puts the
    # right I on it (from the start 300 m west of the road), the tilted
    # ones do not.
    start = local_to_latlon(LEVICO, -300.0, 0.0)
    graph = _north_road(0.0)
    result = search(
        graph,
        list(II.points),
        start,
        II_SCALE * perimeter(list(II.points)),
        max_traces=1,
        move_start=False,
        max_tilt_deg=MAX_TILT_DEG,
        phases=II.phases,
        word=II,
        trace=_fake_trace(stretch=1.0),
    )
    assert result.attempts[0].rotation_deg == 0.0
