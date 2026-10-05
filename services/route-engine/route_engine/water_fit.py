"""Where a shape fits on the water, and the route that draws it (TASK-191,
ADR-0154).

On water there is no road network: the placed shape *is* the route, as long
as all of it lies in the band of `water.WaterArea` (within 1 km of the
shore, off the shore and the obstacles). The search tries the shape at full
size and smaller, upright within ±15° (ADR-0038), at every place of a grid
within reach of the start; keeps, for each scale and angle, the few places
whose outline passes where joining it to a shore reachable on foot costs
least (ADR-0161); checks those exactly on the band; and joins each to the
shore start of lowest cost by a straight leg out and back. The cost says
how much the shape had to shrink and move.

A shape in pieces is drawn with the pen up (TASK-226, ADR-0188): its outline
as any shape, and each piece on its own, such as the eyes of a face. The
route leaves the outline at the vertex from which the pieces are nearest
(`_branch`), paddles to each in turn without drawing and comes back to that
vertex, then goes on along the outline. Outline and pieces are placed
together, all in the band; the stretches between them are the route's
`walks`, paddled with the pen up, and count in its distance.

A shape may be wanted somewhere (`near`, TASK-238): the search is the same,
but the places looked at are those nearest that point, and every metre from
it costs (NEAR_WEIGHT). The shape is still where it fits: all in the band,
with a shore start reachable on foot.

Metres on the plane tangent at the requested start, (lat, lon) in and out.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
import shapely
from shapely.geometry import LineString, Point
from shapely.geometry.base import BaseGeometry

from route_engine.geo import LatLon, latlon_to_local_array, local_to_latlon
from route_engine.water import (
    SHORE_BAND_M,
    XY,
    BBox,
    NoWaterError,
    WaterArea,
    WaterFitError,
    WaterSource,
    build_area,
)

# --- The shore start --------------------------------------------------------

# The shore start is at most this far from the requested start (the 2 km
# of the far search on roads, ADR-0040)...
MOVE_MAX_M = 2_000.0
# ... and the straight leg from it to the shape at most this long.
APPROACH_MAX_M = 300.0

# --- The search -------------------------------------------------------------

# cost = |distance - asked| / asked
#        + LEG_WEIGHT * (both legs) / asked
#        + MOVE_WEIGHT * km from the requested start to the shore start.
# A metre of leg costs twice a metre of distance missed: a longer leg never
# makes up for a smaller shape. A shore start 1 km away costs as much as a
# route 10% short. Within DISTANCE_TOLERANCE of the asked distance the
# shape fits, as on roads (ROUTE_ENGINE.md §5).
LEG_WEIGHT = 2.0
MOVE_WEIGHT = 0.1
DISTANCE_TOLERANCE = 0.10
# The shape is tried at full size (its outline as long as the distance
# asked), then smaller by SCALE_STEP down to MIN_SCALE.
SCALE_STEP = 0.03
MIN_SCALE = 0.4
# Shapes stay upright within ±15°, the circle turns freely (ADR-0038).
MAX_TILT_DEG = 15.0
TILT_STEP_DEG = 5.0
# The band is looked at on a grid of cells: about 200 along the outline,
# and never finer than 10 m nor coarser than 40 m.
CELLS_PER_OUTLINE = 200
MIN_CELL_M = 10.0
MAX_CELL_M = 40.0
# Centres are looked at nearest the start first, CENTRES_CHUNK at a time,
# until CENTRES_ENOUGH fit: a small shape in a wide band fits almost
# everywhere, and only the nearest places can win.
CENTRES_CHUNK = 20_000
CENTRES_ENOUGH = 200
# A cell counts as band only when the band reaches this many cells past
# its centre: then every point of an outline whose cells all count is in
# the band (half a cell to the nearest sample, √2/2 to the cell's centre).
CELL_SAFETY = 1.25
# Placements kept from each scale and rotation, to be checked exactly.
PLACEMENTS_PER_TRY = 3
# A shape wanted somewhere (`near`): each metre between its centre and that
# point costs NEAR_WEIGHT / asked, five times a metre of leg out and back.
# The place comes first, then the largest shape and the shortest legs there.
# The first NEAR_FREE_M cost nothing: a finger on the map cannot tell them,
# and a shape is not made smaller or turned to be a few metres nearer.
NEAR_WEIGHT = 10.0
NEAR_FREE_M = 30.0
# Its placements kept from each scale and rotation are the nearest that
# point, closer to each other than those of the free search: the nearest
# may have no clear leg to the shore, and the next should not be far.
NEAR_PLACEMENTS_PER_TRY = 6
NEAR_CENTRES_ENOUGH = 50
# Shore points tried as the start of one placement, nearest first.
STARTS_PER_PLACEMENT = 12
# A leg starts on the edge of the water: it may run this close to land or
# an obstacle (water.WaterArea.wet), and validation forgives this much.
ON_LAND_M = 0.5

# --- The route --------------------------------------------------------------


@dataclass(frozen=True)
class WaterRoute:
    """A route on the water: closed, from a shore start back to it."""

    points: list[LatLon]
    distance_m: float
    shore_start: LatLon
    # What makes the shore start reachable on foot: ACCESS_KINDS.
    shore_access: str
    # The straight leg from the shore to the shape, each way.
    approach_m: float
    # 1.0: the shape's outline is as long as the distance asked.
    scale: float
    rotation_deg: float
    # From the requested start to the shore start.
    move_m: float
    cost: float
    # The closest the shape comes to land, and the farthest any point of
    # the route gets from the shore.
    nearest_land_m: float
    farthest_shore_m: float
    # The centre of the shape as placed: the mean of the vertices of its
    # outline. Asked back as `near`, the shape stays where it is.
    centre: LatLon
    # A shape in pieces (TASK-226): [from, to] indices into `points`, both
    # included, of each stretch paddled without drawing, from the outline
    # to a piece, from one piece to the next and back to the outline, in
    # order (as RouteResult.walks). Empty for a shape drawn in one line.
    walks: tuple[tuple[int, int], ...] = ()


@dataclass(frozen=True)
class WaterMeasures:
    """What validation looks at on the water (ROUTE_ENGINE.md §8)."""

    distance_m: float
    # Metres of the route more than ON_LAND_M inside land: 0 when it only
    # starts and ends on the shore.
    on_land_m: float
    farthest_shore_m: float
    closed: bool


def rotations(free: bool) -> tuple[float, ...]:
    """The angles tried: one for a shape that looks the same at any angle
    (its fit does not change), else upright within ±15° (ADR-0038)."""
    if free:
        return (0.0,)
    steps = int(MAX_TILT_DEG / TILT_STEP_DEG)
    out = [0.0]
    for k in range(1, steps + 1):
        out += [-k * TILT_STEP_DEG, k * TILT_STEP_DEG]
    return tuple(out)


def _outline_length(shape: Sequence[XY]) -> float:
    return sum(math.dist(a, b) for a, b in zip(shape, shape[1:], strict=False))


def _centred(shape: Sequence[XY]) -> np.ndarray:
    """The closed shape around the mean of its vertices, which turning
    does not move."""
    xy = np.asarray(shape, dtype=float)
    return xy - xy[:-1].mean(axis=0)


def _placed(unit: np.ndarray, scale_m: float, rotation_deg: float) -> np.ndarray:
    theta = math.radians(rotation_deg)
    turn = np.array(
        [[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]]
    )
    out: np.ndarray = (unit * scale_m) @ turn.T
    return out


def _densified(xy: np.ndarray, step: float) -> np.ndarray:
    out = [xy[:1]]
    for a, b in zip(xy[:-1], xy[1:], strict=False):
        n = max(1, math.ceil(math.dist(a, b) / step))
        t = np.arange(1, n + 1)[:, None] / n
        out.append(a + (b - a) * t)
    return np.concatenate(out)


# --- A shape in pieces (TASK-226) --------------------------------------------


def _entered(piece: np.ndarray, at: Sequence[float]) -> np.ndarray:
    """`piece` as it is drawn coming from `at`: a closed one from its vertex
    nearest `at`, round and back to it; an open one from its nearer end (as
    Outline.pen_up_lines)."""
    if len(piece) > 2 and math.dist(piece[0], piece[-1]) <= 1e-9:
        ring = piece[:-1]
        first = int(np.argmin(np.hypot(ring[:, 0] - at[0], ring[:, 1] - at[1])))
        return np.concatenate([ring[first:], ring[:first], ring[first : first + 1]])
    if math.dist(piece[-1], at) < math.dist(piece[0], at):
        return piece[::-1]
    return piece


def _tour(
    vertex: Sequence[float], pieces: Sequence[np.ndarray]
) -> tuple[tuple[np.ndarray, ...], float]:
    """The pieces in the order they are drawn leaving the outline at
    `vertex`: each time the nearest left, entered where it is nearest
    (`_entered`), the first of the file among equals. With them, how far
    the pen is up: to the first, from each to the next, and from the last
    back to `vertex`."""
    left = list(range(len(pieces)))
    at = (float(vertex[0]), float(vertex[1]))
    drawn: list[np.ndarray] = []
    links = 0.0
    while left:
        entered = [_entered(pieces[i], at) for i in left]
        away = [math.dist(line[0], at) for line in entered]
        k = min(range(len(left)), key=lambda j: (away[j], left[j]))
        links += away[k]
        drawn.append(entered[k])
        at = (float(entered[k][-1][0]), float(entered[k][-1][1]))
        left.pop(k)
    return tuple(drawn), links + math.dist(at, vertex)


@dataclass(frozen=True)
class _Pieces:
    """The pieces of a shape around the centre of its outline, in its
    units, as they are drawn: `tour` leaving the outline at its vertex
    `branch`, the pen up for `links` in all; `drawn` is their own length."""

    branch: int
    tour: tuple[np.ndarray, ...]
    links: float
    drawn: float

    @property
    def extra(self) -> float:
        """What they add to the outline's length."""
        return self.drawn + self.links


