"""Draw the new shapes of the catalogue from simple pieces (TASK-418).

Usage (from the repository root, with the route engine importable):

    PYTHONPATH=services/route-engine python tools/draw_new_shapes.py
    PYTHONPATH=services/route-engine python tools/draw_new_shapes.py \
        --preview out/new-shapes.html

Each shape is a union of circles, ellipses, boxes and thick lines, written
here in the engine's frame (x to the right, y up). Its exterior becomes the
outline, its holes (the ring of the anchor, the shackle of the padlock)
become pieces, and so do the details listed with it (eyes, the steam of the
cup, the wheels of the bicycle), when they touch nothing. The files go to
``services/route-engine/candidate_outlines/`` in the format of ``outline.py``,
with one more key, ``category``, the group of the catalogue the shape belongs
to: outside the package, so neither the catalogue nor the engine of the phone
(``tools/phone_engine``) carries a shape the user has not judged yet.

Nothing here is a route: the engine plans the routes, on real roads, from
these files (``python -m route_engine --outline FILE``). The shapes enter
``SHAPES``, and their files ``route_engine/shapes/outlines/``, only once the
user has judged them on real roads (ADR-0036): those are in ``APPROVED``.
``tools/test_draw_new_shapes.py`` checks that the files in the repository
are the ones this script writes.
"""

from __future__ import annotations

import argparse
import html
import json
import math
from collections.abc import Callable, Sequence
from pathlib import Path

from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

REPO_ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = REPO_ROOT / "services" / "route-engine" / "candidate_outlines"
OUTLINES = (
    REPO_ROOT / "services" / "route-engine" / "route_engine" / "shapes" / "outlines"
)
# The shapes the user approved on real roads (TASK-419's first round, «ok
# procedi» on 2026-11-10): in the catalogue, their files among the others.
APPROVED = frozenset(
    {
        "airplane",
        "anchor",
        "bear_head",
        "bicycle",
        "cherries",
        "espresso_cup",
        "four_leaf_clover",
        "leaning_tower",
        "music_note",
        "pear",
        "sailboat",
        "swan",
        "windmill",
        "wine_glass",
    }
)
CATEGORIES = ("monuments", "food", "animals", "objects", "symbols")
# Simplified this close to the drawing, as a share of the unit square.
SIMPLIFY = 0.006
# A hole smaller than this is no piece; a detail closer than this to another
# line is left out, so pieces never touch.
MIN_HOLE_AREA = 0.004
MIN_GAP = 0.03


# ---- primitives -----------------------------------------------------------
def circ(x, y, r):
    return Point(x, y).buffer(r, quad_segs=24)


def ell(x, y, rx, ry, rot=0.0):
    e = affinity.scale(Point(0, 0).buffer(1, quad_segs=24), rx, ry)
    return affinity.translate(affinity.rotate(e, rot, origin=(0, 0)), x, y)


def box(x0, y0, x1, y1):
    return Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def poly(*pts):
    return Polygon(pts)


def line(pts, w, cap=1):
    return LineString(pts).buffer(w / 2, cap_style=cap, join_style=1, quad_segs=12)


def arc_pts(cx, cy, r, a0, a1, n=24, ry=None):
    ry = r if ry is None else ry
    return [
        (
            cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
            cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n)),
        )
        for i in range(n + 1)
    ]


def ring(x, y, r_out, r_in):
    return circ(x, y, r_out).difference(circ(x, y, r_in))


def mirror_half(half):
    """Right half from top (x=0) to bottom (x=0) -> closed symmetric polygon."""
    left = [(-x, y) for x, y in reversed(half[1:-1])]
    return Polygon(list(half) + left)


def rot(g, deg, origin=(0, 0)):
    return affinity.rotate(g, deg, origin=origin)


def toward(p, hub, r):
    """Point on the way from p to hub, r away from hub."""
    dx, dy = hub[0] - p[0], hub[1] - p[1]
    d = math.hypot(dx, dy)
    return (hub[0] - dx / d * r, hub[1] - dy / d * r)


# ---- the shapes -----------------------------------------------------------
S: dict[str, tuple[str, str, Callable[[], object], list]] = {}


def shape(name, category, source, pieces=None):
    def deco(fn):
        S[name] = (category, source, fn, pieces or [])
        return fn

    return deco


# Monuments ----------------------------------------------------------------
@shape(
    "eiffel_tower",
    "monuments",
    "Eiffel Tower, stylized: spire, two platforms, arched base",
)
def _eiffel_tower() -> object:
    half = [
        (0, 1.0),
        (0.05, 0.92),
        (0.07, 0.62),
        (0.15, 0.6),
        (0.15, 0.54),
        (0.11, 0.54),
        (0.2, 0.12),
        (0.36, 0.1),
        (0.36, 0.03),
        (0.3, 0.03),
    ]
    half += [(0.62, -1.0), (0.36, -1.0)]
    half += arc_pts(0, -1.0, 0.36, 0, 90, 12)[1:]
    return mirror_half(half)


