"""The previews of a run kept by PostgreSQL (TASK-501 part A, migration
0088, ADR-0249): «My activities» lists a run from `runs.track_preview` and
`runs.route_preview`, the points recommended.preview takes of the whole
lines, and no longer reads the lines whole; the runs saved before have
theirs from the migration; a run without a route, and a workout without a
track, have none."""

from __future__ import annotations

import random
import shutil
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from psycopg.rows import DictRow
from route_engine.network import FileSource
from test_activities import (
    FAST_HASHER,
    KEY,
    PLACE_KEY,
    PlaceService,
    WallClock,
    _load,
    client,  # noqa: F401  (the fixtures of the activities' tests)
    database,  # noqa: F401
    free,
    request,
    service,  # noqa: F401
    signed_up,
    wall,  # noqa: F401
)

from shaperoute_api import activities as activities_module
from shaperoute_api.accounts import Accounts
from shaperoute_api.activities import PlaceNames, _line
from shaperoute_api.app import create_app
from shaperoute_api.db import MIGRATIONS_DIR, Database, migrations
from shaperoute_api.reads import READS_HEADER
from shaperoute_api.recommended import PREVIEW_POINTS, preview

Point = tuple[float, float]
MIGRATION = "0088_run_previews"
START_MS = 1790000000000
DAY_MS = 86_400_000
# Around the 64 points of a preview, and far past them.
LENGTHS = (2, 63, PREVIEW_POINTS, 65, 100, 127, 128, 189, 1000, 2001, 3333)
# The runs of packages/shared-types/fixtures, as an app sends them.
REAL_RUNS = (
    "activity-request.json",
    "activity-request-cycling.json",
    "activity-request-turned.json",
    "activity-request-walks.json",
    "activity-request-imported.json",
)
# Both roads at once: the lines whole, as the list read them before, and
# the previews kept.
BOTH_ROADS = (
    "SELECT key, ST_AsGeoJSON(route, 15) AS route,"
    " ST_AsGeoJSON(ST_Force2D(track), 15) AS track,"
    " ST_AsGeoJSON(route_preview, 15) AS route_kept,"
    " ST_AsGeoJSON(track_preview, 15) AS track_kept,"
    " ST_NPoints(route_preview) AS route_points,"
    " ST_NPoints(track_preview) AS track_points"
    " FROM runs"
)


def both_roads(db: Database) -> dict[str, DictRow]:
    with db.connect() as conn:
        return {row["key"]: row for row in conn.execute(BOTH_ROADS).fetchall()}


def from_the_whole(row: DictRow) -> tuple[list[list[float]] | None, list[list[float]]]:
    """What the list answered before 0088: `route_preview` and
    `track_preview` chosen in Python from the whole lines."""
    route = row["route"]
    return (
        None if route is None else [list(p) for p in preview(_line(route))],
        [list(p) for p in preview(_line(row["track"]))],
    )


def from_the_kept(row: DictRow) -> tuple[list[list[float]] | None, list[list[float]]]:
    route = row["route_kept"]
    return (
        None if route is None else [list(p) for p in preview(_line(route))],
        [list(p) for p in preview(_line(row["track_kept"]))],
    )


def listed(client: TestClient, me: dict[str, str]) -> dict[str, Any]:  # noqa: F811
    answer = client.get("/me/activities?limit=50", headers=me)
    assert answer.status_code == 200
    return {activity["id"]: activity for activity in answer.json()["activities"]}


def a_jog(seed: int, fixes: int) -> list[Point]:
    """A line a runner could leave, a fix a second: every digit of a
    double, as a phone sends them."""
    rng = random.Random(seed)
    return [
        (
            46.0 + seed * 1e-3 + i * 2e-5 + rng.uniform(0, 2e-6),
            11.0 + i * 2e-5 + rng.uniform(0, 2e-6),
        )
        for i in range(fixes)
    ]