def _branch(shape: Sequence[XY], pieces: Sequence[Sequence[XY]]) -> _Pieces | None:
    """Where the route leaves the outline for `pieces`, given in the frame
    of `shape`: the vertex of the outline from which the pen is up the
    least (`_tour`), the first among equals. None without pieces."""
    if not pieces:
        return None
    unit = _centred(shape)
    centre = np.asarray(shape, dtype=float)[:-1].mean(axis=0)
    parts = [np.asarray(piece, dtype=float) - centre for piece in pieces]
    tours = [_tour(vertex, parts) for vertex in unit[:-1]]
    branch = min(range(len(tours)), key=lambda i: (tours[i][1], i))
    tour, links = tours[branch]
    drawn = sum(float(np.hypot(*np.diff(part, axis=0).T).sum()) for part in parts)
    return _Pieces(branch, tour, links, drawn)


def _reach(unit: np.ndarray, parts: _Pieces | None) -> float:
    """How far the shape reaches from its centre, in its units."""
    reach = float(np.hypot(*unit.T).max())
    for piece in parts.tour if parts else ():
        reach = max(reach, float(np.hypot(*piece.T).max()))
    return reach


def _spread(n: int) -> np.ndarray:
    """0..n-1 in an order that spreads along the outline: far points first,
    so that a placement out of the band fails after a few looks."""
    order: list[int] = []
    seen = np.zeros(n, dtype=bool)
    step = 1 << max(0, (n - 1).bit_length())
    while step >= 1:
        for i in range(0, n, step):
            if not seen[i]:
                seen[i] = True
                order.append(i)
        step //= 2
    return np.array(order, dtype=int)


