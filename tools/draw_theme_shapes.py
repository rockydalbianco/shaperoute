"""Draw the winter, holiday and sport shapes from simple pieces (TASK-516).

Usage (from the repository root, with the route engine importable):

    PYTHONPATH=services/route-engine python tools/draw_theme_shapes.py
    PYTHONPATH=services/route-engine python tools/draw_theme_shapes.py \
        --preview out/theme-shapes.html

The same way as ``draw_new_shapes.py`` (ADR-0346), with its primitives: each
shape is a union of circles, ellipses, boxes and thick lines in the engine's
frame (x to the right, y up); its exterior is the outline, its holes and the
details listed with it are pieces. The files go to
``services/route-engine/candidate_outlines/``, outside the package, until the
user has judged them on paper and on real roads (ADR-0411). The registry is
this file's own, so the 49 shapes of TASK-418 stay as the user chose them.

Nothing here is a route: the engine plans the routes, on real roads, from
these files (``python -m route_engine --outline FILE``).
``tools/test_draw_theme_shapes.py`` checks that the files in the repository
are the ones this script writes.
"""

from __future__ import annotations

import argparse
import math
from collections.abc import Callable, Sequence
from pathlib import Path

from draw_new_shapes import (
    CANDIDATES,
    CATEGORIES,
    MIN_GAP,
    MIN_HOLE_AREA,
    SIMPLIFY,
    _coords,
    _largest,
    arc_pts,
    as_text,
    box,
    circ,
    ell,
    line,
    mirror_half,
    poly,
    preview,
    ring,
    rot,
)
from shapely import affinity
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

TASK = "TASK-516"

# ---- the shapes -----------------------------------------------------------
S: dict[str, tuple[str, str, Callable[[], object], list]] = {}


def shape(name, category, source, pieces=None):
    def deco(fn):
        S[name] = (category, source, fn, pieces or [])
        return fn

    return deco