def a_run(n: int, fixes: int, points: int | None) -> dict[str, Any]:
    began = START_MS - (n + 1) * DAY_MS
    track = [
        {"point": list(point), "time_ms": began + i * 1000}
        for i, point in enumerate(a_jog(fixes, fixes))
    ]
    if points is None:
        return free(track=track, pauses=[])
    route = [list(point) for point in a_jog(points + 7, points)]
    return request(track=track, points=route, pauses=[])


def line_wkt(points: list[Point]) -> str:
    return "LINESTRING(" + ",".join(f"{lon!r} {lat!r}" for lat, lon in points) + ")"


def track_wkt(points: list[Point]) -> str:
    return (
        "LINESTRING M ("
        + ",".join(f"{lon!r} {lat!r} {i}" for i, (lat, lon) in enumerate(points))
        + ")"
    )


# --- The same previews as from the whole lines ---


def test_the_real_runs_are_listed_as_from_their_whole_lines(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    me = signed_up(client)
    for n, name in enumerate(REAL_RUNS):
        saved = client.put(f"/me/activities/{n:016x}", json=_load(name), headers=me)
        assert saved.status_code == 201, name
    shown = listed(client, me)
    rows = both_roads(database)
    assert len(shown) == len(rows) == len(REAL_RUNS)
    for key, row in rows.items():
        was = from_the_whole(row)
        assert (shown[key]["route_preview"], shown[key]["track_preview"]) == was, key


def test_a_long_run_is_listed_as_from_its_whole_lines(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    me = signed_up(client)
    sizes = ((65, 64), (127, 65), (1000, 2001), (3333, 189), (2001, None))
    for n, (fixes, points) in enumerate(sizes):
        saved = client.put(
            f"/me/activities/{n:016x}", json=a_run(n, fixes, points), headers=me
        )
        assert saved.status_code == 201, (fixes, points)
        # The answer of the save too is what the list shows.
        assert len(saved.json()["track_preview"]) == PREVIEW_POINTS
    shown = listed(client, me)
    rows = both_roads(database)
    assert len(shown) == len(rows) == len(sizes)
    for key, row in rows.items():
        was = from_the_whole(row)
        assert (shown[key]["route_preview"], shown[key]["track_preview"]) == was, key
        assert row["track_points"] == PREVIEW_POINTS
        assert row["route_points"] == (
            None
            if row["route"] is None
            else min(PREVIEW_POINTS, len(_line(row["route"])))
        )
    assert shown[f"{4:016x}"]["route_preview"] is None


def test_a_run_without_a_route_keeps_no_preview_of_one(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    me = signed_up(client)
    assert (
        client.put(f"/me/activities/{KEY}", json=free(), headers=me).status_code == 201
    )
    row = both_roads(database)[KEY]
    assert row["route_kept"] is None
    assert row["track_kept"] is not None
    shown = listed(client, me)[KEY]
    assert shown["route_preview"] is None
    assert shown["track_preview"] == from_the_whole(row)[1]


def test_the_previews_follow_a_line_written_again(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    me = signed_up(client)
    client.put(f"/me/activities/{KEY}", json=request(), headers=me)
    another = a_jog(5, 500)
    with database.connect() as conn:
        conn.execute(
            "UPDATE runs SET route = ST_GeomFromText(%s, 4326),"
            " track = ST_GeomFromText(%s, 4326) WHERE key = %s",
            (line_wkt(another), track_wkt(another), KEY),
        )
    row = both_roads(database)[KEY]
    expected = [list(p) for p in preview(another)]
    assert from_the_kept(row) == (expected, expected)
    shown = listed(client, me)[KEY]
    assert shown["route_preview"] == shown["track_preview"] == expected


# --- The list reads the previews only ---


def test_the_list_and_the_save_read_only_the_previews(
    client: TestClient,  # noqa: F811
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every line the API reads from the database goes through `_line`: for
    the list and for the answer of a save, never more than a preview."""
    read: list[int] = []
    whole_line = activities_module._line

    def counted(geojson: str | None) -> list[Point]:
        line = whole_line(geojson)
        read.append(len(line))
        return line

    monkeypatch.setattr(activities_module, "_line", counted)
    me = signed_up(client)
    body = a_run(0, 1000, 2000)

    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 201
    assert read == [PREVIEW_POINTS, PREVIEW_POINTS]
    read.clear()
    # Sent again: answered as it was saved, from the previews.
    assert client.put(f"/me/activities/{KEY}", json=body, headers=me).status_code == 200
    assert read == [PREVIEW_POINTS, PREVIEW_POINTS]
    read.clear()
    assert client.get("/me/activities", headers=me).status_code == 200
    assert read == [PREVIEW_POINTS, PREVIEW_POINTS]
    read.clear()
    # Opened, the run is whole as before.
    whole = client.get(f"/me/activities/{KEY}", headers=me).json()
    assert sorted(read) == [1000, 2000]
    assert len(whole["track"]) == 1000 and len(whole["points"]) == 2000


# --- The runs saved before the migration ---


def test_the_runs_saved_before_have_their_previews(
    database_url: str,
    tmp_path: Path,
    wall: WallClock,  # noqa: F811
    service: PlaceService,  # noqa: F811
) -> None:
    # The schema of before TASK-501, with runs of many lengths in it.
    database = Database(database_url)  # noqa: F811
    before = [path for path in migrations() if path.stem != MIGRATION]
    assert len(before) == len(migrations()) - 1
    for path in before:
        shutil.copy(path, tmp_path / path.name)
    database.migrate(tmp_path)
    old = TestClient(
        create_app(
            FileSource(Path("unused.graphml")),
            accounts=Accounts(database, now=wall, hasher=FAST_HASHER),
            run_places=PlaceNames(PLACE_KEY, fetch=service),
        )
    )
    me = signed_up(old)
    with database.connect() as conn:
        user = conn.execute("SELECT id FROM users").fetchone()
        assert user is not None
        for points in LENGTHS:
            line = a_jog(points, points)
            # Along a route for the even lengths, without one for the odd.
            route = line_wkt(a_jog(points + 1, points)) if points % 2 == 0 else None
            conn.execute(
                "INSERT INTO runs (user_id, key, route, route_similarity, track,"
                " pauses, started_at, distance_m, duration_s, place, created_at)"
                " VALUES (%s, %s, ST_GeomFromText(%s, 4326), %s,"
                " ST_GeomFromText(%s, 4326), '[]', %s, 1001, 299, 'Trento', %s)",
                (
                    user["id"],
                    f"length{points:06d}",
                    route,
                    None if route is None else 0.9,
                    track_wkt(line),
                    wall.t,
                    wall.t,
                ),
            )
        # A workout at the gym: no track at all (TASK-385).
        conn.execute(
            "INSERT INTO runs (user_id, key, activity, pauses, started_at,"
            " distance_m, duration_s, created_at)"
            " VALUES (%s, 'workout0', 'gym', '[]', %s, 0, 1800, %s)",
            (user["id"], wall.t, wall.t),
        )

    assert database.migrate(MIGRATIONS_DIR) == [MIGRATION]

    rows = both_roads(database)
    assert len(rows) == len(LENGTHS) + 1
    workout = rows.pop("workout0")
    assert workout["track_kept"] is None and workout["route_kept"] is None
    for key, row in rows.items():
        points = int(key.removeprefix("length"))
        assert row["track_points"] == min(points, PREVIEW_POINTS), key
        assert row["route_points"] == (
            min(points, PREVIEW_POINTS) if points % 2 == 0 else None
        ), key
        # What the list showed, from the whole lines, and what it shows now.
        assert from_the_kept(row) == from_the_whole(row), key
    shown = listed(old, me)
    for key, row in rows.items():
        was = from_the_whole(row)
        assert (shown[key]["route_preview"], shown[key]["track_preview"]) == was, key
    # The workout, for an app that shows what has no track (ADR-0328).
    assert "workout0" not in shown
    workout = listed(old, {**me, READS_HEADER: "gym,trackless"})["workout0"]
    assert workout["track_preview"] == [] and workout["route_preview"] is None
