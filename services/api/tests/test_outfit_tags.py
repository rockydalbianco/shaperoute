"""The items a member tags on the photos of its posts (TASK-394, ADR-0333,
docs/API.md, «Outfit tags»), in a real PostgreSQL, with Web Risk fake.

The owner keeps the list of a photo whole: an item kept keeps its counts,
one left out goes with them; at most 5 on a photo and 10 in a post. A link
is cleaned, and refused when it is not https on a domain, a shortener, a
blocked domain or listed by Web Risk; without Web Risk only the shops of
Style. An address or a word of the filter in the brand is refused. Who does
not see the photo does not see its items; the others see them without the
link, `hidden` and the totals, which only the owner gets; a hidden item only
its owner sees. A photo replaced or removed, or a drawing back to «Only
me», takes its items along; a new order of the photos does not. «Shop»
checks the link again. The counts keep nothing personal, and the owner's
own touches are not counted. Reported, an item is hidden alone."""

from __future__ import annotations

import json
import re
from typing import Any, get_args
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from test_drawing_photos import (
    FIXTURES,
    KEY,
    PHOTO,
    SMALL,
    WallClock,
    client,  # noqa: F401  (the fixtures of the photos' tests)
    code,
    database,  # noqa: F401
    message,
    other,
    photo_path,
    put_photo,
    saved,
    seen_by,
    signed_up,
    third,
    wall,  # noqa: F401
)
from test_drawings import follows
from test_report_email import links
from test_web_risk import FakeGoogle

from shaperoute_api import drawings, outfit_tags
from shaperoute_api.db import Database
from shaperoute_api.outfit_tags import (
    MAX_IN_POST,
    MAX_ON_PHOTO,
    NO_PHOTO,
    NOT_ON_PHOTO,
    OutfitTagsRequestBody,
)
from shaperoute_api.report_email import apply, email_of, reported
from shaperoute_api.schemas import OutfitTagReason
from shaperoute_api.web_risk import WebRisk

Headers = dict[str, str]
PERSONAL = ("user", "account", "ip", "address", "phone", "device", "agent", "email")
NIKE = "https://www.nike.com/it/t/pegasus-41?utm_source=instagram&size=44#reviews"
NIKE_CLEAN = "https://www.nike.com/it/t/pegasus-41?size=44"
BAD = "https://login.bad-shoes.test/sale"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def item(**change: Any) -> dict[str, Any]:
    return {"x": 0.5, "y": 0.5, "item": "shoes", "brand": "Nike", **change}


def tags_path(n: int = 1, key: str = KEY) -> str:
    return f"/me/activities/{key}/drawing/photos/{n}/tags"


def put_tags(
    client: TestClient,  # noqa: F811
    headers: Headers,
    tags: list[dict[str, Any]],
    n: int = 1,
    status: int = 200,
) -> Any:
    answer = client.put(tags_path(n), json={"tags": tags}, headers=headers)
    assert answer.status_code == status, answer.text
    return answer.json()


def risk_of(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    google: FakeGoogle | None = None,
) -> FakeGoogle:
    """The app's Web Risk on a fake Google that lists BAD's host."""
    google = google or FakeGoogle(listed=["login.bad-shoes.test/"])
    risk = WebRisk(google, wall)
    risk.update()
    client.app.state.web_risk = risk  # type: ignore[attr-defined]
    return google


def posted(
    client: TestClient,  # noqa: F811
    visibility: str = "everyone",
    photos: tuple[int, ...] = (1,),
) -> tuple[Headers, str]:
    """An owner with a drawing others see and its photos; its id."""
    me = signed_up(client)
    saved(client, me)
    drawing_id = str(seen_by(client, me, visibility)["id"])
    for n in photos:
        put_photo(client, me, n)
    return me, drawing_id


def on_photo(
    client: TestClient,  # noqa: F811
    headers: Headers,
    drawing_id: str,
    n: int = 1,
) -> list[dict[str, Any]]:
    answer = client.get(f"/drawings/{drawing_id}", headers=headers)
    assert answer.status_code == 200, answer.text
    (photo,) = [p for p in answer.json()["photos"] if p["n"] == n]
    return list(photo["outfit_tags"])


