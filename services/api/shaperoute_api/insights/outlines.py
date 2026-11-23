"""The shape of a drawing in its search event (TASK-311 part D, ADR-0271).

A figure drawn with a finger, or the outline of a photo, goes to the server
as the route asked for. Its event keeps only its shape: the lines brought
to a square from 0 to 1, so without its place or its size, at most
MAX_POINTS points a line. Never the photo, the route nor the start: the
event's cell of about 1 km is all it says of where (events.py).

Off until the privacy text says so (`outlines_on`): the user approved the
sentence on 2026-11-23, and the server turns it on with
SHAPEROUTE_INSIGHTS_OUTLINES once the sentence is in the app and on the
site. Off, the event says "image" as before.

`page` writes the outlines of some events as one HTML page, to look at
what people draw and what does not come out: a file on the server, never
served.
"""

from __future__ import annotations

import html
import os
from collections.abc import Iterable, Mapping, Sequence
from typing import Any

ON_VARIABLE = "SHAPEROUTE_INSIGHTS_OUTLINES"
ON_VALUES = ("1", "true", "yes", "on")
# Enough for a figure to be recognised; a drawing has at most a few hundred.
MAX_POINTS = 200
# A thousandth of the square: finer says nothing more of the shape.
DECIMALS = 3

Lines = list[list[list[float]]]


def outlines_on(environ: Mapping[str, str] | None = None) -> bool:
    """True once the server has been told the privacy text says it."""
    values = os.environ if environ is None else environ
    return values.get(ON_VARIABLE, "").strip().lower() in ON_VALUES


def _points(line: object) -> list[tuple[float, float]]:
    if not isinstance(line, list | tuple):
        return []
    points = []
    for point in line:
        if (
            isinstance(point, list | tuple)
            and len(point) == 2
            and all(isinstance(v, int | float) for v in point)
        ):
            points.append((float(point[0]), float(point[1])))
    return points


def _thinned(points: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """At most MAX_POINTS, evenly taken, the first and the last kept."""
    if len(points) <= MAX_POINTS:
        return list(points)
    step = (len(points) - 1) / (MAX_POINTS - 1)
    return [points[round(i * step)] for i in range(MAX_POINTS)]


def shape_of(body: Mapping[str, Any] | None) -> Lines | None:
    """The lines of an image request (its strokes, or else its outline) in
    a square from 0 to 1, the longer side of their box from 0 to 1; None
    for a shape or a word, or a figure without two distinct points."""
    if not body or "outline" not in body:
        return None
    strokes = body.get("strokes")
    raw = strokes if isinstance(strokes, list) and strokes else [body.get("outline")]
    lines = [p for p in (_points(line) for line in raw) if len(p) >= 2]
    if not lines:
        return None
    xs = [x for line in lines for x, _ in line]
    ys = [y for line in lines for _, y in line]
    left, top = min(xs), min(ys)
    side = max(max(xs) - left, max(ys) - top)
    if side <= 0:
        return None
    return [
        [
            [round((x - left) / side, DECIMALS), round((y - top) / side, DECIMALS)]
            for x, y in _thinned(line)
        ]
        for line in lines
    ]


def _svg(lines: Lines) -> str:
    paths = "".join(
        '<polyline points="'
        + " ".join(f"{x:g},{y:g}" for x, y in line)
        + '" fill="none" stroke="currentColor" stroke-width="0.02"'
        ' stroke-linecap="round" stroke-linejoin="round"/>'
        for line in lines
    )
    return f'<svg viewBox="-0.05 -0.05 1.1 1.1" width="120" height="120">{paths}</svg>'


def _caption(event: Mapping[str, Any]) -> str:
    parts = [str(event.get("ts", ""))[:10]]
    if event.get("activity"):
        parts.append(str(event["activity"]))
    if isinstance(event.get("distance_m"), int | float):
        parts.append(f"{event['distance_m'] / 1000:.1f} km")
    if event.get("outcome") == "ok" and isinstance(event.get("quality"), int | float):
        parts.append(f"{round(event['quality'] * 100)}%")
    if event.get("code"):
        parts.append(str(event["code"]))
    return html.escape(" · ".join(p for p in parts if p))


def page(events: Iterable[Mapping[str, Any]], title: str) -> str:
    """The outlines of the route events among `events`, those that came out
    first, then those that did not, newest first in each."""
    drawn = [
        e
        for e in events
        if e.get("kind") == "route" and isinstance(e.get("outline"), list)
    ]
    groups = [
        ("Came out", [e for e in drawn if e.get("outcome") == "ok"]),
        ("Did not come out", [e for e in drawn if e.get("outcome") != "ok"]),
    ]
    body = []
    for name, group in groups:
        body.append(f"<h2>{html.escape(name)} ({len(group)})</h2><div class=grid>")
        for event in sorted(group, key=lambda e: str(e.get("ts", "")), reverse=True):
            body.append(
                f"<figure>{_svg(event['outline'])}"
                f"<figcaption>{_caption(event)}</figcaption></figure>"
            )
        body.append("</div>")
    return (
        "<!doctype html><meta charset=utf-8>"
        f"<title>{html.escape(title)}</title>"
        "<style>body{font:14px system-ui;margin:16px;color:#222;background:#fff}"
        ".grid{display:flex;flex-wrap:wrap;gap:12px}"
        "figure{margin:0;width:140px;text-align:center}"
        "figcaption{font-size:12px;color:#555}</style>"
        f"<h1>{html.escape(title)}</h1>{''.join(body)}"
    )
