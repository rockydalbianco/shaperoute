"""Score of a track that was run, from 0 to 100 (docs/ROUTE_ENGINE.md §5).

The route says how much the plan looks like the shape (`similarity`); the
track says how much of the plan was run, and nothing else (`fidelity`).
The score is the two together, so running the planned route exactly scores
what the route scored (ADR-0090).
"""

from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

import numpy as np

from route_engine.geo import LatLon, haversine_m, latlon_to_local_array
from route_engine.network import distance_to_polyline

# How far a position may be from the planned route and still be on it: the
# opposite pavement plus the error of a GPS between houses, as the app's
# OFF_ROUTE_M (ADR-0070).
TRACK_TOLERANCE_M = 40.0
# A position less sure than this says nothing about where the runner was.
MAX_ACCURACY_M = 40.0
# No runner is faster: a position that asks for more is a GPS jump.
MAX_SPEED_MPS = 12.0
# Positions closer than this to the one before add nothing.
MIN_STEP_M = 1.0
# Spacing of the samples along route and track, in metres.
SAMPLE_STEP_M = 10.0
# A track shorter than this share of the planned route is not a drawing yet.
MIN_TRACK_SHARE = 0.10


class TrackNotScorableError(ValueError):
    """The track cannot have a score; the message says why."""


@dataclass(frozen=True)
class TrackPoint:
    lat: float
    lon: float
    # Seconds, on any clock: only differences are used. None when unknown.
    time_s: float | None = None
    # Radius of the GPS error in metres. None when unknown.
    accuracy_m: float | None = None

    @property
    def latlon(self) -> LatLon:
        return self.lat, self.lon


@dataclass(frozen=True)
class TrackScore:
    # 0 to 100: round(100 * similarity of the route * fidelity).
    score: int
    # Harmonic mean of `covered` and `on_route`, from 0 to 1.
    fidelity: float
    # Share of the planned route with the track within TRACK_TOLERANCE_M.
    covered: float
    # Share of the track within TRACK_TOLERANCE_M of the planned route.
    on_route: float
    # Length of the cleaned track, in metres.
    distance_m: float


def clean_track(track: Sequence[TrackPoint]) -> list[TrackPoint]:
    """`track` without the positions that are not where the runner was:
    too uncertain, repeated, or a jump no runner makes."""
    kept: list[TrackPoint] = []
    for point in track:
        if not (math.isfinite(point.lat) and math.isfinite(point.lon)):
            continue
        if point.accuracy_m is not None and point.accuracy_m > MAX_ACCURACY_M:
            continue
        if kept:
            last = kept[-1]
            step_m = haversine_m(last.latlon, point.latlon)
            if step_m < MIN_STEP_M:
                continue
            if point.time_s is not None and last.time_s is not None:
                elapsed_s = point.time_s - last.time_s
                if elapsed_s <= 0 or step_m / elapsed_s > MAX_SPEED_MPS:
                    continue
        kept.append(point)
    return kept


def _length(xy: np.ndarray) -> float:
    return float(np.hypot(*np.diff(xy, axis=0).T).sum())


def _dense(xy: np.ndarray) -> np.ndarray:
    """Points every SAMPLE_STEP_M along a polyline, both ends included."""
    cumulative = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
    n = max(2, math.ceil(cumulative[-1] / SAMPLE_STEP_M) + 1)
    targets = np.linspace(0.0, cumulative[-1], n)
    return np.column_stack(
        [
            np.interp(targets, cumulative, xy[:, 0]),
            np.interp(targets, cumulative, xy[:, 1]),
        ]
    )


def score_track(
    track: Sequence[TrackPoint], route: Sequence[LatLon], similarity: float
) -> TrackScore:
    """Score the `track` run along the planned `route`, whose similarity to
    its shape is `similarity` (RouteResult.points and .similarity).

    Raises TrackNotScorableError when there is too little track to judge.
    """
    if len(route) < 2:
        raise TrackNotScorableError("the planned route has fewer than 2 points")
    if not 0.0 <= similarity <= 1.0:
        raise ValueError(f"similarity must be in [0, 1], got {similarity}")
    clean = clean_track(track)
    if len(clean) < 2:
        raise TrackNotScorableError(
            f"the track has {len(clean)} usable positions, 2 are needed"
        )

    origin = route[0]
    planned = latlon_to_local_array(origin, np.array(route, dtype=float))
    run = latlon_to_local_array(origin, np.array([p.latlon for p in clean]))
    planned_m, run_m = _length(planned), _length(run)
    if run_m < MIN_TRACK_SHARE * planned_m:
        raise TrackNotScorableError(
            f"the track is {run_m:.0f} m long, less than {MIN_TRACK_SHARE:.0%} "
            f"of the {planned_m:.0f} m planned"
        )

    to_track = distance_to_polyline(run, _dense(planned))
    to_route = distance_to_polyline(planned, _dense(run))
    covered = float((to_track <= TRACK_TOLERANCE_M).mean())
    on_route = float((to_route <= TRACK_TOLERANCE_M).mean())
    total = covered + on_route
    fidelity = 0.0 if total == 0 else 2 * covered * on_route / total
    return TrackScore(
        score=round(100 * similarity * fidelity),
        fidelity=fidelity,
        covered=covered,
        on_route=on_route,
        distance_m=run_m,
    )


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def read_gpx_track(text: str) -> list[TrackPoint]:
    """The track points of a GPX document, in order, with their time when
    the file has it. Raises TrackNotScorableError when it is not a GPX."""
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise TrackNotScorableError(f"not a GPX file: {exc}") from None
    points: list[TrackPoint] = []
    first: datetime | None = None
    for element in root.iter():
        if _local_name(element.tag) != "trkpt":
            continue
        try:
            lat, lon = float(element.attrib["lat"]), float(element.attrib["lon"])
        except (KeyError, ValueError):
            raise TrackNotScorableError(
                "a track point has no valid lat and lon"
            ) from None
        time_s: float | None = None
        for child in element:
            if _local_name(child.tag) == "time" and child.text:
                try:
                    when = datetime.fromisoformat(child.text.strip())
                except ValueError:
                    break
                if when.tzinfo is None:
                    break
                first = first or when
                time_s = (when - first).total_seconds()
                break
        points.append(TrackPoint(lat, lon, time_s))
    return points
