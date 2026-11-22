"""A race on foot and in the air opened from the Feed or a profile
(TASK-305 part R6e, ADR-0375): GET /drawings/{id} gives its parts in the
air as stretches of the drawing's track and the two kinds added up, as
GET /me/activities/{key} does, so that the app draws the post's line in
two colours; left out for any other drawing, and when the drawing's line
has not the run's points."""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient
from test_activity_flight import RACE, _stats
from test_drawings import (
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    other,
    published,
    saved,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api.activities import ActivityDetailBody
from shaperoute_api.db import Database
from shaperoute_api.drawings import DrawingDetailBody
from shaperoute_api.run_stats import FLIGHT

Headers = dict[str, str]
# An app that shows flights says so (reads.py): an older one finds no post
# of a flight.
READS = {"X-MuW-Reads": "paragliding"}


def _seen(app: TestClient, headers: Headers, drawing_id: str) -> dict[str, Any]:
    answer = app.get(f"/drawings/{drawing_id}", headers={**headers, **READS})
    assert answer.status_code == 200, answer.text
    body: dict[str, Any] = answer.json()
    return body


def test_the_answers_say_their_fields() -> None:
    # Leaving a null `flight` out keeps each answer's schema its own fields
    # (openapi.json), not any object.
    for model in (DrawingDetailBody, ActivityDetailBody):
        schema = model.model_json_schema(mode="serialization")
        assert {"track", "flight"} <= set(schema["properties"]), model


def test_a_race_post_has_its_flights_on_its_line(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me, activity=FLIGHT)
    _stats(client, me, RACE)
    drawing = published(client, me)
    # The others see it as its owner does.
    for headers in (me, other(client)):
        seen = _seen(client, headers, drawing["id"])
        assert len(seen["track"]) == 5
        assert seen["flight"]["air"] == [[1, 3]]
        assert seen["flight"]["split"]["foot"]["seconds"] == 600
        assert seen["flight"]["split"]["air"]["metres"] == 2100


def test_a_flight_without_parts_on_foot_has_none(
    client: TestClient,  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me, activity=FLIGHT)
    drawing = published(client, me)
    assert "flight" not in _seen(client, me, drawing["id"])
    _stats(client, me, [RACE[1]])
    assert "flight" not in _seen(client, me, drawing["id"])


def test_another_sport_has_none(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    saved(client, me)
    _stats(client, me, RACE)
    drawing = published(client, me)
    assert "flight" not in _seen(client, me, drawing["id"])


def test_a_line_without_the_run_s_points_has_none(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me, activity=FLIGHT)
    _stats(client, me, RACE)
    drawing = published(client, me)
    # A drawing kept on a line of other points (an old cut one, ADR-0330):
    # the stretches would fall elsewhere, so none.
    with database.connect() as conn:
        conn.execute(
            "UPDATE drawings SET track = ST_RemovePoint(track, 2) WHERE id = %s",
            (drawing["id"],),
        )
    seen = _seen(client, me, drawing["id"])
    assert len(seen["track"]) == 4
    assert "flight" not in seen
