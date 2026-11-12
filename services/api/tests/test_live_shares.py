"""«Share live activity» (TASK-424, ADR-0352), in a real PostgreSQL: the link
made by an account, the phone's updates, what the page sees without an
account, the end of the link and the round that deletes the points."""

from __future__ import annotations

import json
import logging
import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_drawings import (
    WallClock,
    api,
    client,  # noqa: F401  (the fixtures of the drawings' tests)
    database,  # noqa: F401
    other,
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api import live_shares
from shaperoute_api.access import RateLimiter
from shaperoute_api.db import Database
from shaperoute_api.live_shares import (
    LIVE_PAGE,
    MAX_RECIPIENTS,
    MAX_SHARES_PER_DAY,
    SENDS_PER_MINUTE,
    SITE_ORIGIN,
    LiveShareRequestBody,
    LiveShares,
    LiveShareSendBody,
    LiveShareSweep,
    LiveStatsBody,
    LiveUpdateBody,
    LiveViewBody,
    token_hash,
)

FIXTURES = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "fixtures"
)
Headers = dict[str, str]
# The example update is of 07:00 on 2026-11-09.
START = datetime(2026, 11, 9, 7, 0, tzinfo=UTC)
SECOND = timedelta(seconds=1)


def fixture(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


@pytest.fixture(autouse=True)
def at_the_start(wall: WallClock) -> None:  # noqa: F811
    wall.t = START


def made(app: TestClient, headers: Headers, **changes: Any) -> dict[str, Any]:
    body = {**fixture("live-share-request.json"), **changes}
    answer = app.post("/me/live-shares", json=body, headers=headers)
    assert answer.status_code == 201, answer.text
    share: dict[str, Any] = answer.json()
    share["token"] = share["url"].removeprefix(LIVE_PAGE)
    return share


def sent(
    app: TestClient, headers: Headers, share: dict[str, Any], **changes: Any
) -> Any:
    body = {**fixture("live-share-update.json"), **changes}
    return app.post(
        f"/me/live-shares/{share['id']}/updates", json=body, headers=headers
    )


def seen(app: TestClient, share: dict[str, Any], after: int = 0) -> Any:
    answer = app.get("/live", params={"t": share["token"], "after": after})
    assert answer.status_code == 200, answer.text
    return answer.json()


def point(seconds: int) -> dict[str, Any]:
    at = START + seconds * SECOND
    return {"lat": 46.067, "lon": 11.121, "at": at.isoformat()}


# --- The examples of the contract ---


def test_the_examples_are_of_the_contract() -> None:
    LiveShareRequestBody.model_validate(fixture("live-share-request.json"))
    LiveUpdateBody.model_validate(fixture("live-share-update.json"))
    LiveViewBody.model_validate(fixture("live-view.json"))


def test_the_page_sees_the_example_update_as_the_example_view(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 15 * SECOND
    assert sent(client, ada, share).status_code == 200
    view = seen(client, share)
    expected = fixture("live-view.json")
    # The sequence numbers are the database's.
    assert view["last_seq"] >= len(expected["points"])
    view["last_seq"] = expected["last_seq"]
    assert LiveViewBody.model_validate(view) == LiveViewBody.model_validate(expected)


# --- The link ---


def test_a_link_is_random_and_only_its_hash_is_kept(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client)
    first, second = made(client, ada), made(client, ada)
    assert first["url"].startswith("https://getmuw.app/live/#")
    assert len(first["token"]) == 22 and first["token"] != second["token"]
    assert first["expires_at"] == (START + timedelta(hours=24)).isoformat().replace(
        "+00:00", "Z"
    )
    with database.connect() as conn:
        rows = conn.execute("SELECT token_hash FROM live_shares").fetchall()
    kept = {bytes(r["token_hash"]) for r in rows}
    assert kept == {token_hash(first["token"]), token_hash(second["token"])}
    assert all(first["token"].encode() not in k for k in kept)


def test_a_link_needs_an_account(client: TestClient) -> None:  # noqa: F811
    body = fixture("live-share-request.json")
    assert client.post("/me/live-shares", json=body).status_code == 401


def test_a_new_link_stops_the_earlier_one_not_finished(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    finished = made(client, ada)
    assert sent(client, ada, finished, state="finished").status_code == 200
    forgotten = made(client, ada)
    wall.t = START + 60 * SECOND
    made(client, ada)
    assert seen(client, forgotten) == {"status": "stopped", **empty_view()}
    assert seen(client, finished)["status"] == "finished"


def test_at_most_so_many_links_a_day(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    for _ in range(MAX_SHARES_PER_DAY):
        made(client, ada)
    body = fixture("live-share-request.json")
    answer = client.post("/me/live-shares", json=body, headers=ada)
    assert answer.status_code == 429
    wall.t = START + timedelta(days=1, seconds=1)
    made(client, ada)


def test_the_pool_is_kept_for_a_swim_only(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client)
    swim = made(client, ada, activity="swimming", pool_length_m=25)
    assert seen(client, swim)["pool_length_m"] == 25
    # The new link stops the swim's: one activity at a time.
    run = made(client, ada, activity="running", pool_length_m=25)
    assert seen(client, run)["pool_length_m"] is None


# --- The updates and the page ---


def empty_view() -> dict[str, Any]:
    """What GET /live gives besides the status of a link that shows nothing."""
    body = LiveViewBody(status="expired").model_dump(mode="json")
    del body["status"]
    return body


def test_the_page_gets_only_the_new_points(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    first = seen(client, share)
    assert first["status"] == "live" and first["points"] == []
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    view = seen(client, share)
    assert len(view["points"]) == 3
    assert view["stats"]["heart_bpm"] == 128
    wall.t = START + 30 * SECOND
    sent(client, ada, share, points=[point(20), point(25)])
    again = seen(client, share, after=view["last_seq"])
    assert [p[2] for p in again["points"]] == [
        (START + 20 * SECOND).timestamp(),
        (START + 25 * SECOND).timestamp(),
    ]
    assert seen(client, share, after=again["last_seq"])["points"] == []


def test_a_long_track_comes_in_pages(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(live_shares, "POINTS_PER_PAGE", 2)
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 60 * SECOND
    sent(client, ada, share, points=[point(5 * i) for i in range(5)])
    first = seen(client, share)
    assert len(first["points"]) == 2 and first["more"]
    second = seen(client, share, after=first["last_seq"])
    third = seen(client, share, after=second["last_seq"])
    assert len(third["points"]) == 1 and not third["more"]


def test_paused_then_going_on(client: TestClient) -> None:  # noqa: F811
    ada = signed_up(client)
    share = made(client, ada)
    assert sent(client, ada, share, state="paused").json()["status"] == "paused"
    assert seen(client, share)["status"] == "paused"
    assert sent(client, ada, share, points=[]).json()["status"] == "live"
    assert seen(client, share)["status"] == "live"


def test_only_the_owner_updates_or_stops_a_link(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    bob = other(client)
    assert sent(client, bob, share).status_code == 404
    assert (
        client.delete(f"/me/live-shares/{share['id']}", headers=bob).status_code == 404
    )
    assert sent(client, {}, share).status_code == 401
    wrong = {**share, "id": "not-a-uuid"}
    assert sent(client, ada, wrong).status_code == 404


def test_points_out_of_time_or_too_many_are_refused(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    early = {**point(0), "at": (START - timedelta(hours=1)).isoformat()}
    assert sent(client, ada, share, points=[early]).status_code == 422
    many = [point(0)] * 201
    assert sent(client, ada, share, points=many).status_code == 422
    bad = {**point(0), "lat": 91}
    assert sent(client, ada, share, points=[bad]).status_code == 422


def test_the_page_is_for_the_site_and_never_cached(
    client: TestClient,  # noqa: F811
) -> None:
    share = made(client, signed_up(client))
    answer = client.get("/live", params={"t": share["token"]})
    assert answer.headers["access-control-allow-origin"] == SITE_ORIGIN
    assert answer.headers["cache-control"] == "no-store"
    assert answer.headers["referrer-policy"] == "no-referrer"


def test_an_unknown_token_looks_expired(client: TestClient) -> None:  # noqa: F811
    for token in ("A" * 22, "short", "not/a/token!!!!!!!!!!!"):
        answer = client.get("/live", params={"t": token})
        assert answer.json() == {"status": "expired", **empty_view()}


def test_too_many_views_of_a_link_wait(client: TestClient) -> None:  # noqa: F811
    share = made(client, signed_up(client))
    client.app.state.live_view_limiter = RateLimiter(2)  # type: ignore[attr-defined]
    seen(client, share)
    seen(client, share)
    answer = client.get("/live", params={"t": share["token"]})
    assert answer.status_code == 429
    assert answer.headers["access-control-allow-origin"] == SITE_ORIGIN
    assert int(answer.headers["retry-after"]) >= 1


# --- The end of the link ---


def test_finished_shows_its_summary_one_hour_then_expires(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    wall.t = START + timedelta(minutes=40)
    answer = sent(client, ada, share, points=[], state="finished")
    assert answer.json()["status"] == "finished"
    view = seen(client, share)
    assert view["status"] == "finished" and len(view["points"]) == 3
    assert view["finished_at"] == "2026-11-09T07:40:00Z"
    # No update once it is finished.
    assert sent(client, ada, share, points=[]).status_code == 410
    wall.t = START + timedelta(minutes=100, seconds=1)
    assert seen(client, share) == {"status": "expired", **empty_view()}
    # The round deletes the points and the numbers; the row a day later.
    shares = LiveShares(database, wall)
    assert shares.sweep() == 3
    with database.connect() as conn:
        row = conn.execute("SELECT stats FROM live_shares").fetchone()
        assert row is not None and row["stats"] is None
    wall.t = START + timedelta(days=1, hours=2)
    shares.sweep()
    with database.connect() as conn:
        assert conn.execute("SELECT 1 FROM live_shares").fetchone() is None


def test_no_link_lasts_more_than_a_day(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + timedelta(hours=23, minutes=59)
    assert sent(client, ada, share, points=[]).status_code == 200
    wall.t = START + timedelta(hours=24)
    assert seen(client, share)["status"] == "expired"
    assert sent(client, ada, share, points=[]).status_code == 410


def test_stopped_deletes_the_points_at_once(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    stop = f"/me/live-shares/{share['id']}"
    assert client.delete(stop, headers=ada).status_code == 204
    assert seen(client, share) == {"status": "stopped", **empty_view()}
    with database.connect() as conn:
        assert conn.execute("SELECT 1 FROM live_share_points").fetchone() is None
        row = conn.execute("SELECT stats FROM live_shares").fetchone()
        assert row is not None and row["stats"] is None
    assert client.delete(stop, headers=ada).status_code == 204
    assert sent(client, ada, share).status_code == 410


def test_deleting_the_account_deletes_its_links(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    assert client.delete("/me", headers=ada).status_code == 204
    with database.connect() as conn:
        assert conn.execute("SELECT 1 FROM live_shares").fetchone() is None
        assert conn.execute("SELECT 1 FROM live_share_points").fetchone() is None
    assert seen(client, share)["status"] == "expired"


# --- The round ---


def live_rounds() -> list[threading.Thread]:
    return [t for t in threading.enumerate() if t.name == "live-shares"]


def test_the_round_runs_only_while_the_app_serves(
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    # Made, not served (as in most tests, and in __main__ before uvicorn):
    # no round, so none can outlive a database closed by a test.
    app = api(database, wall)
    assert live_rounds() == []
    with app:
        assert len(live_rounds()) == 1
    assert live_rounds() == []


class Counted:
    """A stand-in for LiveShares: counts the rounds, the first one slow."""

    def __init__(self) -> None:
        self.rounds = 0
        self.started = threading.Event()

    def sweep(self) -> int:
        self.started.set()
        time.sleep(0.05)
        self.rounds += 1
        return 0


def test_stop_waits_for_the_round_under_way_and_ends_them() -> None:
    shares = Counted()
    sweep = LiveShareSweep(shares, every_s=0.01)  # type: ignore[arg-type]
    sweep.start()
    assert shares.started.wait(5)
    sweep.stop()
    done = shares.rounds
    assert done >= 1
    time.sleep(0.05)
    assert shares.rounds == done
    assert live_rounds() == []


# --- A paragliding flight (TASK-305 parts R, ADR-0375) ---


FLIGHT_NUMBERS = {"alt_m": 1820, "max_alt_m": 2140, "vario_mps": -1.4, "speed_mps": 9.7}


def test_the_numbers_of_a_flight_are_optional() -> None:
    # The update of the app of today, without them, is valid as before.
    today = LiveUpdateBody.model_validate(fixture("live-share-update.json"))
    assert today.stats.alt_m is None and today.stats.vario_mps is None
    flight = LiveStatsBody.model_validate(
        {**today.stats.model_dump(), **FLIGHT_NUMBERS}
    )
    assert flight.max_alt_m == 2140 and flight.speed_mps == 9.7


@pytest.mark.parametrize(
    "wrong",
    [
        {"alt_m": 9_001},
        {"alt_m": -501},
        {"max_alt_m": 12_000},
        {"vario_mps": 31},
        {"vario_mps": -30.5},
        {"vario_mps": float("nan")},
        {"speed_mps": -1},
        {"speed_mps": 101},
    ],
)
def test_the_numbers_of_a_flight_have_their_limits(wrong: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        LiveStatsBody.model_validate({"distance_m": 10, **wrong})


def test_the_page_sees_the_numbers_of_a_flight(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada, activity="paragliding")
    wall.t = START + 15 * SECOND
    stats = {**fixture("live-share-update.json")["stats"], **FLIGHT_NUMBERS}
    assert sent(client, ada, share, stats=stats).status_code == 200
    view = LiveViewBody.model_validate(seen(client, share))
    assert view.activity == "paragliding"
    assert view.stats is not None
    assert view.stats.model_dump(include=set(FLIGHT_NUMBERS)) == FLIGHT_NUMBERS
    assert view.stats.heart_bpm == 128 and view.stats.kcal == 4


def test_a_run_of_today_is_seen_as_before(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    # The app of today sends no numbers of a flight; the page of today reads
    # the view by name, and the new ones come back empty.
    ada = signed_up(client)
    share = made(client, ada)
    wall.t = START + 15 * SECOND
    assert sent(client, ada, share).status_code == 200
    view = seen(client, share)
    expected = fixture("live-view.json")
    assert view["stats"] == expected["stats"]
    assert all(view["stats"][name] is None for name in FLIGHT_NUMBERS)


def test_a_wrong_number_of_a_flight_is_refused(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada, activity="paragliding")
    wall.t = START + 15 * SECOND
    stats = {**fixture("live-share-update.json")["stats"], "vario_mps": 99}
    assert sent(client, ada, share, stats=stats).status_code == 422


# --- In the chat and in the Feed (TASK-468 part A1a, ADR-0381) ---


def person(app: TestClient, name: str) -> Headers:
    return signed_up(app, email=f"{name}@example.com", username=name)


def pid(app: TestClient, headers: Headers) -> str:
    return str(app.get("/me", headers=headers).json()["public_id"])


def follow(app: TestClient, follower: Headers, followed: Headers) -> None:
    """`follower` follows `followed`, the request accepted."""
    asked = app.post(f"/users/{pid(app, followed)}/follow", headers=follower)
    assert asked.is_success, asked.text
    accept = f"/me/follow-requests/{pid(app, follower)}/accept"
    assert app.post(accept, headers=followed).is_success


def shared_to(
    app: TestClient,
    owner: Headers,
    share: dict[str, Any],
    *to: Headers,
) -> Any:
    body = {"to": [pid(app, h) for h in to]}
    return app.post(f"/me/live-shares/{share['id']}/send", json=body, headers=owner)


def in_app(
    app: TestClient,
    viewer: Headers,
    share: dict[str, Any],
    after: int = 0,
) -> Any:
    return app.get(
        f"/live-shares/{share['id']}", params={"after": after}, headers=viewer
    )


def app_share(app: TestClient, owner: Headers, **changes: Any) -> dict[str, Any]:
    body = {**fixture("live-share-request.json"), "link": False, **changes}
    answer = app.post("/me/live-shares", json=body, headers=owner)
    assert answer.status_code == 201, answer.text
    share: dict[str, Any] = answer.json()
    return share


def test_the_example_send_is_of_the_contract() -> None:
    body = LiveShareSendBody.model_validate(fixture("live-share-send-request.json"))
    assert 1 <= len(body.to) <= MAX_RECIPIENTS
    with pytest.raises(ValidationError):
        LiveShareSendBody.model_validate({"to": []})
    with pytest.raises(ValidationError):
        LiveShareSendBody.model_validate({"to": [str(uuid4()) for _ in range(21)]})


def test_a_share_of_before_is_a_link_in_nobodys_feed(
    client: TestClient,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = made(client, ada)
    answer = sent(client, ada, share).json()
    assert answer["link"] is True
    assert answer["audience_feed"] == "none"
    assert answer["heart_visible"] is False


def test_a_share_without_its_link_then_with_it(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client)
    share = app_share(client, ada)
    assert share["url"] is None
    with database.connect() as conn:
        row = conn.execute("SELECT token_hash FROM live_shares").fetchone()
    assert row is not None and row["token_hash"] is None
    linked = client.post(f"/me/live-shares/{share['id']}/link", headers=ada)
    assert linked.status_code == 201, linked.text
    first = {**share, "token": linked.json()["url"].removeprefix(LIVE_PAGE)}
    assert seen(client, first)["status"] == "live"
    # A new link: the one given before stops working.
    again = client.post(f"/me/live-shares/{share['id']}/link", headers=ada).json()
    assert again["url"] != linked.json()["url"]
    assert seen(client, first)["status"] == "expired"


def test_only_the_owner_makes_the_link_or_changes_the_audience(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = signed_up(client), other(client)
    share = app_share(client, ada)
    path = f"/me/live-shares/{share['id']}"
    assert client.post(f"{path}/link", headers=bob).status_code == 404
    patch = {"audience_feed": "everyone"}
    assert client.patch(path, json=patch, headers=bob).status_code == 404
    assert shared_to(client, bob, share, ada).status_code == 404


def test_sent_to_someone_they_see_it_in_the_app_and_nobody_else(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    cleo = person(client, "cleo")
    share = app_share(client, ada)
    assert in_app(client, bob, share).status_code == 404
    answer = shared_to(client, ada, share, bob)
    assert answer.status_code == 200, answer.text
    assert answer.json() == {"sent": [pid(client, bob)], "skipped": []}
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    view = in_app(client, bob, share)
    assert view.status_code == 200, view.text
    assert len(view.json()["points"]) == 3
    # Never 403: one who may not see it is told it is not there.
    assert in_app(client, cleo, share).status_code == 404
    assert in_app(client, {}, share).status_code == 401
    assert in_app(client, ada, share).status_code == 200


def test_sent_twice_is_sent_once_and_oneself_or_nobody_is_skipped(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada)
    nobody = str(uuid4())
    body = {"to": [pid(client, bob), pid(client, bob), pid(client, ada), nobody]}
    answer = client.post(
        f"/me/live-shares/{share['id']}/send", json=body, headers=ada
    ).json()
    assert answer == {"sent": [pid(client, bob)], "skipped": [pid(client, ada), nobody]}
    assert shared_to(client, ada, share, bob).json()["sent"] == [pid(client, bob)]
    with database.connect() as conn:
        n = conn.execute("SELECT count(*) AS n FROM live_share_recipients").fetchone()
    assert n is not None and n["n"] == 1


@pytest.mark.parametrize("blocker", ["owner", "viewer"])
def test_a_block_either_way_keeps_them_apart(
    client: TestClient,  # noqa: F811
    blocker: str,
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada, audience_feed="everyone")
    shared_to(client, ada, share, bob)
    assert in_app(client, bob, share).status_code == 200
    who, whom = (ada, bob) if blocker == "owner" else (bob, ada)
    assert client.put(f"/users/{pid(client, whom)}/block", headers=who).is_success
    assert in_app(client, bob, share).status_code == 404
    # And a block made before: the send skips them.
    assert shared_to(client, ada, share, bob).json()["sent"] == []


def test_a_hidden_owner_is_seen_by_nobody(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada, audience_feed="everyone")
    shared_to(client, ada, share, bob)
    with database.connect() as conn:
        conn.execute("UPDATE users SET hidden_at = now() WHERE username = 'ada'")
    assert in_app(client, bob, share).status_code == 404
    assert in_app(client, ada, share).status_code == 200


def test_the_followers_see_it_and_an_unfollow_ends_it_at_once(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    cleo = person(client, "cleo")
    share = app_share(client, ada, audience_feed="followers")
    follow(client, bob, ada)
    assert in_app(client, bob, share).status_code == 200
    assert in_app(client, cleo, share).status_code == 404
    # Ada following Cleo is not Cleo following Ada.
    follow(client, ada, cleo)
    assert in_app(client, cleo, share).status_code == 404
    assert client.delete(f"/users/{pid(client, ada)}/follow", headers=bob).is_success
    assert in_app(client, bob, share).status_code == 404


def test_everyone_with_an_account_and_back_to_nobody(
    client: TestClient,  # noqa: F811
) -> None:
    ada, cleo = person(client, "ada"), person(client, "cleo")
    share = app_share(client, ada)
    path = f"/me/live-shares/{share['id']}"
    assert in_app(client, cleo, share).status_code == 404
    changed = client.patch(path, json={"audience_feed": "everyone"}, headers=ada)
    assert changed.status_code == 200, changed.text
    assert changed.json()["audience_feed"] == "everyone"
    assert changed.json()["link"] is False
    assert in_app(client, cleo, share).status_code == 200
    client.patch(path, json={"audience_feed": "none"}, headers=ada)
    assert in_app(client, cleo, share).status_code == 404


def test_the_heart_rate_reaches_the_app_only_when_turned_on(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = made(client, ada)
    shared_to(client, ada, share, bob)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    assert in_app(client, bob, share).json()["stats"]["heart_bpm"] is None
    # The owner sees it, and so does the link (TASK-424, choice 3).
    assert in_app(client, ada, share).json()["stats"]["heart_bpm"] == 128
    assert seen(client, share)["stats"]["heart_bpm"] == 128
    path = f"/me/live-shares/{share['id']}"
    turned = client.patch(path, json={"heart_visible": True}, headers=ada).json()
    assert turned["heart_visible"] is True and turned["audience_feed"] == "none"
    assert in_app(client, bob, share).json()["stats"]["heart_bpm"] == 128


def test_a_share_that_ended_is_seen_as_the_link_and_takes_no_changes(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada)
    shared_to(client, ada, share, bob)
    sent(client, ada, share, state="finished")
    assert in_app(client, bob, share).json()["status"] == "finished"
    path = f"/me/live-shares/{share['id']}"
    assert shared_to(client, ada, share, bob).status_code == 410
    heart = {"heart_visible": True}
    assert client.patch(path, json=heart, headers=ada).status_code == 410
    assert client.post(f"{path}/link", headers=ada).status_code == 410
    wall.t = START + timedelta(hours=2)
    assert in_app(client, bob, share).json() == {"status": "expired", **empty_view()}
    client.delete(path, headers=ada)
    assert in_app(client, bob, share).json()["status"] == "stopped"


def test_a_stopped_share_shows_nothing_in_the_app(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada)
    shared_to(client, ada, share, bob)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    assert client.delete(f"/me/live-shares/{share['id']}", headers=ada).is_success
    assert in_app(client, bob, share).json() == {"status": "stopped", **empty_view()}


def test_at_most_so_many_sends_a_minute(
    client: TestClient,  # noqa: F811
) -> None:
    ada, bob = person(client, "ada"), person(client, "bob")
    share = app_share(client, ada)
    for _ in range(SENDS_PER_MINUTE):
        assert shared_to(client, ada, share, bob).status_code == 200
    refused = shared_to(client, ada, share, bob)
    assert refused.status_code == 429
    assert int(refused.headers["Retry-After"]) > 0


def test_the_log_never_writes_a_position(
    client: TestClient,  # noqa: F811
    wall: WallClock,  # noqa: F811
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    ada, bob = person(client, "ada"), person(client, "bob")
    share = made(client, ada, audience_feed="followers")
    shared_to(client, ada, share, bob)
    wall.t = START + 15 * SECOND
    sent(client, ada, share)
    in_app(client, bob, share)
    seen(client, share)
    lats = {str(p["lat"]) for p in fixture("live-share-update.json")["points"]}
    assert not any(lat in caplog.text for lat in lats)
