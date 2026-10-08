"""Deterministic tests for tools/sample_feed.py: no network, the seed catalogue
of the repository and small made-up ones."""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

from sample_feed import (
    DEFAULT_SEED,
    LINE_POINTS,
    PER_SHAPE,
    POSTS,
    RUNNERS,
    TITLES,
    Figure,
    build,
    choose,
    main,
    read_catalogue,
    read_city,
    simplified,
    to_json,
    turn_of,
)

# As the app accepts a username (apps/mobile/src/account/fields.ts).
USERNAME = re.compile(r"^[A-Za-z0-9_.]{3,20}$")


def figure(city: str, shape: str, similarity: float, route_m: int = 5000) -> Figure:
    return Figure(
        id=f"{city}-{shape}-{route_m}-0",
        city=city,
        shape=shape,
        route_m=route_m,
        similarity=similarity,
        points=((46.0, 11.0), (46.001, 11.0), (46.001, 11.001), (46.0, 11.0)),
    )


def ring(points: int, radius_deg: float = 0.01) -> list[tuple[float, float]]:
    """A closed line around Trento with `points` points."""
    return [
        (
            46.07 + radius_deg * math.cos(2 * math.pi * i / (points - 1)),
            11.12 + radius_deg * math.sin(2 * math.pi * i / (points - 1)),
        )
        for i in range(points)
    ]


def test_every_city_gives_its_best_figures_of_different_shapes() -> None:
    figures = [
        figure("a", "star", 0.99),
        figure("a", "star", 0.98, route_m=10000),
        figure("a", "moon", 0.97),
        figure("b", "heart", 0.96),
        figure("b", "cat", 0.955),
    ]
    # "b" has fewer figures that came out well, and chooses first.
    chosen = choose(figures, posts=4)
    assert [(f.city, f.shape) for f in chosen] == [
        ("b", "heart"),
        ("a", "star"),
        ("b", "cat"),
        ("a", "moon"),
    ]
    # The second star of the same city never comes in: one shape a city.
    assert all(f.route_m == 5000 for f in chosen)


def test_a_shape_not_yet_in_the_feed_comes_before_a_better_repeat() -> None:
    figures = [
        figure("a", "star", 0.99),
        figure("b", "star", 1.0),
        figure("b", "fish", 0.96),
    ]
    # "a" has fewer good figures and chooses first: star. "b" would take its
    # perfect star, but a fish that came out well is new to the feed.
    chosen = choose(figures, posts=2, per_city=1)
    assert [(f.city, f.shape) for f in chosen] == [("a", "star"), ("b", "fish")]


def test_a_new_shape_that_came_out_badly_does_not_beat_a_good_repeat() -> None:
    figures = [
        figure("a", "star", 0.99),
        figure("b", "star", 0.98),
        figure("b", "fish", 0.90),
    ]
    chosen = choose(figures, posts=2, per_city=1)
    assert [(f.city, f.shape) for f in chosen] == [("a", "star"), ("b", "star")]


def test_no_shape_comes_up_more_than_twice() -> None:
    figures = [figure(city, "star", 0.99) for city in "abcd"]
    figures += [figure(city, "moon", 0.90) for city in "abcd"]
    chosen = choose(figures, posts=8)
    assert Counter(f.shape for f in chosen) == {"star": 2, "moon": 2}


def test_the_choice_does_not_depend_on_the_order_of_the_catalogue() -> None:
    figures = read_catalogue(DEFAULT_SEED)
    again = choose(list(reversed(figures)))
    assert [f.id for f in choose(figures)] == [f.id for f in again]


def test_a_simplified_line_keeps_its_corners_and_its_ends() -> None:
    # A square with a hundred points along each side: the corners are the line.
    side = [i / 100 * 0.01 for i in range(100)]
    square = (
        [(46.0, 11.0 + d) for d in side]
        + [(46.0 + d, 11.01) for d in side]
        + [(46.01, 11.01 - d) for d in side]
        + [(46.01 - d, 11.0) for d in side]
        + [(46.0, 11.0)]
    )
    line = simplified(square, most=8)
    assert line[0] == square[0] and line[-1] == square[-1]
    assert len(line) <= 8
    for corner in [(46.0, 11.01), (46.01, 11.01), (46.01, 11.0)]:
        assert any(math.dist(p, corner) < 1e-9 for p in line)


def test_a_simplified_line_has_at_most_the_points_asked_for() -> None:
    assert len(simplified(ring(1000), most=120)) <= 120
    assert len(simplified(ring(1000), most=40)) <= 40
    # A line already short enough is left as it is.
    assert simplified(ring(30), most=120) == ring(30)