@shape(
    "leaning_tower",
    "monuments",
    "Leaning Tower of Pisa, stylized: tiers, ledges, belfry, leaning",
)
def _leaning_tower() -> object:
    g = box(-0.3, -1, 0.3, 0.55)
    for y in (-0.6, -0.2, 0.2):
        g = g.union(box(-0.37, y, 0.37, y + 0.06))
    g = g.union(box(-0.22, 0.55, 0.22, 0.82)).union(box(-0.27, 0.5, 0.27, 0.56))
    g = g.union(ell(0, 0.82, 0.22, 0.1))
    g = g.difference(box(-0.08, -1.01, 0.08, -0.82)).difference(circ(0, -0.82, 0.08))
    return rot(g, -9, origin=(0, -1))


@shape(
    "colosseum",
    "monuments",
    "Colosseum, stylized: tiered wall, broken top on one side, arches",
)
def _colosseum() -> object:
    g = poly(
        (-1, -0.6),
        (-1, 0.55),
        (0.35, 0.55),
        (0.45, 0.4),
        (0.6, 0.42),
        (0.75, 0.15),
        (0.88, 0.2),
        (1, -0.05),
        (1, -0.6),
    )
    for x in (-0.66, -0.22, 0.22, 0.66):
        g = g.difference(box(x - 0.13, -0.61, x + 0.13, -0.35)).difference(
            circ(x, -0.35, 0.13)
        )
    return g


S["colosseum"][3].extend(
    [
        arc_pts(x, 0.05, 0.1, 0, 180, 8)
        + [(x - 0.1, -0.12), (x + 0.1, -0.12), (x + 0.1, 0.05)]
        for x in (-0.72, -0.4, -0.08, 0.24)
    ]
)


@shape("windmill", "monuments", "Dutch windmill: tapered tower, cap, four sails")
def _windmill() -> object:
    hub = (0, 0.25)
    g = poly((-0.32, -1), (0.32, -1), (0.17, 0.2), (-0.17, 0.2))
    g = g.union(poly((-0.22, 0.18), (0.22, 0.18), (0, 0.42)))
    for k in range(4):
        blade = box(0.1, -0.09, 0.92, 0.09).union(box(0, -0.035, 0.12, 0.035))
        g = g.union(affinity.translate(rot(blade, 45 + 90 * k), *hub))
    g = g.union(circ(*hub, 0.07))
    return g.difference(box(-0.08, -1.01, 0.08, -0.78)).difference(circ(0, -0.78, 0.08))


@shape("gondola", "monuments", "Venetian gondola with the gondolier and his oar")
def _gondola() -> object:
    bottom = [
        (x, -0.32 - 0.12 * math.cos(x * math.pi / 2))
        for x in [i / 10 - 0.9 for i in range(19)]
    ]
    hull = Polygon(
        bottom
        + [
            (0.95, -0.12),
            (1.0, 0.35),
            (0.94, 0.38),
            (0.86, -0.04),
            (-0.82, -0.04),
            (-0.98, 0.12),
            (-1.0, 0.06),
        ]
    )
    man = box(-0.48, -0.06, -0.34, 0.42).union(circ(-0.41, 0.53, 0.09))
    oar = line([(-0.36, 0.3), (-0.05, 0.3), (0.35, -0.55)], 0.05)
    return hull.union(man).union(oar)


@shape("dome", "monuments", "Renaissance dome on a drum, with its lantern")
def _dome() -> object:
    drum = box(-0.62, -1, 0.62, -0.45).union(box(-0.7, -0.52, 0.7, -0.42))
    ogive = (
        circ(0.28, -0.45, 0.85)
        .intersection(circ(-0.28, -0.45, 0.85))
        .intersection(box(-1, -0.45, 1, 1))
    )
    lantern = box(-0.08, 0.3, 0.08, 0.55).union(
        poly((-0.1, 0.55), (0.1, 0.55), (0, 0.72))
    )
    g = drum.union(ogive).union(lantern).union(circ(0, 0.76, 0.05))
    return g


S["dome"][3].extend(
    [
        arc_pts(x, -0.72, 0.08, 0, 180, 6)
        + [(x - 0.08, -0.9), (x + 0.08, -0.9), (x + 0.08, -0.72)]
        for x in (-0.36, 0.0, 0.36)
    ]
)


@shape("triumphal_arch", "monuments", "Triumphal arch: attic, pillars, the great arch")
def _triumphal_arch() -> object:
    g = (
        box(-0.88, -1, 0.88, 0.58)
        .union(box(-1, 0.56, 1, 0.66))
        .union(box(-0.8, 0.66, 0.8, 0.92))
    )
    g = g.difference(box(-0.32, -1.01, 0.32, -0.12)).difference(circ(0, -0.12, 0.32))
    return g


S["triumphal_arch"][3].extend(
    [
        [
            (x - 0.12, -0.15),
            (x + 0.12, -0.15),
            (x + 0.12, 0.35),
            (x - 0.12, 0.35),
            (x - 0.12, -0.15),
        ]
        for x in (-0.6, 0.6)
    ]
)


# Food -------------------------------------------------------------------
@shape(
    "pizza_slice",
    "food",
    "slice of pizza with its crust and three slices of salami",
    pieces=[
        arc_pts(x, y, r, 0, 360, 12)
        for x, y, r in ((-0.15, 0.3, 0.12), (0.2, 0.15, 0.1), (0.0, -0.3, 0.09))
    ],
)
def _pizza_slice() -> object:
    tri = poly((0, -1), (0.72, 0.62), (-0.72, 0.62))
    crust = line(arc_pts(0, -0.4, 1.12, 50, 130, 20), 0.22)
    return tri.union(crust).intersection(circ(0, -0.4, 1.24))


