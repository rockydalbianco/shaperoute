"""The monthly challenges' entries, gallery and archive (TASK-343,
ADR-0296, docs/CONCORSI.md §15): who may enter what and when, the
standings of the drawings entered only, the gallery in its two orders and
its pages, the archive of the contests closed."""

from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from test_contest_themes import THEME, entered, entering, themed, withdrawing
from test_contests import (
    AFTER,
    ENDS,
    MINUTE,
    STARTS,
    Headers,
    WallClock,
    block,
    client,  # noqa: F401  (the fixtures of the contest's tests)
    closed,
    contest,
    database,  # noqa: F401
    expo,  # noqa: F401
    key,
    me,
    opened,
    posted,
    pusher,  # noqa: F401
    react,
    signed_up,
    top,
    wall,  # noqa: F401
)

from shaperoute_api.contest_entries import (
    NO_ENTRIES,
    NOT_ENTRANT,
    ContestEntries,
    PastContestsBody,
)
from shaperoute_api.db import Database
from shaperoute_api.push import Pusher


def refused(answer: Any) -> tuple[int, str, str]:
    error = answer.json()["error"]
    return answer.status_code, error["code"], error["message"]


def gallery(
    client: TestClient,  # noqa: F811
    contest_id: UUID,
    headers: Headers | None = None,
    **query: str,
) -> dict[str, Any]:
    answer = client.get(
        f"/contests/{contest_id}/entries", params=query, headers=headers
    )
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def titles(page: dict[str, Any]) -> list[tuple[int, str, int]]:
    return [
        (entry["rank"], entry["drawing"]["title"], entry["reactions"])
        for entry in page["entries"]
    ]


def archive(
    client: TestClient, headers: Headers | None = None, **query: str  # noqa: F811
) -> dict[str, Any]:
    answer = client.get(
        "/contests", params={"state": "closed", **query}, headers=headers
    )
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


# --- Entering ---


