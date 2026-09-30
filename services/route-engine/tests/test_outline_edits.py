"""Parts and details drawn by hand on an image's outline (TASK-079)."""

import math

import pytest
from shapely.geometry import Polygon

from route_engine.outline_edits import (
    EDIT_REASONS,
    MAX_DETAIL_POINTS,
    EditedOutline,
    InvalidEditError,
    add_detail,
    add_part,
)
from route_engine.shapes.outline import InvalidOutlineError, parse_outline

Point = tuple[float, float]

# A 100 × 100 square, y upwards, closed.
SQUARE: list[Point] = [(0, 0), (100, 0), (100, 100), (0, 100), (0, 0)]
# A detail from the middle of the left side to the middle of the square.
LEFT_STROKE: list[Point] = [(0, 50), (50, 50)]


def _valid(edited: EditedOutline, crossings: bool = False) -> None:
    """The result is one line the route can follow; with `crossings`, one
    that may cross itself."""
    data: dict[str, object] = {
        "name": "t",
        "source": "t",
        "license": "t",
        "points": [list(p) for p in edited.points],
    }
    if edited.strokes:
        data["strokes"] = [[list(p) for p in s] for s in edited.strokes]
    parse_outline(data, allow_crossings=crossings)


def _reason(call: object, *args: object) -> str:
    with pytest.raises(InvalidEditError) as caught:
        call(*args)  # type: ignore[operator]
    assert caught.value.reason in EDIT_REASONS
    return caught.value.reason


# --- parts ---------------------------------------------------------------


def test_a_part_across_the_line_joins_the_silhouette() -> None:
    drawn = [(80, 40), (140, 40), (140, 60), (80, 60)]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    assert edited.points[0] == edited.points[-1]
    assert Polygon(edited.points).area == pytest.approx(100 * 100 + 40 * 20)
    assert max(x for x, _ in edited.points) == pytest.approx(140)
    assert edited.strokes == ()


def test_a_part_that_only_shares_a_side_still_joins() -> None:
    edited = add_part(SQUARE, [], [(100, 40), (140, 40), (140, 60), (100, 60)])
    assert Polygon(edited.points).area == pytest.approx(100 * 100 + 40 * 20)


def _loop(stroke: tuple[Point, ...]) -> tuple[Point, ...]:
    """The loop at the end of a stroke, closed; empty when it has none."""
    start = stroke.index(stroke[-1])
    return stroke[start:] if start < len(stroke) - 1 else ()


def test_a_part_away_from_the_silhouette_hangs_on_it_as_a_loop() -> None:
    drawn = [(120, 40), (140, 40), (140, 60), (120, 60)]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    assert edited.points == tuple(SQUARE)  # the outline itself is unchanged
    (stroke,) = edited.strokes
    # Joined by the shortest stretch: straight across, 20 long.
    assert stroke[0][0] == pytest.approx(100)
    assert math.dist(stroke[0], stroke[1]) == pytest.approx(20)
    assert Polygon(_loop(stroke)).area == pytest.approx(20 * 20)


def test_a_part_touching_at_one_corner_hangs_there() -> None:
    drawn = [(100, 100), (140, 100), (140, 140), (100, 140)]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    (stroke,) = edited.strokes
    assert stroke[0] == stroke[-1] == (100, 100)
    assert Polygon(stroke).area == pytest.approx(40 * 40)


def test_a_part_inside_the_silhouette_hangs_on_it_as_a_loop() -> None:
    drawn = [(20, 20), (60, 20), (60, 60), (20, 60)]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    assert edited.points == tuple(SQUARE)
    (stroke,) = edited.strokes
    assert stroke[1] == (20, 20)  # the corner nearest to the outline
    assert math.dist(stroke[0], stroke[1]) == pytest.approx(20)
    assert Polygon(_loop(stroke)).area == pytest.approx(40 * 40)


def test_a_loop_inside_may_cross_a_detail() -> None:
    drawn = [(20, 40), (40, 40), (40, 60), (20, 60)]
    edited = add_part(SQUARE, [LEFT_STROKE], drawn)
    _valid(edited, crossings=True)
    assert len(edited.strokes) == 2
    # Without the crossings allowed, the same outline is not one.
    with pytest.raises(InvalidOutlineError):
        _valid(edited)


def test_a_tiny_part_is_short() -> None:
    assert _reason(add_part, SQUARE, [], [(99, 50), (101, 50), (100, 51)]) == "short"
    assert _reason(add_part, SQUARE, [], [(90, 50), (140, 50)]) == "short"