@shape("moka", "food", "Italian moka coffee pot: two chambers, lid, spout, handle")
def _moka() -> object:
    g = poly((-0.45, -1), (0.45, -1), (0.3, -0.06), (-0.3, -0.06))
    g = g.union(box(-0.36, -0.12, 0.36, 0.03))
    g = g.union(poly((-0.3, 0.03), (0.3, 0.03), (0.42, 0.78), (-0.42, 0.78)))
    g = g.union(poly((-0.44, 0.76), (0.44, 0.76), (0.12, 0.95), (-0.12, 0.95))).union(
        circ(0, 0.98, 0.06)
    )
    g = g.union(poly((-0.42, 0.78), (-0.66, 0.86), (-0.62, 0.76), (-0.36, 0.5)))
    g = g.union(line([(0.38, 0.62), (0.74, 0.6), (0.66, 0.12), (0.32, 0.12)], 0.1))
    return g


@shape(
    "espresso_cup",
    "food",
    "espresso cup on its saucer, steaming",
    pieces=[
        [(x + 0.06 * math.sin(i * math.pi / 3), 0.25 + i * 0.1) for i in range(7)]
        for x in (-0.18, 0.12)
    ],
)
def _espresso_cup() -> object:
    cup = box(-0.5, -0.45, 0.5, 0.05).intersection(ell(0, 0.05, 0.5, 0.55))
    handle = line(arc_pts(0.5, -0.17, 0.16, -80, 80, 12), 0.08)
    saucer = ell(0, -0.52, 0.95, 0.11)
    return cup.union(handle).union(saucer)


@shape("croissant", "food", "croissant, the Italian cornetto: a crescent of rolls")
def _croissant() -> object:
    parts = []
    for i in range(7):
        a = 20 + i * 140 / 6
        r = 0.18 + 0.2 * math.sin(math.radians(a))
        parts.append(
            ell(
                0.8 * math.cos(math.radians(a)),
                -0.55 + 0.8 * math.sin(math.radians(a)),
                r * 0.9,
                r,
            )
        )
    return unary_union(parts)


@shape("wine_glass", "food", "wine glass: bowl, stem, foot")
def _wine_glass() -> object:
    bowl = circ(0, 0.38, 0.52).intersection(box(-1, -1, 1, 0.78))
    return bowl.union(box(-0.05, -0.82, 0.05, 0.0)).union(ell(0, -0.86, 0.42, 0.09))


@shape("cherries", "food", "two cherries on their stems, with a leaf")
def _cherries() -> object:
    g = circ(-0.42, -0.58, 0.33).union(circ(0.38, -0.66, 0.33))
    g = g.union(line([(-0.38, -0.3), (-0.1, 0.3), (0.08, 0.78)], 0.06))
    g = g.union(line([(0.36, -0.38), (0.26, 0.3), (0.08, 0.78)], 0.06))
    return g.union(ell(0.38, 0.8, 0.3, 0.12, rot=-15))


@shape("pear", "food", "pear with its stalk and a leaf")
def _pear() -> object:
    body = unary_union([circ(0, -0.45, 0.52), circ(0, 0.28, 0.3)]).convex_hull
    return body.union(line([(0, 0.5), (0.06, 0.88)], 0.07)).union(
        ell(0.28, 0.82, 0.22, 0.09, rot=20)
    )


@shape(
    "strawberry",
    "food",
    "strawberry with its crown of leaves",
    pieces=[
        arc_pts(x, y, 0.04, 0, 360, 8)
        for x, y in (
            (-0.3, 0.1),
            (0.25, 0.15),
            (0.0, -0.2),
            (-0.15, -0.5),
            (0.18, -0.45),
        )
    ],
)
def _strawberry() -> object:
    body = unary_union(
        [circ(-0.42, 0.22, 0.38), circ(0.42, 0.22, 0.38), circ(0, -0.78, 0.16)]
    ).convex_hull
    leaves = poly(
        (-0.6, 0.5),
        (-0.35, 0.72),
        (-0.2, 0.6),
        (0, 0.8),
        (0.2, 0.6),
        (0.35, 0.72),
        (0.6, 0.5),
        (0, 0.45),
    )
    return body.union(leaves).union(line([(0, 0.7), (0.05, 0.98)], 0.07))


# Animals ----------------------------------------------------------------
@shape(
    "elephant",
    "animals",
    "elephant seen from the side: big ear, trunk, four legs",
    pieces=[arc_pts(-0.74, 0.3, 0.045, 0, 360, 8)],
)
def _elephant() -> object:
    g = ell(0.12, 0.0, 0.66, 0.45).union(circ(-0.58, 0.18, 0.34))
    g = g.union(line([(-0.82, 0.05), (-0.96, -0.35), (-0.86, -0.72)], 0.14))
    for x in (-0.3, -0.04, 0.38, 0.62):
        g = g.union(box(x - 0.1, -1, x + 0.1, -0.15))
    g = g.union(line([(0.75, 0.15), (0.92, -0.25)], 0.05))
    return g.union(ell(-0.4, 0.22, 0.24, 0.32))


