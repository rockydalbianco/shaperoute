"""What the model is told, and the only answers it may give (ADR-0012).

The answer is a JSON object whose `shape` can only be a name of the
catalogue or "none": the model cannot answer with anything else, whatever
the words say.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

# The answer when no shape of the catalogue fits the words.
NONE = "none"

# How each outline of the catalogue looks, in the words of its source
# (route_engine/shapes). A shape without a line is shown by its name alone.
OUTLINES: dict[str, str] = {
    "circle": "a circle, a ring",
    "heart": "a heart, the symbol of love",
    "star": "a five-pointed star",
    "horse": "a running horse seen from the side",
    "moon": "a crescent moon",
    "cat": "the head of a cat, with pointed ears and eyes",
    "fish": "a fish seen from the side, with a forked tail and an eye",
}

SYSTEM = """\
You choose the drawing that a running route will trace on a map. The runner \
wrote a few words for the drawing they want, in Italian or in English, maybe \
misspelt. The drawings available are:
{catalogue}

Choose the drawing that the words name or picture: the thing itself, a kind \
of it, or something whose best-known image is that drawing, such as a \
character, an emblem or a symbol. Choose "{none}" when no drawing on the list \
is a fair picture of what the words name.

First write in "picture", in at most five English words, what the words \
name. Then write the drawing in "shape"."""


def outline_of(shape: str) -> str:
    return OUTLINES.get(shape, shape)


def system_prompt(shapes: Sequence[str]) -> str:
    catalogue = "\n".join(f"- {shape}: {outline_of(shape)}" for shape in shapes)
    return SYSTEM.format(catalogue=catalogue, none=NONE)


def answer_schema(shapes: Sequence[str]) -> dict[str, Any]:
    """JSON schema of the answer: `picture` first, so the model says what
    it sees before it chooses."""
    return {
        "type": "object",
        "properties": {
            "picture": {"type": "string"},
            "shape": {"type": "string", "enum": [*shapes, NONE]},
        },
        "required": ["picture", "shape"],
    }
