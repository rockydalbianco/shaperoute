"""The bests of the air (TASK-305 part R5a, ADR-0375): a flight's highest
point and top speed, kept from what the phone sends at the end, and the
owner's four bests from them and from the flights' metres and time."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_drawings import (
    KEY,
    OTHER_KEY,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    other,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.run_stats import (
    FLIGHT,
    FlightBestsBody,
    RunStatsRequestBody,
    flight_bests,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
THIRD_KEY = "0a1b2c3d4e5f6a7b"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def flown(
    app: TestClient, headers: Headers, key: str = KEY, days_later: int = 0
) -> dict[str, Any]:
    """The example run of My activities, as a flight."""
    return saved(app, headers, key, days_later=days_later, activity=FLIGHT)


def with_figures(
    app: TestClient, headers: Headers, key: str = KEY, **changes: Any
) -> Any:
    body = {**_load("flight-stats-request.json"), **changes}
    answer = app.put(f"/me/activities/{key}/stats", json=body, headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json()


def bests(app: TestClient, headers: Headers) -> dict[str, Any]:
    answer = app.get("/me/flight-bests", headers=headers)
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def test_the_examples_are_the_bodies() -> None:
    sent = RunStatsRequestBody.model_validate(_load("flight-stats-request.json"))
    assert (sent.max_alt_m, sent.top_speed_mps) == (2341, 16.94)
    example = FlightBestsBody.model_validate(_load("flight-bests.json"))
    assert example.fastest is None and example.highest is not None


@pytest.mark.parametrize(
    "changes",
    [
        {"max_alt_m": 10_001},
        {"max_alt_m": -1_001},
        {"top_speed_mps": -1},
        {"top_speed_mps": 100.5},
        {"top_speed_mps": float("nan")},
    ],
)
def test_what_the_phone_may_not_send(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(
            {**_load("flight-stats-request.json"), **changes}
        )


def test_the_bests_of_rows_the_first_flown_keeps_a_tie() -> None:
    first = datetime(2026, 11, 15, 9, 0, tzinfo=UTC)
    later = datetime(2026, 11, 16, 9, 0, tzinfo=UTC)
    rows: list[Any] = [
        {
            "key": OTHER_KEY,
            "started_at": later,
            "distance_m": 9000.0,
            "duration_s": 3600,
            "max_alt_m": 2000.0,
            "top_speed_mps": None,
        },
        {
            "key": KEY,
            "started_at": first,
            "distance_m": 4000.0,
            "duration_s": 3600,
            "max_alt_m": 2400.0,
            "top_speed_mps": 0.0,
        },
    ]
    found = flight_bests(rows)
    assert found.highest is not None and found.highest.id == KEY
    assert found.highest.value == 2400.0
    # The same time: the first flown keeps it.
    assert found.longest is not None and found.longest.id == KEY
    assert found.farthest is not None and found.farthest.id == OTHER_KEY
    # A top speed of nothing is no best.
    assert found.fastest is None
    assert flight_bests([]) == FlightBestsBody()


def test_a_flight_keeps_its_figures_and_gives_its_bests(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    assert bests(client, me) == {
        "highest": None,
        "longest": None,
        "farthest": None,
        "fastest": None,
    }
    run = flown(client, me)
    with_figures(client, me)
    found = bests(client, me)
    assert found["highest"]["value"] == 2341
    assert found["fastest"]["value"] == 16.94
    assert found["longest"]["value"] == run["duration_s"]
    assert found["farthest"]["value"] == pytest.approx(run["distance_m"])
    for best in found.values():
        assert best["id"] == KEY


def test_the_higher_and_faster_flight_wins(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    flown(client, me)
    with_figures(client, me, max_alt_m=1800, top_speed_mps=20.0)
    flown(client, me, OTHER_KEY, days_later=1)
    with_figures(client, me, OTHER_KEY, max_alt_m=2500.4, top_speed_mps=12.0)
    found = bests(client, me)
    assert (found["highest"]["id"], found["highest"]["value"]) == (OTHER_KEY, 2500)
    assert (found["fastest"]["id"], found["fastest"]["value"]) == (KEY, 20.0)
    # Sent again without them: the whole of it each time.
    with_figures(client, me, OTHER_KEY, max_alt_m=None, top_speed_mps=None)
    assert bests(client, me)["highest"]["id"] == KEY


def test_another_sport_keeps_none_of_them(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    saved(client, me)
    # A run sends them (an app that does not ask): ignored, not refused.
    stats = with_figures(client, me)
    assert "max_alt_m" not in stats and "top_speed_mps" not in stats
    flown(client, me, OTHER_KEY)
    found = bests(client, me)
    # Only the flight counts, and it sent no figures.
    assert found["highest"] is None and found["fastest"] is None
    assert found["longest"]["id"] == OTHER_KEY


def test_a_flight_deleted_takes_its_bests(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    flown(client, me)
    with_figures(client, me, max_alt_m=3000)
    flown(client, me, OTHER_KEY, days_later=1)
    with_figures(client, me, OTHER_KEY, max_alt_m=1500)
    assert bests(client, me)["highest"]["id"] == KEY
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    assert bests(client, me)["highest"]["id"] == OTHER_KEY


def test_only_ones_own(client: TestClient) -> None:  # noqa: F811
    me, them = signed_up(client), other(client)
    flown(client, me)
    with_figures(client, me)
    assert bests(client, them)["highest"] is None
    assert client.get("/me/flight-bests").status_code == 401
    # A flight of another's has no figures of mine to take.
    body = _load("flight-stats-request.json")
    answer = client.put(f"/me/activities/{KEY}/stats", json=body, headers=them)
    assert answer.status_code == 404
    flown(client, them, THIRD_KEY)
    assert bests(client, them)["highest"] is None
