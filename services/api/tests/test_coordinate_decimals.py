"""Six decimals a coordinate in the whole lines the API answers with
(TASK-501, O11): a run opened, a drawing, the page of a post's link, a
favorite, a group run. As many points as the database keeps, each within a
millionth of a degree and a half, and the line still has its name
(best_routes.line_key, the app's favoriteKey) — which a plain rounding to
six decimals would change. The database keeps every digit; the lists'
previews are the ones of before."""

from __future__ import annotations

import json
import math
import random
from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient
from test_drawings import KEY, run
from test_messages import Headers, WallClock, _load, signed_up
from test_post_links import (
    client,  # noqa: F401  (the fixtures of the post links' tests)
    database,  # noqa: F401
    link,
    seen_by,
    wall,  # noqa: F401
)

from shaperoute_api.answer_lines import DECIMALS, short, short_line, short_point
from shaperoute_api.best_routes import _js_round, line_key
from shaperoute_api.db import Database
from shaperoute_api.recommended import preview

Point = tuple[float, float]
# Half a step of the sixth decimal for the rounding, a whole one when the
# coordinate takes the decimal beside it.
NEAR = 1.5e-6 + 1e-12
START_MS = 1790000000000
M_PER_DEG = 111_320.0


def jog(seed: int, fixes: int, decimals: int | None = None) -> list[Point]:
    """A steady jog in Trento whose heading wanders: every digit of a
    double, as a phone sends them, or `decimals` of them, as a route made
    of OpenStreetMap's nodes (seven)."""
    rng = random.Random(seed)
    lat, lon, heading = 46.0671 + seed * 1e-4, 11.1214, rng.uniform(0, 2 * math.pi)
    line: list[Point] = []
    for _ in range(fixes):
        line.append(
            (lat, lon)
            if decimals is None
            else (round(lat, decimals), round(lon, decimals))
        )
        heading += rng.uniform(-0.08, 0.08)
        step = rng.uniform(2.8, 3.2)
        lat += step * math.cos(heading) / M_PER_DEG
        lon += step * math.sin(heading) / (M_PER_DEG * math.cos(math.radians(lat)))
    return line


def as_sent(line: list[Point]) -> list[list[float]]:
    return [[lat, lon] for lat, lon in line]


def points_of(answered: list[list[float]]) -> list[Point]:
    return [(lat, lon) for lat, lon in answered]


def has_six_decimals(value: float) -> bool:
    """As JSON carries it: at most six digits after the point."""
    text = json.dumps(value)
    return "e" not in text and len(text.partition(".")[2]) <= DECIMALS


def assert_short_of(answered: list[list[float]], whole: list[Point]) -> None:
    """`answered` is `whole` as the app is to receive it."""
    line = points_of(answered)
    assert len(line) == len(whole)
    for (lat, lon), (whole_lat, whole_lon) in zip(line, whole, strict=True):
        assert has_six_decimals(lat) and has_six_decimals(lon)
        assert abs(lat - whole_lat) < NEAR and abs(lon - whole_lon) < NEAR
    assert line_key(line) == line_key(whole)


def kept_line(database: Database, sql: str, *args: Any) -> list[Point]:  # noqa: F811
    """A line as the database keeps it, every digit."""
    with database.connect() as conn:
        row = conn.execute(sql, args).fetchone()
    assert row is not None
    return [(lat, lon) for lon, lat in json.loads(row["line"])["coordinates"]]


# --- The coordinate ---