def test_only_the_drawings_entered_take_part_and_withdrawn_they_leave(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada, bea = signed_up(client, "ada"), signed_up(client, "bea")
    contest_id = themed(database, wall)
    cat = posted(client, ada, 1, "Cat")
    wall.t += MINUTE
    fish = posted(client, bea, 2, "Fish")
    react(client, ada, fish)
    # Published in the period, for everyone: not in the standings yet.
    assert top(client) == []
    assert entering(client, ada, contest_id, cat).status_code == 204
    assert top(client) == [(1, "Cat", 0)]
    assert entering(client, bea, contest_id, fish).status_code == 204
    assert top(client) == [(1, "Fish", 1), (2, "Cat", 0)]
    # Twice: nothing changes.
    assert entering(client, bea, contest_id, fish).status_code == 204
    assert top(client) == [(1, "Fish", 1), (2, "Cat", 0)]
    # Taken back, out; taken back again, still 204.
    assert withdrawing(client, bea, contest_id, fish).status_code == 204
    assert withdrawing(client, bea, contest_id, fish).status_code == 204
    assert top(client) == [(1, "Cat", 0)]
    # Another's withdrawal changes nothing.
    assert withdrawing(client, bea, contest_id, cat).status_code == 204
    assert top(client) == [(1, "Cat", 0)]


def test_an_account_enters_as_many_drawings_as_it_wants(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    contest_id = themed(database, wall)
    drawings = []
    for n in range(1, 5):
        drawings.append(posted(client, ada, n, f"Animal {n}"))
        wall.t += MINUTE
    for drawing in drawings:
        assert entering(client, ada, contest_id, drawing).status_code == 204
        wall.t += MINUTE
    assert [title for _, title, _ in top(client)] == [
        "Animal 1",
        "Animal 2",
        "Animal 3",
    ]
    seen = contest(client, ada)
    assert seen["entrants"] == 1
    assert seen["entered"] == drawings
    assert seen["mine"]["drawing_id"] == drawings[0]


def test_an_entry_is_refused_for_a_drawing_that_cannot_take_part(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada, bea = signed_up(client, "ada"), signed_up(client, "bea")
    contest_id = themed(database, wall)
    beas = posted(client, bea, 1, "Bea's")
    followers = posted(client, ada, 2, "Followers", visibility="followers")
    private = posted(client, ada, 3, "Mine", visibility="only_me")
    imported = posted(client, ada, 4, "Imported")
    with database.connect() as conn:
        conn.execute(
            "UPDATE runs SET source = 'file' FROM drawings d"
            " WHERE d.run_id = runs.id AND d.id = %s",
            (UUID(imported),),
        )
    wall.t = STARTS - timedelta(seconds=1)
    before = posted(client, ada, 5, "Before")
    wall.t = STARTS + timedelta(days=1)
    for drawing in (beas, followers, private, imported, before, str(uuid4())):
        answer = entering(client, ada, contest_id, drawing)
        assert refused(answer) == (409, "not_entrant", NOT_ENTRANT), drawing
    assert entered(database) == []
    # Without a token: 401; for a contest that is not there: 404.
    answer = client.put(f"/contests/{contest_id}/entries/{beas}")
    assert answer.status_code == 401
    answer = entering(client, bea, uuid4(), beas)
    assert answer.status_code == 404
    assert answer.json()["error"]["code"] == "no_contest"


def test_an_entry_is_refused_without_a_theme_after_the_end_or_once_closed(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    # A contest without a theme takes no entries: every post takes part.
    plain = opened(database, wall)
    post = posted(client, ada, 1, "Post")
    for answer in (
        entering(client, ada, plain, post),
        withdrawing(client, ada, plain, post),
    ):
        assert refused(answer) == (409, "contest_closed", NO_ENTRIES)
    assert top(client) == [(1, "Post", 0)]
    wall.t = AFTER
    assert closed(database, wall, pusher)[0] == 0
    # A monthly challenge: open until its end.
    wall.t = STARTS + timedelta(days=40)
    contest_id = themed(database, wall, days=10)
    cat = posted(client, ada, 2, "Cat")
    assert entering(client, ada, contest_id, cat).status_code == 204
    wall.t += timedelta(days=10)
    for answer in (
        entering(client, ada, contest_id, cat),
        withdrawing(client, ada, contest_id, cat),
    ):
        assert refused(answer) == (409, "contest_closed", NO_ENTRIES)
    assert closed(database, wall, pusher)[0] == 0
    assert refused(entering(client, ada, contest_id, cat))[:2] == (
        409,
        "contest_closed",
    )
    assert len(entered(database)) == 1


def test_a_drawing_entered_that_stops_taking_part_leaves_the_standings(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    contest_id = themed(database, wall)
    cat = posted(client, ada, 1, "Cat")
    assert entering(client, ada, contest_id, cat).status_code == 204
    assert top(client) == [(1, "Cat", 0)]
    # Made private: out of the standings, its entry kept.
    answer = client.put(
        f"/me/activities/{key(1)}/drawing",
        json={"title": "Cat", "visibility": "only_me"},
        headers=ada,
    )
    assert answer.status_code == 200 and answer.json()["id"] == cat
    assert top(client) == []
    assert contest(client, ada)["entered"] == [cat]
    assert contest(client, ada)["entrants"] == 0


def test_a_deleted_account_takes_its_entries_with_it(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    contest_id = themed(database, wall)
    cat = posted(client, ada, 1, "Cat")
    assert entering(client, ada, contest_id, cat).status_code == 204
    with database.connect() as conn:
        conn.execute("DELETE FROM users WHERE id = %s", (me(client, ada)["id"],))
    assert entered(database) == []


# --- The gallery ---


def test_the_gallery_by_place_and_by_date_a_page_at_a_time(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada, bea, cal = (signed_up(client, name) for name in ("ada", "bea", "cal"))
    contest_id = themed(database, wall)
    first = posted(client, ada, 1, "First")
    wall.t += MINUTE
    second = posted(client, bea, 2, "Second")
    wall.t += MINUTE
    third = posted(client, cal, 3, "Third")
    wall.t += MINUTE
    left_out = posted(client, cal, 4, "Not entered")
    for who, drawing in ((ada, first), (bea, second), (cal, third)):
        assert entering(client, who, contest_id, drawing).status_code == 204
    react(client, cal, second)
    react(client, ada, second)
    react(client, bea, third)
    react(client, ada, left_out)

    everything = gallery(client, contest_id)
    assert titles(everything) == [(1, "Second", 2), (2, "Third", 1), (3, "First", 0)]
    assert everything["next"] is None
    assert everything["entries"][0]["drawing"]["author"]["username"] == "bea"
    assert "track" not in everything["entries"][0]["drawing"]
    newest = gallery(client, contest_id, order="new")
    assert titles(newest) == [(2, "Third", 1), (1, "Second", 2), (3, "First", 0)]

    # A page at a time, in both orders.
    entries = ContestEntries(database, wall)
    page = entries.gallery(None, contest_id, "top", limit=2)
    assert [e.rank for e in page.entries] == [1, 2] and page.next == "2"
    page = entries.gallery(None, contest_id, "top", page.next, limit=2)
    assert [e.rank for e in page.entries] == [3] and page.next is None
    page = entries.gallery(None, contest_id, "new", limit=2)
    assert [e.drawing.title for e in page.entries] == ["Third", "Second"]
    assert page.next is not None
    rest = gallery(client, contest_id, order="new", cursor=page.next)
    assert titles(rest) == [(3, "First", 0)] and rest["next"] is None
    # A cursor of the other order, or not one: 422.
    answer = client.get(
        f"/contests/{contest_id}/entries", params={"order": "top", "cursor": page.next}
    )
    assert answer.status_code == 422
    answer = client.get(f"/contests/{contest_id}/entries", params={"cursor": "x"})
    assert answer.status_code == 422
    # A contest that is not there: 404.
    answer = client.get(f"/contests/{uuid4()}/entries")
    assert answer.status_code == 404


def test_the_gallery_leaves_out_who_is_across_a_block_and_keeps_the_places(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada, bea, cal = (signed_up(client, name) for name in ("ada", "bea", "cal"))
    contest_id = themed(database, wall)
    first = posted(client, ada, 1, "First")
    wall.t += MINUTE
    second = posted(client, bea, 2, "Second")
    for who, drawing in ((ada, first), (bea, second)):
        assert entering(client, who, contest_id, drawing).status_code == 204
    react(client, cal, first)
    block(client, bea, ada)
    assert titles(gallery(client, contest_id, bea)) == [(2, "Second", 0)]
    assert titles(gallery(client, contest_id, cal)) == [
        (1, "First", 1),
        (2, "Second", 0),
    ]


def test_the_gallery_of_a_contest_without_a_theme_is_its_whole_standings(
    client: TestClient, database: Database, wall: WallClock  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    contest_id = opened(database, wall)
    posted(client, ada, 1, "Post")
    assert titles(gallery(client, contest_id)) == [(1, "Post", 0)]


# --- The archive ---


def test_the_archive_has_the_contests_closed_the_latest_first(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
    pusher: Pusher,  # noqa: F811
) -> None:
    ada, bea = signed_up(client, "ada"), signed_up(client, "bea")
    # Nothing closed yet: an empty page.
    assert archive(client) == {"contests": [], "next": None}
    plain = opened(database, wall)
    post = posted(client, ada, 1, "Plain")
    react(client, bea, post)
    assert archive(client)["contests"] == []
    wall.t = AFTER
    assert closed(database, wall, pusher)[0] == 0

    wall.t = ENDS + timedelta(days=2)
    challenge = themed(database, wall, days=5)
    cat = posted(client, bea, 2, "Cat")
    assert entering(client, bea, challenge, cat).status_code == 204
    react(client, ada, cat)
    wall.t += timedelta(days=5)
    assert closed(database, wall, pusher)[0] == 0

    page = archive(client)
    PastContestsBody.model_validate(page)
    latest, earlier = page["contests"]
    assert (latest["id"], earlier["id"]) == (str(challenge), str(plain))
    assert latest["theme"] == THEME and earlier["theme"] is None
    assert (latest["entrants"], earlier["entrants"]) == (1, 1)
    assert latest["winner"]["drawing"]["id"] == cat
    assert latest["winner"]["reactions"] == 1
    assert [e["drawing"]["title"] for e in latest["top"]] == ["Cat"]
    assert earlier["winner"]["drawing"]["id"] == post
    assert page["next"] is None
    # A page at a time.
    first = ContestEntries(database, wall).archive(None, limit=1)
    assert [c.id for c in first.contests] == [challenge] and first.next is not None
    rest = archive(client, cursor=first.next)
    assert [c["id"] for c in rest["contests"]] == [str(plain)]
    assert rest["next"] is None
    # Across a block, the post is left out of `top`; the winner stays.
    block(client, ada, bea)
    seen = archive(client, ada)["contests"][0]
    assert seen["top"] == [] and seen["winner"]["drawing"]["id"] == cat
    # Only `closed` is a state.
    assert client.get("/contests", params={"state": "open"}).status_code == 422
    assert client.get("/contests").status_code == 422