@dataclass(frozen=True)
class _Grid:
    x0: float
    y0: float
    cell: float
    mask: np.ndarray  # [row, col]: the cell's centre is deep enough in the band
    rows: np.ndarray  # the band cells, as np.nonzero(mask)
    cols: np.ndarray

    def centre(self, rows: np.ndarray, cols: np.ndarray) -> np.ndarray:
        return np.column_stack(
            [self.x0 + (cols + 0.5) * self.cell, self.y0 + (rows + 0.5) * self.cell]
        )


def _grid(band: BaseGeometry, reach_m: float, cell: float) -> _Grid | None:
    """The band on a grid of `cell` metres, within `reach_m` of the start."""
    safe = band.buffer(-CELL_SAFETY * cell)
    if safe.is_empty:
        return None
    bx0, by0, bx1, by1 = safe.bounds
    x0, y0 = max(bx0, -reach_m), max(by0, -reach_m)
    x1, y1 = min(bx1, reach_m), min(by1, reach_m)
    if x0 >= x1 or y0 >= y1:
        return None
    cols = math.ceil((x1 - x0) / cell)
    rows = math.ceil((y1 - y0) / cell)
    xs = x0 + (np.arange(cols) + 0.5) * cell
    ys = y0 + (np.arange(rows) + 0.5) * cell
    gx, gy = np.meshgrid(xs, ys)
    shapely.prepare(safe)
    mask = shapely.contains_xy(safe, gx, gy)
    if not mask.any():
        return None
    rows_in, cols_in = np.nonzero(mask)
    return _Grid(x0, y0, cell, mask, rows_in, cols_in)


