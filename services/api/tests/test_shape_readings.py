"""POST /shape-readings with a fake model: no Ollama here (ADR-0012)."""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource
from route_engine.shapes import SUPPORTED_SHAPES
from shaperoute_ai.prompt import OUTLINES
from shaperoute_ai.reading import Choice, ModelUnavailableError, ShapeReader

from shaperoute_api.app import create_app

REPO = Path(__file__).resolve().parents[3]
UNUSED = FileSource(REPO / "unused.graphml")
PHRASE_LISTS = [
    REPO / "services/ai/tests/phrases.json",
    REPO / "services/ai/tests/phrases-holdout.json",
]


class FakeModel:
    def __init__(self, answers: dict[str, Choice | Exception]) -> None:
        self.answers = answers
        self.asked: list[str] = []

    def choose(self, text: str, shapes: Sequence[str]) -> Choice:
        assert tuple(shapes) == SUPPORTED_SHAPES
        self.asked.append(text)
        answer = self.answers[text]
        if isinstance(answer, Exception):
            raise answer
        return answer


def client_with(model: FakeModel) -> TestClient:
    reader = ShapeReader(model, SUPPORTED_SHAPES)
    return TestClient(create_app(UNUSED, reader=reader))


def test_the_words_become_a_shape_of_the_catalogue() -> None:
    model = FakeModel({"stemma della Ferrari": Choice("horse", "prancing horse")})
    response = client_with(model).post(
        "/shape-readings", json={"text": "  stemma  della Ferrari "}
    )
    assert response.status_code == 200
    assert response.json() == {"text": "stemma della Ferrari", "shape": "horse"}


def test_no_shape_is_null() -> None:
    model = FakeModel({"Batman": Choice(None, "bat superhero")})
    response = client_with(model).post("/shape-readings", json={"text": "Batman"})
    assert response.status_code == 200
    assert response.json() == {"text": "Batman", "shape": None}


def test_a_shape_the_catalogue_does_not_have_is_null() -> None:
    model = FakeModel({"casa": Choice("house", "a house")})
    response = client_with(model).post("/shape-readings", json={"text": "casa"})
    assert response.json()["shape"] is None


def test_the_same_words_are_read_once() -> None:
    model = FakeModel({"Nemo": Choice("fish", "clownfish")})
    client = client_with(model)
    for text in ("Nemo", "nemo ", "NEMO"):
        assert client.post("/shape-readings", json={"text": text}).json()["shape"] == (
            "fish"
        )
    assert model.asked == ["Nemo"]


def test_no_words_or_too_many_are_an_invalid_request() -> None:
    client = client_with(FakeModel({}))
    for body in ({"text": "  "}, {"text": "x" * 61}, {}, {"text": "a", "b": 1}):
        response = client.post("/shape-readings", json=body)
        assert response.status_code == 422, body
        assert response.json()["error"]["code"] == "invalid_request"


def test_a_model_that_does_not_answer_is_ai_unavailable() -> None:
    model = FakeModel({"Garfield": ModelUnavailableError("Ollama does not answer")})
    response = client_with(model).post("/shape-readings", json={"text": "Garfield"})
    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "ai_unavailable",
            "message": "Ollama does not answer",
            "suggested_distance_m": None,
        }
    }


def test_an_api_without_the_ai_says_so() -> None:
    response = TestClient(create_app(UNUSED)).post(
        "/shape-readings", json={"text": "Garfield"}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_unavailable"


def test_every_shape_of_the_catalogue_has_its_outline_for_the_model() -> None:
    assert set(OUTLINES) == set(SUPPORTED_SHAPES)


@pytest.mark.parametrize("path", PHRASE_LISTS, ids=lambda path: path.name)
def test_the_phrase_lists_use_the_catalogue(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["shapes"] == list(SUPPORTED_SHAPES)
    for item in data["phrases"]:
        assert item["accept"], item
        for shape in item["accept"]:
            assert shape is None or shape in SUPPORTED_SHAPES, item


def test_the_held_out_words_are_new() -> None:
    tuning, holdout = (
        {
            item["text"].casefold()
            for item in json.loads(path.read_text("utf-8"))["phrases"]
        }
        for path in PHRASE_LISTS
    )
    assert not tuning & holdout
