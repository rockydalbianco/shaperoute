"""Drawings in a real PostgreSQL (TASK-117): a saved run titled and made
public by its owner, seen by the other members without its first and last
200 m, never when private; its score the one the API counted; gone with its
run. The bodies are the examples of packages/shared-types/fixtures."""

from __future__ import annotations

import json
import math
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from route_engine.geo import (
    haversine_m,
    latlon_to_local,
    local_to_latlon,
    path_length_m,
)
from route_engine.network import FileSource

from shaperoute_api.accounts import AccountError, Accounts
from shaperoute_api.activities import UNKNOWN_ACTIVITY, PlaceNames
from shaperoute_api.app import create_app
from shaperoute_api.db import Database, migrations
from shaperoute_api.drawings import (
    CUT_M,
    MAX_TITLE_LENGTH,
    NO_DRAWING,
    NO_PROFILE,
    TITLE_NOT_TEXT,
    TITLE_TOO_LONG,
    TOO_SHORT,
    DrawingDetailBody,
    DrawingRequestBody,
    DrawingsBody,
    MyDrawingBody,
    checked_title,
    cut_track,
)
from shaperoute_api.profiles import PublicProfileBody

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
# Cheap parameters: every test signs up.
FAST_HASHER = PasswordHasher(time_cost=1, memory_cost=1024, parallelism=1)
KEY = "7c2e91a4b05d3f68"
OTHER_KEY = "e5d0a83f19c7b246"
# The migration of the drawings, whatever its number when merged.
(DRAWINGS_MIGRATION,) = [p for p in migrations() if p.name.endswith("_drawings.sql")]
OTHER_EMAIL = "other@example.com"
DAY_MS = 86_400_000
# Seven digits of a degree are about a centimetre; the preview keeps five.
NEAR_M = 0.01


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class WallClock:
    """A clock the test moves by hand."""

    def __init__(self) -> None:
        self.t = datetime(2026, 10, 2, 21, 40, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.t


@pytest.fixture
def wall() -> WallClock:
    return WallClock()


@pytest.fixture
def database(database_url: str) -> Database:
    database = Database(database_url)
    database.migrate()
    return database


def api(database: Database, wall: WallClock) -> TestClient:
    return TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
            run_places=PlaceNames(None),
        )
    )


@pytest.fixture
def client(database: Database, wall: WallClock) -> TestClient:
    return api(database, wall)


def signed_up(client: TestClient, **changes: Any) -> dict[str, str]:
    """A new account, as the header its requests carry."""
    body = {**_load("sign-up-request.json"), **changes}
    answer = client.post("/accounts", json=body)
    assert answer.status_code == 201
    return {"Authorization": f"Bearer {answer.json()['token']}"}


def other(client: TestClient) -> dict[str, str]:
    return signed_up(client, email=OTHER_EMAIL, username="other_runner")


def public_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(client.get("/me", headers=headers).json()["public_id"])


def run(days_later: int = 0, **changes: Any) -> dict[str, Any]:
    """The example run of My activities: a square of about 4 km in Trento,
    moved `days_later` days on the clock."""
    body = _load("activity-request.json")
    shift = days_later * DAY_MS
    for fix in body["track"]:
        fix["time_ms"] += shift
    for pause in body["pauses"]:
        pause["from_ms"] += shift
        pause["to_ms"] += shift
    return {**body, **changes}


def saved(
    client: TestClient, headers: dict[str, str], key: str = KEY, **changes: Any
) -> dict[str, Any]:
    answer = client.put(f"/me/activities/{key}", json=run(**changes), headers=headers)
    assert answer.status_code == 201
    return dict(answer.json())


def published(
    client: TestClient,
    headers: dict[str, str],
    key: str = KEY,
    title: str | None = "Sunday star",
    public: bool = True,
) -> dict[str, Any]:
    answer = client.put(
        f"/me/activities/{key}/drawing",
        json={"title": title, "public": public},
        headers=headers,
    )
    assert answer.status_code == 200, answer.text
    return dict(answer.json())


def code(answer: Any) -> str:
    return str(answer.json()["error"]["code"])


def message(answer: Any) -> str:
    return str(answer.json()["error"]["message"])


