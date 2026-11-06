"""A shape in pieces drawn with the pen down from its pen-up route
(TASK-2002, ADR-2002).

With the pen down, a shape in pieces (pieces.py), like the rabbit's head
and its eyes, was searched as one closed line: the outline with each piece
hung from it by a link drawn out and back (`Outline.joined`). That search
judges the whole line within 1% of its length, and an eye pressed against
the outline costs it a few points only: at Trento, 16 km, the rabbit passed
at its first trace with one eye squashed into the outline. With the pen up
each piece is searched and judged on its own, and moves a little to where
the roads are: the same rabbit came out right.

So with the pen down the route starts from the pen-up one (`plan`): the
same roads, each piece hung from the line drawn before it by the shortest
link along the roads, run out and back (`join`). A part the pen-up route
walked away from inside a piece (a detour, TASK-242; a spike, TASK-243) is
drawn along that walk. The search of the whole line stays: when the joined
route is not good enough, or there is none, it runs too, and the better of
the two wins, both judged piece by piece (`piece_similarity`).
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from typing import Any

import networkx as nx
import numpy as np

from route_engine import optimizer
from route_engine.errors import ShapeNotDrawableError
from route_engine.geo import (
    LatLon,
    haversine_m,
    latlon_to_local_array,
    local_to_latlon,
    path_length_m,
)
from route_engine.network import (
    BBox,
    Graph,
    NetworkRoute,
    _edge_points,
    _node_latlon,
    corner_indices,
    distance_to_segments,
    on_foot_stretches,
    step_cost,
    twice_drawn,
)
from route_engine.pen_up import letter_lines, similarity
from route_engine.pieces import compose_shape
from route_engine.projection import Point, project_shape, start_at_phase, transform
from route_engine.shapes import SUPPORTED_SHAPES, in_pieces
from route_engine.validation import measure, validate
from route_engine.words import Word

log = logging.getLogger(__name__)

# A point of a route and the node it was made from are the same within this.
SAME_POINT_M = 0.5
# A link is a stroke of the drawing: the route runs it twice on purpose,
# and the checks leave it out within this many metres of it (validation.py).
LINK_SPARE_M = 10.0


def applies(name: str, word: Word | None, one_way: bool = False) -> bool:
    """Whether the shape called `name` is one of the catalogue drawn in
    pieces, asked with the pen down: what `plan` is for."""
    return word is None and not one_way and name in SUPPORTED_SHAPES and in_pieces(name)


@dataclass
class Joined:
    """A pen-up route made one line, and the links that hang its pieces."""

    route: NetworkRoute
    links: list[list[LatLon]]


def join(
    graph: Graph, route: NetworkRoute, word: Word, line: Sequence[LatLon]
) -> Joined | None:
    """`route`, a shape in pieces traced with the pen up as `line` placed it
    (the pen-up search's `Attempt.shape`), drawn as one closed line.

    The route's parts between its walks are given the piece whose line is
    nearest to them. The parts of one piece in a row are one line, joined
    along the walk between them as the pen-up route walked it. The first
    piece, the outline, is the line the others hang from: each is reached
    from the nearest node of what is drawn before it by the shortest way
    along the roads, then drawn (a closed piece round from there, an open
    one from its nearer end to the other and back), and the link is run back
    the same way. None when the parts are not what this expects: the outline
    does not close, or the points are not those of the nodes."""
    nodes = list(route.nodes)
    at = _node_points(graph, nodes)
    if at is None or at[-1] != len(route.points) - 1:
        return None
    if any(
        haversine_m(route.points[i], _node_latlon(graph, n)) > SAME_POINT_M
        for i, n in zip(at, nodes, strict=True)
    ):
        return None
    where = {point: k for k, point in reversed(list(enumerate(at)))}
    cuts = [0]
    for begin, end in route.walks:
        if begin not in where or end not in where:
            return None
        cuts.extend((where[begin], where[end]))
    cuts.append(len(nodes) - 1)
    parts = [nodes[cuts[k] : cuts[k + 1] + 1] for k in range(0, len(cuts), 2)]
    walks = [nodes[cuts[k] : cuts[k + 1] + 1] for k in range(1, len(cuts) - 1, 2)]
    # No link costs more than the walks it replaces: the way the pen-up
    # route walked to a piece starts on what is drawn before it.
    cutoff = sum(_cost_along(graph, walk) for walk in walks)
    owners = _owners(graph, parts, word, line)
    groups = [list(parts[0])]
    for walk, part, owner, before in zip(
        walks, parts[1:], owners[1:], owners[:-1], strict=True
    ):
        if owner == before:
            groups[-1].extend([*walk[1:], *part[1:]])
        else:
            groups.append(list(part))
    drawn = groups[0]
    if len(drawn) < 3 or drawn[0] != drawn[-1]:
        return None
    links: list[list[Any]] = []
    for piece in groups[1:]:
        closed = len(piece) > 2 and piece[0] == piece[-1]
        ends = set(piece[:-1]) if closed else {piece[0], piece[-1]}
        try:
            reach, paths = nx.multi_source_dijkstra(
                graph, set(drawn), cutoff=cutoff, weight=step_cost
            )
        except nx.NetworkXNoPath:
            return None
        found = [n for n in ends if n in reach]
        if not found:
            return None
        end = min(found, key=lambda n: reach[n])
        out = paths[end]
        back = _back(graph, out)
        if back is None:
            return None
        if closed:
            ring = piece[:-1]
            i = ring.index(end)
            round_ = [*ring[i:], *ring[:i], end]
        else:
            along = piece if end == piece[0] else piece[::-1]
            round_ = [*along, *along[-2::-1]]
        k = drawn.index(out[0])
        drawn = [*drawn[: k + 1], *out[1:], *round_[1:], *back[1:], *drawn[k + 1 :]]
        links.append(out)
    points = _points(graph, drawn)
    joined = NetworkRoute(
        points=points,
        distance_m=path_length_m(points),
        warnings=list(route.warnings),
        waypoints=list(route.waypoints),
        nodes=drawn,
    )
    return Joined(joined, [_points(graph, link) for link in links])


def piece_similarity(
    word: Word, points: Sequence[LatLon], line: Sequence[LatLon], scale_m: float
) -> float:
    """How well `points`, all drawn, draw the pieces of `word` placed as
    `line` at `scale_m`: pen_up.similarity with no walk, within the
    tolerance of the pen-up search (optimizer.WORD_TOLERANCE)."""
    tolerance = optimizer.WORD_TOLERANCE * scale_m * word.height
    return similarity(word, points, [], line, tolerance)


def pieces_placed(
    word: Word,
    shape: Sequence[Point],
    start: LatLon,
    scale_m: float,
    rotation_deg: float,
    phase: float,
) -> list[LatLon]:
    """The pieces of `word` where a placement of the whole line `shape` puts
    them: both share the frame of their outline (pieces.compose), and the
    point of `shape` at `phase` is on `start`."""
    entry = transform(start_at_phase(shape, phase)[:1], scale_m, rotation_deg)[0]
    local = transform(word.points, scale_m, rotation_deg)
    return [local_to_latlon(start, x - entry[0], y - entry[1]) for x, y in local]


def area(name: str, shape: Sequence[Point], start: LatLon, planned_m: float) -> BBox:
    """The area both searches of `plan` need: the whole line's and the
    pieces'."""
    word = compose_shape(name)
    a = optimizer.required_area(shape, start, planned_m)
    b = optimizer.required_area(list(word.points), start, planned_m, word=word)
    return min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])