def rows(database: Database, sql: str, *values: Any) -> list[Any]:  # noqa: F811
    with database.connect() as conn:
        return conn.execute(sql, values).fetchall()


@pytest.fixture
def google(client: TestClient, wall: WallClock) -> FakeGoogle:  # noqa: F811
    return risk_of(client, wall)


# --- The contract ---


def test_the_example_of_shared_types_is_a_request() -> None:
    body = OutfitTagsRequestBody.model_validate(_load("outfit-tags-request.json"))
    assert len(body.tags) <= MAX_ON_PHOTO


def test_the_lists_are_the_apps() -> None:
    """packages/shared-types holds the items and the reasons in the same
    order, and the limits."""
    source = (FIXTURES.parent / "src" / "index.ts").read_text(encoding="utf-8")
    for name, values in (
        ("OUTFIT_ITEMS", outfit_tags.OutfitItem),
        ("OUTFIT_TAG_REASONS", OutfitTagReason),
    ):
        match = re.search(rf"export const {name} = \[([^\]]*)\]", source)
        assert match is not None, name
        found = tuple(re.findall(r'"([a-z_]+)"', match.group(1)))
        assert found == get_args(values)
    for name, value in (
        ("OUTFIT_TAGS_ON_PHOTO", MAX_ON_PHOTO),
        ("OUTFIT_TAGS_IN_POST", MAX_IN_POST),
        ("OUTFIT_BRAND_MAX_LENGTH", outfit_tags.MAX_BRAND_LENGTH),
        ("OUTFIT_MODEL_MAX_LENGTH", outfit_tags.MAX_MODEL_LENGTH),
    ):
        assert f"export const {name} = {value};" in source
    # The places of the photos, which this module cannot import.
    assert outfit_tags.MAX_PLACE == drawings.MAX_PHOTOS


# --- Keeping them ---


