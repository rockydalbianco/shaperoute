"""Shapes in pieces (TASK-223): lines apart from the outline, such as the eyes
of a face, drawn on their own with the pen up, or joined with the pen down."""

import json
import math
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np
import pytest

import route_engine.__main__ as cli
from route_engine.__main__ import main, parse_request
from route_engine.geo import LatLon, local_to_latlon, path_length_m
from route_engine.models import PEN_UP_WITHOUT_WORD
from route_engine.network import Graph
from route_engine.optimizer import DISTANCE_TOLERANCE, SHAPE_POINTS, plan_shape
from route_engine.pen_up import drawn_m, walks_problem
from route_engine.pieces import PIECE_HEIGHT, NoPiecesError, compose
from route_engine.shapes import OUTLINES, SHAPES
from route_engine.shapes.outline import (
    InvalidOutlineError,
    Outline,
    parse_outline,
)
from route_engine.words import Place

TRENTO = (46.0671, 11.1214)

# A square face 20 wide, far from the origin, with two square eyes and an
# open mouth inside: the place and scale of the file do not matter.
FACE = [[100, 100], [100, 120], [120, 120], [120, 100], [100, 100]]
LEFT_EYE = [[104, 112], [104, 116], [107, 116], [107, 112], [104, 112]]
RIGHT_EYE = [[113, 112], [113, 116], [116, 116], [116, 112], [113, 112]]
MOUTH = [[104, 106], [110, 104], [116, 106]]


