"""A city's examples drawn before anyone asks for them (ADR-0136).

The API keeps a city's examples once drawn (route_store.py): the first phone
in a city waits, the next do not. This command is that first phone, for a
list of cities: it asks a running API what the app asks when a city is
tapped, the city by name and then a circle, a heart and a star of 5 km from
its centre, one at a time, and waits for each.

    python -m shaperoute_api.draw_examples --api http://127.0.0.1:8000 Rovereto
    python -m shaperoute_api.draw_examples --api https://... --preset italy

Run again, it goes through the cities already kept in a moment. The API's
key, when it asks for one, comes from SHAPEROUTE_API_KEY. A city whose zone
is not on the API's disk is downloaded by it, as for a phone: see
prefetch_zones.py for the zones of many cities at once.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from shaperoute_api.access import KEY_HEADER, KEY_VARIABLE
from shaperoute_api.prefetch_zones import EXAMPLE_DISTANCE_M, EXAMPLE_SHAPES, PRESETS

# Method, path and body in; status and JSON body out.
Call = Callable[[str, str, dict[str, Any] | None], tuple[int, Any]]

POLL_S = 2.0
# A zone to download and three plans: the app waits as long (routes.ts).
MAX_WAIT_S = 300.0
# 429 too_many_requests (access.py): the API says how long, at most this.
MAX_RETRY_S = 90.0


@dataclass
class Drawn:
    """What became of one city."""

    city: str
    label: str | None = None  # None: the city search did not find it
    # For each shape: "kept" (already there), "drawn", or the error's code.
    shapes: dict[str, str] = field(default_factory=dict)
    seconds: float = 0.0

    @property
    def ready(self) -> bool:
        return self.label is not None and all(
            said in ("kept", "drawn") for said in self.shapes.values()
        )

    def line(self) -> str:
        if self.label is None:
            return f"{self.city}: not found by the city search"
        shapes = ", ".join(f"{shape} {said}" for shape, said in self.shapes.items())
        return f"{self.label}: {shapes} ({self.seconds:.0f} s)"


def http_call(api: str, key: str | None, timeout_s: float = 30.0) -> Call:
    headers = {"Content-Type": "application/json"}
    if key:
        headers[KEY_HEADER] = key

    def call(method: str, path: str, body: dict[str, Any] | None) -> tuple[int, Any]:
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(
            api.rstrip("/") + path, data=data, method=method, headers=headers
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_s) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as exc:
            try:
                answer = json.loads(exc.read())
            except ValueError:
                answer = None
            if exc.code == 429:
                answer = {"retry_after_s": exc.headers.get("Retry-After")}
            return exc.code, answer

    return call


def draw_city(
    city: str,
    call: Call,
    sleep: Callable[[float], None] = time.sleep,
    clock: Callable[[], float] = time.monotonic,
) -> Drawn:
    began = clock()
    drawn = Drawn(city)
    status, found = call("GET", f"/cities?q={urllib.parse.quote(city)}", None)
    places = found.get("places") if status == 200 and isinstance(found, dict) else None
    if not places:
        return drawn
    drawn.label = places[0]["label"]
    for shape in EXAMPLE_SHAPES:
        asked = {
            "shape": shape,
            "distance_m": EXAMPLE_DISTANCE_M,
            "start": places[0]["point"],
            "activity": "running",
        }
        drawn.shapes[shape] = _draw(asked, call, sleep, clock)
        if drawn.shapes[shape] == "map_data_unavailable":
            break  # the other shapes would end the same (exampleRoutes.ts)
    drawn.seconds = clock() - began
    return drawn


def _draw(
    asked: dict[str, Any],
    call: Call,
    sleep: Callable[[float], None],
    clock: Callable[[], float],
) -> str:
    status, job = call("POST", "/route-jobs", asked)
    if status == 429:
        # One POST after the other, a city already kept takes no time.
        try:
            wait = float(job["retry_after_s"])
        except (KeyError, TypeError, ValueError):
            wait = MAX_RETRY_S
        sleep(min(wait, MAX_RETRY_S))
        status, job = call("POST", "/route-jobs", asked)
    if status != 202 or not isinstance(job, dict):
        return _code(job) or f"http_{status}"
    if job["status"] == "done":
        return "kept"
    deadline = clock() + MAX_WAIT_S
    while job["status"] not in ("done", "failed"):
        if clock() >= deadline:
            call("DELETE", f"/route-jobs/{job['job_id']}", None)
            return "timeout"
        sleep(POLL_S)
        status, answer = call("GET", f"/route-jobs/{job['job_id']}", None)
        if status != 200 or not isinstance(answer, dict):
            return _code(answer) or f"http_{status}"
        job = answer
    return "drawn" if job["status"] == "done" else (_code(job) or "failed")


def _code(body: Any) -> str | None:
    error = body.get("error") if isinstance(body, dict) else None
    code = error.get("code") if isinstance(error, dict) else None
    return code if isinstance(code, str) else None


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api.draw_examples",
        description="Draw the examples of cities before anyone asks for them.",
    )
    parser.add_argument("cities", nargs="*", help="city names, as typed in the app")
    parser.add_argument("--preset", choices=sorted(PRESETS), action="append")
    parser.add_argument("--api", required=True, help="where the API answers")
    args = parser.parse_args(argv)
    cities = list(args.cities)
    for preset in args.preset or []:
        cities += [c for c in PRESETS[preset] if c not in cities]
    if not cities:
        parser.error("name some cities, or a --preset")
    call = http_call(args.api, os.environ.get(KEY_VARIABLE, "").strip() or None)
    ready = 0
    for city in cities:
        try:
            drawn = draw_city(city, call)
        except OSError as exc:
            # The API is not there: no city after this one would do better.
            print(f"{city}: the API did not answer ({type(exc).__name__})")
            return 1
        print(drawn.line(), flush=True)
        ready += drawn.ready
    print(f"{ready} of {len(cities)} cities have their examples")
    return 0 if ready == len(cities) else 1


if __name__ == "__main__":
    raise SystemExit(main())
