"""A drawing's shape in its search event (TASK-311 part D, ADR-0271)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from shaperoute_api.insights import route_fields
from shaperoute_api.insights.__main__ import main
from shaperoute_api.insights.events import Event, EventLog
from shaperoute_api.insights.outlines import (
    MAX_POINTS,
    ON_VARIABLE,
    outlines_on,
    page,
    shape_of,
)

TRENTO = [46.0671, 11.1214]
# A square 300 by 300, somewhere on a canvas, and its diagonal.
SQUARE = [
    [100.0, 200.0],
    [400.0, 200.0],
    [400.0, 500.0],
    [100.0, 500.0],
    [100.0, 200.0],
]


def image_body(**more: object) -> dict[str, object]:
    return {
        "start": TRENTO,
        "outline": SQUARE,
        "distance_m": 4000,
        "activity": "cycling",
        "pen_up": False,
        **more,
    }


def test_the_shape_is_brought_to_a_square_without_place_or_size() -> None:
    assert shape_of(image_body()) == [
        [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
    ]
    # The same square elsewhere and ten times bigger: the same shape.
    moved = [[x * 10 + 7000, y * 10 - 50] for x, y in SQUARE]
    assert shape_of(image_body(outline=moved)) == shape_of(image_body())


def test_the_strokes_are_kept_line_by_line_in_one_square() -> None:
    strokes = [[[0, 0], [2, 0]], [[0, 1], [1, 1], [1, 2]]]
    assert shape_of(image_body(strokes=strokes)) == [
        [[0.0, 0.0], [1.0, 0.0]],
        [[0.0, 0.5], [0.5, 0.5], [0.5, 1.0]],
    ]


def test_a_long_line_is_thinned_to_the_most_points_ends_kept() -> None:
    line = [[float(i), float(i % 7)] for i in range(1000)]
    (thinned,) = shape_of(image_body(outline=line)) or [[]]
    assert len(thinned) == MAX_POINTS
    assert thinned[0] == [0.0, 0.0]
    assert thinned[-1] == [1.0, round((999 % 7) / 999, 3)]


def test_no_shape_for_a_word_a_shape_or_a_point() -> None:
    assert shape_of({"shape": "heart", "start": TRENTO}) is None
    assert shape_of({"word": "CIAO"}) is None
    assert shape_of(image_body(outline=[[5, 5], [5, 5]])) is None
    assert shape_of(image_body(outline=[["x", 1]])) is None


def test_off_until_the_server_is_told(monkeypatch: pytest.MonkeyPatch) -> None:
    assert outlines_on({}) is False
    assert outlines_on({ON_VARIABLE: "on"}) is True
    monkeypatch.delenv(ON_VARIABLE, raising=False)
    fields = route_fields(image_body(), 0.91, None)
    assert fields["shape"] == "image"
    assert fields["outline"] is None
    monkeypatch.setenv(ON_VARIABLE, "1")
    fields = route_fields(image_body(), 0.91, None)
    assert fields["outline"] == shape_of(image_body())
    # Never the start: the cell of about 1 km is the event's own.
    assert fields["point"] == (TRENTO[0], TRENTO[1])
    assert "start" not in json.dumps(fields["outline"])


def test_every_route_event_says_its_sport_pen_and_style(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(ON_VARIABLE, "1")
    word = {
        "start": TRENTO,
        "word": "ciao",
        "distance_m": 12000,
        "activity": "running",
        "pen_up": True,
        "style": "round",
    }
    fields = route_fields(word, None, "shape_not_drawable")
    assert (fields["activity"], fields["pen_up"], fields["style"]) == (
        "running",
        True,
        "round",
    )
    # A word is never a shape to keep, even with the switch on.
    assert fields["outline"] is None
    assert route_fields({}, None, None)["activity"] is None


def test_the_event_line_keeps_the_shape_and_drops_what_is_empty(tmp_path: Path) -> None:
    log = EventLog(tmp_path)
    lines = shape_of(image_body())
    log.write(Event(kind="route", shape="image", activity="cycling", outline=lines))
    (written,) = tmp_path.glob("events-*.jsonl")
    event = json.loads(written.read_text(encoding="utf-8"))
    assert event["outline"] == lines
    assert event["activity"] == "cycling"
    assert "pen_up" not in event and "style" not in event


def test_the_page_shows_what_came_out_then_what_did_not() -> None:
    lines = shape_of(image_body()) or []
    events = [
        {
            "kind": "route",
            "outcome": "ok",
            "outline": lines,
            "quality": 0.93,
            "distance_m": 4000,
            "activity": "cycling",
            "ts": "2026-11-23T10:00:00Z",
        },
        {
            "kind": "route",
            "outcome": "error",
            "code": "shape_not_drawable",
            "outline": lines,
            "ts": "2026-11-23T11:00:00Z",
        },
        {"kind": "route", "outcome": "ok", "shape": "heart"},
        {"kind": "city_search", "outline": lines},
    ]
    html = page(events, "Drawings <asked>")
    assert "<title>Drawings &lt;asked&gt;</title>" in html
    assert html.index("Came out (1)") < html.index("Did not come out (1)")
    assert html.count("<svg") == 2
    assert "cycling · 4.0 km · 93%" in html
    assert "shape_not_drawable" in html


def test_the_command_writes_the_page(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    events = tmp_path / "events"
    log = EventLog(events)
    log.write(Event(kind="route", shape="image", outline=shape_of(image_body())))
    out = tmp_path / "drawings.html"
    assert main(["--dir", str(events), "outlines", "--out", str(out)]) == 0
    assert out.read_text(encoding="utf-8").count("<svg") == 1
    assert "written" in capsys.readouterr().out