def test_a_part_drawn_across_itself_keeps_its_largest_piece() -> None:
    # A bow tie: the right lobe is much larger than the left one.
    drawn = [(90, 45), (95, 55), (95, 45), (150, 80), (150, 20)]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    assert max(x for x, _ in edited.points) == pytest.approx(150)


def test_holes_left_by_a_part_are_dropped() -> None:
    # A C around the top right corner that closes on the square: the gap
    # between them would be a hole.
    drawn = [
        (90, 90),
        (90, 130),
        (130, 130),
        (130, 70),
        (90, 70),
        (90, 80),
        (120, 80),
        (120, 120),
        (95, 120),
        (95, 90),
    ]
    edited = add_part(SQUARE, [], drawn)
    _valid(edited)
    assert len(Polygon(edited.points).interiors) == 0


def test_a_part_keeps_the_details_elsewhere() -> None:
    drawn = [(80, 40), (140, 40), (140, 60), (80, 60)]
    edited = add_part(SQUARE, [LEFT_STROKE], drawn)
    _valid(edited)
    assert edited.strokes == (tuple(LEFT_STROKE),)


def test_a_part_over_the_start_of_a_detail_covers_it() -> None:
    right_stroke = [(100, 50), (70, 50)]
    drawn = [(80, 40), (140, 40), (140, 60), (80, 60)]
    assert _reason(add_part, SQUARE, [right_stroke], drawn) == "covers_detail"


# --- details -------------------------------------------------------------


def test_a_detail_near_the_line_starts_exactly_on_it() -> None:
    drawn = [(3, 50), (20, 50.2), (40, 49.8), (50, 50)]
    edited = add_detail(SQUARE, [], drawn)
    _valid(edited)
    assert edited.points == tuple(SQUARE)
    (stroke,) = edited.strokes
    assert stroke[0] == (0, 50)
    assert stroke[-1] == (50, 50)
    assert len(stroke) == 2  # the wobble is simplified away


def test_a_detail_that_slides_along_the_line_first_starts_where_it_leaves() -> None:
    drawn = [(0, 10), (0.5, 30), (0, 50), (20, 50), (40, 50)]
    (stroke,) = add_detail(SQUARE, [], drawn).strokes
    assert stroke == ((0, 50), (40, 50))


def test_a_detail_that_crosses_itself_closes_a_loop_there() -> None:
    drawn = [(0, 50), (20, 50), (40, 50), (50, 40), (60, 50), (50, 60), (30, 45)]
    edited = add_detail(SQUARE, [], drawn)
    _valid(edited)
    (stroke,) = edited.strokes
    meet = stroke[-1]
    assert meet[0] == pytest.approx(50 - 20 * 10 / 15)
    assert meet[1] == pytest.approx(50)
    loop = stroke.index(meet)
    assert loop < len(stroke) - 1
    assert len(stroke) - 1 - loop >= 3  # a loop, not a line
    assert stroke[: loop + 1] == ((0, 50), meet)  # the rest is left out


def test_a_detail_whose_end_comes_back_closes_a_loop() -> None:
    drawn = [(0, 50), (30, 50), (40, 60), (50, 50), (40, 40), (31, 49)]
    (stroke,) = add_detail(SQUARE, [], drawn).strokes
    assert stroke == ((0, 50), (30, 50), (40, 60), (50, 50), (40, 40), (30, 50))


def test_a_loop_can_hang_right_on_the_line() -> None:
    drawn = [(0, 40), (30, 30), (30, 60), (2, 41)]
    edited = add_detail(SQUARE, [], drawn)
    _valid(edited)
    (stroke,) = edited.strokes
    assert stroke[0] == stroke[-1] == (0, 40)


def test_a_detail_can_start_on_an_earlier_detail() -> None:
    drawn = [(20, 52), (20, 80)]
    edited = add_detail(SQUARE, [LEFT_STROKE], drawn)
    _valid(edited)
    assert edited.strokes[1] == ((20, 50), (20, 80))


def test_a_detail_away_from_the_line_is_joined_to_the_nearest() -> None:
    (stroke,) = add_detail(SQUARE, [], [(30, 50), (60, 50)]).strokes
    assert stroke == ((0, 50), (60, 50))
    # From whichever end is nearer: here the last point drawn.
    (stroke,) = add_detail(SQUARE, [], [(60, 50), (80, 50)]).strokes
    assert stroke == ((100, 50), (60, 50))
    # To an earlier detail when that is the nearest line.
    edited = add_detail(SQUARE, [LEFT_STROKE], [(30, 60), (30, 80)])
    _valid(edited)
    assert edited.strokes[1] == ((30, 50), (30, 80))