def test_a_coordinate_is_shortened_inside_its_cell() -> None:
    rng = random.Random(501)
    values = [rng.uniform(-180.0, 180.0) for _ in range(20_000)]
    # As OpenStreetMap's nodes, and as the app's examples.
    values += [round(rng.uniform(-180.0, 180.0), 7) for _ in range(20_000)]
    values += [round(rng.uniform(-90.0, 90.0), 4) for _ in range(2_000)]
    # At the border of a cell of five decimals, and on either side of it.
    for _ in range(5_000):
        border = (rng.randrange(-18_000_000, 18_000_000) + 0.5) / 1e5
        values += [
            border,
            math.nextafter(border, math.inf),
            math.nextafter(border, -math.inf),
            border + rng.uniform(-6e-7, 6e-7),
            round(border + rng.choice((-1, 1)) * rng.randrange(1, 6) * 1e-7, 7),
        ]
    moved = 0
    for value in values:
        shortened = short(value)
        assert has_six_decimals(shortened), value
        assert abs(shortened - value) < NEAR, value
        assert _js_round(shortened * 1e5) == _js_round(value * 1e5), value
        assert short(shortened) == shortened, value
        moved += shortened != round(value, DECIMALS)
    # The plain rounding is not enough: some took the decimal beside it.
    assert moved > 100


def test_the_plain_rounding_would_leave_the_cell() -> None:
    """46.0671249 is in the cell of 46.06712; 46.067125, its six decimals,
    in the one of 46.06713."""
    for value, kept in ((46.0671249, 46.067124), (11.1214748, 11.121474)):
        plain = round(value, DECIMALS)
        assert _js_round(plain * 1e5) != _js_round(value * 1e5)
        assert short(value) == kept
    # Nothing to do for a coordinate of six decimals or fewer.
    for value in (46.0671, 11.1214, 46.067125, -33.856785, 0.0, -0.000001):
        assert short(value) == value
    assert short_point((46.0671249, 11.1214748)) == (46.067124, 11.121474)


def test_a_line_keeps_its_name_which_the_plain_rounding_changes() -> None:
    renamed = 0
    for seed in range(40):
        whole = jog(seed, 200, decimals=None if seed % 2 else 7)
        shortened = short_line(whole)
        assert len(shortened) == len(whole)
        assert line_key(shortened) == line_key(whole)
        plain = [(round(lat, DECIMALS), round(lon, DECIMALS)) for lat, lon in whole]
        renamed += line_key(plain) != line_key(whole)
    # With 200 points nearly every line: about one coordinate in twenty.
    assert renamed >= 38
    assert short_line([]) == []
    assert short_line(iter([(46.0671, 11.1214)])) == [(46.0671, 11.1214)]


# --- The answers ---


def a_long_run(seed: int = 3, fixes: int = 400) -> dict[str, Any]:
    """A run of `fixes` fixes with every digit, along a route of 150 points
    of seven decimals."""
    track = jog(seed, fixes)
    route = jog(seed + 100, 150, decimals=7)
    return run(
        track=[
            {"point": [lat, lon], "time_ms": START_MS + n * 1000, "accuracy_m": 5.0}
            for n, (lat, lon) in enumerate(track)
        ],
        pauses=[],
        points=as_sent(route),
    )