def _fitting_centres(
    grid: _Grid,
    outline: np.ndarray,
    reach_m: float,
    wanted: _Wanted | None = None,
) -> np.ndarray:
    """Centres (k, 2) within `reach_m` of the start where every point of
    `outline` (around 0, 0) falls on a band cell: nearest the start first,
    CENTRES_CHUNK at a time, until CENTRES_ENOUGH are found.

    With `wanted`, nearest that point first, and only those from which the
    shore can be reached (`_Wanted.reached`), until NEAR_CENTRES_ENOUGH."""
    cells = np.round(outline / grid.cell).astype(int)
    _, first = np.unique(cells, axis=0, return_index=True)
    offsets = cells[np.sort(first)]  # in the order of the outline
    offsets = offsets[_spread(len(offsets))]
    dx, dy = offsets[0]
    rows, cols = grid.rows - dy, grid.cols - dx
    centre = grid.centre(rows, cols)
    away = np.hypot(centre[:, 0], centre[:, 1])
    near = away <= reach_m
    if wanted is not None:
        away = np.hypot(*(centre - wanted.at).T)
    order = np.argsort(away[near], kind="stable")
    rows, cols = rows[near][order], cols[near][order]
    enough = CENTRES_ENOUGH if wanted is None else NEAR_CENTRES_ENOUGH
    found: list[np.ndarray] = []
    count = 0
    for begin in range(0, len(rows), CENTRES_CHUNK):
        r_fit, c_fit = _filtered(
            grid,
            offsets[1:],
            rows[begin : begin + CENTRES_CHUNK],
            cols[begin : begin + CENTRES_CHUNK],
        )
        fit = grid.centre(r_fit, c_fit)
        if wanted is not None:
            fit = fit[wanted.reached(grid, fit, outline)]
        found.append(fit)
        count += len(fit)
        if count >= enough:
            break
    return np.concatenate(found) if found else np.zeros((0, 2))