@shape("giraffe", "animals", "giraffe: long neck, ossicones, four long legs")
def _giraffe() -> object:
    g = ell(0.3, -0.05, 0.45, 0.24)
    g = g.union(poly((-0.02, 0.1), (0.2, 0.05), (-0.3, 0.82), (-0.46, 0.78)))
    g = g.union(ell(-0.5, 0.86, 0.24, 0.1, rot=-15))
    g = g.union(line([(-0.38, 0.9), (-0.36, 1.02)], 0.04)).union(
        line([(-0.3, 0.88), (-0.27, 1.0)], 0.04)
    )
    for x in (0.0, 0.15, 0.48, 0.62):
        g = g.union(box(x - 0.055, -1, x + 0.055, -0.1))
    return g.union(line([(0.74, 0.0), (0.88, -0.38)], 0.04))


@shape(
    "whale",
    "animals",
    "whale with its tail raised",
    pieces=[arc_pts(-0.68, -0.02, 0.05, 0, 360, 8)],
)
def _whale() -> object:
    body = ell(-0.2, -0.1, 0.78, 0.4)
    stalk = line([(0.4, -0.05), (0.66, 0.1), (0.8, 0.4)], 0.16)
    fluke = poly((0.8, 0.36), (0.5, 0.78), (0.82, 0.58), (1.0, 0.86), (0.92, 0.42))
    return body.union(stalk).union(fluke)


@shape(
    "dolphin",
    "animals",
    "dolphin leaping in an arc: beak, fin, tail flukes",
    pieces=[arc_pts(-0.52, 0.18, 0.04, 0, 360, 8)],
)
def _dolphin() -> object:
    parts = []
    for i in range(15):
        a = 160 - i * 140 / 14
        r = 0.2 * math.sin(math.radians(20 + i * 150 / 14)) + 0.04
        parts.append(
            circ(
                0.85 * math.cos(math.radians(a)),
                -0.45 + 0.8 * math.sin(math.radians(a)),
                r,
            )
        )
    g = unary_union(parts)
    g = g.union(poly((-0.85, -0.05), (-1.0, -0.2), (-0.78, -0.12)))
    g = g.union(poly((-0.05, 0.5), (0.25, 0.68), (0.2, 0.4)))
    return g.union(
        poly((0.8, -0.2), (0.62, -0.42), (0.85, -0.3), (1.0, -0.48), (0.92, -0.18))
    )


@shape(
    "turtle",
    "animals",
    "turtle seen from above: shell, head, four flippers",
    pieces=[
        [
            (0.0, 0.25),
            (0.2, 0.12),
            (0.2, -0.12),
            (0.0, -0.25),
            (-0.2, -0.12),
            (-0.2, 0.12),
            (0.0, 0.25),
        ]
    ],
)
def _turtle() -> object:
    g = ell(0, 0, 0.5, 0.62)
    g = g.union(ell(0, 0.78, 0.16, 0.2)).union(
        poly((-0.05, -0.6), (0.05, -0.6), (0, -0.85))
    )
    for sx in (-1, 1):
        g = g.union(ell(sx * 0.5, 0.4, 0.28, 0.12, rot=sx * 30)).union(
            ell(sx * 0.45, -0.42, 0.22, 0.1, rot=-sx * 35)
        )
    return g


@shape(
    "owl",
    "animals",
    "owl: ear tufts, big round eyes, feet",
    pieces=[arc_pts(x, 0.28, 0.17, 0, 360, 16) for x in (-0.25, 0.25)]
    + [[(-0.07, 0.05), (0.0, -0.08), (0.07, 0.05)]],
)
def _owl() -> object:
    g = ell(0, -0.1, 0.6, 0.82)
    g = g.union(poly((-0.55, 0.38), (-0.6, 0.95), (-0.25, 0.62))).union(
        poly((0.55, 0.38), (0.6, 0.95), (0.25, 0.62))
    )
    for sx in (-1, 1):
        g = g.union(ell(sx * 0.2, -0.93, 0.12, 0.07))
    return g


@shape(
    "penguin",
    "animals",
    "penguin facing us: flippers, feet, white belly",
    pieces=[arc_pts(0, -0.2, 0.3, 0, 360, 20, ry=0.5)]
    + [arc_pts(x, 0.66, 0.05, 0, 360, 8) for x in (-0.13, 0.13)],
)
def _penguin() -> object:
    g = ell(0, -0.15, 0.5, 0.8).union(circ(0, 0.62, 0.32))
    g = g.union(ell(-0.52, -0.05, 0.12, 0.42, rot=-15)).union(
        ell(0.52, -0.05, 0.12, 0.42, rot=15)
    )
    g = g.union(ell(-0.2, -0.95, 0.16, 0.07)).union(ell(0.2, -0.95, 0.16, 0.07))
    return g.union(poly((-0.07, 0.52), (0.07, 0.52), (0, 0.38)))