def star_pts(cx, cy, r_out, r_in, n=5, a0=90.0):
    """The corners of a star with ``n`` points, the first one at ``a0``."""
    pts = []
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(a0 + 180.0 * i / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# Winter and the holidays ---------------------------------------------------
@shape(
    "snowman",
    "objects",
    "Snowman, stylized: three snowballs, top hat, stick arms",
)
def _snowman() -> object:
    body = unary_union([circ(0, -0.52, 0.48), circ(0, 0.12, 0.34), circ(0, 0.6, 0.24)])
    hat = unary_union([box(-0.28, 0.78, 0.28, 0.84), box(-0.17, 0.82, 0.17, 1.12)])
    arms = unary_union(
        [
            line([(0.28, 0.2), (0.72, 0.46)], 0.07),
            line([(0.6, 0.39), (0.66, 0.56)], 0.06),
            line([(-0.28, 0.2), (-0.72, 0.46)], 0.07),
            line([(-0.6, 0.39), (-0.66, 0.56)], 0.06),
        ]
    )
    return unary_union([body, hat, arms])


@shape(
    "snowflake",
    "symbols",
    "Snowflake, stylized: six arms, each with a pair of branches",
)
def _snowflake() -> object:
    parts = []
    for k in range(6):
        a = math.radians(90 + 60 * k)
        ux, uy = math.cos(a), math.sin(a)
        parts.append(line([(0, 0), (ux, uy)], 0.12))
        bx, by = 0.55 * ux, 0.55 * uy
        for side in (-1, 1):
            b = a + side * math.radians(45)
            parts.append(
                line([(bx, by), (bx + 0.3 * math.cos(b), by + 0.3 * math.sin(b))], 0.1)
            )
    return unary_union(parts)


@shape(
    "reindeer",
    "animals",
    "Reindeer, stylized: side view, long legs, branching antlers",
)
def _reindeer() -> object:
    body = ell(0.05, -0.1, 0.55, 0.26)
    legs = [
        line([(-0.38, -0.2), (-0.42, -0.92)], 0.1),
        line([(-0.22, -0.25), (-0.2, -0.92)], 0.1),
        line([(0.3, -0.25), (0.32, -0.92)], 0.1),
        line([(0.46, -0.2), (0.52, -0.92)], 0.1),
    ]
    neck = line([(-0.36, 0.0), (-0.62, 0.34)], 0.2)
    head = unary_union([ell(-0.68, 0.38, 0.14, 0.11), ell(-0.86, 0.32, 0.1, 0.07)])
    ear = ell(-0.56, 0.5, 0.08, 0.04, 30)
    tail = ell(0.6, 0.06, 0.08, 0.05, 30)
    antlers = [
        line([(-0.64, 0.46), (-0.58, 0.72), (-0.42, 0.98)], 0.06),
        line([(-0.58, 0.72), (-0.76, 0.9)], 0.05),
        line([(-0.5, 0.86), (-0.32, 0.88)], 0.05),
        line([(-0.7, 0.46), (-0.82, 0.68), (-0.96, 0.84)], 0.06),
        line([(-0.82, 0.68), (-0.98, 0.64)], 0.05),
    ]
    return unary_union([body, *legs, neck, head, ear, tail, *antlers])


@shape(
    "santa_hat",
    "objects",
    "Santa Claus hat, stylized: drooping cone, fur brim, pompom",
)
def _santa_hat() -> object:
    # The cone rises from the brim and flops over to the right, the pompom
    # hanging at its tip.
    outer = [(-0.6, -0.5), (-0.42, 0.22), (-0.12, 0.6), (0.24, 0.8)]
    outer += [(0.54, 0.72), (0.74, 0.46), (0.8, 0.2)]
    inner = [(0.66, 0.3), (0.5, 0.44), (0.36, 0.42), (0.3, 0.22)]
    inner += [(0.44, -0.12), (0.6, -0.5)]
    cone = Polygon(outer + inner)
    brim = unary_union(
        [
            box(-0.72, -0.74, 0.72, -0.44),
            circ(-0.72, -0.59, 0.15),
            circ(0.72, -0.59, 0.15),
        ]
    )
    pompom = circ(0.8, 0.1, 0.17)
    return unary_union([cone, brim, pompom])


@shape(
    "candy_cane",
    "food",
    "Candy cane, stylized: a thick stick with a round hook",
)
def _candy_cane() -> object:
    # From the tip of the hook, over the top, then down the stick.
    pts = [(-0.59, 0.4), *arc_pts(-0.25, 0.58, 0.34, 180, 0, 24), (0.09, -1.0)]
    return line(pts, 0.26)


@shape(
    "bell",
    "objects",
    "Bell, stylized: flared bell, clapper below, ring on top",
    pieces=[],
)
def _bell() -> object:
    half = [
        (0, 0.74),
        (0.2, 0.72),
        (0.32, 0.62),
        (0.38, 0.4),
        (0.42, 0.1),
        (0.5, -0.24),
        (0.68, -0.48),
        (0.76, -0.6),
        (0, -0.6),
    ]
    bell = mirror_half(half)
    clapper = circ(0, -0.7, 0.14)
    loop = ring(0, 0.86, 0.16, 0.08)
    return unary_union([bell, clapper, loop])


@shape(
    "stocking",
    "objects",
    "Christmas stocking, stylized: leg, round toe, wide cuff",
)
def _stocking() -> object:
    leg = box(-0.36, -0.45, 0.16, 0.6)
    foot = unary_union([ell(0.1, -0.62, 0.48, 0.3), circ(-0.2, -0.55, 0.16)])
    heel = circ(-0.2, -0.6, 0.18)
    cuff = unary_union(
        [box(-0.46, 0.58, 0.26, 0.86), circ(-0.46, 0.72, 0.14), circ(0.26, 0.72, 0.14)]
    )
    return unary_union([leg, foot, heel, cuff])


@shape(
    "comet",
    "symbols",
    "Comet, stylized: a five-pointed star with a sweeping three-line tail",
)
def _comet() -> object:
    star = Polygon(star_pts(0.5, 0.5, 0.44, 0.19, a0=90))
    tail = [
        line([(0.42, 0.42), (-0.2, 0.02), (-0.96, -0.5)], 0.11),
        line([(0.46, 0.4), (-0.86, -0.88)], 0.11),
        line([(0.42, 0.46), (0.02, -0.2), (-0.5, -0.96)], 0.11),
    ]
    return unary_union([star, *tail])


# Sport ---------------------------------------------------------------------
@shape(
    "ball",
    "objects",
    "Football, stylized: a round ball with its middle pentagon",
    pieces=[star_pts(0, 0, 0.32, 0.32 * math.cos(math.radians(36)), n=5)[::2]],
)
def _ball() -> object:
    return circ(0, 0, 1.0)


@shape(
    "racket",
    "objects",
    "Tennis racket, stylized: oval head with its strings' frame, handle",
)
def _racket() -> object:
    head = ell(0, 0.4, 0.46, 0.58).difference(ell(0, 0.4, 0.36, 0.48))
    throat = poly((-0.2, -0.12), (0.2, -0.12), (0.05, -0.36), (-0.05, -0.36))
    handle = line([(0, -0.3), (0, -1.0)], 0.17)
    return rot(unary_union([head, throat, handle]), -30)


@shape(
    "skis",
    "objects",
    "Skis, stylized: two crossed skis with curled tips",
)
def _skis() -> object:
    def ski(sign: int) -> object:
        body = line([(0, -0.95), (0, 0.78)], 0.14)
        tip = line(arc_pts(-0.12, 0.78, 0.12, 0, 120, 10), 0.14)
        g = unary_union([body, tip])
        if sign < 0:
            g = affinity.scale(g, -1, 1, origin=(0, 0))
        return rot(g, sign * 24)

    return unary_union([ski(1), ski(-1)])


# ---- export ---------------------------------------------------------------
def draw(name: str) -> tuple[dict, list[str]]:
    """The file of the shape called ``name``, and the details left out."""
    category, source, fn, extra = S[name]
    g = _largest(fn()).simplify(SIMPLIFY, preserve_topology=True)
    ext = list(g.exterior.coords)
    # The route starts at the top: the highest vertex, the most central first.
    top = max(range(len(ext) - 1), key=lambda i: (ext[i][1], -abs(ext[i][0])))
    ext = ext[top:-1] + ext[:top] + [ext[top]]
    pieces = [
        _coords(hole.coords, True)
        for hole in g.interiors
        if Polygon(hole).area > MIN_HOLE_AREA
    ]
    left_out = []
    for p in extra:
        p = [*p, p[0]] if len(p) > 2 and p[0] != p[-1] else p
        ls = LineString(p)
        near_outline = ls.distance(g.exterior) < MIN_GAP
        near_piece = any(ls.distance(LineString(q)) < MIN_GAP for q in pieces)
        if near_outline or near_piece:
            left_out.append(f"{name}: a detail touches another line, left out")
            continue
        pieces.append(_coords(p, p[0] == p[-1] and len(p) > 2))
    data = {
        "name": name,
        "source": f"{source} ({TASK})",
        "license": "drawn for ShapeRoute, no third-party rights",
        "category": category,
        "points": _coords(ext, True),
    }
    if pieces:
        data["pieces"] = pieces
    return data, left_out


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--out", type=Path, help="write every file here instead of its home"
    )
    parser.add_argument("--preview", type=Path, help="also write this HTML page")
    args = parser.parse_args(argv)
    files = []
    for name in sorted(S, key=lambda n: (CATEGORIES.index(S[n][0]), n)):
        data, left_out = draw(name)
        home = CANDIDATES if args.out is None else args.out
        path = home / f"{name}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(as_text(data), encoding="utf-8")
        files.append(data)
        for line_ in left_out:
            print(line_)
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        args.preview.write_text(preview(files), encoding="utf-8")
    print(f"{len(files)} shapes written")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