def test_a_run_opens_with_six_decimals_and_is_kept_with_every_digit(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    body = a_long_run()
    saved = client.put(f"/me/activities/{KEY}", json=body, headers=ada)
    assert saved.status_code == 201, saved.text

    route = kept_line(
        database, "SELECT ST_AsGeoJSON(route, 15) AS line FROM runs WHERE key = %s", KEY
    )
    track = kept_line(
        database,
        "SELECT ST_AsGeoJSON(ST_Force2D(track), 15) AS line FROM runs WHERE key = %s",
        KEY,
    )
    # Nothing written changes: the route digit for digit, the track with
    # more digits than the app is answered.
    assert as_sent(route) == body["points"]
    assert not all(has_six_decimals(lat) for lat, _ in track)

    opened = client.get(f"/me/activities/{KEY}", headers=ada).json()
    assert_short_of(opened["points"], route)
    assert_short_of(opened["track"], track)
    # The route's name on the phone is the one of the points it sent.
    assert line_key(points_of(opened["points"])) == line_key(points_of(body["points"]))

    # The list is the one of before: the previews of the whole lines.
    [listed] = client.get("/me/activities", headers=ada).json()["activities"]
    assert points_of(listed["route_preview"]) == preview(route)
    assert points_of(listed["track_preview"]) == preview(track)
    assert points_of(saved.json()["track_preview"]) == preview(track)


def test_a_drawing_and_its_link_show_the_same_short_line(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    saved = client.put(f"/me/activities/{KEY}", json=a_long_run(), headers=ada)
    assert saved.status_code == 201, saved.text
    drawing_id = seen_by(client, ada, "everyone")
    drawn = kept_line(
        database,
        "SELECT ST_AsGeoJSON(d.track, 15) AS line FROM drawings d WHERE d.id = %s",
        drawing_id,
    )
    # The drawing is written from the run's track, every digit of it.
    assert drawn == kept_line(
        database,
        "SELECT ST_AsGeoJSON(ST_Force2D(track), 15) AS line FROM runs WHERE key = %s",
        KEY,
    )

    seen = client.get(f"/drawings/{drawing_id}", headers=signed_up(client, "bob"))
    assert seen.status_code == 200, seen.text
    assert_short_of(seen.json()["track"], drawn)
    mine = client.get(f"/drawings/{drawing_id}", headers=ada).json()
    assert mine["track"] == seen.json()["track"]

    page = link(client, drawing_id)
    assert page.status_code == 200, page.text
    assert page.json()["track"] == seen.json()["track"]


def keep(client: TestClient, who: Headers, line: list[Point]) -> str:  # noqa: F811
    """`line` kept among the favorites as the app does: named by its
    points."""
    key = line_key(line)
    body = {**_load("favorite-request.json"), "points": as_sent(line)}
    kept = client.put(f"/me/favorites/{key}", json=body, headers=who)
    assert kept.status_code == 201, kept.text
    return key


def test_a_favorite_opens_with_six_decimals_and_its_own_name(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    for seed, decimals in ((1, None), (2, 7)):
        line = jog(seed, 300, decimals)
        key = keep(client, ada, line)
        kept = kept_line(
            database,
            "SELECT ST_AsGeoJSON(line, 15) AS line FROM favorites WHERE key = %s",
            key,
        )
        assert kept == line

        opened = client.get(f"/me/favorites/{key}", headers=ada).json()
        assert_short_of(opened["points"], line)
        # What the app would name the line it received: the favorite's key.
        assert line_key(points_of(opened["points"])) == key

        [listed] = [
            favorite
            for favorite in client.get("/me/favorites", headers=ada).json()["favorites"]
            if favorite["id"] == key
        ]
        assert_short_of([listed["start"]], line[:1])
        assert points_of(listed["preview"]) == preview(line)

    # Removed by its key: the line's count is found with every digit.
    assert client.delete(f"/me/favorites/{key}", headers=ada).status_code == 204


def test_a_group_run_opens_with_six_decimals_and_its_route_s_name(
    client: TestClient,  # noqa: F811
    database: Database,  # noqa: F811
    wall: WallClock,  # noqa: F811
) -> None:
    ada = signed_up(client, "ada")
    line = jog(7, 300, decimals=7)
    asked = {
        **_load("group-run-request.json"),
        "points": as_sent(line),
        "starts_at": (wall.t + timedelta(days=1)).isoformat(),
    }
    created = client.post("/group-runs", json=asked, headers=ada)
    assert created.status_code == 201, created.text
    group_run_id = created.json()["id"]
    assert_short_of([created.json()["start"]], line[:1])
    assert points_of(created.json()["preview"]) == preview(line)
    assert line == kept_line(
        database,
        "SELECT ST_AsGeoJSON(line, 15) AS line FROM group_runs WHERE id = %s",
        group_run_id,
    )

    opened = client.get(f"/group-runs/{group_run_id}", headers=ada).json()
    assert_short_of(opened["points"], line)
    # Whoever runs it sends these points: the route's name is the same.
    assert line_key(points_of(opened["points"])) == line_key(line)
