"""The winter, holiday and sport shapes of TASK-516: the files in the
repository are the ones ``draw_theme_shapes.py`` writes, the engine reads each
one as one outline it can follow, and none of them takes a name already used
by the engine or by the candidates of TASK-418."""

from __future__ import annotations

import json

import pytest

pytest.importorskip("route_engine")
pytest.importorskip("shapely")

import draw_new_shapes  # noqa: E402
from draw_theme_shapes import CANDIDATES, CATEGORIES, S, draw, preview  # noqa: E402
from route_engine.shapes import SHAPES  # noqa: E402
from route_engine.shapes.outline import read_outline  # noqa: E402
from shapely.geometry import LineString  # noqa: E402

NAMES = sorted(S)
N = 64
# The same tolerance as for the shapes of TASK-418: another GEOS simplifies
# the same curves with a vertex more or less.
SAME_DRAWING = 0.02


def _path(name: str):
    return CANDIDATES / f"{name}.json"


def _file(name: str) -> dict:
    return json.loads(_path(name).read_text(encoding="utf-8"))


def test_eleven_shapes_for_winter_the_holidays_and_sport() -> None:
    assert NAMES == [
        "ball",
        "bell",
        "candy_cane",
        "comet",
        "racket",
        "reindeer",
        "santa_hat",
        "skis",
        "snowflake",
        "snowman",
        "stocking",
    ]
    assert {S[n][0] for n in NAMES} <= set(CATEGORIES)


def test_no_name_is_taken() -> None:
    assert not set(NAMES) & set(SHAPES)
    assert not set(NAMES) & set(draw_new_shapes.S)


def test_the_registries_stay_apart() -> None:
    # The 49 shapes of TASK-418 are the user's list: this script adds none.
    assert len(draw_new_shapes.S) == 49


@pytest.mark.parametrize("name", NAMES)
def test_the_file_is_the_one_the_script_writes(name: str) -> None:
    data, left_out = draw(name)
    assert left_out == []
    kept = _file(name)
    assert {k: v for k, v in kept.items() if k not in ("points", "pieces")} == {
        k: v for k, v in data.items() if k not in ("points", "pieces")
    }
    assert len(kept.get("pieces", [])) == len(data.get("pieces", []))
    lines = [kept["points"], *kept.get("pieces", [])]
    wanted = [data["points"], *data.get("pieces", [])]
    for got, want in zip(lines, wanted, strict=True):
        assert LineString(got).hausdorff_distance(LineString(want)) < SAME_DRAWING


@pytest.mark.parametrize("name", NAMES)
def test_the_engine_follows_it_as_one_closed_outline(name: str) -> None:
    outline = read_outline(_path(name))
    assert outline.name == name
    assert not outline.line
    points = outline(N)
    assert points[0] == points[-1]
    assert len(points) >= N + 1
    assert len(outline.pieces) == len(_file(name).get("pieces", []))


@pytest.mark.parametrize("name", NAMES)
def test_the_route_starts_at_the_top(name: str) -> None:
    points = _file(name)["points"]
    assert points[0] == points[-1]
    assert points[0][1] == max(y for _, y in points)


def test_the_holes_and_details_become_pieces() -> None:
    # The ring of the bell, the strings' frame of the racket, the pentagon of
    # the ball.
    assert len(_file("bell")["pieces"]) == 1
    assert len(_file("racket")["pieces"]) == 1
    assert len(_file("ball")["pieces"]) == 1


def test_the_files_say_where_they_come_from() -> None:
    for name in NAMES:
        assert _file(name)["source"].endswith("(TASK-516)")


def test_the_preview_draws_every_shape() -> None:
    page = preview([draw(n)[0] for n in NAMES])
    assert page.count("<figure>") == len(NAMES)
    assert "<b>snowman</b>" in page
