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
    "pumpkin": "a Halloween pumpkin, with a stem, carved eyes and a grin",
    "christmas_tree": "a decorated Christmas tree with a star on top, not a plain tree",
    "smiley": "a smiling face, a round face with two eyes and a smile",
    "ghost": "a cartoon ghost, a sheet with a wavy hem and two eyes",
    "donut": "a doughnut seen from above, a thick ring with a hole",
    "sun": "the sun, a round disc with rays all around",
    "airplane": "an airliner seen from above, with swept wings and a tail",
    "anchor": "a ship's anchor, with a ring, a stock and curved arms",
    "bear_head": "the head of a teddy bear, with round ears, eyes and a snout",
    "bicycle": "a bicycle seen from the side, with two wheels and a saddle",
    "cherries": "two cherries hanging from their joined stalks, with a leaf",
    "espresso_cup": "an espresso cup on its saucer, with steam rising",
    "four_leaf_clover": "a four-leaf clover with its stalk",
    "leaning_tower": "the Leaning Tower of Pisa, a tiered tower that leans",
    "music_note": "a musical eighth note, with a round head, a stem and a flag",
    "pear": "a pear with its stalk and a leaf",
    "sailboat": "a sailboat seen from the side, with a mast and two sails",
    "swan": "a swan floating, with its long curved neck",
    "windmill": "a Dutch windmill, a tapered tower with four sails",
    "wine_glass": "a wine glass, with a round bowl, a thin stem and a foot",
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
