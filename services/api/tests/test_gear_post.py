"""The gear of a post (TASK-486 part E, ADR-0393, the user's choice 6), in a
real PostgreSQL: GET /drawings/{id}/gear.

Whoever sees the post sees the items on its activity, with their totals; a
post one does not see is 404, as for nobody. The items «Hide from profile»
are not there, not even for their owner; one hidden after a report only for
its owner. A block keeps it apart either way.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient
from test_drawing_photos import (
    WallClock,
    client,  # noqa: F401  (the fixtures of the photos' tests)
    database,  # noqa: F401
    other,
    seen_by,
    signed_up,
    third,
    wall,  # noqa: F401
)
from test_gear import Headers, add, put_on
from test_moderation import block, post_of

from shaperoute_api.db import Database


def post_gear(app: TestClient, drawing_id: str, viewer: Headers) -> Any:
    return app.get(f"/drawings/{drawing_id}/gear", headers=viewer)


def test_whoever_sees_the_post_sees_its_gear(
    client: TestClient, wall: WallClock  # noqa: F811
) -> None:
    me = signed_up(client)
    you = other(client)
    shoes = add(client, me, limit_m=700_000, defaults=["running"])
    # The clock stands still in the tests: the helmet is added later.
    wall.t += timedelta(minutes=1)
    helmet = add(client, me, kind="helmet", brand="Petzl", model=None, name=None)
    add(client, me, brand="Not on this run")
    drawing_id = post_of(client, me)
    put_on(client, me, [helmet["id"], shoes["id"]])
    answer = post_gear(client, drawing_id, you)
    assert answer.status_code == 200, answer.text
    gear = answer.json()["gear"]
    # In use first, the oldest first: as the profile.
    assert [g["id"] for g in gear] == [shoes["id"], helmet["id"]]
    assert gear[0]["totals"]["activities"] == 1
    assert gear[0]["totals"]["distance_m"] > 0
    # What only its owner reads.
    assert {"off_profile", "limit_m", "defaults", "hidden"}.isdisjoint(gear[0])


def test_a_post_without_gear_is_empty(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    drawing_id = post_of(client, me)
    assert post_gear(client, drawing_id, other(client)).json() == {"gear": []}


def test_a_post_one_does_not_see_is_404(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    friend = third(client)
    item = add(client, me)
    drawing_id = post_of(client, me)
    put_on(client, me, [item["id"]])
    # For the followers: a stranger does not see it, its owner does.
    seen_by(client, me, "followers")
    assert post_gear(client, drawing_id, you).status_code == 404
    assert post_gear(client, drawing_id, me).status_code == 200
    seen_by(client, me, "everyone")
    block(client, friend, me)
    assert post_gear(client, drawing_id, friend).status_code == 404
    assert post_gear(client, str(uuid4()), you).status_code == 404
    assert post_gear(client, "not-an-id", you).status_code == 404


def test_hidden_items_stay_out(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    you = other(client)
    off = add(client, me, brand="Secret", off_profile=True)
    reported = add(client, me, brand="Reported")
    drawing_id = post_of(client, me)
    put_on(client, me, [off["id"], reported["id"]])
    with database.connect() as conn:
        conn.execute(
            "UPDATE gear SET hidden_at = now() WHERE id = %s", (reported["id"],)
        )
    # «Hide from profile»: not even for its owner; hidden after a report: only
    # its owner.
    mine = post_gear(client, drawing_id, me).json()["gear"]
    assert [g["id"] for g in mine] == [reported["id"]]
    assert post_gear(client, drawing_id, you).json() == {"gear": []}
