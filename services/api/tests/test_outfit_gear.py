"""An item tagged on a photo from its owner's gear (TASK-486 part F,
ADR-0393, the user's choice 3), in a real PostgreSQL.

The tag keeps `gear_id` when the item is its owner's, 422 when it is not.
An app of before, which sends no `gear_id`, leaves it as it was. Whoever
sees the photo gets `gear_id` when they would see the item: not one «Hide
from profile» or hidden after a report. Deleting the item leaves the tag,
without the link.
"""

from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient
from test_drawing_photos import (
    client,  # noqa: F401  (the fixtures of the photos' tests)
    database,  # noqa: F401
    other,
    wall,  # noqa: F401
)
from test_gear import add
from test_outfit_tags import google, item, on_photo, posted, put_tags  # noqa: F401

from shaperoute_api.db import Database
from shaperoute_api.outfit_tags import NOT_MY_GEAR


def test_an_item_of_ones_gear_is_kept_and_seen(
    client: TestClient, google: Any  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    shoes = add(client, me)
    (tag,) = put_tags(client, me, [item(gear_id=shoes["id"])])["tags"]
    assert tag["gear_id"] == shoes["id"]
    (seen,) = on_photo(client, other(client), drawing_id)
    assert seen["gear_id"] == shoes["id"]
    # A tag of before has none.
    (plain,) = put_tags(client, me, [item()])["tags"]
    assert plain["gear_id"] is None


def test_only_ones_own_gear(client: TestClient, google: Any) -> None:  # noqa: F811
    me, _ = posted(client)
    theirs = add(client, other(client))
    answer = client.put(
        "/me/activities/7c2e91a4b05d3f68/drawing/photos/1/tags",
        json={"tags": [item(gear_id=theirs["id"])]},
        headers=me,
    )
    assert answer.status_code == 422, answer.text
    assert answer.json()["error"]["message"] == NOT_MY_GEAR


def test_an_app_of_before_keeps_the_link(
    client: TestClient, google: Any  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    shoes = add(client, me)
    (tag,) = put_tags(client, me, [item(gear_id=shoes["id"])])["tags"]
    # Moved by an app that does not know gear_id: the link stays.
    (moved,) = put_tags(client, me, [item(id=tag["id"], x=0.2)])["tags"]
    assert moved["gear_id"] == shoes["id"] and moved["x"] == 0.2
    # Sent as null by an app that knows it: gone.
    (cleared,) = put_tags(client, me, [item(id=tag["id"], gear_id=None)])["tags"]
    assert cleared["gear_id"] is None


def test_hidden_items_are_not_linked_for_the_others(
    client: TestClient, database: Database, google: Any  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    off = add(client, me, brand="Secret", off_profile=True)
    reported = add(client, me, brand="Reported")
    put_tags(
        client,
        me,
        [item(gear_id=off["id"]), item(gear_id=reported["id"], x=0.1)],
    )
    with database.connect() as conn:
        conn.execute(
            "UPDATE gear SET hidden_at = now() WHERE id = %s", (reported["id"],)
        )
    them = other(client)
    assert [t["gear_id"] for t in on_photo(client, them, drawing_id)] == [None, None]
    # Its owner sees both links.
    assert [t["gear_id"] for t in on_photo(client, me, drawing_id)] == [
        off["id"],
        reported["id"],
    ]


def test_a_deleted_item_leaves_the_tag(
    client: TestClient, google: Any  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    shoes = add(client, me)
    put_tags(client, me, [item(gear_id=shoes["id"])])
    assert client.delete(f"/me/gear/{shoes['id']}", headers=me).status_code == 204
    (tag,) = on_photo(client, me, drawing_id)
    assert tag["gear_id"] is None and tag["brand"] == "Nike"
