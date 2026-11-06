"""A walk (TASK-371, ADR-0315): a run at a walker's pace, on the same roads.

A walk is drawn as a run is, on the foot network (network.NETWORKS): the same
graph, the same cached zones, no network of its own. Only its distances are
its own, 1-30 km, the user's choice. The API offers "walking" and asks the
engine for a run (`engine_activity`); models.py does not know it, so the
routes kept, the walks among them, keep their fingerprint.

A gravel ride (TASK-378, ADR-0322) is drawn the same way, as a ride on the
bike network: the API offers "gravel_biking" and asks the engine for
"cycling", 10-30 km, the user's choice. Its routes are a ride's.

No module that draws routes imports this file: route_store leaves it out of
the engine's fingerprint (WALK_ONLY), so a change here keeps every route kept.

Usage (from services/route-engine), as `python -m route_engine` without
`--activity`:

    python -m route_engine.walking --start 46.0671,11.1214 --shape heart \
        --distance 5000 --out heart-walk.gpx
"""

from __future__ import annotations

import sys
from collections.abc import Sequence

from route_engine.models import (
    DISTANCE_LIMITS_M,
    SUPPORTED_ACTIVITIES,
    InvalidRequestError,
)

# The activity of the contract, and the one the engine draws it as.
ACTIVITY = "walking"
RUN = "running"
# Its target distances in metres: within those of a run.
WALK_DISTANCE_M = (1_000, 30_000)
# A gravel ride, drawn as a ride (TASK-378), within a ride's distances.
GRAVEL = "gravel_biking"
RIDE = "cycling"
GRAVEL_DISTANCE_M = (10_000, 30_000)

# Each activity of the API the engine draws as another: that one, and its
# own target distances in metres.
DRAWN_AS: dict[str, tuple[str, tuple[int, int]]] = {
    ACTIVITY: (RUN, WALK_DISTANCE_M),
    GRAVEL: (RIDE, GRAVEL_DISTANCE_M),
}

# The activities of the API (packages/shared-types API_ACTIVITIES): the
# engine's, then the walk drawn as a run and the gravel ride as a ride.
API_ACTIVITIES: tuple[str, ...] = (*SUPPORTED_ACTIVITIES, *DRAWN_AS)
# The target distances of each activity of the API.
API_DISTANCE_LIMITS_M: dict[str, tuple[int, int]] = {
    **{activity: DISTANCE_LIMITS_M[activity] for activity in SUPPORTED_ACTIVITIES},
    **{activity: limits for activity, (_, limits) in DRAWN_AS.items()},
}


def drawn_as(activity: str) -> str:
    """The activity whose network `activity` goes on: a walk a run's, a
    gravel ride a ride's, any other its own (the way back to a route, a
    stroke matched to the roads)."""
    return DRAWN_AS[activity][0] if activity in DRAWN_AS else activity


def engine_activity(activity: str, distance_m: int) -> str:
    """The activity the engine draws a route of `activity` as: a walk as a
    run, a gravel ride as a ride, once its distance is within its own
    (DRAWN_AS; InvalidRequestError, in the words of models.check_distance);
    any other as it is."""
    if activity in DRAWN_AS:
        low, high = DRAWN_AS[activity][1]
        if not low <= distance_m <= high:
            raise InvalidRequestError(
                f"distance must be between {low} and {high} metres for "
                f"{activity}, got {distance_m}"
            )
    return drawn_as(activity)


def _distance(argv: Sequence[str]) -> int | None:
    """The value of `--distance` in `argv`, if it is a whole number."""
    for index, arg in enumerate(argv):
        value = None
        if arg == "--distance" and index + 1 < len(argv):
            value = argv[index + 1]
        elif arg.startswith("--distance="):
            value = arg.removeprefix("--distance=")
        if value is not None:
            try:
                return int(value)
            except ValueError:
                return None
    return None


def main(argv: Sequence[str] | None = None) -> int:
    """`python -m route_engine` for a walk: its distances, then a run. The
    command line is imported here only: the API and the phone import this
    module for its constants."""
    from route_engine import __main__ as cli

    args = list(sys.argv[1:] if argv is None else argv)
    if any(arg == "--activity" or arg.startswith("--activity=") for arg in args):
        print("--activity: a walk is always on foot; leave it out", file=sys.stderr)
        return 2
    distance = _distance(args)
    if distance is not None:
        try:
            engine_activity(ACTIVITY, distance)
        except InvalidRequestError as exc:
            print(f"--distance: {exc}", file=sys.stderr)
            return 2
    return cli.main([*args, "--activity", RUN])


if __name__ == "__main__":
    sys.exit(main())