@shape(
    "bear_head",
    "animals",
    "teddy bear head: round ears, snout, eyes",
    pieces=[arc_pts(0, -0.3, 0.25, 0, 360, 16, ry=0.18)]
    + [arc_pts(x, 0.12, 0.06, 0, 360, 8) for x in (-0.25, 0.25)],
)
def _bear_head() -> object:
    return (
        circ(0, -0.1, 0.72).union(circ(-0.55, 0.5, 0.26)).union(circ(0.55, 0.5, 0.26))
    )


@shape(
    "fox_head",
    "animals",
    "fox head: pointed ears, cheeks, snout",
    pieces=[arc_pts(x, 0.2, 0.06, 0, 360, 8) for x in (-0.25, 0.25)],
)
def _fox_head() -> object:
    return poly(
        (-0.92, 0.25),
        (-0.66, 1.0),
        (-0.3, 0.52),
        (0.3, 0.52),
        (0.66, 1.0),
        (0.92, 0.25),
        (0.55, -0.15),
        (0.1, -0.85),
        (-0.1, -0.85),
        (-0.55, -0.15),
    )


@shape(
    "dinosaur",
    "animals",
    "long-necked dinosaur: small head, long tail, four legs",
    pieces=[arc_pts(-0.72, 0.8, 0.03, 0, 360, 8)],
)
def _dinosaur() -> object:
    g = ell(0.05, -0.2, 0.48, 0.3)
    g = g.union(line([(-0.25, -0.05), (-0.5, 0.45), (-0.62, 0.78)], 0.18))
    g = g.union(ell(-0.72, 0.8, 0.16, 0.09))
    g = g.union(poly((0.4, -0.05), (0.45, -0.38), (1.0, -0.6)))
    for x in (-0.25, -0.08, 0.2, 0.36):
        g = g.union(box(x - 0.07, -0.85, x + 0.07, -0.3))
    return g


@shape("swan", "animals", "swan floating: curved neck, beak, raised tail")
def _swan() -> object:
    body = ell(0.1, -0.45, 0.75, 0.32).intersection(box(-1, -0.75, 1, 0.1))
    body = body.union(poly((0.55, -0.35), (1.0, 0.1), (0.75, -0.55)))
    neck = line([(-0.45, -0.3), (-0.55, 0.1), (-0.35, 0.5), (-0.4, 0.8)], 0.14)
    head = ell(-0.48, 0.82, 0.13, 0.09)
    beak = poly((-0.58, 0.86), (-0.85, 0.74), (-0.58, 0.76))
    return body.union(neck).union(head).union(beak)


# Objects ----------------------------------------------------------------
@shape(
    "scooter",
    "objects",
    "Italian scooter seen from the side: rounded body, shield, handlebar, wheels",
)
def _scooter() -> object:
    body = poly(
        (-0.95, -0.45),
        (-0.95, -0.15),
        (-0.75, 0.12),
        (-0.25, 0.15),
        (-0.1, -0.3),
        (0.25, -0.3),
        (0.5, 0.45),
        (0.62, 0.45),
        (0.8, -0.45),
    )
    seat = ell(-0.55, 0.18, 0.32, 0.08)
    bar = line([(0.55, 0.42), (0.55, 0.62), (0.35, 0.68)], 0.07).union(
        line([(0.55, 0.62), (0.75, 0.66)], 0.07)
    )
    return (
        body.union(seat)
        .union(bar)
        .union(circ(-0.62, -0.62, 0.24))
        .union(circ(0.62, -0.62, 0.24))
    )


@shape(
    "bicycle",
    "objects",
    "bicycle seen from the side: frame, saddle, handlebar; the wheels drawn apart",
    pieces=[
        arc_pts(-0.6, -0.42, 0.38, 0, 360, 28),
        arc_pts(0.6, -0.42, 0.38, 0, 360, 28),
    ],
)
def _bicycle() -> object:
    rear, front, r = (-0.6, -0.42), (0.6, -0.42), 0.46
    crank, seat, head = (0.0, -0.42), (-0.22, 0.3), (0.38, 0.3)
    w = 0.07
    g = line([crank, seat, head, crank], w)
    g = g.union(line([crank, toward(crank, rear, r)], w)).union(
        line([seat, toward(seat, rear, r)], w)
    )
    g = g.union(line([head, toward(head, front, r)], w))
    g = g.union(line([head, (0.46, 0.55)], w)).union(
        line([(0.34, 0.6), (0.58, 0.55)], w)
    )
    g = g.union(line([seat, (-0.26, 0.42)], w)).union(ell(-0.28, 0.45, 0.16, 0.05))
    return g


@shape("airplane", "objects", "airliner seen from above: wings, tailplane, pointing up")
def _airplane() -> object:
    g = ell(0, 0, 0.12, 0.98)
    g = g.union(poly((-0.08, 0.25), (-1.0, -0.15), (-1.0, -0.28), (-0.08, -0.12)))
    g = g.union(poly((0.08, 0.25), (1.0, -0.15), (1.0, -0.28), (0.08, -0.12)))
    g = g.union(
        poly(
            (-0.06, -0.62),
            (-0.4, -0.85),
            (-0.4, -0.94),
            (0, -0.85),
            (0.4, -0.94),
            (0.4, -0.85),
            (0.06, -0.62),
        )
    )
    return g