def _filtered(
    grid: _Grid, offsets: np.ndarray, rows: np.ndarray, cols: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """The centres among (rows, cols) whose every offset is a band cell."""
    rows_n, cols_n = grid.mask.shape
    for dx, dy in offsets:
        r, c = rows + dy, cols + dx
        ok = (r >= 0) & (r < rows_n) & (c >= 0) & (c < cols_n)
        ok[ok] = grid.mask[r[ok], c[ok]]
        rows, cols = rows[ok], cols[ok]
        if not len(rows):
            break
    return rows, cols


def _join_costs(grid: _Grid, access: np.ndarray, distance_m: float) -> np.ndarray:
    """For each band cell of `grid`, about what it costs to join a shape
    that passes there to the shore: the legs out and back to the nearest
    shore point reachable on foot within MOVE_MAX_M of the start, and the
    move to that point (LEG_WEIGHT, MOVE_WEIGHT). inf off the band, and
    everywhere when no such point is (ADR-0161)."""
    legs, moves = _shore_legs(grid, access)
    costs: np.ndarray = (
        LEG_WEIGHT * 2 * legs / distance_m + MOVE_WEIGHT * moves / 1000.0
    )
    return costs


def _shore_legs(grid: _Grid, access: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """For each band cell of `grid`, the metres to the nearest shore point
    reachable on foot within MOVE_MAX_M of the start, and the metres from
    the start to that point: inf off the band, and everywhere when no such
    point is."""
    legs = np.full(grid.mask.shape, np.inf)
    moves = np.full(grid.mask.shape, np.inf)
    near = access[np.hypot(access[:, 0], access[:, 1]) <= MOVE_MAX_M]
    if not len(near):
        return legs, moves
    tree = shapely.STRtree(shapely.points(near))
    cells = shapely.points(grid.centre(grid.rows, grid.cols))
    (found, nearest), away = tree.query_nearest(cells, return_distance=True)
    legs[grid.rows[found], grid.cols[found]] = away
    moves[grid.rows[found], grid.cols[found]] = np.hypot(
        near[nearest, 0], near[nearest, 1]
    )
    return legs, moves


def _on_cells(
    grid: _Grid, values: np.ndarray, centres: np.ndarray, outline: np.ndarray
) -> np.ndarray:
    """The least of `values`, one for each cell of `grid`, on the cells an
    `outline` (around 0, 0) passes when placed at each of `centres`: looked
    at on about 48 of its points."""
    sample = outline[:: max(1, len(outline) // 48)]
    xs = centres[:, None, 0] + sample[None, :, 0]
    ys = centres[:, None, 1] + sample[None, :, 1]
    rows_n, cols_n = values.shape
    cols = np.clip(np.floor((xs - grid.x0) / grid.cell).astype(int), 0, cols_n - 1)
    rows = np.clip(np.floor((ys - grid.y0) / grid.cell).astype(int), 0, rows_n - 1)
    least: np.ndarray = values[rows, cols].min(axis=1)
    return least


@dataclass(frozen=True)
class _Wanted:
    """Where the shape is wanted (`near` of fit_shape), in metres around
    the start, and the leg from each cell of the grid to the shore
    (`_shore_legs`)."""

    at: np.ndarray
    legs: np.ndarray

    def reached(
        self, grid: _Grid, centres: np.ndarray, outline: np.ndarray
    ) -> np.ndarray:
        """Which of `centres` place `outline` within APPROACH_MAX_M of a
        shore point reachable on foot: the others have no start."""
        if not len(centres):
            return np.zeros(0, dtype=bool)
        reached: np.ndarray = (
            _on_cells(grid, self.legs, centres, outline) <= APPROACH_MAX_M
        )
        return reached

    def cost(self, centre: np.ndarray, distance_m: float) -> float:
        """What a shape placed at `centre` costs for being away from the
        point it is wanted at (NEAR_WEIGHT, NEAR_FREE_M)."""
        away = max(0.0, math.dist(centre, self.at) - NEAR_FREE_M)
        return NEAR_WEIGHT * away / distance_m


def _nearest(
    wanted: _Wanted, centres: np.ndarray, keep: int, apart_m: float
) -> list[tuple[float, np.ndarray]]:
    """Up to `keep` of `centres`, at least `apart_m` from each other, the
    nearest the point the shape is wanted at: (metres from it, centre)."""
    away = np.hypot(*(centres - wanted.at).T) if len(centres) else np.zeros(0)
    picked: list[tuple[float, np.ndarray]] = []
    for i in np.argsort(away, kind="stable"):
        centre = centres[i]
        if all(math.dist(centre, other) >= apart_m for _, other in picked):
            picked.append((float(away[i]), centre))
            if len(picked) >= keep:
                break
    return picked


def _promising(
    grid: _Grid,
    join: np.ndarray,
    centres: np.ndarray,
    outline: np.ndarray,
    keep: int,
    apart_m: float,
) -> list[tuple[float, np.ndarray]]:
    """Up to `keep` centres, at least `apart_m` from each other, whose
    outline passes where joining it to the shore costs least (`join`, of
    _join_costs), the nearest the start among equals: (that cost, centre).
    Only a few are checked exactly: the others would cost more for the legs
    or the move."""
    if not len(centres):
        return []
    costs = _on_cells(grid, join, centres, outline)
    away = np.hypot(centres[:, 0], centres[:, 1])
    picked: list[tuple[float, np.ndarray]] = []
    for i in np.lexsort((away, costs)):
        centre = centres[i]
        if all(math.dist(centre, other) >= apart_m for _, other in picked):
            picked.append((float(costs[i]), centre))
            if len(picked) >= keep:
                break
    return picked


@dataclass(frozen=True)
class _Placement:
    scale: float
    rotation_deg: float
    centre: np.ndarray
    outline: np.ndarray  # closed, in metres around the start
    # A shape in pieces (TASK-226): the pieces as they are drawn, placed
    # with the outline; its vertex where the route leaves it for them; and
    # the metres they add to its length, the pen up included.
    pieces: tuple[np.ndarray, ...] = ()
    branch: int = 0
    extra_m: float = 0.0

    def in_band(self, area: WaterArea) -> bool:
        """Whether the pieces, and the stretches with the pen up from the
        outline to them and back, lie in the band."""
        at = self.outline[self.branch]
        for piece in [*self.pieces, self.outline[self.branch][None, :]]:
            if math.dist(at, piece[0]) > 1e-6 and not area.band.contains(
                LineString([at, piece[0]])
            ):
                return False
            if len(piece) > 1 and not area.band.contains(LineString(piece)):
                return False
            at = piece[-1]
        return True


def _start_on_shore(
    area: WaterArea, placement: _Placement, distance_m: float
) -> tuple[float, XY, XY, str, float] | None:
    """The shore start for a placement: of the shore points reachable on
    foot within APPROACH_MAX_M of the shape and MOVE_MAX_M of the start,
    whose straight leg to the shape stays on open water, the one of lowest
    cost. (cost, shore point, point of the shape, access kind, leg)."""
    if not len(area.access):
        return None
    line = LineString(placement.outline)
    x0, y0, x1, y1 = line.bounds
    pts = area.access
    near = (
        (pts[:, 0] >= x0 - APPROACH_MAX_M)
        & (pts[:, 0] <= x1 + APPROACH_MAX_M)
        & (pts[:, 1] >= y0 - APPROACH_MAX_M)
        & (pts[:, 1] <= y1 + APPROACH_MAX_M)
        & (np.hypot(pts[:, 0], pts[:, 1]) <= MOVE_MAX_M)
    )
    index = np.flatnonzero(near)
    if not len(index):
        return None
    legs = shapely.distance(shapely.points(pts[index]), line)
    index, legs = index[legs <= APPROACH_MAX_M], legs[legs <= APPROACH_MAX_M]
    if not len(index):
        return None
    total = line.length + placement.extra_m + 2 * legs
    moves = np.hypot(pts[index, 0], pts[index, 1])
    costs = (
        np.abs(total - distance_m) / distance_m
        + LEG_WEIGHT * 2 * legs / distance_m
        + MOVE_WEIGHT * moves / 1000.0
    )
    for k in np.argsort(costs, kind="stable")[:STARTS_PER_PLACEMENT]:
        shore = Point(pts[index[k]])
        on_shape = line.interpolate(line.project(shore))
        if area.wet.contains(LineString([shore, on_shape])):
            return (
                float(costs[k]),
                (shore.x, shore.y),
                (on_shape.x, on_shape.y),
                area.access_kind[index[k]],
                float(legs[k]),
            )
    return None


def _joined_side(outline: np.ndarray, on_shape: XY) -> int:
    """The side of `outline` the point `on_shape` of it is on: from its
    vertex of this index to the next."""
    line = LineString(outline)
    along = line.project(Point(on_shape))
    lengths = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(outline, axis=0).T))])
    k = int(np.searchsorted(lengths, along, side="right") - 1)
    return min(max(k, 0), len(outline) - 2)


