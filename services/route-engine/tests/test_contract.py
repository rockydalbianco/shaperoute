"""The TypeScript contract in packages/shared-types mirrors models.py by hand
(ADR-0028): its fixtures must fit the dataclasses, field for field."""

import json
from dataclasses import fields
from pathlib import Path
from typing import Any

from route_engine.alternatives import MAX_ALTERNATIVES
from route_engine.models import (
    MAX_DISTANCE_M,
    MIN_DISTANCE_M,
    SUPPORTED_ACTIVITIES,
    RouteRequest,
    RouteResult,
)
from route_engine.pen_up import drawn_pieces, walks_problem
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.words import ALPHABET, LETTER_DISTANCE_M, MAX_WORD_LETTERS, STYLES

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _names(model: type) -> set[str]:
    return {f.name for f in fields(model)}


# Added by TASK-197 (ADR-0157), both optional: the fixtures written before
# are what an older app sends and an older API answers.
PEN_UP = {"pen_up"}
WALKS = {"walks"}


def test_request_fixtures_are_valid_requests() -> None:
    # A shape or a word, the other null (TASK-056).
    for name, drawn in (
        ("route-request.json", "heart"),
        ("route-request-word.json", "CIAO"),
    ):
        data = _load(name)
        assert set(data) == _names(RouteRequest) - PEN_UP
        request = RouteRequest(**{**data, "start": tuple(data["start"])})
        assert request.start == (46.0671, 11.1214)
        assert request.name == drawn
        assert not request.pen_up


def test_result_fixtures_have_the_result_fields() -> None:
    for name in ("route-result.json", "route-result-word.json"):
        data = _load(name)
        assert set(data) == _names(RouteResult) - WALKS
        points = [tuple(p) for p in data["points"]]
        result = RouteResult(**{**data, "points": points})
        assert result.points[0] == result.points[-1]
        assert (result.shape is None) != (result.word is None)
        assert result.walks == []  # an older API: no walks, one line


def test_a_word_with_the_pen_up_and_its_walks_are_in_the_contract() -> None:
    data = _load("route-request-pen-up.json")
    assert set(data) == _names(RouteRequest)
    request = RouteRequest(**{**data, "start": tuple(data["start"])})
    assert request.pen_up and request.name == "IO"
    data = _load("route-result-pen-up.json")
    assert set(data) == _names(RouteResult)
    points = [tuple(p) for p in data["points"]]
    walks = [tuple(w) for w in data["walks"]]
    result = RouteResult(**{**data, "points": points, "walks": walks})
    # One walk fewer than the letters, within the points, in order; the
    # route is open, from the first letter to the last.
    assert result.word is not None and len(result.walks) == len(result.word) - 1
    assert walks_problem(result.walks, len(result.points)) is None
    assert len(drawn_pieces(result.points, result.walks)) == len(result.word)
    assert result.points[0] != result.points[-1]


def test_shapes_activities_and_limits_match() -> None:
    contract = _load("contract.json")
    assert contract == {
        "shapes": list(SUPPORTED_SHAPES),
        "activities": list(SUPPORTED_ACTIVITIES),
        "min_distance_m": MIN_DISTANCE_M,
        "max_distance_m": MAX_DISTANCE_M,
        "letters": sorted(ALPHABET),
        "max_word_letters": MAX_WORD_LETTERS,
        "letter_distance_m": LETTER_DISTANCE_M,
        "styles": list(STYLES),
    }


def test_alternatives_have_the_engine_limit_and_the_result_fields() -> None:
    assert _load("route-alternatives.json") == {"max_alternatives": MAX_ALTERNATIVES}
    for other in _load("route-result.json")["alternatives"]:
        assert set(other) == _names(RouteResult) - WALKS
        assert other["alternatives"] == []
