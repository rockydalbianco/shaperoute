"""Checks on a finished route (docs/ROUTE_ENGINE.md §6, TASK-016).

Each check measures one thing and becomes an `Issue` only above its limit;
the issues end up as warnings in `RouteResult`, with measure and limit.
A route that is not closed, or starts too far from the requested point,
is not a warning but a bug: `check_closed` raises.
"""

from __future__ import annotations

from collections.abc import Collection, Sequence
from dataclasses import dataclass
from typing import Any

import numpy as np

from route_engine.geo import LatLon, haversine_m, latlon_to_local_array
from route_engine.network import Graph

# Starting values, confirmed with the user in TASK-016 (ADR-0026).
EXACT_REUSE_MAX = 0.05  # share of the length on edges already travelled
VISUAL_RETRACE_MAX = 0.10  # share of the length close to another stretch
RETRACE_NEAR_M = 20.0  # "close": within this distance
RETRACE_GAP_M = 60.0  # "another stretch": this far away along the route
RETRACE_STEP_M = 10.0  # sampling step along the route
# Ways a runner should know about (OSM `highway` values), and tunnels.
BUSY_ROADS = frozenset({"trunk", "trunk_link", "primary", "primary_link"})
STEPS = frozenset({"steps"})


class InvalidRouteError(RuntimeError):
    """The engine produced a route that breaks its own rules."""


@dataclass(frozen=True)
class Issue:
    code: str
    value: float
    limit: float
    message: str


def _edge_data(graph: Graph, u: Any, v: Any) -> dict[str, Any]:
    data: dict[str, Any] = min(graph[u][v].values(), key=lambda d: float(d["length"]))
    return data


def _values(tag: Any) -> set[str]:
    """OSMnx keeps merged ways' tags as lists: every value counts."""
    if tag is None:
        return set()
    if isinstance(tag, list):
        return {str(t) for t in tag}
    return {str(tag)}


def exact_reuse(graph: Graph, nodes: Sequence[Any]) -> float:
    """Share of the route length on edges travelled before, either way."""
    seen: set[frozenset[Any]] = set()
    total = reused = 0.0
    for u, v in zip(nodes, nodes[1:], strict=False):
        length = float(_edge_data(graph, u, v)["length"])
        key = frozenset((u, v))
        total += length
        if key in seen:
            reused += length
        seen.add(key)
    return reused / total if total else 0.0


def _resample(xy: np.ndarray, step_m: float) -> tuple[np.ndarray, np.ndarray]:
    """Points every `step_m` along a polyline, and their distance along it."""
    cumulative = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
    s = np.arange(0.0, cumulative[-1], step_m)
    pts = np.column_stack(
        [np.interp(s, cumulative, xy[:, 0]), np.interp(s, cumulative, xy[:, 1])]
    )
    return pts, s


def retraced(
    points: Sequence[LatLon],
    near_m: float = RETRACE_NEAR_M,
    gap_m: float = RETRACE_GAP_M,
    step_m: float = RETRACE_STEP_M,
) -> np.ndarray:
    """For each sample of a closed route, whether it runs within `near_m` of
    a stretch at least `gap_m` away along the route: going out on one side
    of a street and back on the other draws the same line twice."""
    xy = latlon_to_local_array(points[0], np.array(points))
    pts, s = _resample(xy, step_m)
    if len(pts) == 0:
        return np.zeros(0, bool)
    length = s[-1] + step_m
    result = np.zeros(len(pts), bool)
    chunk = 512
    for start in range(0, len(pts), chunk):
        p, sp = pts[start : start + chunk], s[start : start + chunk]
        d = np.hypot(p[:, None, 0] - pts[None, :, 0], p[:, None, 1] - pts[None, :, 1])
        along = np.abs(sp[:, None] - s[None, :])
        along = np.minimum(along, length - along)  # the route is a loop
        d[along < gap_m] = np.inf
        result[start : start + chunk] = d.min(axis=1) < near_m
    return result


