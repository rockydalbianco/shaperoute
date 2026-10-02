"""Redo a recorded request: python -m shaperoute_api.replay [--list]
[--job ID | --line N] [--gpx FILE] (TASK-090, docs/API.md).

Reads a line of the request log, rebuilds the request as the API did when
it arrived and gives it to the same planner, on the graphs in the cache:
no server, no phone. Says whether the route is the recorded one, point for
point; the exit code is 1 when it is not.
"""

from __future__ import annotations

import argparse
import time
from collections.abc import Sequence
from dataclasses import replace
from pathlib import Path
from typing import Any

from route_engine.export_gpx import route_name, to_gpx
from route_engine.models import RouteResult

from shaperoute_api.activity_graphs import ActivityGraphs, Graphs, source_for
from shaperoute_api.app import now_utc, to_request
from shaperoute_api.errors import error_of
from shaperoute_api.images import AnyRequest, plan_request
from shaperoute_api.jobs import Planner
from shaperoute_api.request_log import (
    DEFAULT_DIR,
    FILE_NAME,
    outcome_of,
    read_entries,
)
from shaperoute_api.schemas import ImageRouteRequestBody, RouteRequestBody

Entry = dict[str, Any]


def request_of(entry: Entry) -> AnyRequest:
    """The request the engine got when the line was written: the body goes
    through the same checks as one that arrives over HTTP."""
    body_type = ImageRouteRequestBody if entry["kind"] == "image" else RouteRequestBody
    return to_request(body_type.model_validate(entry["request"]))


def replay(
    entry: Entry, source: Graphs, planner: Planner = plan_request
) -> RouteResult:
    request = request_of(entry)
    # On the network of its activity, as the API drew it (TASK-190).
    plan = planner(request, source_for(source, request.activity))
    return replace(plan.result, alternatives=[o.result for o in plan.alternatives])


def choose(entries: list[Entry], job_id: str | None, line: int | None) -> Entry:
    """The line asked for, or the last one."""
    if not entries:
        raise SystemExit("The request log is empty.")
    if job_id is not None:
        for entry in entries:
            if entry.get("job_id") == job_id:
                return entry
        raise SystemExit(f"No request of job {job_id} in the log.")
    if line is not None:
        if not 1 <= line <= len(entries):
            raise SystemExit(f"The log has lines 1 to {len(entries)}.")
        return entries[line - 1]
    return entries[-1]


def describe(entry: Entry) -> str:
    request, outcome = entry["request"], entry.get("outcome", {})
    what = {
        "image": "image",
        "word": f"word {request.get('word')} ({request.get('style')})",
    }.get(entry["kind"], str(request.get("shape")))
    lat, lon = request["start"]
    if outcome.get("status") == "done":
        ended = (
            f"{outcome['distance_m']:.0f} m, similarity {outcome['similarity']:.2f}, "
            f"in {outcome['elapsed_s']} s"
        )
    else:
        ended = str(outcome.get("code") or outcome.get("status"))
    return (
        f"{entry.get('time')}  job {entry.get('job_id') or '-'}  {what}, "
        f"{request['distance_m']} m from {lat:.5f}, {lon:.5f}: {ended}"
    )


def compare(entry: Entry, now: dict[str, Any]) -> bool:
    """Prints what came out now beside what was recorded; True if it is
    the same route, or the same error."""
    before = entry.get("outcome", {})
    if now["status"] == "done":
        print(
            f"Now:      {now['distance_m']:.0f} m, similarity "
            f"{now['similarity']:.2f}, {now['points']} points, in {now['elapsed_s']} s"
        )
        same = before.get("route") == now["route"]
        if "alternatives" in before:  # recorded since TASK-093
            routes = [other["route"] for other in now["alternatives"]]
            print(f"          and {len(routes)} other routes to choose from")
            same = same and [o["route"] for o in before["alternatives"]] == routes
    else:
        print(f"Now:      {now['code']}")
        same = before.get("code") == now["code"]
    if before.get("status") == "cancelled":
        print("Recorded as cancelled: nothing to compare with.")
        return True
    if same and now["status"] == "done":
        print("The same route as recorded, point for point.")
    elif same:
        print("The same error as recorded.")
    else:
        print("NOT what was recorded: another engine, or other map data.")
    return same


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.replay",
        description="Redo a request of the request log (docs/API.md).",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=DEFAULT_DIR / FILE_NAME,
        help=f"the request log (default: {DEFAULT_DIR / FILE_NAME})",
    )
    parser.add_argument("--list", action="store_true", help="show the lines and stop")
    which = parser.add_mutually_exclusive_group()
    which.add_argument("--job", help="the request of this job id")
    which.add_argument("--line", type=int, help="the request on this line, from 1")
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("data/cache"),
        help="where road graphs are cached (default: data/cache, like the API)",
    )
    parser.add_argument("--gpx", type=Path, help="write the route to this GPX file")
    return parser.parse_args(argv)


def main(
    argv: Sequence[str] | None = None,
    source: Graphs | None = None,
    planner: Planner = plan_request,
) -> None:
    args = parse_args(argv)
    try:
        entries = read_entries(args.file)
    except OSError as exc:
        raise SystemExit(f"Cannot read {args.file}: {exc}") from None
    if args.list:
        for number, entry in enumerate(entries, start=1):
            print(f"{number:4d}  {describe(entry)}")
        return
    entry = choose(entries, args.job, args.line)
    print(f"Recorded: {describe(entry)}")
    graphs = source or ActivityGraphs.from_cache(args.cache_dir)
    started = time.perf_counter()
    try:
        result = replay(entry, graphs, planner)
    except Exception as exc:
        activity = str(entry["request"].get("activity", "running"))
        detail = error_of(exc, activity)[1]
        now = outcome_of(None, detail, time.perf_counter() - started)
        print(f"          {exc}")
    else:
        now = outcome_of(result, None, time.perf_counter() - started)
        if args.gpx is not None:
            request, moment = request_of(entry), now_utc()
            name = route_name(request.name, request.distance_m, moment)
            args.gpx.write_text(to_gpx(result.points, name, moment), encoding="utf-8")
            print(f"GPX written to {args.gpx}")
    if not compare(entry, now):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