def plan(
    shape: Sequence[Point],
    name: str,
    start: LatLon,
    distance_m: int,
    source: optimizer.GraphLoader,
    reuse_penalty: float,
    max_tilt_deg: float,
    activity: str,
    first: optimizer.Placement | None = None,
    first_scale_m: float | None = None,
) -> optimizer.Plan:
    """`optimizer.plan_shape` of a shape in pieces with the pen down
    (`applies`): the pen-up plan joined (`join`), or the whole line's, as
    `better_of` chooses. A `first` placement is one of the whole line's
    (ADR-0256): only its search tries it."""
    word = compose_shape(name)
    kept = KeptSource(source)

    def apart() -> optimizer.Plan:
        return optimizer.plan_shape(
            list(word.points),
            name,
            start,
            distance_m,
            kept,
            reuse_penalty=reuse_penalty,
            max_tilt_deg=max_tilt_deg,
            word=word,
            activity=activity,
        )

    def whole() -> optimizer.Plan:
        return optimizer.plan_shape(
            shape,
            name,
            start,
            distance_m,
            source,
            reuse_penalty=reuse_penalty,
            max_tilt_deg=max_tilt_deg,
            activity=activity,
            first=first,
            first_scale_m=first_scale_m,
            join_pieces=False,
        )

    return better_of(name, shape, distance_m, apart, whole, kept.last)