def _route_points(outline: np.ndarray, shore: XY, on_shape: XY) -> list[XY]:
    """Shore, out to the shape, around it, back to where it joined, shore."""
    k = _joined_side(outline, on_shape)
    vertices = [tuple(p) for p in outline[:-1]]
    n = len(vertices)
    ring = [on_shape] + [vertices[(k + 1 + i) % n] for i in range(n)] + [on_shape]
    points: list[XY] = [shore]
    for p in [*ring, shore]:
        if math.dist(p, points[-1]) > 1e-6:
            points.append((float(p[0]), float(p[1])))
    return points


def _route_in_pieces(
    placement: _Placement, shore: XY, on_shape: XY
) -> tuple[list[XY], tuple[tuple[int, int], ...]]:
    """`_route_points` for a shape in pieces: at the outline's vertex
    `placement.branch` the pen goes up to where each piece begins, down
    along it, and after the last up again back to that vertex; then the
    outline goes on. The route and the stretches with the pen up, as
    indices into it."""
    outline = placement.outline
    k = _joined_side(outline, on_shape)
    n = len(outline) - 1
    points: list[XY] = [shore]
    walks: list[tuple[int, int]] = []

    def draw_to(p: Sequence[float]) -> None:
        if math.dist(p, points[-1]) > 1e-6:
            points.append((float(p[0]), float(p[1])))

    def paddle_to(p: Sequence[float]) -> None:
        if math.dist(p, points[-1]) > 1e-6:
            walks.append((len(points) - 1, len(points)))
            points.append((float(p[0]), float(p[1])))

    draw_to(on_shape)
    for i in range(n):
        vertex = (k + 1 + i) % n
        draw_to(outline[vertex])
        if vertex == placement.branch:
            for piece in placement.pieces:
                paddle_to(piece[0])
                for p in piece[1:]:
                    draw_to(p)
            paddle_to(outline[vertex])
    draw_to(on_shape)
    draw_to(shore)
    return points, tuple(walks)


