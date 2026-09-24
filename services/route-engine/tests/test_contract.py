"""The TypeScript contract in packages/shared-types mirrors models.py by hand
(ADR-0028): its fixtures must fit the dataclasses, field for field."""

import json
from dataclasses import fields
from pathlib import Path
from typing import Any

from route_engine.models import (
    MAX_DISTANCE_M,
    MIN_DISTANCE_M,
    SUPPORTED_ACTIVITIES,
    RouteRequest,
    RouteResult,
)
from route_engine.shapes import SUPPORTED_SHAPES
from route_engine.words import ALPHABET, LETTER_DISTANCE_M, MAX_WORD_LETTERS

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"


def _load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def _names(model: type) -> set[str]:
    return {f.name for f in fields(model)}


def test_request_fixtures_are_valid_requests() -> None:
    # A shape or a word, the other null (TASK-056).
    for name, drawn in (
        ("route-request.json", "heart"),
        ("route-request-word.json", "CIAO"),
    ):
        data = _load(name)
        assert set(data) == _names(RouteRequest)
        request = RouteRequest(**{**data, "start": tuple(data["start"])})
        assert request.start == (46.0671, 11.1214)
        assert request.name == drawn


def test_result_fixtures_have_the_result_fields() -> None:
    for name in ("route-result.json", "route-result-word.json"):
        data = _load(name)
        assert set(data) == _names(RouteResult)
        points = [tuple(p) for p in data["points"]]
        result = RouteResult(**{**data, "points": points})
        assert result.points[0] == result.points[-1]
        assert (result.shape is None) != (result.word is None)


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
    }