@shape("sailboat", "objects", "sailboat: hull, mast, two sails")
def _sailboat() -> object:
    hull = poly((-1.0, -0.55), (1.0, -0.55), (0.7, -0.9), (-0.65, -0.9))
    mast = box(-0.04, -0.55, 0.04, 1.0)
    main = poly((-0.04, 0.95), (-0.04, -0.45), (-0.8, -0.45))
    jib = poly((0.04, 0.8), (0.04, -0.45), (0.7, -0.45))
    return (
        hull.union(mast)
        .union(main)
        .union(jib)
        .union(poly((0.04, 1.0), (0.3, 0.93), (0.04, 0.86)))
    )


@shape(
    "rocket",
    "objects",
    "rocket: pointed nose, porthole, fins, flame",
    pieces=[arc_pts(0, 0.25, 0.13, 0, 360, 14)],
)
def _rocket() -> object:
    body = (
        circ(0.45, -0.1, 0.75)
        .intersection(circ(-0.45, -0.1, 0.75))
        .union(box(-0.3, -0.62, 0.3, -0.1))
    )
    fins = poly((-0.3, -0.25), (-0.6, -0.72), (-0.3, -0.6)).union(
        poly((0.3, -0.25), (0.6, -0.72), (0.3, -0.6))
    )
    flame = poly((-0.18, -0.62), (0.18, -0.62), (0.0, -1.0))
    return body.union(fins).union(flame)


@shape("anchor", "objects", "anchor: ring, stock, shank, curved arms with flukes")
def _anchor() -> object:
    g = (
        box(-0.07, -0.92, 0.07, 0.62)
        .union(ring(0, 0.78, 0.2, 0.11))
        .union(box(-0.45, 0.32, 0.45, 0.44))
    )
    g = g.union(line(arc_pts(0, -0.12, 0.78, 200, 340, 24), 0.13))
    for sx in (-1, 1):
        tip = (
            sx * 0.78 * math.cos(math.radians(20)),
            -0.12 - 0.78 * math.sin(math.radians(20)),
        )
        g = g.union(
            poly(
                (tip[0] - sx * 0.12, tip[1] - 0.05),
                (tip[0] + sx * 0.08, tip[1] + 0.3),
                (tip[0] + sx * 0.12, tip[1] - 0.08),
            )
        )
    return g


@shape("padlock", "objects", "padlock, the love lock: shackle, body, keyhole")
def _padlock() -> object:
    body = box(-0.62, -1, 0.62, 0.12).buffer(0.08).buffer(-0.08)
    shackle = (
        ring(0, 0.18, 0.48, 0.32)
        .intersection(box(-1, 0.18, 1, 1))
        .union(box(-0.48, 0.0, -0.32, 0.18))
        .union(box(0.32, 0.0, 0.48, 0.18))
    )
    key = circ(0, -0.32, 0.11).union(
        poly((-0.06, -0.36), (0.06, -0.36), (0.1, -0.7), (-0.1, -0.7))
    )
    return body.union(shackle).difference(key)


@shape("key", "objects", "old key: round bow, shaft, bit")
def _key() -> object:
    g = ring(-0.62, 0, 0.36, 0.18).union(box(-0.3, -0.07, 1.0, 0.07))
    return g.union(box(0.62, -0.32, 0.72, -0.07)).union(box(0.84, -0.42, 0.98, -0.07))


@shape("umbrella", "objects", "open umbrella: scalloped canopy, shaft, hooked handle")
def _umbrella() -> object:
    canopy = circ(0, 0.05, 0.95).intersection(box(-1, 0.05, 1, 1))
    for i in range(4):
        canopy = canopy.difference(ell(-0.71 + i * 0.475, 0.05, 0.24, 0.12))
    canopy = canopy.union(line([(0, 0.95), (0, 1.05)], 0.06))
    shaft = box(-0.04, -0.6, 0.04, 0.05)
    hook = line(arc_pts(-0.17, -0.6, 0.17, 0, -180, 14), 0.08)
    return canopy.union(shaft).union(hook)


@shape(
    "running_shoe",
    "objects",
    "running shoe seen from the side: sole, toe, laces, heel tab",
    pieces=[[(x, y), (x + 0.12, y + 0.06)] for x, y in ((-0.05, 0.12), (0.12, 0.02))],
)
def _running_shoe() -> object:
    upper = poly(
        (-1.0, -0.42),
        (0.98, -0.42),
        (1.0, -0.25),
        (0.85, -0.12),
        (0.42, -0.02),
        (0.05, 0.35),
        (-0.35, 0.4),
        (-0.6, 0.32),
        (-0.82, 0.52),
        (-0.98, 0.45),
        (-1.0, 0.0),
    )
    sole = box(-1.0, -0.6, 1.0, -0.42).buffer(0.06).buffer(-0.06)
    return upper.union(sole)


@shape("guitar", "objects", "acoustic guitar: body, sound hole, neck, head")
def _guitar() -> object:
    body = (
        circ(0, -0.55, 0.45)
        .union(circ(0, -0.02, 0.33))
        .union(box(-0.3, -0.45, 0.3, -0.15))
    )
    neck = box(-0.06, 0.25, 0.06, 0.82).union(box(-0.1, 0.8, 0.1, 1.0))
    return body.union(neck).difference(circ(0, -0.22, 0.12))


