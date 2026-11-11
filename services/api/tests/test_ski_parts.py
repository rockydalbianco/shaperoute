"""The parts of a day of skiing in the figures of its run (TASK-424 part
C2b, with TASK-429): sent with PUT /me/activities/{key}/stats, kept on the
clock of the run's track, the sum of the descents in every list of posts,
the parts whole on the post's page."""

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
    WallClock,
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
    MAX_SKI_PARTS,
    RunStatsRequestBody,
    SkiPartRequestBody,
    kept_ski,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
# The first point of the example run (activity-request.json), on the
# phone's clock: the parts of the example start there.
FIRST_S = 1_790_000_000.0
Headers = dict[str, str]
# An app that shows days of skiing says so (reads.py): an older one is
# shown none.
SKIING = {"X-MuW-Reads": "skiing"}


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text())


def with_parts(app: TestClient, headers: Headers, **changes: Any) -> Any:
    body = {**_load("ski-parts-request.json"), **changes}
    answer = app.put(f"/me/activities/{KEY}/stats", json=body, headers=headers)
    assert answer.status_code == 200, answer.text
    return answer.json()


@pytest.fixture(autouse=True)
def after_the_day(wall: WallClock) -> None:  # noqa: F811
    wall.t = datetime(2026, 10, 2, 21, 40, tzinfo=UTC)


# --- The contract, without a database ---


def test_the_example_is_a_request() -> None:
    request = RunStatsRequestBody.model_validate(_load("ski-parts-request.json"))
    assert request.ski_parts is not None
    assert [(p.kind, p.n) for p in request.ski_parts] == [
        ("lift", 1),
        ("descent", 1),
        ("lift", 2),
        ("descent", 2),
    ]


def test_a_listed_day_of_skiing_is_a_drawing() -> None:
    example = _load("drawing-ski.json")
    assert set(example) == set(DrawingBody.model_fields)
    listed = DrawingBody.model_validate(example)
    assert listed.ski_descents is not None
    assert (listed.ski_descents.metres, listed.ski_descents.moving_s) == (2900, 285)


@pytest.mark.parametrize(
    "changes",
    [
        {"kind": "walk"},
        {"n": 0},
        {"end_ms": 1_789_999_999_000},
        # Longer in movement than it lasts.
        {"moving_s": 400},
        {"metres": -1},
        {"height_m": 6_000},
        {"top_mps": 150},
        {"name": "Sella"},
    ],
)
def test_what_a_part_may_not_be(changes: dict[str, Any]) -> None:
    part = {**_load("ski-parts-request.json")["ski_parts"][1], **changes}
    with pytest.raises(ValidationError):
        SkiPartRequestBody.model_validate(part)


def test_the_parts_go_in_the_order_of_the_day_and_are_not_too_many() -> None:
    example = _load("ski-parts-request.json")
    parts = example["ski_parts"]
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(
            {**example, "ski_parts": [parts[1], parts[0]]}
        )
    with pytest.raises(ValidationError):
        RunStatsRequestBody.model_validate(
            {**example, "ski_parts": [parts[0]] * (MAX_SKI_PARTS + 1)}
        )


def test_the_descents_are_summed_and_the_times_put_on_the_track() -> None:
    request = RunStatsRequestBody.model_validate(_load("ski-parts-request.json"))
    kept = kept_ski(request.ski_parts, FIRST_S)
    assert kept["ski_descents"] == {"metres": 2900.0, "moving_s": 285.0}
    assert [(p["start_s"], p["end_s"]) for p in kept["ski_parts"]] == [
        (0.0, 300.0),
        (300.0, 420.0),
        (420.0, 720.0),
        (720.0, 900.0),
    ]
    # A part from before the first point the API kept starts with it.
    assert kept_ski(request.ski_parts, FIRST_S + 10)["ski_parts"][0]["start_s"] == 0.0
    # None, or none at all: nothing kept.
    for parts in (None, []):
        assert kept_ski(parts, FIRST_S) == {"ski_parts": None, "ski_descents": None}


# --- In the database ---


def test_a_day_of_skiing_keeps_its_parts_and_shows_its_descents(
    client: TestClient,  # noqa: F811
) -> None:
    me, them = signed_up(client), {**other(client), **SKIING}
    saved(client, me, activity="skiing")
    drawing_id = drawn(client, me)["id"]
    mine = with_parts(client, me)
    assert mine["ski_descents"] == {"metres": 2900.0, "moving_s": 285.0}
    assert [p["start_s"] for p in mine["ski_parts"]] == [0.0, 300.0, 420.0, 720.0]
    assert mine["kcal"] == 412
    # The page of the post: the parts whole, to whoever sees it.
    page = client.get(f"/drawings/{drawing_id}", headers=them)
    assert page.status_code == 200, page.text
    seen = page.json()["stats"]
    assert seen["ski_parts"] == mine["ski_parts"]
    assert seen["ski_descents"] == mine["ski_descents"]
    # The Feed and the profile: the descents' sum, for the calories.
    feed = client.get("/feed", headers=them).json()["posts"]
    (post,) = [p for p in feed if p["id"] == drawing_id]
    assert post["ski_descents"] == {"metres": 2900.0, "moving_s": 285.0}
    assert "ski_parts" not in post
    listed = client.get(
        f"/users/{public_id(client, me)}/drawings", headers=them
    ).json()["drawings"]
    assert listed[0]["ski_descents"] == {"metres": 2900.0, "moving_s": 285.0}


def test_without_parts_there_are_none(client: TestClient) -> None:  # noqa: F811
    me, them = signed_up(client), {**other(client), **SKIING}
    saved(client, me, activity="skiing")
    drawing_id = drawn(client, me)["id"]
    # Before any figure, and with figures but no parts.
    feed = client.get("/feed", headers=them).json()["posts"]
    assert all(post["ski_descents"] is None for post in feed)
    stats = with_parts(client, me, ski_parts=None)
    assert (stats["ski_parts"], stats["ski_descents"]) == (None, None)
    # Sent again without them, after them: the whole of it each time.
    with_parts(client, me)
    again = with_parts(client, me, ski_parts=[])
    assert again["ski_descents"] is None
    seen = client.get(f"/drawings/{drawing_id}", headers=them).json()["stats"]
    assert seen is None or seen["ski_parts"] is None