def _data(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {
        "name": "face",
        "source": "a test",
        "license": "none",
        "points": FACE,
        "pieces": [LEFT_EYE, RIGHT_EYE, MOUTH],
    }
    data.update(overrides)
    return data


def _frame(point: list[int]) -> tuple[float, float]:
    """A point of the file in the frame of the outline: the face fills
    [-1, 1]² and the file is centred on (110, 110)."""
    return (point[0] - 110) / 10, (point[1] - 110) / 10


def _length(line: Any) -> float:
    return sum(math.dist(a, b) for a, b in zip(line, line[1:], strict=False))


# --- The file ---


def test_pieces_share_the_frame_of_the_outline() -> None:
    outline = parse_outline(_data())
    assert outline.points[0] == pytest.approx((-1.0, -1.0))
    assert outline.pieces[0] == pytest.approx([_frame(p) for p in LEFT_EYE])
    assert outline.pieces[2] == pytest.approx([_frame(p) for p in MOUTH])
    assert outline.strokes == ()


def test_pieces_count_in_the_size_of_the_drawing() -> None:
    # A piece beyond the outline, like the rays of a sun: the whole drawing
    # fills the square, not the outline alone.
    ray = [[130, 110], [140, 110]]
    outline = parse_outline(_data(pieces=[ray]))
    xs = [x for x, _ in (*outline.points, *outline.pieces[0])]
    assert (min(xs), max(xs)) == pytest.approx((-1.0, 1.0))


def test_an_outline_without_pieces_is_read_as_before() -> None:
    for path in sorted(OUTLINES.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if "pieces" in data:
            continue
        outline = parse_outline(data)
        assert outline.pieces == () and outline.joined == ()


@pytest.mark.parametrize(
    ("pieces", "message"),
    [
        ("eyes", "'pieces' must be a list of lines"),
        ([[[0, 0]]], "piece 1 needs at least 2 distinct points"),
        ([[[104, 112], [106, 114], [104, 112]]], "piece 1 needs at least 3"),
        ([LEFT_EYE, [[104, 106], [106, 106], [104, 106]]], "piece 2 needs at least 3"),
        # A bow tie: it crosses itself where its sides meet.
        ([[[104, 104], [108, 108], [108, 104], [104, 108], [104, 104]]], "crosses"),
        ([[[104, 104], [108, 104], [106, 104]]], "folds back onto itself"),
        ([[[104, 104], [108, 104], [108, 108], [108, 104]]], "comes back to a point"),
        ([[[104, 104], [108, 108], [108, 104], [104, 108]]], "piece 1 crosses itself"),
        ([[[110, 110], [125, 110]]], "piece 1 touches the outline"),
        ([[[110, 110], [110, 120]]], "piece 1 touches the outline"),
        ([LEFT_EYE, [[105, 105], [105, 114]]], "piece 2 touches piece 1"),
    ],
)
def test_a_broken_piece_is_named(pieces: object, message: str) -> None:
    with pytest.raises(InvalidOutlineError, match=message):
        parse_outline(_data(pieces=pieces))


def test_a_piece_may_not_touch_a_stroke() -> None:
    stroke = [[110, 100], [110, 108]]
    with pytest.raises(InvalidOutlineError, match="piece 1 touches stroke 1"):
        parse_outline(_data(strokes=[stroke], pieces=[[[108, 108], [112, 108]]]))


def test_a_piece_of_an_image_may_cross() -> None:
    crossing = [[[110, 110], [125, 110]]]
    outline = parse_outline(_data(pieces=crossing), allow_crossings=True)
    assert len(outline.pieces) == 1


# --- With the pen down: each piece joined as a stroke ---


def test_with_the_pen_down_each_piece_hangs_from_the_nearest_line() -> None:
    outline = parse_outline(_data())
    left, right, mouth = outline.joined
    # The left eye, from the left side of the face to its nearest corner,
    # round it and back to that corner: a window on a line (TASK-037).
    assert left[0] == pytest.approx((-1.0, _frame([104, 112])[1]))
    assert left[1] == pytest.approx(_frame([104, 112]))
    assert left[-1] == left[1]
    assert sorted(left[1:-1]) == pytest.approx(sorted(outline.pieces[0][:-1]))
    # The right eye is as near to the top as to the right side: the first
    # vertex found that near wins, its upper left corner, joined to the top.
    assert right[1] == pytest.approx(_frame([113, 116]))
    assert right[0] == pytest.approx((right[1][0], 1.0))
    # The mouth, an open line, from its end nearest to a line: both ends are
    # as near to the sides, and the first, the left one, wins.
    assert mouth[0] == pytest.approx((-1.0, _frame([104, 106])[1]))
    assert np.array(mouth[1:]) == pytest.approx(np.array(outline.pieces[2]))


def test_with_the_pen_down_the_shape_is_one_closed_line_through_every_piece() -> None:
    outline = parse_outline(_data())
    path = outline.path()
    assert path[0] == path[-1] == outline.points[0]
    for piece in outline.pieces:
        for point in piece:
            assert any(math.dist(point, p) < 1e-9 for p in path)
    # Each piece is drawn out and back, as a stroke: its link twice.
    links = sum(math.dist(line[0], line[1]) for line in outline.joined)
    eyes = sum(_length(piece) for piece in outline.pieces[:2])
    mouth = _length(outline.pieces[2])
    face = _length(outline.points)
    assert _length(path) == pytest.approx(face + eyes + 2 * mouth + 2 * links)
    points = outline(SHAPE_POINTS)
    assert len(points) == SHAPE_POINTS + 1 and points[0] == points[-1]


def test_a_link_that_would_cross_a_line_is_refused() -> None:
    # A dot inside a ring: joined to the face before the ring, the dot's
    # link runs across it. The ring first, the dot hangs from the ring.
    ring = [[106, 106], [106, 114], [114, 114], [114, 106], [106, 106]]
    dot = [[109, 109], [109, 111], [111, 111], [111, 109], [109, 109]]
    with pytest.raises(InvalidOutlineError, match="with the pen down, a piece"):
        parse_outline(_data(pieces=[dot, ring]))
    outline = parse_outline(_data(pieces=[ring, dot]))
    assert math.dist(*outline.joined[1][:2]) == pytest.approx(0.3)


# --- With the pen up: the lines on their own ---


def test_with_the_pen_up_the_outline_comes_first_then_the_pieces() -> None:
    outline = parse_outline(_data())
    lines = outline.pen_up_lines()
    assert len(lines) == 4
    assert lines[0] == list(outline.points)
    # Each closed piece starts at its vertex nearest to where the line before
    # ends, and comes back to it.
    for k in (1, 2):
        piece = outline.pieces[k - 1]
        nearest = min(piece[:-1], key=lambda p: math.dist(p, lines[k - 1][-1]))
        assert lines[k][0] == lines[k][-1] == nearest
        assert sorted(lines[k][:-1]) == sorted(piece[:-1])
    # The open mouth starts at its end nearest to the right eye's: the right.
    assert lines[3] == list(outline.pieces[2][::-1])


def test_the_strokes_stay_on_the_outline_with_the_pen_up() -> None:
    stroke = [[110, 100], [110, 103]]
    outline = parse_outline(_data(strokes=[stroke]))
    first = outline.pen_up_lines()[0]
    assert first[0] == first[-1] == outline.points[0]
    assert any(math.dist(p, _frame([110, 103])) < 1e-9 for p in first)


def test_a_shape_in_pieces_is_a_word_written_with_the_pen_up() -> None:
    outline = parse_outline(_data())
    word = compose(outline, "face")
    assert word.pen_up and word.kind == "piece" and word.text == "face"
    assert word.starts == (0,) and word.phases == (0.0,)
    assert len(word.letters) == 4
    assert word.label(0) == "piece 1" and word.label(3) == "piece 4"
    # One letter height is PIECE_HEIGHT of the size, the frame 2 wide.
    assert word.height == pytest.approx(2 * PIECE_HEIGHT)
    xs = [x for x, _ in word.points]
    ys = [y for _, y in word.points]
    assert (min(xs), max(xs), min(ys), max(ys)) == pytest.approx((-1, 1, -1, 1))
    # Each line is drawn where the outline puts it, and only the lines are.
    lines = outline.pen_up_lines()
    for k, rows in enumerate(word.strokes(0)):
        drawn = np.array(word.points)[rows]
        assert drawn[0] == pytest.approx(lines[k][0])
        assert drawn[-1] == pytest.approx(lines[k][-1])
        assert _length(drawn) == pytest.approx(_length(lines[k]))
    assert word.drawn_length == pytest.approx(sum(_length(line) for line in lines))
    # The gaps run straight from the end of a line to the start of the next.
    gaps = [p for p, place in zip(word.points, word.places, strict=True) if place.along]
    assert gaps and all(
        place.along is None or 0 < place.along < 1 for place in word.places
    )
    assert word.places[0] == Place(0)


def test_the_outline_holds_the_start_and_the_pieces_move() -> None:
    word = compose(parse_outline(_data()), "face")
    points, _ = word.line(0)
    shifts = np.array([[0.25, 0.0], [0.125, 0.0], [0.0, 0.25], [-0.25, 0.0]])
    moved = (np.array(word.moved(0, shifts)) - points) / word.height
    for place, move in zip(word.places, moved, strict=True):
        if place.along is None and place.index == 0:
            assert move == pytest.approx((0.0, 0.0))
        elif place.along is None:
            assert move == pytest.approx(shifts[place.index])


def test_a_shape_without_pieces_cannot_be_drawn_with_the_pen_up() -> None:
    outline = parse_outline(_data(pieces=None))
    with pytest.raises(NoPiecesError, match="face has no pieces"):
        compose(outline, "face")


def test_the_catalogue_has_no_shape_in_pieces_yet() -> None:
    # The candidates of TASK-223 are tried from the CLI until the user has
    # judged them by eye on real roads (ADR-0036).
    assert not any(
        isinstance(shape, Outline) and shape.pieces for shape in SHAPES.values()
    )


# --- On the roads ---


def _grid(origin: LatLon, spacing_m: float, half_m: float) -> nx.MultiDiGraph:
    """Streets every `spacing_m` around `origin`, both directions."""
    graph = nx.MultiDiGraph()
    n = int(half_m / spacing_m)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            lat, lon = local_to_latlon(origin, i * spacing_m, j * spacing_m)
            graph.add_node((i, j), y=lat, x=lon)
    for i, j in list(graph.nodes):
        for b in ((i + 1, j), (i, j + 1)):
            if b in graph:
                graph.add_edge((i, j), b, length=spacing_m)
                graph.add_edge(b, (i, j), length=spacing_m)
    return graph


class _Source:
    def __init__(self, graph: Graph | None = None) -> None:
        self.graph = graph if graph is not None else _grid(TRENTO, 100.0, 4000.0)

    def is_cached(self, bbox: tuple[float, float, float, float]) -> bool:
        return True

    def load(self, bbox: tuple[float, float, float, float]) -> Graph:
        return self.graph


def test_a_shape_in_pieces_walks_from_each_piece_to_the_next() -> None:
    outline = parse_outline(_data())
    word = compose(outline, "face")
    source = _Source()
    plan = plan_shape(list(word.points), "face", TRENTO, 8000, source, word=word)
    result = plan.result
    assert result.shape == "face" and result.word is None
    # Four lines, three walks, within the points, in order.
    assert len(result.walks) == 3
    assert walks_problem(result.walks, len(result.points)) is None
    drawn = drawn_m(result.points, result.distance_m, result.walks)
    assert abs(drawn / 8000 - 1) <= DISTANCE_TOLERANCE
    assert result.distance_m == pytest.approx(path_length_m(result.points))
    assert result.distance_m > drawn
    assert all("letter" not in warning for warning in result.warnings)


def _write(tmp_path: Path, **overrides: Any) -> Path:
    path = tmp_path / "face.json"
    path.write_text(json.dumps(_data(**overrides)), encoding="utf-8")
    return path


def test_the_cli_draws_an_outline_in_pieces_with_the_pen_up(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", lambda cache_dir: _Source())
    out = tmp_path / "face.gpx"
    argv = [
        f"--outline={_write(tmp_path)}",
        "--distance=8000",
        "--start=46.0671,11.1214",
        "--pen-up",
    ]
    assert main([*argv, f"--out={out}"]) == 0
    printed = capsys.readouterr().out
    assert "pen up: the outline, then 3 pieces each on its own" in printed
    assert "walks:      3, not drawn: " in printed
    assert "pieces:     " in printed and "m drawn (target 8000 m)" in printed
    assert "(pieces)" in printed
    # A pause and a resume for each walk.
    assert out.read_text(encoding="utf-8").count("<wpt") == 6


def test_the_cli_draws_an_outline_in_pieces_with_the_pen_down_too(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(cli, "OsmnxSource", lambda cache_dir: _Source())
    out = tmp_path / "face.gpx"
    argv = [f"--outline={_write(tmp_path)}", "--distance=8000"]
    assert main([*argv, "--start=46.0671,11.1214", f"--out={out}"]) == 0
    printed = capsys.readouterr().out
    assert "walks:" not in printed and "<wpt" not in out.read_text(encoding="utf-8")


def test_the_cli_refuses_the_pen_up_for_an_outline_without_pieces(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    argv = [
        f"--outline={_write(tmp_path, pieces=None)}",
        "--distance=8000",
        "--start=46.0671,11.1214",
        "--pen-up",
    ]
    with pytest.raises(SystemExit) as exc:
        parse_request(argv)
    assert exc.value.code == 2
    err = capsys.readouterr().err
    assert PEN_UP_WITHOUT_WORD in err and "face has none" in err
