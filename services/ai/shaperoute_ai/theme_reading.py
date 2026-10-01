"""The theme of a request the API's word tables do not know (TASK-129).

The model may only answer one of the themes it is given, or "none": the
answer's schema allows nothing else (ADR-0012). It never names a place nor
gives a point; the places come from OpenStreetMap.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any

from shaperoute_ai.ollama import KEEP_ALIVE, MAX_ANSWER_TOKENS, OllamaModel
from shaperoute_ai.reading import ModelUnavailableError

NONE = "none"

DESCRIPTIONS: dict[str, str] = {
    "romantic": "romantic places for a couple: views, gardens, bridges, squares",
    "food": "restaurants, cafés, local food",
    "famous": "the famous places and landmarks of the city",
    "tourist": "a sightseeing tour: sights and museums",
    "panoramic": "viewpoints, views over the city, parks",
    "nature": "parks, gardens, nature",
    "culture": "museums, art, culture",
    "shopping": "shops, malls, markets",
    "nightlife": "bars, pubs, clubs, nightlife",
    "hidden": "hidden gems, lesser-known places",
    "photography": "photo spots, landmarks worth a picture",
    "family": "playgrounds, zoos, aquariums, places for children",
    "running": "a run through parks",
    "walking": "a walk past sights and parks",
    "local": "local markets, cafés, authentic places",
}

SYSTEM = """\
A runner asks for a route in a city, in any language. Choose what the route \
should pass by, from this list, or "{none}" if nothing fits:
{themes}"""


def request_body(
    model: OllamaModel, text: str, themes: Sequence[str]
) -> dict[str, Any]:
    listed = "\n".join(f"- {t}: {DESCRIPTIONS.get(t, t)}" for t in themes)
    body: dict[str, Any] = {
        "model": model.model,
        "messages": [
            {"role": "system", "content": SYSTEM.format(themes=listed, none=NONE)},
            {"role": "user", "content": text},
        ],
        "format": {
            "type": "object",
            "properties": {"theme": {"type": "string", "enum": [*themes, NONE]}},
            "required": ["theme"],
        },
        "stream": False,
        "keep_alive": KEEP_ALIVE,
        "options": {"temperature": 0, "seed": 0, "num_predict": MAX_ANSWER_TOKENS},
    }
    if model.think is not None:
        body["think"] = model.think
    return body


def parse_theme(reply: Any, themes: Sequence[str]) -> str | None:
    """The theme in Ollama's answer, checked: anything else is none."""
    try:
        answer = json.loads(reply["message"]["content"])
        theme = answer["theme"]
    except (KeyError, TypeError, ValueError) as exc:
        raise ModelUnavailableError(f"Ollama's answer has no theme: {exc}") from exc
    return theme if theme in themes else None


class ThemeReader:
    """Reads the theme with the model; the same words are asked once."""

    def __init__(self, model: OllamaModel) -> None:
        self.model = model
        self._seen: dict[str, str | None] = {}

    def __call__(self, text: str, themes: list[str]) -> str | None:
        key = " ".join(text.lower().split())
        if key not in self._seen:
            reply = self.model.post(
                f"{self.model.url.rstrip('/')}/api/chat",
                request_body(self.model, text, themes),
                self.model.timeout_s,
            )
            self._seen[key] = parse_theme(reply, themes)
        return self._seen[key]
