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


def _fitting_centres(grid: _Grid, outline: np.ndarray, reach_m: float) -> np.ndarray:
    """Centres (k, 2) within `reach_m` of the start where every point of
    `outline` (around 0, 0) falls on a band cell: nearest the start first,
    CENTRES_CHUNK at a time, until CENTRES_ENOUGH are found."""
    cells = np.round(outline / grid.cell).astype(int)
    _, first = np.unique(cells, axis=0, return_index=True)
    offsets = cells[np.sort(first)]  # in the order of the outline
    offsets = offsets[_spread(len(offsets))]
    dx, dy = offsets[0]
    rows, cols = grid.rows - dy, grid.cols - dx
    centre = grid.centre(rows, cols)
    away = np.hypot(centre[:, 0], centre[:, 1])
    near = away <= reach_m
    order = np.argsort(away[near], kind="stable")
    rows, cols = rows[near][order], cols[near][order]
    found: list[np.ndarray] = []
    count = 0
    for begin in range(0, len(rows), CENTRES_CHUNK):
        r_fit, c_fit = _filtered(
            grid,
            offsets[1:],
            rows[begin : begin + CENTRES_CHUNK],
            cols[begin : begin + CENTRES_CHUNK],
        )
        found.append(grid.centre(r_fit, c_fit))
        count += len(r_fit)
        if count >= CENTRES_ENOUGH:
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
    costs = np.full(grid.mask.shape, np.inf)
    near = access[np.hypot(access[:, 0], access[:, 1]) <= MOVE_MAX_M]
    if not len(near):
        return costs
    tree = shapely.STRtree(shapely.points(near))
    cells = shapely.points(grid.centre(grid.rows, grid.cols))
    (found, nearest), legs = tree.query_nearest(cells, return_distance=True)
    moves = np.hypot(near[nearest, 0], near[nearest, 1])
    costs[grid.rows[found], grid.cols[found]] = (
        LEG_WEIGHT * 2 * legs / distance_m + MOVE_WEIGHT * moves / 1000.0
    )
    return costs


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
    sample = outline[:: max(1, len(outline) // 48)]
    xs = centres[:, None, 0] + sample[None, :, 0]
    ys = centres[:, None, 1] + sample[None, :, 1]
    rows_n, cols_n = join.shape
    cols = np.clip(np.floor((xs - grid.x0) / grid.cell).astype(int), 0, cols_n - 1)
    rows = np.clip(np.floor((ys - grid.y0) / grid.cell).astype(int), 0, rows_n - 1)
    costs = join[rows, cols].min(axis=1)
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
    total = line.length + 2 * legs
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


def _route_points(outline: np.ndarray, shore: XY, on_shape: XY) -> list[XY]:
    """Shore, out to the shape, around it, back to where it joined, shore."""
    line = LineString(outline)
    along = line.project(Point(on_shape))
    lengths = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(outline, axis=0).T))])
    k = int(np.searchsorted(lengths, along, side="right") - 1)
    k = min(max(k, 0), len(outline) - 2)
    vertices = [tuple(p) for p in outline[:-1]]
    n = len(vertices)
    ring = [on_shape] + [vertices[(k + 1 + i) % n] for i in range(n)] + [on_shape]
    points: list[XY] = [shore]
    for p in [*ring, shore]:
        if math.dist(p, points[-1]) > 1e-6:
            points.append((float(p[0]), float(p[1])))
    return points


def fit_shape(
    shape: Sequence[XY],
    distance_m: float,
    area: WaterArea,
    *,
    name: str = "shape",
    free_rotation: bool = False,
) -> WaterRoute:
    """Place a normalized closed `shape` on the water of `area` so that it
    lies in the band, with a shore start reachable on foot, at the lowest
    cost (LEG_WEIGHT, MOVE_WEIGHT): the largest shape, the shortest legs,
    the nearest start.

    NoWaterError when there is no band within reach of the start;
    WaterFitError when the shape does not fit in it, or fits only outside
    DISTANCE_TOLERANCE of `distance_m` (its best_distance_m then says the
    distance it fits at)."""
    area.prepare()
    unit = _centred(shape)
    full = distance_m / _outline_length(shape)
    radius = float(np.hypot(*unit.T).max()) * full
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
            centres = _fitting_centres(grid, dense, reach + radius * level)
            for _, centre in _promising(
                grid, join, centres, outline, PLACEMENTS_PER_TRY, max(5 * cell, 50.0)
            ):
                placement = _Placement(level, angle, centre, outline + centre)
                line = LineString(placement.outline)
                if not area.band.contains(line):
                    continue
                fitted_somewhere = True
                start = _start_on_shore(area, placement, distance_m)
                if start is None:
                    continue
                found = _Found(placement, *start, line.length + 2 * start[4])
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


def water_bbox(start: LatLon, shape: Sequence[XY], distance_m: float) -> BBox:
    """The area whose water a request needs: the shape may lie as far as
    MOVE_MAX_M + APPROACH_MAX_M from the start, and the shore within
    SHORE_BAND_M of it counts. Rounded outward to 1e-4° (≈ 10 m), as the
    road areas, so the same request finds the same file."""
    unit = _centred(shape)
    radius = float(np.hypot(*unit.T).max()) * distance_m / _outline_length(shape)
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
) -> tuple[WaterRoute, WaterArea]:
    """The whole plan from a request: the water of `water_bbox` (or of
    `bbox`, the area some data cover), then `fit_shape`."""
    area_bbox = bbox if bbox is not None else water_bbox(start, shape, distance_m)
    area = build_area(source.elements(area_bbox), start, area_bbox)
    route = fit_shape(shape, distance_m, area, name=name, free_rotation=free_rotation)
    return route, area