def along_m(line: list[tuple[float, float]], point: tuple[float, float]) -> float:
    """How far along `line` the place nearest to `point` is, in metres, on
    the plane around each segment's start."""
    best, best_along, walked = float("inf"), 0.0, 0.0
    for a, b in zip(line, line[1:], strict=False):
        x_m, y_m = latlon_to_local(a, b)
        px_m, py_m = latlon_to_local(a, point)
        span = x_m * x_m + y_m * y_m
        ahead = 0.0 if span == 0 else (px_m * x_m + py_m * y_m) / span
        share = max(0.0, min(1.0, ahead))
        gap = math.hypot(px_m - share * x_m, py_m - share * y_m)
        if gap < best:
            best, best_along = gap, walked + share * math.sqrt(span)
        walked += math.sqrt(span)
    return best_along


# --- The cut, without a database ---


def straight(length_m: float, step_m: float = 50.0) -> list[tuple[float, float]]:
    """A line north from Trento, a point every `step_m`."""
    origin = (46.0671, 11.1214)
    n = round(length_m / step_m)
    return [local_to_latlon(origin, 0.0, i * step_m) for i in range(n + 1)]


def test_the_cut_leaves_out_200_m_at_either_end() -> None:
    line = straight(1_000)
    cut = cut_track(line)
    assert path_length_m(cut) == pytest.approx(1_000 - 2 * CUT_M, abs=NEAR_M)
    assert haversine_m(line[0], cut[0]) == pytest.approx(CUT_M, abs=NEAR_M)
    assert haversine_m(line[-1], cut[-1]) == pytest.approx(CUT_M, abs=NEAR_M)
    for point in cut:
        assert haversine_m(line[0], point) >= CUT_M - NEAR_M
        assert haversine_m(line[-1], point) >= CUT_M - NEAR_M


def test_a_cut_on_a_vertex_does_not_repeat_it() -> None:
    line = straight(1_000, step_m=100)
    cut = cut_track(line)
    assert len(cut) == len(line) - 4
    assert all(a != b for a, b in zip(cut, cut[1:], strict=False))


def test_a_cut_inside_one_long_step() -> None:
    line = [(46.0671, 11.1214), local_to_latlon((46.0671, 11.1214), 0.0, 1_000.0)]
    cut = cut_track(line)
    assert len(cut) == 2
    assert path_length_m(cut) == pytest.approx(600, abs=NEAR_M)


@pytest.mark.parametrize("length_m", [0, 150, 399, 400])
def test_nothing_is_left_of_a_short_track(length_m: float) -> None:
    line = straight(length_m, step_m=max(1.0, length_m / 7)) if length_m else []
    assert cut_track(line) == []


def test_the_title_rule() -> None:
    assert checked_title(None) is None
    assert checked_title("   ") is None
    assert checked_title("  Sunday star ") == "Sunday star"
    assert checked_title("é" * MAX_TITLE_LENGTH) == "é" * MAX_TITLE_LENGTH
    with pytest.raises(AccountError) as too_long:
        checked_title("a" * (MAX_TITLE_LENGTH + 1))
    assert too_long.value.message == TITLE_TOO_LONG
    with pytest.raises(AccountError) as two_lines:
        checked_title("Sunday\nstar")
    assert two_lines.value.message == TITLE_NOT_TEXT


# --- The contract ---


def test_the_examples_are_the_bodies() -> None:
    request = _load("drawing-request.json")
    assert set(request) == set(DrawingRequestBody.model_fields)
    DrawingRequestBody.model_validate(request)
    mine = _load("my-drawing.json")
    assert set(mine) == set(MyDrawingBody.model_fields)
    MyDrawingBody.model_validate(mine)
    page = _load("drawings.json")
    assert set(page) == set(DrawingsBody.model_fields)
    DrawingsBody.model_validate(page)
    one = _load("drawing.json")
    assert set(one) == set(DrawingDetailBody.model_fields)
    seen = DrawingDetailBody.model_validate(one)
    # The list item is the detail without author, public and track, with a
    # preview instead.
    assert set(page["drawings"][0]) == (
        set(one) - {"author", "public", "track"} | {"track_preview"}
    )
    assert str(seen.author.public_id) == _load("public-profile.json")["public_id"]


# --- In the database ---