def visual_retrace(
    points: Sequence[LatLon],
    spare: Collection[LatLon] = (),
    spare_radius_m: float = 0.0,
) -> float:
    """Share of the route drawn twice (`retraced`), leaving out the samples
    within `spare_radius_m` of a point in `spare`: the out-and-back to a
    corner of the shape is meant to be there."""
    xy = latlon_to_local_array(points[0], np.array(points))
    pts, _ = _resample(xy, RETRACE_STEP_M)
    if len(pts) == 0:
        return 0.0
    twice = retraced(points)
    if spare:
        corners = latlon_to_local_array(points[0], np.array(list(spare)))
        d = np.hypot(
            pts[:, None, 0] - corners[None, :, 0], pts[:, None, 1] - corners[None, :, 1]
        ).min(axis=1)
        twice &= d > spare_radius_m
    return float(twice.mean())


def usability(graph: Graph, nodes: Sequence[Any]) -> dict[str, float]:
    """Metres of the route on steps, on busy roads and in tunnels."""
    metres = {"steps": 0.0, "busy": 0.0, "tunnel": 0.0}
    for u, v in zip(nodes, nodes[1:], strict=False):
        data = _edge_data(graph, u, v)
        length = float(data["length"])
        highway = _values(data.get("highway"))
        if highway & STEPS:
            metres["steps"] += length
        if highway & BUSY_ROADS:
            metres["busy"] += length
        if "yes" in _values(data.get("tunnel")):
            metres["tunnel"] += length
    return metres


def check_closed(
    points: Sequence[LatLon],
    first: LatLon,
    requested: LatLon,
    start: LatLon,
    max_offset_m: float,
) -> None:
    """Raise unless the route ends where it begins, begins at `first` (the
    road point nearest to the chosen `start`), and `start` is within
    `max_offset_m` of the `requested` one (ADR-0025)."""
    if not points or points[0] != points[-1]:
        raise InvalidRouteError("the route does not end where it begins")
    if points[0] != first:
        raise InvalidRouteError("the route does not begin at its start")
    offset = haversine_m(start, requested)
    if offset > max_offset_m + 1.0:
        raise InvalidRouteError(
            f"the start was moved {offset:.0f} m from the requested one "
            f"(at most {max_offset_m:.0f} m)"
        )


def measure(
    graph: Graph,
    points: Sequence[LatLon],
    nodes: Sequence[Any],
    corners: Collection[LatLon] = (),
    corner_radius_m: float = 0.0,
) -> dict[str, float]:
    """Every check's value: `reuse` and `retrace` as shares of the length,
    `steps`, `busy` and `tunnel` in metres."""
    return {
        "reuse": exact_reuse(graph, nodes),
        "retrace": visual_retrace(points, corners, corner_radius_m),
        **usability(graph, nodes),
    }


def validate(measures: dict[str, float]) -> list[Issue]:
    """Issues among the `measure`d values, each above its limit."""
    issues: list[Issue] = []
    reuse, twice = measures["reuse"], measures["retrace"]
    if reuse > EXACT_REUSE_MAX:
        issues.append(
            Issue(
                "reuse",
                reuse,
                EXACT_REUSE_MAX,
                f"{reuse:.0%} of the route is on roads already travelled "
                f"(limit {EXACT_REUSE_MAX:.0%})",
            )
        )
    if twice > VISUAL_RETRACE_MAX:
        issues.append(
            Issue(
                "retrace",
                twice,
                VISUAL_RETRACE_MAX,
                f"{twice:.0%} of the route runs next to another stretch of it, "
                f"within {RETRACE_NEAR_M:.0f} m (limit {VISUAL_RETRACE_MAX:.0%})",
            )
        )
    labels = {"steps": "on steps", "busy": "on main roads", "tunnel": "in tunnels"}
    for code, label in labels.items():
        if measures[code] > 0:
            issues.append(
                Issue(
                    code,
                    measures[code],
                    0.0,
                    f"{measures[code]:.0f} m of the route {label}",
                )
            )
    return issues
