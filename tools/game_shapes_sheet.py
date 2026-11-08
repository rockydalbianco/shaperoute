"""Draw every shape of the game's catalog on one SVG sheet, by collection.

Usage (from the repository root):

    python tools/game_shapes_sheet.py catalog.json out/TASK-423/forme.svg

`catalog.json` is the body of `GET /game/catalog` (TASK-423, ADR-0351): saved
from a running API, or dumped from the API's code. Each shape is drawn from
its outline (from 0 to 1, y downwards) in a square cell, with its id, its
name in one language and what it asks; the collections follow one another
in the catalog's order. The sheet is for the user to look at the drawings
before they ship.

Standard library only: it runs with any Python 3.11+ and imports neither
the API nor the route-engine.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

CELL = 132
DRAWING = 84
COLUMNS = 6
TITLE_HEIGHT = 34
MARGIN = 16


def goal_text(goal: Mapping[str, Any]) -> str:
    """«K 42», «1×5K», «5k 5:30»: what a shape asks, short."""
    if goal.get("kind") == "distance":
        return f"K {_km(goal['total_m'])}"
    distance = _km(goal["distance_m"])
    if goal.get("single_run"):
        return f"1×{distance}K"
    pace = int(goal["pace_s"])
    return f"{distance}k {pace // 60}:{pace % 60:02d}"


def _km(metres: float) -> str:
    """«5», «21.097», «0.4»: a distance in km, as short as it goes."""
    return f"{metres / 1000:g}"


def path_of(outline: Sequence[Sequence[float]], x0: float, y0: float) -> str:
    """The outline as an SVG path inside a DRAWING-wide square at (x0, y0)."""
    points = [f"{x0 + x * DRAWING:.1f},{y0 + y * DRAWING:.1f}" for x, y in outline]
    return "M" + " L".join(points) + " Z"


def sheet_svg(
    catalog: Mapping[str, Any], language: str = "it", columns: int = COLUMNS
) -> str:
    """The SVG sheet: one titled block per collection, the shapes in rows."""
    names = {
        c["id"]: c["names"].get(language, c["names"]["en"])
        for c in catalog.get("collections", [])
    }
    order = [c["id"] for c in catalog.get("collections", [])]
    groups: dict[str, list[Mapping[str, Any]]] = {}
    for shape in catalog["shapes"]:
        key = shape.get("collection") or ""
        groups.setdefault(key, []).append(shape)
        if key not in order:
            order.append(key)
    width = MARGIN * 2 + columns * CELL
    parts: list[str] = []
    y = MARGIN
    for key in order:
        shapes = groups.get(key, [])
        if not shapes:
            continue
        title = names.get(key, key or "—")
        parts.append(
            f'<text x="{MARGIN}" y="{y + 22}" class="t">'
            f"{html.escape(title)} · {len(shapes)}</text>"
        )
        y += TITLE_HEIGHT
        for i, shape in enumerate(shapes):
            col, row = i % columns, i // columns
            x0 = MARGIN + col * CELL + (CELL - DRAWING) / 2
            y0 = y + row * CELL + 6
            name = shape["names"].get(language, shape["names"]["en"])
            parts.append(
                f'<rect x="{MARGIN + col * CELL + 2}" y="{y + row * CELL}"'
                f' width="{CELL - 4}" height="{CELL - 4}" class="c"/>'
                f'<path d="{path_of(shape["outline"], x0, y0)}" class="s"/>'
                f'<text x="{MARGIN + col * CELL + CELL / 2}"'
                f' y="{y0 + DRAWING + 18}" class="n">{html.escape(name)}</text>'
                f'<text x="{MARGIN + col * CELL + CELL / 2}"'
                f' y="{y0 + DRAWING + 32}" class="g">'
                f"{html.escape(shape['id'])} · {html.escape(goal_text(shape['goal']))}"
                "</text>"
            )
        y += ((len(shapes) + columns - 1) // columns) * CELL + MARGIN
    height = y + MARGIN
    style = (
        "<style>.t{font:600 18px sans-serif;fill:#222}"
        ".n{font:12px sans-serif;fill:#222;text-anchor:middle}"
        ".g{font:9px monospace;fill:#777;text-anchor:middle}"
        ".c{fill:#fafafa;stroke:#ddd}"
        ".s{fill:none;stroke:#111;stroke-width:2;stroke-linejoin:round}</style>"
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}"'
        f' height="{height}" viewBox="0 0 {width} {height}">'
        f'{style}<rect width="100%" height="100%" fill="#fff"/>'
        + "".join(parts)
        + "</svg>\n"
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("catalog", type=Path, help="the body of GET /game/catalog")
    parser.add_argument("out", type=Path, help="the SVG sheet to write")
    parser.add_argument("--language", default="it", help="en, de, it, es or fr")
    parser.add_argument("--columns", type=int, default=COLUMNS, help="shapes a row")
    args = parser.parse_args(argv)
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        sheet_svg(catalog, args.language, args.columns), encoding="utf-8"
    )
    print(f"{len(catalog['shapes'])} shapes → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