@shape(
    "light_bulb",
    "objects",
    "light bulb: glass, neck, screw base",
    pieces=[[(-0.1, -0.15), (-0.05, 0.05), (0.0, -0.1), (0.05, 0.05), (0.1, -0.15)]],
)
def _light_bulb() -> object:
    glass = circ(0, 0.3, 0.6).union(
        poly((-0.45, -0.05), (0.45, -0.05), (0.25, -0.45), (-0.25, -0.45))
    )
    base = box(-0.25, -0.75, 0.25, -0.45)
    for y in (-0.53, -0.65):
        base = base.union(box(-0.29, y - 0.03, 0.29, y + 0.03))
    return glass.union(base).union(ell(0, -0.78, 0.13, 0.08))


# Symbols ----------------------------------------------------------------
@shape("infinity", "symbols", "infinity sign, the lemniscate, drawn as a thick band")
def _infinity() -> object:
    pts = []
    for i in range(121):
        t = i / 120 * 2 * math.pi
        d = 1 + math.sin(t) ** 2
        pts.append((math.cos(t) / d, math.sin(t) * math.cos(t) / d))
    return LineString(pts).buffer(0.1, quad_segs=12)


@shape("peace", "symbols", "peace sign: circle and its three lines")
def _peace() -> object:
    g = ring(0, 0, 1.0, 0.86).union(box(-0.07, -0.9, 0.07, 0.9))
    g = g.union(line([(0, 0), (-0.66, -0.66)], 0.14, cap=2)).union(
        line([(0, 0), (0.66, -0.66)], 0.14, cap=2)
    )
    return g


@shape("four_leaf_clover", "symbols", "four-leaf clover with its stalk")
def _four_leaf_clover() -> object:
    leaf = unary_union(
        [
            circ(-0.17, 0.55, 0.19),
            circ(0.17, 0.55, 0.19),
            poly((-0.33, 0.47), (0.33, 0.47), (0, 0.06)),
        ]
    )
    g = unary_union(
        [rot(leaf, 90 * k, origin=(0, 0)) for k in range(4)] + [circ(0, 0, 0.1)]
    )
    return rot(g, 45).union(line([(0.0, -0.1), (0.12, -0.6), (0.4, -0.98)], 0.08))


@shape(
    "flower",
    "symbols",
    "flower: six petals, stem, leaf",
    pieces=[arc_pts(0, 0.35, 0.14, 0, 360, 14)],
)
def _flower() -> object:
    g = unary_union(
        [
            affinity.translate(rot(ell(0, 0.28, 0.15, 0.28), 60 * k), 0, 0.35)
            for k in range(6)
        ]
    )
    g = g.union(box(-0.04, -1.0, 0.04, 0.0)).union(ell(0.25, -0.55, 0.25, 0.1, rot=30))
    return g


@shape(
    "leaf",
    "symbols",
    "leaf with its stalk and midrib",
    pieces=[[(-0.4, -0.38), (0.45, 0.45)]],
)
def _leaf() -> object:
    blade = circ(0.38, -0.38, 0.92).intersection(circ(-0.38, 0.38, 0.92))
    return blade.union(line([(-0.55, -0.55), (-0.95, -0.95)], 0.07))


@shape("music_note", "symbols", "eighth note: head, stem, flag")
def _music_note() -> object:
    head = ell(-0.3, -0.72, 0.3, 0.2, rot=25)
    stem = box(-0.06, -0.7, 0.04, 0.95)
    flag = line([(0.0, 0.92), (0.15, 0.6), (0.48, 0.42), (0.42, 0.05)], 0.12)
    return head.union(stem).union(flag)


@shape("trophy", "symbols", "trophy cup: bowl, two handles, stem, base")
def _trophy() -> object:
    bowl = ell(0, 0.55, 0.52, 0.75).intersection(box(-1, -1, 1, 0.9))
    handles = line(arc_pts(-0.52, 0.5, 0.22, 90, 270, 12), 0.08).union(
        line(arc_pts(0.52, 0.5, 0.22, 90, -90, 12), 0.08)
    )
    stem = box(-0.07, -0.55, 0.07, -0.15)
    base = box(-0.35, -0.75, 0.35, -0.55).union(box(-0.45, -0.88, 0.45, -0.75))
    return bowl.union(handles).union(stem).union(base)


@shape(
    "medal",
    "symbols",
    "medal on its ribbon, a star on it",
    pieces=[
        [
            (0.0, -0.18),
            (0.07, -0.38),
            (0.26, -0.39),
            (0.11, -0.52),
            (0.17, -0.72),
            (0.0, -0.6),
            (-0.17, -0.72),
            (-0.11, -0.52),
            (-0.26, -0.39),
            (-0.07, -0.38),
            (0.0, -0.18),
        ]
    ],
)
def _medal() -> object:
    disc = circ(0, -0.45, 0.5)
    ribbon = poly((-0.55, 1.0), (-0.25, 1.0), (0.08, 0.0), (-0.22, 0.0)).union(
        poly((0.55, 1.0), (0.25, 1.0), (-0.08, 0.0), (0.22, 0.0))
    )
    return disc.union(ribbon)