def fit_shape(
    shape: Sequence[XY],
    distance_m: float,
    area: WaterArea,
    *,
    name: str = "shape",
    free_rotation: bool = False,
    pieces: Sequence[Sequence[XY]] = (),
    near: LatLon | None = None,
) -> WaterRoute:
    """Place a normalized closed `shape` on the water of `area` so that it
    lies in the band, with a shore start reachable on foot, at the lowest
    cost (LEG_WEIGHT, MOVE_WEIGHT): the largest shape, the shortest legs,
    the nearest start.

    `pieces` are the lines of a shape in pieces besides its outline, in the
    frame of `shape` (TASK-226): placed with it, all in the band, each drawn
    on its own with the pen up between them (`WaterRoute.walks`). At full
    size the outline, the pieces and the stretches with the pen up are
    together as long as the distance asked.

    `near` is where the centre of the shape is wanted (`WaterRoute.centre`
    of a route before, moved): the shape is placed at the nearest place to
    it where it fits, every metre from it at NEAR_WEIGHT in the cost (but
    the first NEAR_FREE_M). The
    band, the shore start and its reach from the start of `area` are those
    of any placement.

    NoWaterError when there is no band within reach of the start;
    WaterFitError when the shape does not fit in it, or fits only outside
    DISTANCE_TOLERANCE of `distance_m` (its best_distance_m then says the
    distance it fits at)."""
    area.prepare()
    unit = _centred(shape)
    parts = _branch(shape, pieces)
    if parts is None:
        full = distance_m / _outline_length(shape)
        radius = float(np.hypot(*unit.T).max()) * full
    else:
        full = distance_m / (_outline_length(shape) + parts.extra)
        radius = _reach(unit, parts) * full
    reach = MOVE_MAX_M + APPROACH_MAX_M
    if area.band.is_empty or area.band.distance(Point(0.0, 0.0)) > reach:
        raise NoWaterError(
            f"there is no lake or sea to paddle on within {MOVE_MAX_M / 1000:g} km "
            "of here"
        )
    cell = min(max(distance_m / CELLS_PER_OUTLINE, MIN_CELL_M), MAX_CELL_M)
    grid = _grid(area.band, reach + 2 * radius + cell, cell)
    if grid is None:
        raise WaterFitError(_too_small(name, distance_m))
    join = _join_costs(grid, area.access, distance_m)
    wanted: _Wanted | None = None
    if near is not None:
        at = latlon_to_local_array(area.origin, np.array([near], dtype=float))[0]
        wanted = _Wanted(at, _shore_legs(grid, area.access)[0])
    # Both legs, as a share of the distance, are at least this long wherever
    # the shape is: at sea 200 m each (ADR-0161).
    legs = 2 * _shortest_leg(area) / distance_m
    best: _Found | None = None  # within DISTANCE_TOLERANCE
    best_any: _Found | None = None
    fitted_somewhere = False
    # Below this scale no route is within DISTANCE_TOLERANCE, legs or not.
    lowest_ok = 1.0 - DISTANCE_TOLERANCE - 2 * APPROACH_MAX_M / distance_m
    levels = np.arange(1.0, MIN_SCALE - 1e-9, -SCALE_STEP)
    for level in levels:
        if level + legs > 1.0 + DISTANCE_TOLERANCE:
            continue  # too long with its legs, wherever it is placed
        # The cost of any placement at this scale is at least this much.
        lowest = abs(level + legs - 1.0) + LEG_WEIGHT * legs
        if best is not None and lowest >= best.cost:
            if level <= 1.0 - legs:
                break  # smaller shapes only cost more
            continue
        if best is None and best_any is not None and level < lowest_ok:
            break  # what fits is known, and nothing smaller is within tolerance
        for angle in rotations(free_rotation):
            outline = _placed(unit, full * level, angle)
            dense = _densified(outline, cell)
            tour: tuple[np.ndarray, ...] = ()
            if parts is not None:
                tour = tuple(_placed(p, full * level, angle) for p in parts.tour)
                dense = np.concatenate([dense, *(_densified(p, cell) for p in tour)])
            centres = _fitting_centres(grid, dense, reach + radius * level, wanted)
            if wanted is None:
                tried = _promising(
                    grid,
                    join,
                    centres,
                    outline,
                    PLACEMENTS_PER_TRY,
                    max(5 * cell, 50.0),
                )
            else:
                tried = _nearest(wanted, centres, NEAR_PLACEMENTS_PER_TRY, 2 * cell)
            for _, centre in tried:
                if parts is None:
                    placement = _Placement(level, angle, centre, outline + centre)
                else:
                    placement = _Placement(
                        level,
                        angle,
                        centre,
                        outline + centre,
                        tuple(piece + centre for piece in tour),
                        parts.branch,
                        parts.extra * full * level,
                    )
                line = LineString(placement.outline)
                if not area.band.contains(line):
                    continue
                if placement.pieces and not placement.in_band(area):
                    continue
                fitted_somewhere = True
                start = _start_on_shore(area, placement, distance_m)
                if start is None:
                    continue
                cost = start[0]
                if wanted is not None:
                    cost += wanted.cost(centre, distance_m)
                found = _Found(
                    placement,
                    cost,
                    *start[1:],
                    line.length + placement.extra_m + 2 * start[4],
                )
                if best_any is None or found.cost < best_any.cost:
                    best_any = found
                off = abs(found.distance_m - distance_m)
                if off <= DISTANCE_TOLERANCE * distance_m and (
                    best is None or found.cost < best.cost
                ):
                    best = found
    if best is not None:
        return _water_route(area, best)
    if best_any is not None:
        raise WaterFitError(
            f"the {name} does not fit at {distance_m / 1000:g} km on the water "
            f"within {SHORE_BAND_M / 1000:g} km of the shore here: "
            f"it fits at {best_any.distance_m / 1000:.1f} km",
            best_distance_m=best_any.distance_m,
        )
    if fitted_somewhere:
        raise WaterFitError(
            f"the {name} fits on the water here, but no shore within "
            f"{APPROACH_MAX_M:g} m of it can be reached on foot"
        )
    raise WaterFitError(_too_small(name, distance_m))


def _shortest_leg(area: WaterArea) -> float:
    """The shortest leg any placement can have: from the nearest shore
    point reachable on foot within MOVE_MAX_M of the start to the band, in
    which the shape lies. 0 when there is no such point."""
    access = area.access
    near = access[np.hypot(access[:, 0], access[:, 1]) <= MOVE_MAX_M]
    if not len(near):
        return 0.0
    return float(shapely.distance(shapely.points(near), area.band).min())


