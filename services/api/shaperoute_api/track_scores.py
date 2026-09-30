"""The score of a run (TASK-113, ADR-0092): the engine judges the track
against the planned route (route_engine/track_score.py, ADR-0090).

The API keeps nothing and needs no road graph: the app sends the route it
was given and the fixes it recorded, and gets the score back, or why the
run cannot have one.
"""

from __future__ import annotations

from dataclasses import asdict

from route_engine.models import InvalidRequestError
from route_engine.track_score import TrackNotScorableError, TrackPoint, score_track

from shaperoute_api.schemas import TrackScoreBody, TrackScoreRequestBody


def score_run(body: TrackScoreRequestBody) -> TrackScoreBody:
    """The score of the run in `body`. InvalidRequestError, with the
    engine's reason, for a run too short to judge."""
    track = [
        TrackPoint(
            lat=fix.point[0],
            lon=fix.point[1],
            time_s=fix.time_ms / 1000,
            accuracy_m=fix.accuracy_m,
        )
        for fix in body.track
    ]
    try:
        scored = score_track(track, body.points, body.similarity)
    except TrackNotScorableError as exc:
        raise InvalidRequestError(f"This run cannot be scored: {exc}.") from None
    return TrackScoreBody(**asdict(scored))