@shape(
    "mountain",
    "symbols",
    "two mountain peaks, the higher with snow",
    pieces=[
        [(-0.35, 0.35), (-0.25, 0.45), (-0.15, 0.35), (-0.05, 0.45), (-0.01, 0.37)]
    ],
)
def _mountain() -> object:
    return poly((-1.0, -0.7), (-0.2, 0.9), (0.18, 0.15), (0.45, 0.5), (1.0, -0.7))


@shape("gift", "symbols", "gift box with a bow")
def _gift() -> object:
    g = box(-0.72, -1.0, 0.72, 0.2).union(box(-0.82, 0.2, 0.82, 0.45))
    g = g.union(ell(-0.25, 0.62, 0.28, 0.14, rot=25)).union(
        ell(0.25, 0.62, 0.28, 0.14, rot=-25)
    )
    return g


S["gift"][3].extend([[(-0.08, -0.9), (-0.08, 0.1)], [(0.08, -0.9), (0.08, 0.1)]])


@shape(
    "easter_egg",
    "symbols",
    "decorated Easter egg: a zigzag band across",
    pieces=[[(-0.58 + i * 0.145, 0.0 if i % 2 == 0 else 0.16) for i in range(9)]],
)
def _easter_egg() -> object:
    pts = []
    for i in range(80):
        t = i / 80 * 2 * math.pi
        y = math.sin(t)
        x = 0.72 * math.cos(t) * (1 - 0.18 * y)
        pts.append((x, y))
    return Polygon(pts)


# ---- export ---------------------------------------------------------------
def _largest(g):
    if isinstance(g, MultiPolygon):
        g = max(g.geoms, key=lambda p: p.area)
    return orient(g.buffer(0), sign=-1.0)  # clockwise, like the catalogue


def _coords(seq, close: bool) -> list[list[float]]:
    pts = [(round(x, 4), round(y, 4)) for x, y in seq]
    out = [pts[0]]
    for p in pts[1:]:
        if p != out[-1]:
            out.append(p)
    if close and out[0] != out[-1]:
        out.append(out[0])
    return [list(p) for p in out]


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
        ls = LineString(p)
        near_outline = ls.distance(g.exterior) < MIN_GAP
        near_piece = any(ls.distance(LineString(q)) < MIN_GAP for q in pieces)
        if near_outline or near_piece:
            left_out.append(f"{name}: a detail touches another line, left out")
            continue
        pieces.append(_coords(p, p[0] == p[-1] and len(p) > 2))
    data = {
        "name": name,
        "source": f"{source} (TASK-418)",
        "license": "drawn for ShapeRoute, no third-party rights",
        "category": category,
        "points": _coords(ext, True),
    }
    if pieces:
        data["pieces"] = pieces
    return data, left_out


def as_text(data: dict) -> str:
    return json.dumps(data, indent=2) + "\n"


def preview(files: Sequence[dict]) -> str:
    """One page with every shape drawn, its start in red: to judge by eye."""
    cards = []
    for data in files:
        lines = [data["points"], *data.get("pieces", [])]
        xs = [x for line_ in lines for x, _ in line_]
        ys = [y for line_ in lines for _, y in line_]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        k = 126 / max(max(xs) - min(xs), max(ys) - min(ys))

        def at(x: float, y: float, cx=cx, cy=cy, k=k) -> str:
            return f"{(x - cx) * k + 80:.1f},{80 - (y - cy) * k:.1f}"

        svg = "".join(
            f'<polyline points="{" ".join(at(x, y) for x, y in line_)}"/>'
            for line_ in lines
        )
        sx, sy = at(*data["points"][0]).split(",")
        svg += f'<circle cx="{sx}" cy="{sy}" r="4"/>'
        cards.append(
            f'<figure><svg viewBox="0 0 160 160">{svg}</svg><figcaption>'
            f'<b>{html.escape(data["name"])}</b>'
            f'<span>{data["category"]} · {len(data.get("pieces", []))} pieces</span>'
            "</figcaption></figure>"
        )
    return f"""<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New shapes</title><style>
:root{{--bg:#faf8f5;--fg:#1d1b19;--muted:#77706a;--card:#fff;--line:#e8e2da}}
@media (prefers-color-scheme:dark){{:root{{--bg:#171513;--fg:#f2eee9;
--muted:#a39a91;--card:#221f1c;--line:#36312c}}}}
body{{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px system-ui}}
div{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}}
figure{{margin:0;background:var(--card);border:1px solid var(--line);
border-radius:12px;padding:8px}}
polyline{{fill:none;stroke:var(--fg);stroke-width:3;stroke-linejoin:round;
stroke-linecap:round}} circle{{fill:#e4572e}}
figcaption{{display:flex;flex-direction:column}}
span{{color:var(--muted);font-size:12px}}
</style><div>{"".join(cards)}</div>
"""


def home(name: str) -> Path:
    """Where the file of the shape called ``name`` lives: in the catalogue
    once the user approved it, among the candidates before."""
    return (OUTLINES if name in APPROVED else CANDIDATES) / f"{name}.json"


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
        path = home(name) if args.out is None else args.out / f"{name}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(as_text(data), encoding="utf-8")
        files.append(data)
        for line_ in left_out:
            print(line_)
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        args.preview.write_text(preview(files), encoding="utf-8")
    print(f"{len(files)} shapes written, {len(APPROVED)} in the catalogue")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
