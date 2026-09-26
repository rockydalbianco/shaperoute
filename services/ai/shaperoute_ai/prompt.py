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
    "butterfly": "a butterfly seen from above, with open wings and antennae",
    "snail": "a snail seen from the side, with a spiral shell and two horns",
    "dog_head": "the head of a dog, with long hanging ears, eyes and a nose",
    "rabbit_head": "the head of a rabbit, with two long upright ears and eyes",
}

SYSTEM = """\
You choose the drawing that a running route will trace on a map. The runner \
wrote a few words for the drawing they want, in Italian or in English, maybe \
misspelt.

Step 1, "picture": in at most six English words, what the best-known image \
of the named thing shows. For a logo, emblem or flag: what is drawn on it. \
For a character: what kind of creature it is.

Step 2, "shape": the drawing below that is that picture, or "{none}".
{catalogue}
- {none}: anything else, such as a car, a bird, a bridge, a flower, a \
mountain or a letter

Choose a drawing if someone who sees it would say it is the picture, or a \
kind of it. Something merely round is not a circle, something pointed is not \
a star."""


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
