"""The AI's theme (TASK-129): only a theme of the list, checked; no network."""

from __future__ import annotations

import json
from typing import Any

import pytest

from shaperoute_ai.ollama import OllamaModel
from shaperoute_ai.reading import ModelUnavailableError
from shaperoute_ai.theme_reading import NONE, ThemeReader, parse_theme, request_body

THEMES = ["romantic", "food"]


def reply(theme: str) -> dict[str, Any]:
    return {"message": {"content": json.dumps({"theme": theme})}}


def test_the_answer_can_only_be_a_theme_or_none() -> None:
    body = request_body(OllamaModel(), "un giro per innamorati", THEMES)
    assert body["format"]["properties"]["theme"]["enum"] == [*THEMES, NONE]
    assert body["options"]["temperature"] == 0


def test_a_theme_outside_the_list_is_none() -> None:
    assert parse_theme(reply("romantic"), THEMES) == "romantic"
    assert parse_theme(reply("pirates"), THEMES) is None
    assert parse_theme(reply(NONE), THEMES) is None
    with pytest.raises(ModelUnavailableError):
        parse_theme({"message": {}}, THEMES)


def test_the_same_words_are_asked_once() -> None:
    calls: list[str] = []

    def post(url: str, body: dict[str, Any], timeout_s: float) -> Any:
        calls.append(url)
        return reply("romantic")

    reader = ThemeReader(OllamaModel(post=post))
    assert reader("Un giro per innamorati", THEMES) == "romantic"
    assert reader("un giro  per innamorati", THEMES) == "romantic"
    assert len(calls) == 1
