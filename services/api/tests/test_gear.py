"""A member's gear (TASK-486, ADR-0393, docs/API.md, «Gear»), in a real
PostgreSQL.

An item is kept whole by its owner, with words the filter allows and no
address; its photo comes back upright and smaller, without the phone's
file. Hooked to activities, its totals are the server's metres and seconds
of those runs. The others see it on the profile unless it is «Hide from
profile», hidden after a report, or a block keeps the two apart; what only
its owner reads never reaches them. Retired, it keeps its totals and its
defaults go. Deleting an activity, an item or the account takes the links.
"""

from __future__ import annotations

import base64
import io
from typing import Any, get_args
from uuid import uuid4

from fastapi.testclient import TestClient
from PIL import Image
from test_drawing_photos import (
    KEY,
    PHOTO,
    WallClock,
    client,  # noqa: F401  (the fixtures of the photos' tests)
    database,  # noqa: F401
    other,
    saved,
    signed_up,
    third,
    wall,  # noqa: F401
)
from test_moderation import block, rows
from test_report_email import links

from shaperoute_api.db import Database, migrations
from shaperoute_api.gear import (
    GEAR_KINDS,
    MAX_ON_ACTIVITY,
    NO_LINKS,
    PHOTO_SIDE,
    GearKind,
)
from shaperoute_api.report_email import apply, email_of, reported

Headers = dict[str, str]
OTHER_KEY = "9d3f02b6c71e4a58"
(GEAR_SQL,) = [p for p in migrations() if p.name.endswith("_gear.sql")]


def shoes(**change: Any) -> dict[str, Any]:
    return {
        "kind": "shoes",
        "brand": "Nike",
        "model": "Pegasus 41",
        "name": "The red ones",
        "bought_on": "2025-03-14",
        "note": "Bought in Milan.\nRan the Rome half in them.",
        **change,
    }


def add(
    client: TestClient,  # noqa: F811
    headers: Headers,
    status: int = 201,
    **change: Any,
) -> Any:
    answer = client.post("/me/gear", json=shoes(**change), headers=headers)
    assert answer.status_code == status, answer.text
    return answer.json()


def public_id(client: TestClient, headers: Headers) -> str:  # noqa: F811
    return str(client.get("/me", headers=headers).json()["public_id"])


def profile(client: TestClient, viewer: Headers, owner: Headers) -> Any:  # noqa: F811
    return client.get(f"/users/{public_id(client, owner)}/gear", headers=viewer)


def put_on(
    client: TestClient,  # noqa: F811
    headers: Headers,
    ids: list[str],
    key: str = KEY,
    status: int = 200,
) -> Any:
    answer = client.put(
        f"/me/activities/{key}/gear", json={"gear_ids": ids}, headers=headers
    )
    assert answer.status_code == status, answer.text
    return answer.json()


def run_numbers(database: Database, key: str) -> tuple[int, int]:  # noqa: F811
    (row,) = rows(
        database, "SELECT distance_m, duration_s FROM runs WHERE key = %s", key
    )
    return int(row["distance_m"]), int(row["duration_s"])


# --- The lists ---


def test_the_migration_holds_the_same_kinds() -> None:
    sql = GEAR_SQL.read_text(encoding="utf-8").split("CREATE TABLE gear_photos")[0]
    for kind in GEAR_KINDS:
        assert f"'{kind}'" in sql
    assert GEAR_KINDS == get_args(GearKind)
    assert len(set(GEAR_KINDS)) == len(GEAR_KINDS)


# --- An item ---