def _too_small(name: str, distance_m: float) -> str:
    return (
        f"the {name} does not fit on the water within "
        f"{SHORE_BAND_M / 1000:g} km of the shore here, even at "
        f"{MIN_SCALE * distance_m / 1000:.1f} km"
    )


@dataclass(frozen=True)
class _Found:
    """A placement checked on the band, with its shore start."""

    placement: _Placement
    cost: float
    shore: XY
    on_shape: XY
    kind: str
    leg: float
    distance_m: float


def _water_route(area: WaterArea, found: _Found) -> WaterRoute:
    placement = found.placement
    walks: tuple[tuple[int, int], ...] = ()
    if placement.pieces:
        local, walks = _route_in_pieces(placement, found.shore, found.on_shape)
    else:
        local = _route_points(placement.outline, found.shore, found.on_shape)
    line = LineString(local)
    return WaterRoute(
        points=area.to_latlon(local),
        distance_m=line.length,
        shore_start=local_to_latlon(area.origin, *found.shore),
        shore_access=found.kind,
        approach_m=found.leg,
        scale=round(float(placement.scale), 4),
        rotation_deg=float(placement.rotation_deg),
        move_m=math.hypot(*found.shore),
        cost=found.cost,
        nearest_land_m=float(area.dry.distance(LineString(placement.outline))),
        farthest_shore_m=_farthest(line, area.shore),
        centre=local_to_latlon(area.origin, *map(float, placement.centre)),
        walks=walks,
    )


def _farthest(line: LineString, shore: BaseGeometry, step: float = 10.0) -> float:
    if shore.is_empty:
        return math.inf
    steps = np.append(np.arange(0.0, line.length, step), line.length)
    points = shapely.line_interpolate_point(line, steps)
    return float(shapely.distance(points, shore).max())


def measure(points: Sequence[LatLon], area: WaterArea) -> WaterMeasures:
    """The measures of a route on the water of `area`, for validation."""
    xy = latlon_to_local_array(area.origin, np.asarray(points, dtype=float))
    line = LineString(xy)
    inland = area.dry.buffer(-ON_LAND_M)
    return WaterMeasures(
        distance_m=line.length,
        on_land_m=float(line.intersection(inland).length),
        farthest_shore_m=_farthest(line, area.shore),
        closed=bool(np.allclose(xy[0], xy[-1], atol=1e-6)),
    )


# --- From a request ---------------------------------------------------------


def water_bbox(
    start: LatLon,
    shape: Sequence[XY],
    distance_m: float,
    pieces: Sequence[Sequence[XY]] = (),
) -> BBox:
    """The area whose water a request needs: the shape may lie as far as
    MOVE_MAX_M + APPROACH_MAX_M from the start, and the shore within
    SHORE_BAND_M of it counts. Rounded outward to 1e-4° (≈ 10 m), as the
    road areas, so the same request finds the same file."""
    unit = _centred(shape)
    parts = _branch(shape, pieces)
    if parts is None:
        radius = float(np.hypot(*unit.T).max()) * distance_m / _outline_length(shape)
    else:
        radius = (
            _reach(unit, parts) * distance_m / (_outline_length(shape) + parts.extra)
        )
    half = MOVE_MAX_M + APPROACH_MAX_M + 2 * radius + SHORE_BAND_M
    south, west = local_to_latlon(start, -half, -half)
    north, east = local_to_latlon(start, half, half)
    step = 1e-4
    return (
        math.floor(south / step) * step,
        math.floor(west / step) * step,
        math.ceil(north / step) * step,
        math.ceil(east / step) * step,
    )


def plan_on_water(
    shape: Sequence[XY],
    distance_m: float,
    start: LatLon,
    source: WaterSource,
    *,
    name: str = "shape",
    free_rotation: bool = False,
    bbox: BBox | None = None,
    pieces: Sequence[Sequence[XY]] = (),
    near: LatLon | None = None,
) -> tuple[WaterRoute, WaterArea]:
    """The whole plan from a request: the water of `water_bbox` (or of
    `bbox`, the area some data cover), then `fit_shape`. The water is that
    around `start` with `near` too: the shape stays within reach of it."""
    area_bbox = (
        bbox if bbox is not None else water_bbox(start, shape, distance_m, pieces)
    )
    area = build_area(source.elements(area_bbox), start, area_bbox)
    route = fit_shape(
        shape,
        distance_m,
        area,
        name=name,
        free_rotation=free_rotation,
        pieces=pieces,
        near=near,
    )
    return route, area
