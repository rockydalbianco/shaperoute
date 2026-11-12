"""A race on foot and in the air, hike & fly (TASK-305 part R6a, ADR-0375):
a flight's parts kept from what the phone sends at the end, the two kinds
added up in every list of posts, only for a flight."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_drawings import (
    KEY,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    drawn,
    other,
    public_id,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.drawings import DrawingBody
from shaperoute_api.run_stats import (
    FLIGHT,
    MAX_FLIGHT_PARTS,
    FlightSplitBody,
    RunStatsRequestBody,
    kept_flight_parts,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# The first part of the example starts here, on the phone's clock.
EXAMPLE_FIRST_S = 1_794_470_400.0
# An app that shows flights says so (reads.py): an older one is shown none.
FLYING = {"X-MuW-Reads": FLIGHT}


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def request(**changes: Any) -> dict[str, Any]:
    return {**_load("flight-parts-request.json"), **changes}


def part(**changes: Any) -> dict[str, Any]:
    return {**_load("flight-parts-request.json")["flight_parts"][0], **changes}


def with_parts(app: TestClient, headers: Headers, **changes: Any) -> Any:
    answer = app.put(
        f"/me/activities/{KEY}/stats", json=request(**changes), headers=headers
    )
    assert answer.status_code == 200, answer.text
    return answer.json()


# --- The contract, without a database ---


def test_the_examples_are_the_bodies() -> None:
    sent = RunStatsRequestBody.model_validate(request())
    assert sent.flight_parts is not None
    assert [p.kind for p in sent.flight_parts] == ["foot", "air", "foot"]
    FlightSplitBody.model_validate(_load("flight-split.json"))
    assert set(_load("flight-split.json")["foot"]) == set(
        FlightSplitBody.model_fields["foot"].annotation.model_fields  # type: ignore[union-attr]
    )
    assert "flight_split" in DrawingBody.model_fields


def test_the_parts_are_added_up_and_put_on_the_track() -> None:
    sent = RunStatsRequestBody.model_validate(request())
    kept = kept_flight_parts(sent.flight_parts, EXAMPLE_FIRST_S)
    assert kept["flight_split"] == _load("flight-split.json")
    assert [(p["kind"], p["start_s"], p["end_s"]) for p in kept["flight_parts"]] == [
        ("foot", 0.0, 7120.0),
        ("air", 7120.0, 13330.0),
        ("foot", 13330.0, 13530.0),
    ]
    # A part may start before the first point the API kept.
    early = kept_flight_parts(sent.flight_parts, EXAMPLE_FIRST_S + 100)
    assert early["flight_parts"][0]["start_s"] == 0.0


def test_only_air_or_only_foot_is_no_split() -> None:
    sent = RunStatsRequestBody.model_validate(request())
    assert sent.flight_parts is not None
    air = [p for p in sent.flight_parts if p.kind == "air"]
    kept = kept_flight_parts(air, EXAMPLE_FIRST_S)
    assert kept["flight_split"] is None
    assert len(kept["flight_parts"]) == 1
    assert kept_flight_parts([], EXAMPLE_FIRST_S) == {
        "flight_parts": None,
        "flight_split": None,
    }
    assert kept_flight_parts(None, EXAMPLE_FIRST_S)["flight_split"] is None


@pytest.mark.parametrize(
    "changes",
    [
        {"kind": "lift"},
        {"end_ms": 1_794_470_399_000},
        {"moving_s": 9_000},
        {"metres": -1},
        {"climb_m": 10_001},
        {"max_alt_m": 10_001},
        {"speed": 3},
    ],
)
def test_what_a_part_may_not_be(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(request(flight_parts=[part(**changes)]))


def test_the_parts_go_in_the_flight_order_and_are_not_too_many() -> None:
    parts = _load("flight-parts-request.json")["flight_parts"]
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(request(flight_parts=parts[::-1]))
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(
            request(flight_parts=[parts[0]] * (MAX_FLIGHT_PARTS + 1))
        )


# --- In the database ---


def test_a_flight_keeps_its_parts_and_shows_the_two_times(
    client: TestClient,  # noqa: F811
) -> None:
    me, them = signed_up(client), {**other(client), **FLYING}
    saved(client, me, activity=FLIGHT)
    drawing_id = drawn(client, me)["id"]
    mine = with_parts(client, me)
    split = _load("flight-split.json")
    assert mine["flight_split"] == split
    assert [p["kind"] for p in mine["flight_parts"]] == ["foot", "air", "foot"]
    # The page of the post: the parts whole, to whoever sees it.
    page = client.get(f"/drawings/{drawing_id}", headers=them)
    assert page.status_code == 200, page.text
    seen = page.json()["stats"]
    assert seen["flight_parts"] == mine["flight_parts"]
    # The Feed and the profile: the two kinds added up.
    feed = client.get("/feed", headers=them).json()["posts"]
    (post,) = [p for p in feed if p["id"] == drawing_id]
    assert post["flight_split"] == split
    assert "flight_parts" not in post
    listed = client.get(
        f"/users/{public_id(client, me)}/drawings", headers=them
    ).json()["drawings"]
    assert listed[0]["flight_split"] == split
    # Sent again without them: the whole of it each time.
    again = with_parts(client, me, flight_parts=None)
    assert (again["flight_parts"], again["flight_split"]) == (None, None)
    feed = client.get("/feed", headers=them).json()["posts"]
    (post,) = [p for p in feed if p["id"] == drawing_id]
    assert post["flight_split"] is None


def test_another_sport_keeps_none_of_them(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    saved(client, me)
    drawing_id = drawn(client, me)["id"]
    # A run sends them (an app that does not ask): ignored, not refused.
    stats = with_parts(client, me)
    assert (stats["flight_parts"], stats["flight_split"]) == (None, None)
    feed = client.get("/feed", headers=me).json()["posts"]
    (post,) = [p for p in feed if p["id"] == drawing_id]
    assert post["flight_split"] is None