def test_the_feed_of_the_seed_catalogue() -> None:
    figures = read_catalogue(DEFAULT_SEED)
    posts = build(figures)
    by_id = {f.id: f for f in figures}

    assert len(posts) == POSTS
    assert len({post["id"] for post in posts}) == POSTS
    # Every city of the catalogue is there, with two figures or more when
    # the posts are enough for two each (TASK-161: 14 cities, 15 posts).
    # With more cities than posts (TASK-163: 23), a post each for as many.
    cities = Counter(str(post["city"]) for post in posts)
    everyone = {f.city for f in figures}
    assert set(cities) <= everyone
    assert len(cities) == min(len(everyone), POSTS)
    assert min(cities.values()) >= min(2, POSTS // len(cities))
    assert max(Counter(str(post["shape"]) for post in posts).values()) <= PER_SHAPE
    for place, post in enumerate(posts):
        source = by_id[str(post["id"])]
        # The line is the engine's: every point of it is a point of the route.
        route = {(round(lat, 5), round(lon, 5)) for lat, lon in source.points}
        line = post["line"]
        assert isinstance(line, list) and 20 <= len(line) <= LINE_POINTS
        assert all((lat, lon) in route for lat, lon in line)
        assert post["route_m"] == source.route_m
        assert post["user"] == RUNNERS[place]
        assert USERNAME.match(str(post["user"]))
        assert 0 < len(str(post["title"])) <= 60
        score = post["score"]
        assert isinstance(score, int) and 60 <= score <= 99
        assert score < round(source.similarity * 100)
        minutes = post["minutes"]
        assert isinstance(minutes, int)
        # Between 5 and 7 minutes a kilometre: a run, not a walk.
        assert 5 <= minutes / (source.route_m / 1000) <= 7


def test_runners_and_titles_are_enough_and_different() -> None:
    assert len(RUNNERS) == POSTS == len(set(RUNNERS))
    for first, second in TITLES.values():
        assert first != second


def test_the_file_is_json_as_prettier_writes_it(tmp_path: Path) -> None:
    posts = build(read_catalogue(DEFAULT_SEED))
    text = to_json(posts)
    assert json.loads(text) == json.loads(json.dumps(posts))
    assert text.startswith('[\n  {\n    "id": ') and text.endswith("\n  }\n]\n")
    # One point a line, as Prettier leaves a pair that fits.
    assert re.search(r"^      \[\d+\.\d+, \d+\.\d+\],?$", text, re.MULTILINE)

    out = tmp_path / "feed.json"
    assert main(["--out", str(out)]) == 0
    assert out.read_text(encoding="utf-8") == text


def test_a_catalogue_too_small_is_an_error_not_a_short_feed(
    tmp_path: Path, capsys
) -> None:
    seed = tmp_path / "seed"
    seed.mkdir()
    (seed / "solo.json").write_text(
        json.dumps(
            {
                "city": "solo",
                "routes": [
                    {
                        "shape": "star",
                        "distance_m": 5000,
                        "route_m": 5000,
                        "similarity": 0.99,
                        "points": [[46.0, 11.0], [46.001, 11.0], [46.0, 11.0]],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    out = tmp_path / "feed.json"
    assert main(["--seed", str(seed), "--out", str(out)]) == 1
    assert "the feed wants 15" in capsys.readouterr().err
    assert not out.exists()


def test_a_figure_the_engine_turned_says_so_and_the_others_do_not(
    tmp_path: Path,
) -> None:
    """TASK-232 part C: `rotation_deg` of a city file goes to the post, so
    «Feed» draws the figure turned back; a route north up, or of a file
    written before, has no field, as before."""
    assert turn_of({}) == 0.0
    assert turn_of({"rotation_deg": -30}) == -30.0
    assert turn_of({"rotation_deg": 22.5}) == 22.5
    for junk in ("30", True, None, 181, float("nan")):
        assert turn_of({"rotation_deg": junk}) == 0.0
    city = tmp_path / "x.json"
    route = {"distance_m": 5000, "route_m": 5000, "similarity": 0.9, "points": ring(30)}
    city.write_text(
        json.dumps(
            {
                "city": "x",
                "routes": [
                    {"shape": "star", "rotation_deg": -30, **route},
                    {"shape": "heart", **route},
                    {"shape": "moon", "rotation_deg": 0, **route},
                ],
            }
        ),
        encoding="utf-8",
    )
    star, heart, moon = read_city(city)
    assert (star.rotation_deg, heart.rotation_deg, moon.rotation_deg) == (-30, 0, 0)
    # Eight cities, two shapes each: a feed of fifteen, the star turned.
    shapes = ["star", "heart", "moon", "cat", "horse", "snail", "sun", "fish"]
    figures = [
        figure(chr(ord("a") + i), shape, 0.99 - i * 0.001)
        for i, shape in enumerate(shapes)
    ] + [
        figure(chr(ord("a") + i), shapes[(i + 1) % len(shapes)], 0.98 - i * 0.001)
        for i in range(len(shapes))
    ]
    figures[0] = Figure(**{**figures[0].__dict__, "rotation_deg": -30.0})
    posts = build(figures)
    turned = [post for post in posts if "rotation_deg" in post]
    assert [(p["city"], p["shape"], p["rotation_deg"]) for p in turned] == [
        ("a", "star", -30.0)
    ]
    assert len(posts) == POSTS