def test_a_run_is_private_until_published(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    answer = client.get(f"/me/activities/{KEY}/drawing", headers=me)
    assert answer.status_code == 200
    assert answer.json() == {
        "key": KEY,
        "id": None,
        "title": None,
        "public": False,
        "published_at": None,
    }
    assert client.get("/me/drawings", headers=me).json() == {"drawings": []}
    mine = public_id(client, me)
    assert client.get(f"/users/{mine}", headers=me).json()["drawings"] == 0
    listed = client.get(f"/users/{mine}/drawings", headers=me).json()
    assert listed == {"drawings": [], "next": None, "total": 0}


def test_published_the_others_see_it_cut(client: TestClient, wall: WallClock) -> None:
    me = signed_up(client)
    saved(client, me)
    kept = published(client, me, title="  Sunday star ")
    assert kept["key"] == KEY
    assert kept["title"] == "Sunday star"
    assert kept["public"] is True
    assert kept["published_at"] == "2026-10-02T21:40:00Z"
    drawing_id = kept["id"]
    UUID(drawing_id)

    whole = client.get(f"/me/activities/{KEY}", headers=me).json()["track"]
    them = other(client)
    seen = client.get(f"/drawings/{drawing_id}", headers=them)
    assert seen.status_code == 200
    body = seen.json()
    assert body["author"] == {
        "public_id": public_id(client, me),
        "username": _load("sign-up-request.json")["username"],
    }
    assert body["public"] is True
    assert body["title"] == "Sunday star"
    for hidden in ("points", "route_preview", "pauses", "walks", "key", "similarity"):
        assert hidden not in body
    track = [tuple(p) for p in body["track"]]
    line = [tuple(p) for p in whole]
    # The run is a loop: it ends where it began, at the door.
    total = path_length_m(line)
    assert path_length_m(track) == pytest.approx(total - 2 * CUT_M, abs=1)
    for point in track:
        assert along_m(line, point) >= CUT_M - 1
        assert along_m(line, point) <= total - CUT_M + 1
        assert haversine_m(line[0], point) >= CUT_M - 1
        assert haversine_m(line[-1], point) >= CUT_M - 1
    # The owner keeps the run whole in My activities.
    assert line[0] == pytest.approx(tuple(run()["track"][0]["point"]))


def test_the_profile_lists_and_counts_the_public_ones(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    saved(client, me, key=OTHER_KEY, days_later=1)
    published(client, me)
    mine = public_id(client, me)
    them = other(client)
    assert client.get(f"/users/{mine}", headers=them).json()["drawings"] == 1
    page = client.get(f"/users/{mine}/drawings", headers=them).json()
    assert page["total"] == 1
    assert page["next"] is None
    (item,) = page["drawings"]
    assert item["title"] == "Sunday star"
    assert item["shape"] == "star"
    assert item["place"] is None
    assert len(item["track_preview"]) >= 2
    first = tuple(run()["track"][0]["point"])
    for point in item["track_preview"]:
        assert haversine_m(first, tuple(point)) >= CUT_M - 1
    # The other run is private: not listed, not counted.
    PublicProfileBody.model_validate(client.get(f"/users/{mine}", headers=me).json())


def test_the_score_is_the_one_the_api_counted(client: TestClient) -> None:
    me = signed_up(client)
    # The app cannot send a score with the run, nor with the drawing.
    refused = client.put(
        f"/me/activities/{KEY}", json={**run(), "score": 100}, headers=me
    )
    assert refused.status_code == 422
    activity = saved(client, me)
    refused = client.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": None, "public": True, "score": 100},
        headers=me,
    )
    assert refused.status_code == 422
    drawing_id = published(client, me)["id"]
    seen = client.get(f"/drawings/{drawing_id}", headers=other(client)).json()
    assert seen["score"] == activity["score"]
    assert seen["fidelity"] == activity["fidelity"]
    assert seen["distance_m"] == activity["distance_m"]
    assert seen["duration_s"] == activity["duration_s"]


def test_a_private_drawing_is_not_found_by_anyone_else(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    drawing_id = published(client, me, title="Mine only", public=False)["id"]
    assert drawing_id is not None
    them = other(client)
    hidden = client.get(f"/drawings/{drawing_id}", headers=them)
    unknown = client.get(f"/drawings/{uuid4()}", headers=them)
    not_an_id = client.get("/drawings/42", headers=them)
    for answer in (hidden, unknown, not_an_id):
        assert answer.status_code == 404
        assert message(answer) == NO_DRAWING
    assert hidden.json() == unknown.json()
    # Its owner sees it, cut as the others would.
    own = client.get(f"/drawings/{drawing_id}", headers=me)
    assert own.status_code == 200
    assert own.json()["public"] is False
    mine = public_id(client, me)
    assert client.get(f"/users/{mine}/drawings", headers=them).json()["total"] == 0


def test_unpublished_it_disappears_and_comes_back(
    client: TestClient, wall: WallClock
) -> None:
    me = signed_up(client)
    saved(client, me)
    first = published(client, me)
    wall.t += timedelta(hours=1)
    # A new title on a public drawing does not publish it again.
    renamed = published(client, me, title="Star of Sunday")
    assert renamed["published_at"] == first["published_at"]
    assert renamed["id"] == first["id"]
    hidden = published(client, me, public=False)
    assert hidden["published_at"] is None
    them = other(client)
    assert client.get(f"/drawings/{first['id']}", headers=them).status_code == 404
    wall.t += timedelta(hours=1)
    again = published(client, me)
    assert again["id"] == first["id"]
    assert again["published_at"] == "2026-10-02T23:40:00Z"
    assert client.get(f"/drawings/{first['id']}", headers=them).status_code == 200


def test_a_deleted_run_leaves_no_drawing(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    drawing_id = published(client, me)["id"]
    mine = public_id(client, me)
    them = other(client)
    assert client.delete(f"/me/activities/{KEY}", headers=me).status_code == 204
    for headers in (me, them):
        answer = client.get(f"/drawings/{drawing_id}", headers=headers)
        assert answer.status_code == 404
        assert client.get(f"/users/{mine}/drawings", headers=headers).json() == {
            "drawings": [],
            "next": None,
            "total": 0,
        }
        assert client.get(f"/users/{mine}", headers=headers).json()["drawings"] == 0
    assert client.get("/me/drawings", headers=me).json() == {"drawings": []}
    answer = client.get(f"/me/activities/{KEY}/drawing", headers=me)
    assert answer.status_code == 404


def test_a_deleted_account_leaves_no_drawing(
    client: TestClient, database: Database
) -> None:
    me = signed_up(client)
    saved(client, me)
    published(client, me)
    assert client.delete("/me", headers=me).status_code == 204
    with database.connect() as conn:
        left = conn.execute("SELECT count(*) AS n FROM drawings").fetchone()
    assert left is not None and left["n"] == 0


def test_only_the_owner_changes_its_drawing(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    them = other(client)
    for answer in (
        client.get(f"/me/activities/{KEY}/drawing", headers=them),
        client.put(
            f"/me/activities/{KEY}/drawing",
            json={"title": "Taken", "public": True},
            headers=them,
        ),
        client.get(f"/me/activities/{OTHER_KEY}/drawing", headers=me),
    ):
        assert answer.status_code == 404
        assert message(answer) == UNKNOWN_ACTIVITY
    assert client.get(f"/me/activities/{KEY}/drawing", headers=me).json()["id"] is None


def test_a_title_refused_changes_nothing(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    published(client, me)
    for title, why in (
        ("a" * (MAX_TITLE_LENGTH + 1), TITLE_TOO_LONG),
        ("Sunday\tstar", TITLE_NOT_TEXT),
    ):
        answer = client.put(
            f"/me/activities/{KEY}/drawing",
            json={"title": title, "public": False},
            headers=me,
        )
        assert answer.status_code == 422
        assert code(answer) == "invalid_request"
        assert message(answer) == why
    kept = client.get(f"/me/activities/{KEY}/drawing", headers=me).json()
    assert kept["title"] == "Sunday star"
    assert kept["public"] is True
    missing = client.put(f"/me/activities/{KEY}/drawing", json={}, headers=me)
    assert missing.status_code == 422


def test_a_run_too_short_is_not_published(client: TestClient) -> None:
    me = signed_up(client)
    body = run()
    # Two fixes 300 m apart: nothing is left once 200 m go from either end.
    body["track"] = [
        {"point": [46.0671, 11.1214], "time_ms": 1790000000000, "accuracy_m": 5.0},
        {"point": [46.0698, 11.1214], "time_ms": 1790000120000, "accuracy_m": 5.0},
    ]
    body.update(points=None, similarity=None, pauses=[])
    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 201
    answer = client.put(
        f"/me/activities/{KEY}/drawing",
        json={"title": "Short", "public": True},
        headers=me,
    )
    assert answer.status_code == 422
    assert message(answer) == TOO_SHORT
    # Titled and private it is kept, with nothing for the others.
    kept = published(client, me, title="Short", public=False)
    seen = client.get(f"/drawings/{kept['id']}", headers=me).json()
    assert seen["track"] == []


def test_the_profile_pages(client: TestClient) -> None:
    me = signed_up(client)
    keys = [f"{n:016x}" for n in range(0xA0, 0xA3)]
    for days, key in enumerate(keys):
        saved(client, me, key=key, days_later=days)
        published(client, me, key=key, title=f"Run {days}")
    mine = public_id(client, me)
    them = other(client)
    first = client.get(f"/users/{mine}/drawings?limit=2", headers=them).json()
    assert [d["title"] for d in first["drawings"]] == ["Run 2", "Run 1"]
    assert first["total"] == 3
    assert first["next"] is not None
    second = client.get(
        f"/users/{mine}/drawings?limit=2&cursor={first['next']}", headers=them
    ).json()
    assert [d["title"] for d in second["drawings"]] == ["Run 0"]
    assert second["next"] is None
    mine_all = client.get("/me/drawings", headers=me).json()["drawings"]
    assert [d["key"] for d in mine_all] == keys[::-1]
    for bad in ("limit=0", "limit=51", "cursor=12-34", f"cursor=1-{uuid4()}"):
        answer = client.get(f"/users/{mine}/drawings?{bad}", headers=them)
        assert answer.status_code == 422


def test_an_unknown_profile_has_no_drawings(client: TestClient) -> None:
    me = signed_up(client)
    for wanted in (str(uuid4()), "42", "Ada_runs"):
        answer = client.get(f"/users/{wanted}/drawings", headers=me)
        assert answer.status_code == 404
        assert message(answer) == NO_PROFILE


def test_every_drawing_needs_a_token(client: TestClient) -> None:
    me = signed_up(client)
    saved(client, me)
    drawing_id = published(client, me)["id"]
    mine = public_id(client, me)
    for method, path, body in (
        ("GET", "/me/drawings", None),
        ("GET", f"/me/activities/{KEY}/drawing", None),
        ("PUT", f"/me/activities/{KEY}/drawing", {"title": None, "public": False}),
        ("GET", f"/users/{mine}/drawings", None),
        ("GET", f"/drawings/{drawing_id}", None),
    ):
        answer = client.request(method, path, json=body)
        assert answer.status_code == 401, path
        assert code(answer) == "not_signed_in"


def test_without_a_database_the_drawings_are_unavailable() -> None:
    client = TestClient(create_app(FileSource(Path("unused.graphml"))))
    answer = client.get("/me/drawings", headers={"Authorization": "Bearer x"})
    assert answer.status_code == 503
    assert code(answer) == "accounts_unavailable"


def test_a_run_saved_before_the_drawings_can_be_published(
    database_url: str, wall: WallClock, tmp_path: Path
) -> None:
    database = Database(database_url)
    # The schema of before: the migrations before the drawings' one, not those
    # after it, which may need its table (the comments do, TASK-120).
    for path in migrations():
        if path.name < DRAWINGS_MIGRATION.name:
            shutil.copy(path, tmp_path / path.name)
    database.migrate(tmp_path)
    old = api(database, wall)
    me = signed_up(old)
    saved(old, me)
    database.migrate()
    client = api(database, wall)
    assert client.get(f"/me/activities/{KEY}", headers=me).status_code == 200
    drawing_id = published(client, me)["id"]
    seen = client.get(f"/drawings/{drawing_id}", headers=other(client))
    assert seen.status_code == 200


def test_a_run_without_a_route_is_published_without_a_score(
    client: TestClient,
) -> None:
    me = signed_up(client)
    # The user's choice (TASK-117): a run without a route is a drawing too,
    # freehand, and the others see it without a score.
    assert saved(client, me, points=None, similarity=None, shape=None)["score"] is None
    drawing_id = published(client, me, title="Freehand")["id"]
    seen = client.get(f"/drawings/{drawing_id}", headers=other(client)).json()
    assert seen["score"] is None
    assert seen["fidelity"] is None
    assert seen["shape"] is None
    assert len(seen["track"]) >= 2
