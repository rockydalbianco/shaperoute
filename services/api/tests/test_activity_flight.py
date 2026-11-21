"""A race on foot and in the air opened whole (TASK-305 part R6d,
ADR-0375): GET /me/activities/{key} gives its parts in the air as
stretches of its track and the two kinds added up, so that the app draws
the line in two colours and shows the two times; left out for any other
run."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from test_drawings import (
    KEY,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.flight_legs import ActivityFlightBody, KeptFlightPart, air_legs
from shaperoute_api.run_stats import FLIGHT

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# The example run's first point, on the phone's clock (activity-request.json):
# its five points are 0, 300, 600, 900 and 1200 s after it.
FIRST_MS = 1_790_000_000_000


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _part(kind: str, start_s: float, end_s: float, metres: float) -> dict[str, Any]:
    return {
        "kind": kind,
        "start_ms": FIRST_MS + int(start_s * 1000),
        "end_ms": FIRST_MS + int(end_s * 1000),
        "moving_s": end_s - start_s,
        "metres": metres,
        "climb_m": 40,
        "max_alt_m": 1700,
    }


# Up on foot, a flight from the second point to the fourth, a walk.
RACE = [
    _part("foot", 0, 300, 1000),
    _part("air", 300, 900, 2100),
    _part("foot", 900, 1200, 900),
]


def _stats(app: TestClient, headers: Headers, parts: list[dict[str, Any]]) -> None:
    answer = app.put(
        f"/me/activities/{KEY}/stats",
        json={**_load("flight-parts-request.json"), "flight_parts": parts},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text


def _flight(app: TestClient, headers: Headers) -> Any:
    answer = app.get(f"/me/activities/{KEY}", headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json().get("flight")


# --- Without a database ---


def test_the_example_is_the_body() -> None:
    body = ActivityFlightBody.model_validate(_load("activity-flight.json"))
    assert body.air == [(1, 3)]


def test_the_parts_in_the_air_are_cut_on_the_points_inside_them() -> None:
    times = [0.0, 300.0, 600.0, 900.0, 1200.0]
    parts = [
        KeptFlightPart(kind=kind, start_s=a, end_s=b)
        for kind, a, b in [
            ("foot", 0, 290),
            ("air", 290, 610),
            ("foot", 610, 890),
            ("air", 890, 1000),
            ("air", 1100, 1300),
        ]
    ]
    # The two last flights have one point each: no line, left out.
    assert air_legs(times, parts) == [(1, 2)]
    assert air_legs(times, []) == []


# --- In the database ---


def test_a_race_opened_whole_has_its_flights_and_its_two_times(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me, activity=FLIGHT)
    _stats(client, me, RACE)
    flight = _flight(client, me)
    assert flight["air"] == [[1, 3]]
    assert flight["split"]["foot"]["seconds"] == 600
    assert flight["split"]["foot"]["metres"] == 1900
    assert flight["split"]["air"]["seconds"] == 600
    assert flight["split"]["air"]["metres"] == 2100
    whole = client.get(f"/me/activities/{KEY}", headers=me).json()
    assert len(whole["track"]) == 5


def test_a_flight_without_parts_on_foot_or_without_figures_has_none(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me, activity=FLIGHT)
    assert _flight(client, me) is None
    _stats(client, me, [RACE[1]])
    assert _flight(client, me) is None


def test_another_sport_has_none(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    saved(client, me)
    _stats(client, me, RACE)
    # Left out of the answer, as the examples of before have it.
    assert "flight" not in client.get(f"/me/activities/{KEY}", headers=me).json()
