"""The API loads the AI model when it starts, in the background (TASK-052):
it answers at once, also with Ollama off or the model missing."""

from __future__ import annotations

import threading
from collections.abc import Sequence
from pathlib import Path

from fastapi.testclient import TestClient
from route_engine.network import FileSource
from route_engine.shapes import SUPPORTED_SHAPES
from shaperoute_ai.reading import Choice, ModelUnavailableError, ShapeReader

from shaperoute_api.app import create_app

REPO = Path(__file__).resolve().parents[3]
UNUSED = FileSource(REPO / "unused.graphml")


class SlowModel:
    """Takes its time to load, until `loaded` is set; or cannot load."""

    def __init__(self, fails: bool = False) -> None:
        self.fails = fails
        self.started = threading.Event()
        self.loaded = threading.Event()

    def preload(self) -> None:
        self.started.set()
        self.loaded.wait(5)
        if self.fails:
            raise ModelUnavailableError("Ollama does not answer: is it running?")

    def choose(self, text: str, shapes: Sequence[str]) -> Choice:
        return Choice("heart")


def test_the_api_answers_while_the_model_loads() -> None:
    model = SlowModel()
    app = create_app(UNUSED, reader=ShapeReader(model, SUPPORTED_SHAPES))
    with TestClient(app) as client:  # runs the start-up
        assert model.started.wait(5), "the model was not asked to load"
        assert client.get("/health").json() == {"status": "ok"}
        assert not model.loaded.is_set()  # still loading, and nobody waited
        model.loaded.set()


def test_the_api_starts_when_the_model_cannot_load() -> None:
    model = SlowModel(fails=True)
    model.loaded.set()
    app = create_app(UNUSED, reader=ShapeReader(model, SUPPORTED_SHAPES))
    with TestClient(app) as client:
        assert model.started.wait(5)
        assert client.get("/health").status_code == 200
        answer = client.post("/shape-readings", json={"text": "cuore"})
        assert answer.json() == {"text": "cuore", "shape": "heart"}


def test_without_a_reader_nothing_is_loaded() -> None:
    with TestClient(create_app(UNUSED)) as client:
        assert client.get("/health").status_code == 200