def test_the_example_is_kept_cleaned(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    request = _load("outfit-tags-request.json")
    shoes, jacket = put_tags(client, me, request["tags"])["tags"]
    assert shoes["url"] == (
        "https://www.nike.com/it/t/pegasus-41-scarpa-da-running-su-strada-uomo"
        "?size=44"
    )
    assert shoes["store"] == "nike.com"
    assert (shoes["product_name"], jacket["product_name"]) == ("Pegasus 41", None)
    assert (jacket["store"], jacket["url"]) == (None, None)
    for kept in (shoes, jacket):
        assert (kept["hidden"], kept["opens"], kept["shops"]) == (False, 0, 0)
    # The owner sees them as the PUT answered, in My activities too.
    assert on_photo(client, me, drawing_id) == [shoes, jacket]
    mine = client.get(f"/me/activities/{KEY}/drawing", headers=me).json()
    assert mine["photos"][0]["outfit_tags"] == [shoes, jacket]


def test_the_others_see_them_without_link_nor_totals(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    (shoes,) = put_tags(client, me, [item(url=NIKE, product_name="Pegasus 41")])["tags"]
    them = other(client)
    (seen,) = on_photo(client, them, drawing_id)
    assert seen == shoes | {"url": None, "opens": None, "shops": None}
    feed = client.get("/feed", headers=them).json()
    (post,) = [p for p in feed["posts"] if p["id"] == drawing_id]
    assert post["photos"][0]["outfit_tags"] == [seen]
    profile = client.get(f"/users/{post['author']['public_id']}/drawings", headers=them)
    assert profile.json()["drawings"][0]["photos"][0]["outfit_tags"] == [seen]
    # The owner, in the feed, sees its totals.
    mine = client.get("/feed", headers=me).json()["posts"][0]
    assert mine["photos"][0]["outfit_tags"] == [shoes]


def test_who_does_not_see_the_photo_does_not_see_its_items(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, drawing_id = posted(client, "followers")
    (shoes,) = put_tags(client, me, [item(url=NIKE)])["tags"]
    stranger = other(client)
    assert client.get(f"/drawings/{drawing_id}", headers=stranger).status_code == 404
    for action in ("open", "shop"):
        answer = client.post(f"/outfit-tags/{shoes['id']}/{action}", headers=stranger)
        assert answer.status_code == 404
    follower = third(client)
    follows(client, follower, me)
    assert [t["id"] for t in on_photo(client, follower, drawing_id)] == [shoes["id"]]
    shop = client.post(f"/outfit-tags/{shoes['id']}/shop", headers=follower)
    assert shop.json() == {"url": NIKE_CLEAN}
    assert (
        client.post(f"/outfit-tags/{uuid4()}/open", headers=follower).status_code == 404
    )
    assert client.post(f"/outfit-tags/{shoes['id']}/open").status_code == 401


REFUSED: list[tuple[dict[str, Any], OutfitTagReason]] = [
    (item(url="http://www.nike.com/it/"), "not_https"),
    (item(url="https://me@www.nike.com/"), "not_https"),
    (item(url="https://www.nike.com:8443/"), "not_https"),
    (item(url="https://93.184.216.34/shoes"), "not_https"),
    (item(url="https://bit.ly/3xYz"), "shortened"),
    (item(url="https://www.spam-shoes.test/x"), "blocked"),
    (item(url="https://shop.spam-shoes.test/x"), "blocked"),
    (item(url=BAD), "blocked"),
    (item(brand="nike.com"), "link_in_text"),
    (item(product_name="see www.nike"), "link_in_text"),
    (item(brand="merda"), "words"),
]


@pytest.mark.parametrize(("tag", "reason"), REFUSED)
def test_what_cannot_be_kept_is_refused_with_its_reason(
    client: TestClient,  # noqa: F811
    google: FakeGoogle,
    database: Database,  # noqa: F811
    tag: dict[str, Any],
    reason: str,
) -> None:
    me, _ = posted(client)
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO outfit_blocked_domains (domain, note)"
            " VALUES ('spam-shoes.test', 'reported')"
        )
    answer = client.put(tags_path(), json={"tags": [tag]}, headers=me)
    assert answer.status_code == 422, answer.text
    assert code(answer) == "outfit_tag_rejected"
    assert answer.json()["error"]["reason"] == reason
    assert message(answer) == outfit_tags.REJECTED[reason]  # type: ignore[index]
    assert rows(database, "SELECT 1 FROM drawing_outfit_tags") == []


def test_web_risk_gets_hash_prefixes_only(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, _ = posted(client)
    put_tags(client, me, [item(url=BAD)], status=422)
    (shoes,) = put_tags(client, me, [item(url=NIKE)])["tags"]
    client.post(f"/outfit-tags/{shoes['id']}/shop", headers=other(client))
    assert google.searches
    sent = [repr(call) for call in google.diffs + google.searches]
    for prefix, _ in google.searches:
        assert len(prefix) == 4
    for piece in ("bad-shoes", "nike", "pegasus", "sale", "https"):
        assert all(piece not in call for call in sent)


def test_without_web_risk_only_the_shops_of_style(
    client: TestClient,  # noqa: F811
) -> None:
    me, _ = posted(client)
    zalando = "https://www.zalando.it/nike-pegasus-41-n1242a2n0-q11.html"
    (kept,) = put_tags(client, me, [item(url=zalando)])["tags"]
    assert (kept["store"], kept["url"]) == ("Zalando", zalando)
    answer = client.put(tags_path(), json={"tags": [item(url=NIKE)]}, headers=me)
    assert answer.json()["error"]["reason"] == "blocked"


def test_a_brand_is_needed_and_the_rest_is_trimmed(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, _ = posted(client)
    for brand in ("", "   "):
        answer = client.put(tags_path(), json={"tags": [item(brand=brand)]}, headers=me)
        assert answer.status_code == 422 and code(answer) == "invalid_request"
    bad = client.put(tags_path(), json={"tags": [item(brand="Ni\u0000ke")]}, headers=me)
    assert bad.status_code == 422 and code(bad) == "invalid_request"
    for wrong in (item(item="hat"), item(x=1.2), item(brand="N" * 41), item(size=9)):
        assert (
            client.put(tags_path(), json={"tags": [wrong]}, headers=me).status_code
            == 422
        )
    (kept,) = put_tags(client, me, [item(brand="  On ", product_name="  ", url="  ")])[
        "tags"
    ]
    assert (kept["brand"], kept["product_name"], kept["url"]) == ("On", None, None)


# --- How many ---


def test_at_most_five_on_a_photo_and_ten_in_a_post(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, _ = posted(client, photos=(1, 2, 3))
    six = [item(x=i / 10) for i in range(MAX_ON_PHOTO + 1)]
    answer = client.put(tags_path(1), json={"tags": six}, headers=me)
    assert answer.json()["error"]["reason"] == "too_many_on_photo"
    put_tags(client, me, six[:5], n=1)
    put_tags(client, me, six[:5], n=2)
    answer = client.put(tags_path(3), json={"tags": [item()]}, headers=me)
    assert answer.json()["error"]["reason"] == "too_many_in_post"
    # A photo sent again with fewer makes room.
    put_tags(client, me, six[:4], n=1)
    assert len(put_tags(client, me, [item()], n=3)["tags"]) == 1


# --- Changing them ---


def test_an_item_kept_keeps_its_counts_and_one_left_out_goes(
    client: TestClient, google: FakeGoogle, database: Database  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    a, b = put_tags(client, me, [item(url=NIKE), item(item="cap", brand="Ciele")])[
        "tags"
    ]
    them = other(client)
    for path in ("open", "open", "shop"):
        client.post(f"/outfit-tags/{a['id']}/{path}", headers=them)
    client.post(f"/outfit-tags/{b['id']}/open", headers=them)
    moved, new = put_tags(
        client,
        me,
        [item(id=a["id"], x=0.1, url=NIKE), item(item="watch", brand="Garmin")],
    )["tags"]
    assert moved["id"] == a["id"] and moved["x"] == 0.1
    assert (moved["opens"], moved["shops"]) == (2, 1)
    assert (new["opens"], new["shops"]) == (0, 0)
    assert [t["id"] for t in on_photo(client, me, drawing_id)] == [a["id"], new["id"]]
    left = rows(database, "SELECT tag_id FROM outfit_tag_clicks")
    assert {str(row["tag_id"]) for row in left} == {a["id"]}
    # An id that is not on this photo, or twice: nothing changes.
    for wrong in ([item(id=b["id"])], [item(id=a["id"]), item(id=a["id"])]):
        answer = client.put(tags_path(), json={"tags": wrong}, headers=me)
        assert answer.status_code == 422
    assert (
        message(client.put(tags_path(), json={"tags": [item(id=b["id"])]}, headers=me))
        == NOT_ON_PHOTO
    )
    # An empty list takes them all away.
    assert put_tags(client, me, [])["tags"] == []
    assert rows(database, "SELECT 1 FROM outfit_tag_clicks") == []


def test_only_the_owner_tags_its_photos(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    posted(client)
    answer = client.put(tags_path(), json={"tags": [item()]}, headers=other(client))
    assert answer.status_code == 404
    assert client.put(tags_path(), json={"tags": [item()]}).status_code == 401


def test_a_photo_must_be_there_and_seen_by_others(
    client: TestClient, google: FakeGoogle  # noqa: F811
) -> None:
    me, _ = posted(client, photos=())
    answer = client.put(tags_path(1), json={"tags": [item()]}, headers=me)
    assert answer.status_code == 404 and message(answer) == NO_PHOTO
    assert client.put(tags_path(11), json={"tags": []}, headers=me).status_code == 422
    seen_by(client, me, "only_me")
    assert client.put(tags_path(1), json={"tags": []}, headers=me).status_code == 409
    unknown = client.put(
        tags_path(1, key="0000000000000000"), json={"tags": []}, headers=me
    )
    assert unknown.status_code == 404


# --- The item follows its photo ---


def test_a_new_order_keeps_them_a_new_photo_does_not(
    client: TestClient, google: FakeGoogle, database: Database  # noqa: F811
) -> None:
    me, drawing_id = posted(client, photos=(1, 2))
    (one,) = put_tags(client, me, [item()], n=1)["tags"]
    and_two = put_tags(client, me, [item(item="top")], n=2)["tags"]
    moved = client.put(
        f"/me/activities/{KEY}/drawing/order",
        json={"order": ["photo:2", "drawing", "photo:1"]},
        headers=me,
    )
    assert moved.status_code == 200, moved.text
    assert on_photo(client, me, drawing_id, 1) == [one]
    assert on_photo(client, me, drawing_id, 2) == and_two
    # The same photo sent again keeps them; another one does not.
    put_photo(client, me, 2)
    assert on_photo(client, me, drawing_id, 2) == and_two
    put_photo(client, me, 2, SMALL)
    assert on_photo(client, me, drawing_id, 2) == []


def test_a_photo_removed_or_a_drawing_only_mine_takes_them_along(
    client: TestClient, google: FakeGoogle, database: Database  # noqa: F811
) -> None:
    me, _ = posted(client, photos=(1, 2))
    put_tags(client, me, [item()], n=1)
    put_tags(client, me, [item(url=NIKE)], n=2)
    assert client.delete(photo_path(1), headers=me).status_code == 204
    assert len(rows(database, "SELECT 1 FROM drawing_outfit_tags")) == 1
    seen_by(client, me, "only_me")
    assert rows(database, "SELECT 1 FROM drawing_outfit_tags") == []
    # Back to the others, the phone sends photo and items again.
    seen_by(client, me, "everyone")
    put_photo(client, me, 1, PHOTO)
    assert len(put_tags(client, me, [item()], n=1)["tags"]) == 1


# --- Open and «Shop» ---


def test_shop_answers_the_link_and_counts(
    client: TestClient, google: FakeGoogle, database: Database  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    shoes, jacket = put_tags(client, me, [item(url=NIKE), item(item="jacket")])["tags"]
    them = other(client)
    opened = client.post(f"/outfit-tags/{shoes['id']}/open", headers=them)
    assert opened.status_code == 204
    shop = client.post(f"/outfit-tags/{shoes['id']}/shop", headers=them)
    assert shop.status_code == 200 and shop.json() == {"url": NIKE_CLEAN}
    # No link: nothing to open, nothing counted.
    none = client.post(f"/outfit-tags/{jacket['id']}/shop", headers=them)
    assert none.json() == {"url": None}
    (counted,) = rows(database, "SELECT day, opens, shops FROM outfit_tag_clicks")
    assert (counted["opens"], counted["shops"]) == (1, 1)
    # The owner's own touches are not counted.
    client.post(f"/outfit-tags/{shoes['id']}/open", headers=me)
    assert client.post(f"/outfit-tags/{shoes['id']}/shop", headers=me).json() == {
        "url": NIKE_CLEAN
    }
    (mine,) = [t for t in on_photo(client, me, drawing_id) if t["id"] == shoes["id"]]
    assert (mine["opens"], mine["shops"]) == (1, 1)


def test_shop_checks_the_link_again(
    client: TestClient, wall: WallClock, database: Database  # noqa: F811
) -> None:
    risk_of(client, wall, FakeGoogle())
    me, drawing_id = posted(client)
    (shoes,) = put_tags(client, me, [item(url="https://shop.later-bad.test/x")])["tags"]
    them = other(client)
    path = f"/outfit-tags/{shoes['id']}/shop"
    assert client.post(path, headers=them).json() == {
        "url": "https://shop.later-bad.test/x"
    }
    # Listed by Web Risk since: it no longer opens, nor is counted.
    risk_of(client, wall, FakeGoogle(listed=["later-bad.test/"]))
    assert client.post(path, headers=them).json() == {"url": None}
    # Unlisted, but on MuW's list of blocked domains.
    risk_of(client, wall, FakeGoogle())
    with database.connect() as conn:
        conn.execute(
            "INSERT INTO outfit_blocked_domains (domain) VALUES ('later-bad.test')"
        )
    assert client.post(path, headers=them).json() == {"url": None}
    (counted,) = rows(database, "SELECT shops FROM outfit_tag_clicks")
    assert counted["shops"] == 1
    # The owner still sees its link, to change it.
    assert on_photo(client, me, drawing_id)[0]["url"] == "https://shop.later-bad.test/x"


def test_nothing_personal_is_kept(
    client: TestClient, google: FakeGoogle, database: Database  # noqa: F811
) -> None:
    """ADR-0333: a touch is a number for the item and the day. No account,
    no network address, no phone, no browser in the counts."""
    me, _ = posted(client)
    (shoes,) = put_tags(client, me, [item(url=NIKE)])["tags"]
    them = other(client)
    client.post(
        f"/outfit-tags/{shoes['id']}/open", headers=them | {"User-Agent": "MuW/1.0"}
    )
    client.post(f"/outfit-tags/{shoes['id']}/shop", headers=them)
    tables = ("drawing_outfit_tags", "outfit_tag_clicks", "outfit_blocked_domains")
    columns = rows(
        database,
        "SELECT table_name, column_name FROM information_schema.columns"
        " WHERE table_name = ANY(%s)",
        list(tables),
    )
    clicks = {
        c["column_name"] for c in columns if c["table_name"] == "outfit_tag_clicks"
    }
    assert clicks == {"tag_id", "day", "opens", "shops"}
    for column in columns:
        assert not any(word in column["column_name"] for word in PERSONAL), column
    references = rows(
        database,
        "SELECT DISTINCT ccu.table_name FROM information_schema.table_constraints tc"
        " JOIN information_schema.constraint_column_usage ccu"
        " USING (constraint_name, table_schema)"
        " WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ANY(%s)",
        list(tables),
    )
    assert {r["table_name"] for r in references} == {
        "drawing_photos",
        "drawing_outfit_tags",
    }


# --- Reported and hidden ---


def test_a_reported_item_is_hidden_alone(
    client: TestClient,  # noqa: F811
    google: FakeGoogle,
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    me, drawing_id = posted(client)
    shoes, cap = put_tags(
        client, me, [item(url=NIKE, product_name="Pegasus 41"), item(item="cap")]
    )["tags"]
    them = other(client)
    answer = client.post(
        "/reports",
        json={"kind": "outfit_tag", "id": shoes["id"], "reason": "spam"},
        headers=them,
    )
    assert answer.status_code == 204, answer.text
    own = client.post(
        "/reports",
        json={"kind": "outfit_tag", "id": cap["id"], "reason": "spam"},
        headers=me,
    )
    assert own.status_code == 422
    (kept,) = rows(database, "SELECT id FROM reports WHERE kind = 'outfit_tag'")
    with database.connect() as conn:
        report = reported(conn, kept["id"])
    assert report is not None
    assert (report.kind, report.author) == ("outfit_tag", "Runner_42")
    assert "Link: " + NIKE_CLEAN in report.lines
    assert "Domain: www.nike.com" in report.lines
    assert "Model: Pegasus 41" in report.lines
    link = links().new("hide", "outfit_tag", report.target, wall())
    email = email_of(report, links().url(link), link.expires)
    assert "tagged item" in email.subject and NIKE_CLEAN in email.text
    with database.connect() as conn:
        assert apply(conn, link, wall()) == "done"
    # Hidden from the others, and from open and «Shop»; the owner sees it.
    assert [t["id"] for t in on_photo(client, them, drawing_id)] == [cap["id"]]
    assert (
        client.post(f"/outfit-tags/{shoes['id']}/open", headers=them).status_code == 404
    )
    mine = on_photo(client, me, drawing_id)
    assert [(t["id"], t["hidden"]) for t in mine] == [
        (shoes["id"], True),
        (cap["id"], False),
    ]
    # Changed by its owner, it stays hidden.
    put_tags(
        client, me, [item(id=shoes["id"], brand="Nike"), item(id=cap["id"], item="cap")]
    )
    assert [t["hidden"] for t in on_photo(client, me, drawing_id)] == [True, False]