def better_of(
    name: str,
    shape: Sequence[Point],
    distance_m: int,
    apart: Callable[[], optimizer.Plan],
    whole: Callable[[], optimizer.Plan],
    graph: Callable[[], Graph | None],
) -> optimizer.Plan:
    """The pen-up plan `apart` joined, when it is good (SIMILARITY_THRESHOLD
    piece by piece, the distance within DISTANCE_TOLERANCE); otherwise the
    better of it and the plan of the whole line `whole`, both judged piece by
    piece, by the search's cost. `graph` gives the graph `apart` planned on.
    The plans' similarity is the pieces': the plans of one request compare
    (nearby_starts.score). ShapeNotDrawableError when neither can be drawn."""
    word = compose_shape(name)
    joined: optimizer.Plan | None = None
    try:
        up = apart()
    except ShapeNotDrawableError:
        up = None
    loaded = graph()
    if up is not None and loaded is not None:
        joined = _joined_plan(loaded, up, word, shape)
    if joined is not None and _good(joined, distance_m):
        log.info("%s, pen down: joined %s", name, _said(joined))
        return joined
    try:
        down = whole()
    except ShapeNotDrawableError:
        if joined is None:
            raise
        log.info("%s, pen down: joined %s, whole none", name, _said(joined))
        return joined
    down = _judged(down, word, shape)
    if joined is None:
        log.info("%s, pen down: joined none, whole %s", name, _said(down))
        return down
    log.info("%s, pen down: joined %s, whole %s", name, _said(joined), _said(down))
    return min((joined, down), key=lambda p: _cost(p, distance_m))


def _said(plan: optimizer.Plan) -> str:
    """A plan for the log: its similarity and its length."""
    return f"{plan.result.similarity:.2f} {plan.result.distance_m:.0f} m"


class KeptSource:
    """`source`, keeping the last graph it gave: the one the pen-up plan
    traced on, which `join` needs."""

    def __init__(self, source: optimizer.GraphLoader) -> None:
        self._source = source
        self.graph: Graph | None = None

    def load(self, bbox: BBox) -> Graph:
        self.graph = self._source.load(bbox)
        return self.graph

    def last(self) -> Graph | None:
        return self.graph


def _joined_plan(
    graph: Graph, up: optimizer.Plan, word: Word, shape: Sequence[Point]
) -> optimizer.Plan | None:
    """The pen-up plan `up` as one line (`join`), checked and judged again;
    None when it cannot be joined."""
    found = next(
        (
            s
            for s in (up.search, up.far)
            if s is not None and s.best.route.points == up.result.points
        ),
        None,
    )
    if found is None:
        return None
    best = found.best
    joined = join(graph, best.route, word, best.shape)
    if joined is None:
        return None
    route = joined.route
    # What the app shows under the route: the whole line where the pieces
    # were placed, as the pen-down search places it.
    ghost = project_shape(shape, best.placement.start, best.scale_m, best.rotation_deg)
    measures = _measures(graph, route, ghost, joined.links)
    issues = {issue.message for issue in validate(up.checks)} if up.checks else set()
    warnings = [w for w in up.result.warnings if w not in issues]
    warnings.extend(issue.message for issue in validate(measures))
    result = replace(
        up.result,
        points=route.points,
        distance_m=route.distance_m,
        similarity=piece_similarity(word, route.points, best.shape, best.scale_m),
        warnings=warnings,
        walks=[],
        on_foot=on_foot_stretches(graph, route.nodes),
    )
    search = replace(found, best=replace(best, route=route, shape=ghost))
    if found is up.search:
        return replace(up, result=result, search=search, checks=measures)
    return replace(up, result=result, far=search, checks=measures)


