"""The new shapes of TASK-418: the files in the repository are the ones
``draw_new_shapes.py`` writes, and the engine reads every one of them as one
outline it can follow, with its pieces apart."""

from __future__ import annotations

import json

import pytest

pytest.importorskip("route_engine")
pytest.importorskip("shapely")

from draw_new_shapes import (  # noqa: E402
    APPROVED,
    CANDIDATES,
    CATEGORIES,
    OUTLINES,
    S,
    as_text,
    draw,
    home,
    preview,
)
from route_engine.shapes import SHAPES  # noqa: E402
from route_engine.shapes.outline import read_outline  # noqa: E402
from shapely.geometry import LineString  # noqa: E402

NAMES = sorted(S)
N = 64
# Two drawings of a shape are the same when no point of one is farther than
# this from the other, in the frame of the script (about [-1, 1]).
SAME_DRAWING = 0.02


def _file(name: str) -> dict:
    return json.loads(home(name).read_text(encoding="utf-8"))


def test_the_user_chose_forty_nine_shapes_in_five_groups() -> None:
    assert len(NAMES) == 49
    groups = {c: sum(S[n][0] == c for n in NAMES) for c in CATEGORIES}
    assert groups == {
        "monuments": 7,
        "food": 8,
        "animals": 11,
        "objects": 12,
        "symbols": 11,
    }


def test_only_the_approved_shapes_are_in_the_catalogue() -> None:
    assert len(APPROVED) == 14
    assert APPROVED <= set(NAMES)
    assert set(NAMES) & set(SHAPES) == APPROVED


@pytest.mark.parametrize("name", NAMES)
def test_each_file_lives_in_one_place(name: str) -> None:
    in_catalogue = (OUTLINES / f"{name}.json").exists()
    candidate = (CANDIDATES / f"{name}.json").exists()
    assert (in_catalogue, candidate) == (name in APPROVED, name not in APPROVED)


@pytest.mark.parametrize("name", NAMES)
def test_the_file_is_the_one_the_script_writes(name: str) -> None:
    data, left_out = draw(name)
    assert left_out == []
    kept = _file(name)
    assert {k: v for k, v in kept.items() if k not in ("points", "pieces")} == {
        k: v for k, v in data.items() if k not in ("points", "pieces")
    }
    # Another GEOS simplifies the same curves with a vertex more or less, a
    # few hundredths away: the lines are compared as drawings, not vertex by
    # vertex.
    assert len(kept.get("pieces", [])) == len(data.get("pieces", []))
    lines = [kept["points"], *kept.get("pieces", [])]
    wanted = [data["points"], *data.get("pieces", [])]
    for got, want in zip(lines, wanted, strict=True):
        assert LineString(got).hausdorff_distance(LineString(want)) < SAME_DRAWING


@pytest.mark.parametrize("name", NAMES)
def test_the_engine_follows_it_as_one_closed_outline(name: str) -> None:
    outline = read_outline(home(name))
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


def test_the_holes_become_pieces() -> None:
    # The ring of the anchor, the shackle and keyhole of the padlock, the
    # bow of the key, the two loops of the infinity sign.
    assert len(_file("anchor").get("pieces", [])) == 1
    assert len(_file("padlock")["pieces"]) == 2
    assert len(_file("key")["pieces"]) == 1
    assert len(_file("infinity")["pieces"]) == 2


def test_the_bicycle_has_its_wheels_apart() -> None:
    wheels = [p for p in _file("bicycle")["pieces"] if len(p) > 20]
    assert len(wheels) == 2


def test_a_file_ends_with_a_new_line() -> None:
    data, _ = draw(NAMES[0])
    assert as_text(data).endswith("}\n")


def test_the_preview_draws_every_shape() -> None:
    page = preview([draw(n)[0] for n in NAMES])
    assert page.count("<figure>") == 49
    assert "<b>colosseum</b>" in page