def test_an_eye_drawn_inside_is_a_loop_joined_to_the_line() -> None:
    drawn = [(30, 50), (40, 60), (50, 50), (40, 40), (31, 49)]
    edited = add_detail(SQUARE, [], drawn)
    _valid(edited)
    (stroke,) = edited.strokes
    assert stroke == ((0, 50), (30, 50), (40, 60), (50, 50), (40, 40), (30, 50))


def test_a_detail_may_cross_the_outline() -> None:
    drawn = [(0, 50), (50, 50), (50, 120)]
    edited = add_detail(SQUARE, [], drawn)
    _valid(edited, crossings=True)
    assert edited.strokes == (((0, 50), (50, 50), (50, 120)),)


def test_a_detail_may_cross_another_detail() -> None:
    drawn = [(50, 0), (50, 20), (30, 60)]
    edited = add_detail(SQUARE, [LEFT_STROKE], drawn)
    _valid(edited, crossings=True)
    assert edited.strokes[1] == ((50, 0), (50, 20), (30, 60))


def test_the_route_of_crossing_lines_is_still_one_closed_line() -> None:
    edited = add_detail(SQUARE, [LEFT_STROKE], [(50, 0), (50, 20), (30, 60)])
    outline = parse_outline(
        {
            "name": "t",
            "source": "t",
            "license": "t",
            "points": [list(p) for p in edited.points],
            "strokes": [[list(p) for p in s] for s in edited.strokes],
        },
        allow_crossings=True,
    )
    path = outline.path()
    assert path[0] == path[-1]
    # Out and back along each detail: its far end is passed once.
    assert len(outline(64)) == 65


def test_a_short_detail_is_refused() -> None:
    assert _reason(add_detail, SQUARE, [], [(0, 50), (1, 50)]) == "short"


def test_a_detail_that_stays_on_the_line_is_short() -> None:
    drawn = [(0, 10), (0, 40), (1, 70), (0, 90)]
    assert _reason(add_detail, SQUARE, [], drawn) == "short"


def test_too_many_detail_corners_are_refused() -> None:
    zigzag = [(0.0, 50.0)] + [
        (1.5 * k, 45.0 if k % 2 else 55.0) for k in range(1, MAX_DETAIL_POINTS + 5)
    ]
    assert _reason(add_detail, SQUARE, [], zigzag) == "too_many_corners"


def test_a_drawing_with_too_many_points_is_refused() -> None:
    drawn = [(0.0, 50.0)] + [(0.01 * k, 50.0) for k in range(1, 3_000)]
    assert _reason(add_detail, SQUARE, [], drawn) == "too_many_corners"


# --- both ----------------------------------------------------------------


def test_the_outline_given_must_be_valid() -> None:
    bow_tie = [(0, 0), (100, 100), (100, 0), (0, 100), (0, 0)]
    with pytest.raises(InvalidOutlineError):
        add_part(bow_tie, [], [(80, 40), (140, 40), (140, 60)])
    with pytest.raises(InvalidOutlineError):
        add_detail(SQUARE, [[(30, 50), (40, 50)]], [(0, 50), (20, 50)])


def test_the_scale_and_place_of_the_frame_do_not_matter() -> None:
    def moved(points: list[Point]) -> list[Point]:
        return [(0.01 * x + 7, 0.01 * y - 3) for x, y in points]

    drawn = [(0, 50), (20, 50), (40, 50), (50, 40), (60, 50), (50, 60), (30, 45)]
    big = add_detail(SQUARE, [], drawn)
    small = add_detail(moved(SQUARE), [], moved(drawn))
    assert len(small.strokes[0]) == len(big.strokes[0])
    for a, b in zip(small.strokes[0], moved(list(big.strokes[0])), strict=True):
        assert math.dist(a, b) == pytest.approx(0, abs=1e-9)


def test_the_same_drawing_gives_the_same_outline() -> None:
    drawn = [(80, 40), (140, 40), (140, 60), (80, 60)]
    assert add_part(SQUARE, [], drawn) == add_part(SQUARE, [], drawn)


def test_edits_add_up() -> None:
    edited = add_part(SQUARE, [], [(80, 40), (140, 40), (140, 60), (80, 60)])
    edited = add_detail(edited.points, edited.strokes, [(0, 50), (30, 50)])
    edited = add_detail(edited.points, edited.strokes, [(15, 51), (15, 80)])
    _valid(edited)
    assert len(edited.strokes) == 2