def test_an_item_is_added_changed_and_deleted(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    item = add(client, me, defaults=["running", "hiking", "running"])
    assert item["kind"] == "shoes"
    assert (item["brand"], item["model"], item["name"]) == (
        "Nike",
        "Pegasus 41",
        "The red ones",
    )
    assert item["bought_on"] == "2025-03-14"
    assert item["note"].endswith("Rome half in them.")
    assert item["totals"] == {"distance_m": 0, "duration_s": 0, "activities": 0}
    assert item["defaults"] == ["hiking", "running"]
    assert item["off_profile"] is False and item["retired"] is False
    assert "photo_url" not in item

    changed = client.put(
        f"/me/gear/{item['id']}",
        json=shoes(kind="boots", brand="Scarpa", model=None, limit_m=700_000),
        headers=me,
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["kind"] == "boots"
    assert "model" not in changed.json()
    assert changed.json()["limit_m"] == 700_000
    assert changed.json()["defaults"] == []

    assert [g["id"] for g in client.get("/me/gear", headers=me).json()["gear"]] == [
        item["id"]
    ]
    assert client.delete(f"/me/gear/{item['id']}", headers=me).status_code == 204
    assert client.get("/me/gear", headers=me).json() == {"gear": []}
    assert client.delete(f"/me/gear/{item['id']}", headers=me).status_code == 404


def test_every_kind_is_kept(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    for kind in GEAR_KINDS:
        assert add(client, me, kind=kind)["kind"] == kind
    assert add(client, me, 422, kind="spaceship")


def test_the_words_are_checked(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    assert add(client, me, 422, brand="   ")["error"]["message"] == "Say the brand."
    link = add(client, me, 422, note="Cheaper at https://shoes.example/sale")
    assert link["error"]["message"] == NO_LINKS
    assert add(client, me, 422, name="Red\tones")["error"]["code"] == "invalid_request"
    assert add(client, me, 422, bought_on="2999-01-01")
    assert add(client, me, 422, bought_on="1900-01-01")
    assert add(client, me, 422, limit_m=10)
    assert add(client, me, 422, note="x" * 501)
    # Blank optional words are none.
    blank = add(client, me, model="  ", name="", note=" ")
    assert {"model", "name", "note"}.isdisjoint(blank)


def test_the_comment_filter_refuses_its_words(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    answer = add(client, me, 422, note="idiot")
    assert answer["error"]["code"] == "comment_rejected"


def test_only_its_owner_changes_an_item(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    item = add(client, me)
    path = f"/me/gear/{item['id']}"
    assert client.put(path, json=shoes(), headers=you).status_code == 404
    assert client.delete(path, headers=you).status_code == 404
    assert client.get("/me/gear", headers=you).json() == {"gear": []}
    assert (
        client.put(f"/me/gear/{uuid4()}", json=shoes(), headers=me).status_code == 404
    )


def test_retired_keeps_its_day_and_drops_its_defaults(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    me = signed_up(client)
    item = add(client, me, defaults=["running"])
    newer = add(client, me, brand="Hoka")
    path = f"/me/gear/{item['id']}"
    retired = client.put(
        path, json=shoes(retired=True, defaults=["running"]), headers=me
    ).json()
    assert retired["retired"] is True and retired["defaults"] == []
    query = "SELECT retired_at FROM gear WHERE id = %s"
    (first,) = rows(database, query, item["id"])
    wall.t = wall.t.replace(hour=wall.t.hour + 1)
    client.put(path, json=shoes(retired=True), headers=me)
    (again,) = rows(database, query, item["id"])
    assert again == first
    # In use first.
    listed = client.get("/me/gear", headers=me).json()["gear"]
    assert [g["id"] for g in listed] == [newer["id"], item["id"]]
    back = client.put(path, json=shoes(), headers=me).json()
    assert back["retired"] is False


# --- The photo ---


def test_a_photo_comes_back_upright_and_smaller(
    client: TestClient,  # noqa: F811
) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    item = add(client, me)
    image = {"image": base64.b64encode(PHOTO).decode("ascii")}
    answer = client.put(f"/me/gear/{item['id']}/photo", json=image, headers=me)
    assert answer.status_code == 200, answer.text
    url = answer.json()["photo_url"]
    assert url.startswith(f"/gear/{item['id']}/photo?v=")
    jpeg = client.get(url, headers=you)
    assert jpeg.status_code == 200
    assert jpeg.headers["content-type"] == "image/jpeg"
    picture = Image.open(io.BytesIO(jpeg.content))
    assert picture.format == "JPEG"
    assert max(picture.size) == PHOTO_SIDE
    assert picture.size == (PHOTO_SIDE, PHOTO_SIDE * 1200 // 1600)
    assert "exif" not in picture.info
    # Only its owner puts or removes it.
    assert (
        client.put(f"/me/gear/{item['id']}/photo", json=image, headers=you).status_code
        == 404
    )
    assert client.delete(f"/me/gear/{item['id']}/photo", headers=you).status_code == 404
    assert client.delete(f"/me/gear/{item['id']}/photo", headers=me).status_code == 204
    assert client.get(url, headers=you).status_code == 404
    assert "photo_url" not in client.get(f"/gear/{item['id']}", headers=me).json()


def test_not_a_picture_is_refused(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    item = add(client, me)
    image = {"image": base64.b64encode(b"not a picture").decode("ascii")}
    answer = client.put(f"/me/gear/{item['id']}/photo", json=image, headers=me)
    assert answer.status_code == 422


# --- On activities ---


def test_the_totals_are_the_server_s(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, OTHER_KEY)
    pegasus = add(client, me)
    helmet = add(client, me, kind="helmet", brand="Petzl")
    on = put_on(client, me, [pegasus["id"], helmet["id"], pegasus["id"]])
    assert {g["id"] for g in on["gear"]} == {pegasus["id"], helmet["id"]}
    put_on(client, me, [pegasus["id"]], OTHER_KEY)
    one_m, one_s = run_numbers(database, KEY)
    two_m, two_s = run_numbers(database, OTHER_KEY)
    (mine,) = [
        g
        for g in client.get("/me/gear", headers=me).json()["gear"]
        if g["id"] == pegasus["id"]
    ]
    assert mine["totals"] == {
        "distance_m": one_m + two_m,
        "duration_s": one_s + two_s,
        "activities": 2,
    }
    # The whole list: the helmet off the first activity.
    put_on(client, me, [pegasus["id"]])
    read = client.get(f"/me/activities/{KEY}/gear", headers=me).json()["gear"]
    assert [g["id"] for g in read] == [pegasus["id"]]
    helmet_now = client.get(f"/gear/{helmet['id']}", headers=me).json()
    assert helmet_now["totals"]["activities"] == 0
    # A deleted activity takes its links, and its metres.
    assert client.delete(f"/me/activities/{OTHER_KEY}", headers=me).status_code == 204
    after = client.get(f"/gear/{pegasus['id']}", headers=me).json()
    assert after["totals"]["distance_m"] == one_m


def test_only_ones_own_gear_goes_on_ones_own_activity(
    client: TestClient,  # noqa: F811
) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    saved(client, me)
    saved(client, you)
    yours = add(client, you)
    mine = add(client, me)
    put_on(client, me, [yours["id"]], status=422)
    put_on(client, me, [mine["id"]], key="0000000000000000", status=404)
    too_many = [add(client, me, brand=f"B{i}")["id"] for i in range(MAX_ON_ACTIVITY)]
    put_on(client, me, [*too_many, mine["id"]], status=422)
    put_on(client, me, [])


# --- Seen by the others ---


def test_the_others_see_it_on_the_profile(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    seen = add(client, me, limit_m=700_000, defaults=["running"])
    hidden = add(client, me, brand="Secret", off_profile=True)
    answer = profile(client, you, me)
    assert answer.status_code == 200, answer.text
    (theirs,) = answer.json()["gear"]
    assert theirs["id"] == seen["id"]
    # What only its owner reads.
    assert {"off_profile", "limit_m", "defaults", "hidden"}.isdisjoint(theirs)
    assert client.get(f"/gear/{hidden['id']}", headers=you).status_code == 404
    assert client.get(f"/gear/{seen['id']}", headers=you).status_code == 200
    # Its owner sees its profile as the others do.
    assert [g["id"] for g in profile(client, me, me).json()["gear"]] == [seen["id"]]
    assert client.get(f"/users/{uuid4()}/gear", headers=you).status_code == 404
    assert client.get("/users/not-an-id/gear", headers=you).status_code == 404


def test_a_block_keeps_it_apart(client: TestClient) -> None:  # noqa: F811
    me = signed_up(client)
    you = other(client)
    item = add(client, me)
    block(client, you, me)
    assert profile(client, you, me).status_code == 404
    assert profile(client, me, you).status_code == 404
    assert client.get(f"/gear/{item['id']}", headers=you).status_code == 404


def test_a_reported_item_is_hidden_from_the_others(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    me = signed_up(client)
    you = other(client)
    friend = third(client)
    item = add(client, me)
    answer = client.post(
        "/reports",
        json={"kind": "gear", "id": item["id"], "reason": "offensive"},
        headers=you,
    )
    assert answer.status_code == 204, answer.text
    own = client.post(
        "/reports",
        json={"kind": "gear", "id": item["id"], "reason": "spam"},
        headers=me,
    )
    assert own.status_code == 422
    (kept,) = rows(database, "SELECT id FROM reports WHERE kind = 'gear'")
    with database.connect() as conn:
        report = reported(conn, kept["id"])
    assert report is not None
    assert report.kind == "gear"
    assert "Brand: Nike" in report.lines and "Photo: no" in report.lines
    link = links().new("hide", "gear", report.target, wall())
    email = email_of(report, links().url(link), link.expires)
    assert "gear item" in email.subject
    with database.connect() as conn:
        assert apply(conn, link, wall()) == "done"
    assert profile(client, friend, me).json() == {"gear": []}
    assert client.get(f"/gear/{item['id']}", headers=friend).status_code == 404
    mine = client.get("/me/gear", headers=me).json()["gear"]
    assert mine[0]["hidden"] is True
    assert [g["id"] for g in profile(client, me, me).json()["gear"]] == [item["id"]]


# --- Deleting ---


def test_a_deleted_account_takes_its_gear(
    client: TestClient, database: Database  # noqa: F811
) -> None:
    me = signed_up(client)
    saved(client, me)
    item = add(client, me, defaults=["cycling"])
    image = {"image": base64.b64encode(PHOTO).decode("ascii")}
    client.put(f"/me/gear/{item['id']}/photo", json=image, headers=me)
    put_on(client, me, [item["id"]])
    assert client.delete("/me", headers=me).status_code == 204
    for table in ("gear", "gear_photos", "activity_gear", "gear_defaults"):
        assert rows(database, f"SELECT 1 FROM {table}") == [], table