def _judged(down: optimizer.Plan, word: Word, shape: Sequence[Point]) -> optimizer.Plan:
    """The plan of the whole line, its similarity the pieces' where its
    search placed them."""
    found = down.search if down.search is not None else down.far
    if found is None:
        return down
    best = found.best
    line = pieces_placed(
        word, shape, best.placement.start, best.scale_m, best.rotation_deg, best.phase
    )
    sim = piece_similarity(word, down.result.points, line, best.scale_m)
    return replace(down, result=replace(down.result, similarity=sim))


def _good(plan: optimizer.Plan, distance_m: int) -> bool:
    ratio = plan.result.distance_m / distance_m
    return (
        plan.result.similarity >= optimizer.SIMILARITY_THRESHOLD
        and abs(ratio - 1) <= optimizer.DISTANCE_TOLERANCE
    )


def _cost(plan: optimizer.Plan, distance_m: int) -> float:
    """The search's cost (optimizer.W_SHAPE, W_DISTANCE) of a finished plan."""
    ratio = plan.result.distance_m / distance_m
    return optimizer.W_SHAPE * (
        1 - plan.result.similarity
    ) + optimizer.W_DISTANCE * abs(ratio - 1)


def _measures(
    graph: Graph,
    route: NetworkRoute,
    ghost: Sequence[LatLon],
    links: Sequence[Sequence[LatLon]],
) -> dict[str, float]:
    """validation.measure of a joined route, as plan_shape measures one:
    the corners and the strokes of the whole line, and the links too, run
    out and back on purpose."""
    outline = latlon_to_local_array(ghost[0], np.array(ghost))
    corners = [ghost[i] for i in corner_indices(outline[:-1])]
    strokes = [(ghost[i], ghost[i + 1]) for i in np.flatnonzero(twice_drawn(outline))]
    strokes.extend(
        (a, b) for link in links for a, b in zip(link, link[1:], strict=False)
    )
    size = float(np.hypot(*np.diff(outline, axis=0).T).sum())
    return measure(
        graph,
        route.points,
        route.nodes,
        corners,
        optimizer.CORNER_SPARE * size,
        strokes,
        max(optimizer.STROKE_SPARE * size, LINK_SPARE_M),
    )


def _owners(
    graph: Graph, parts: Sequence[Sequence[Any]], word: Word, line: Sequence[LatLon]
) -> list[int]:
    """For each part of a route, the piece of `word` whose line, placed as
    `line`, is nearest to it on average; the first part is the outline's."""
    origin = line[0]
    pieces = [
        latlon_to_local_array(origin, np.array(p)) for p in letter_lines(word, line)
    ]
    owners = [0]
    for part in parts[1:]:
        xy = latlon_to_local_array(
            origin, np.array([_node_latlon(graph, n) for n in part])
        )
        gaps = [
            (
                float(distance_to_segments(p[:-1], p[1:], xy).mean())
                if len(p) > 1
                else np.inf
            )
            for p in pieces
        ]
        owners.append(int(np.argmin(gaps)))
    return owners


def _back(graph: Graph, out: Sequence[Any]) -> list[Any] | None:
    """The way back along `out`, the same roads; where one of them is one
    way, the shortest way back instead."""
    back = list(reversed(out))
    if all(graph.has_edge(u, v) for u, v in zip(back, back[1:], strict=False)):
        return back
    try:
        return list(nx.shortest_path(graph, out[-1], out[0], weight=step_cost))
    except nx.NetworkXNoPath:
        return None


def _points(graph: Graph, nodes: Sequence[Any]) -> list[LatLon]:
    """The points of a route along `nodes`, as every route makes them: the
    first node, then the points of each edge."""
    points = [_node_latlon(graph, nodes[0])]
    for u, v in zip(nodes, nodes[1:], strict=False):
        points.extend(_edge_points(graph, u, v))
    return points


def _cost_along(graph: Graph, nodes: Sequence[Any]) -> float:
    """What a way along `nodes` costs (network.step_cost)."""
    return sum(
        step_cost(u, v, graph[u][v]) for u, v in zip(nodes, nodes[1:], strict=False)
    )


def _node_points(graph: Graph, nodes: Sequence[Any]) -> list[int] | None:
    """The index into the route's points of each of `nodes`, the points
    made as `_points` makes them; None when two nodes in a row have no edge."""
    at = [0]
    for u, v in zip(nodes, nodes[1:], strict=False):
        if not graph.has_edge(u, v):
            return None
        at.append(at[-1] + len(_edge_points(graph, u, v)))
    return at
