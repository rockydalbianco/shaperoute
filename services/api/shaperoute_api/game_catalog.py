"""The shapes of the game (TASK-296, ADR-0255; TASK-423, ADR-0351;
docs/GIOCO.md §5.3).

In the API's code, so changing a shape or what it asks costs a deploy of
the API and no update of the app: GET /game/catalog serves it whole. Each
outline is in the drawing's coordinates, from 0 to 1 with y downwards as on
a screen, never geographic. The game's shapes are collectables: they lock
nothing in «Draw».

From TASK-423 the catalog has 94 shapes in 10 collections, and every
requirement is a shape: 24 steps of counted km, 6 single runs and 64 pace
levels on 10 distances (docs/tasks/TASK-423-proposta.md §2, approved by the
user on 2026-11-08). The 12 shapes of TASK-296 keep their id, names, goal
and outline. Where the outlines come from:

- the engine's (route_engine/shapes/), read and never changed;
- computed here: regular polygons and a few curves;
- drawn here: polygons on a 0–100 grid, y downwards, fitted to the card.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from route_engine.shapes import OUTLINES, SHAPES
from route_engine.shapes.outline import Outline, read_outline
from route_engine.shapes.resample import resample_by_arc_length

from shaperoute_api.game_rules import BEST_DISTANCES_M, DistanceGoal, Goal, PaceGoal

# Points of an engine outline, equally spaced along it: enough for a card.
OUTLINE_POINTS = 96
LANGUAGES = ("en", "de", "it", "es", "fr")
# The distances the pace and single-run shapes ask, in metres: those the
# rules time (TASK-423 part B).
PACE_DISTANCES_M: tuple[int, ...] = BEST_DISTANCES_M
# A single run asks its distance at this pace or better: any run of it.
SINGLE_RUN_PACE_S = 1_200

Point = tuple[float, float]


@dataclass(frozen=True)
class Collection:
    id: str
    names: dict[str, str]


@dataclass(frozen=True)
class GameShape:
    id: str
    # The name, in each language of the app.
    names: dict[str, str]
    goal: Goal
    # Closed: the last point is the first.
    outline: tuple[Point, ...]
    # The id of its collection.
    collection: str = ""


def _names(en: str, de: str, it: str, es: str, fr: str) -> dict[str, str]:
    return dict(zip(LANGUAGES, (en, de, it, es, fr), strict=True))


# --- Outlines: the engine's, the computed, the drawn ---


def _on_card(points: Sequence[Point]) -> tuple[Point, ...]:
    """From the engine's square [-1, 1]², y upwards, to [0, 1]², y down."""
    return tuple((round((x + 1) / 2, 4), round((1 - y) / 2, 4)) for x, y in points)


def _engine(name: str, outline_only: bool = False) -> tuple[Point, ...]:
    """An engine outline. `outline_only`: without its strokes and pieces
    (eyes, spirals), which the card would draw as lines out and back."""
    shape = SHAPES.get(name) or read_outline(OUTLINES / f"{name}.json")
    if outline_only and isinstance(shape, Outline):
        return _on_card(resample_by_arc_length(shape.points, OUTLINE_POINTS))
    return _on_card(shape(OUTLINE_POINTS))


def _polygon(sides: int, turn_deg: float = 90.0) -> tuple[Point, ...]:
    """A regular polygon inside the square, its first corner at `turn_deg`
    (90: at the top)."""
    corners = [
        (
            math.cos(math.radians(turn_deg + 360 * k / sides)),
            math.sin(math.radians(turn_deg + 360 * k / sides)),
        )
        for k in range(sides)
    ]
    return _on_card([*corners, corners[0]])


def _diamond() -> tuple[Point, ...]:
    corners = [(0.0, 1.0), (0.62, 0.0), (0.0, -1.0), (-0.62, 0.0)]
    return _on_card([*corners, corners[0]])


def _fit(points: Sequence[Point]) -> tuple[Point, ...]:
    """Points of the 0–100 grid (y down) fitted into the card: centred,
    the longer side from 0 to 1, closed, rounded to 4 decimals."""
    xs = [x for x, _ in points]
    ys = [y for _, y in points]
    side = max(max(xs) - min(xs), max(ys) - min(ys))
    dx = (side - (max(xs) - min(xs))) / 2 - min(xs)
    dy = (side - (max(ys) - min(ys))) / 2 - min(ys)
    card = [
        (
            round(min(1.0, max(0.0, (x + dx) / side)), 4),
            round(min(1.0, max(0.0, (y + dy) / side)), 4),
        )
        for x, y in points
    ]
    if card[0] != card[-1]:
        card.append(card[0])
    return tuple(card)


def _pts(text: str) -> list[Point]:
    """«x,y x,y …» on the grid."""
    return [(float(x), float(y)) for x, y in (pair.split(",") for pair in text.split())]


def _arc(
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    start_deg: float,
    end_deg: float,
    steps: int = 0,
) -> list[Point]:
    """Points on an ellipse from `start_deg` to `end_deg`, both kept. On the
    grid y is down: 0° is right, 90° is down, so a growing angle turns
    clockwise on the screen."""
    steps = steps or max(2, round(abs(end_deg - start_deg) / 12))
    return [
        (
            cx
            + rx
            * math.cos(math.radians(start_deg + (end_deg - start_deg) * i / steps)),
            cy
            + ry
            * math.sin(math.radians(start_deg + (end_deg - start_deg) * i / steps)),
        )
        for i in range(steps + 1)
    ]


def _mirror(half: Sequence[Point]) -> list[Point]:
    """A shape symmetric about x = 50 from its right half, drawn from the
    top of the axis down to its bottom."""
    back = [(100 - x, y) for x, y in reversed(half)]
    if half[-1][0] == 50:
        back = back[1:]
    if half[0][0] == 50:
        back = back[:-1]
    return [*half, *back]


def _polar(radius: Callable[[float], float], samples: int = 180) -> list[Point]:
    """A closed curve around (50, 50), radius by angle in radians."""
    return [
        (
            50
            + radius(2 * math.pi * i / samples) * math.cos(2 * math.pi * i / samples),
            50
            + radius(2 * math.pi * i / samples) * math.sin(2 * math.pi * i / samples),
        )
        for i in range(samples)
    ]


def _star(
    tips: int, outer: float, inner: float, turn_deg: float = -90.0
) -> list[Point]:
    return [
        (
            50
            + (outer if k % 2 == 0 else inner)
            * math.cos(math.radians(turn_deg + 180 * k / tips)),
            50
            + (outer if k % 2 == 0 else inner)
            * math.sin(math.radians(turn_deg + 180 * k / tips)),
        )
        for k in range(2 * tips)
    ]


def _crenels(x0: float, x1: float, top: float, depth: float, teeth: int) -> list[Point]:
    """The top edge of a wall from x0 to x1 with `teeth` merlons."""
    width = (x1 - x0) / (2 * teeth - 1)
    points: list[Point] = []
    for k in range(2 * teeth - 1):
        y = top if k % 2 == 0 else top + depth
        points += [(x0 + k * width, y), (x0 + (k + 1) * width, y)]
    return points


def _rotated(points: Sequence[Point], degrees: float) -> list[Point]:
    a = math.radians(degrees)
    return [
        (
            50 + (x - 50) * math.cos(a) - (y - 50) * math.sin(a),
            50 + (x - 50) * math.sin(a) + (y - 50) * math.cos(a),
        )
        for x, y in points
    ]


# Computed shapes.


def _oval() -> list[Point]:
    return _arc(50, 50, 50, 32, -90, 270, 72)


def _plus() -> list[Point]:
    return _pts("36,4 64,4 64,36 96,36 96,64 64,64 64,96 36,96 36,64 4,64 4,36 36,36")


def _flower() -> list[Point]:
    return _polar(lambda t: 18 + 30 * abs(math.cos(2.5 * (t + math.pi / 2))) ** 0.7)


def _clover() -> list[Point]:
    # Four leaves on the diagonals; the notch at the bottom (90°, sample
    # 40 of 160) is where the stem leaves.
    leaves = _polar(lambda t: 6 + 40 * abs(math.sin(2 * t)) ** 0.55, 160)
    return [*leaves[:41], (53, 60), (64, 98), (59, 98), (48, 60), *leaves[41:]]


def _fireworks() -> list[Point]:
    return _star(12, 49, 20)


def _snowflake() -> list[Point]:
    upper = _pts("6,-3 20,-3 27,-12 31,-10 25,-3 33,-3 39,-9 42,-7 37,-2 47,0")
    arm = [*upper, *[(x, -y) for x, y in reversed(upper[:-1])]]
    points: list[Point] = []
    for k in range(6):
        a = math.radians(-90 + 60 * k)
        points += [
            (
                50 + x * math.cos(a) - y * math.sin(a),
                50 + x * math.sin(a) + y * math.cos(a),
            )
            for x, y in arm
        ]
    return points


# Drawn shapes: animals.


def _turtle() -> list[Point]:
    return [
        (20, 60),
        *_arc(48, 60, 30, 28, 180, 360),
        *_pts(
            "84,54 92,50 98,54 97,60 88,62 80,64 78,74 70,74 68,66 40,66"
            " 34,66 32,74 24,74 24,66 18,66 12,64 18,61"
        ),
    ]


def _duck() -> list[Point]:
    return _pts(
        "4,30 16,25 20,17 28,13 36,16 39,24 36,32 33,38 42,44 62,42 80,36 94,26"
        " 92,42 86,56 72,66 48,68 30,64 22,56 22,46 26,40 18,36 6,34"
    )


def _cheetah() -> list[Point]:
    return _pts(
        "2,30 12,33 24,36 32,33 48,30 64,32 74,29 80,23 90,23 97,27 95,32 87,34"
        " 82,38 86,45 99,50 98,55 82,52 72,47 60,48 46,50 37,51 23,61 9,68 6,64"
        " 20,55 26,46 22,41 12,37 3,34"
    )


def _penguin() -> list[Point]:
    return _mirror(
        [
            *_arc(50, 16, 14, 14, -90, -10),
            *_pts(
                "66,26 68,36 76,44 86,60 82,63 70,52 70,66 68,82 62,90 68,94"
                " 68,98 50,98"
            ),
        ]
    )


def _bear() -> list[Point]:
    return _pts(
        "16,90 16,64 10,56 11,40 24,30 44,28 56,24 66,27 73,29 77,22 82,21 84,26"
        " 92,30 99,38 96,43 86,45 80,49 80,90 68,90 68,66 56,67 32,67 30,90"
    )


def _fox() -> list[Point]:
    return _mirror(_pts("50,32 60,27 78,3 83,30 96,46 80,58 63,72 50,86"))


def _crab() -> list[Point]:
    return _mirror(
        _pts(
            "50,40 62,38 74,42 80,34 82,22 76,14 82,5 92,8 90,17 97,13 99,24 91,30"
            " 86,42 85,50 95,53 97,61 85,58 93,67 92,74 80,64 70,68 50,70"
        )
    )


def _octopus() -> list[Point]:
    return _mirror(
        [
            *_arc(50, 30, 26, 26, -90, 20),
            *_pts(
                "74,44 82,56 93,66 97,78 88,76 80,64 72,58 77,74 74,90 68,84"
                " 66,66 60,62 60,82 56,96 52,80 50,64"
            ),
        ]
    )


def _whale() -> list[Point]:
    return _pts(
        "4,50 8,38 20,28 40,24 60,28 74,37 82,44 90,32 99,24 97,38 89,46 99,52"
        " 96,58 84,52 74,56 56,66 32,70 14,66 6,58"
    )


def _dolphin() -> list[Point]:
    return _pts(
        "99,40 88,35 80,28 66,22 60,8 54,22 40,26 26,36 16,48 10,56 1,53 3,67"
        " 12,64 15,73 21,64 25,54 36,45 52,40 56,48 63,51 62,42 76,40 88,42"
    )


# Drawn shapes: sky.


def _rainbow() -> list[Point]:
    return [*_arc(50, 80, 48, 48, 180, 360, 30), *_arc(50, 80, 24, 24, 0, -180, 18)]


def _comet() -> list[Point]:
    # The head, and a tail of three streaks towards the top left.
    return [
        *_arc(70, 70, 22, 22, -45, 135, 18),
        *_pts("2,24 34,40 6,6 40,34 24,2"),
    ]


def _planet() -> list[Point]:
    return [
        (1, 56),
        (16, 47),
        *_arc(50, 50, 28, 28, 200, 340, 14),
        (84, 44),
        (99, 44),
        (84, 53),
        *_arc(50, 50, 28, 28, 20, 160, 14),
        (16, 57),
    ]


def _rocket() -> list[Point]:
    return _mirror(_pts("50,1 58,10 63,24 63,64 77,76 78,93 63,85 58,90 56,99 50,94"))


# Drawn shapes: nature.


def _leaf() -> list[Point]:
    return _mirror(_pts("50,1 64,13 74,31 76,51 70,69 58,83 53,87 52,99 50,99"))


def _mushroom() -> list[Point]:
    return _mirror(
        [*_arc(50, 48, 46, 42, -90, -2), *_pts("84,50 62,50 62,58 65,84 62,94 50,96")]
    )


def _mountain() -> list[Point]:
    return _pts("2,92 34,24 44,40 60,10 98,92")


def _cactus() -> list[Point]:
    return _pts(
        "42,96 42,64 30,64 24,58 22,34 26,28 32,29 34,36 34,52 42,52 42,10 46,4"
        " 54,4 58,10 58,40 66,40 66,20 70,14 76,16 78,22 78,48 72,54 58,54 58,96"
    )


def _palm() -> list[Point]:
    return _pts(
        "54,98 58,62 59,32 80,34 98,48 86,30 68,26 84,19 90,9 70,12 58,19 57,9"
        " 50,1 47,11 50,19 34,10 13,10 29,19 46,25 26,28 4,45 24,37 47,31 49,62"
        " 44,98"
    )


def _acorn() -> list[Point]:
    return _mirror(
        _pts("50,2 54,2 54,12 68,13 84,19 93,28 92,36 77,39 79,52 74,70 63,85 50,97")
    )


def _volcano() -> list[Point]:
    return _pts("2,96 38,36 30,18 44,30 50,8 56,30 70,18 62,36 98,96")


# Drawn shapes: city.


def _igloo() -> list[Point]:
    # The dome, and the tunnel of the door on its right.
    return [
        *_arc(44, 92, 42, 42, 180, 330, 20),
        *_pts("90,71 96,74 98,80 98,92 94,92 94,84"),
        *_arc(88, 84, 6, 6, 0, -180, 6),
        (82, 92),
    ]


def _shop() -> list[Point]:
    return _pts(
        "10,8 90,8 98,32 93,38 88,33 88,96 60,96 60,70 40,70 40,96 12,96 12,33"
        " 7,38 2,32"
    )


def _windmill() -> list[Point]:
    hub = (50.0, 32.0)
    points: list[Point] = []
    for angle in (-45, 45, 135, 225):
        a = math.radians(angle)
        for r, side in ((5, -45), (31, -9), (31, 9)):
            b = a + math.radians(side)
            points.append((hub[0] + r * math.cos(b), hub[1] + r * math.sin(b)))
        if angle == 45:
            points += _pts("56,44 64,98 36,98 44,44")
    return points


def _tower() -> list[Point]:
    return _mirror(
        [*_crenels(50, 72, 4, 9, 2)[2:], (72, 20), (64, 26), (64, 96), (50, 96)]
    )


def _clock_tower() -> list[Point]:
    return _mirror(_pts("50,1 58,17 62,17 62,44 67,44 67,52 62,52 62,96 50,96"))


def _bridge() -> list[Point]:
    return [
        *_pts("2,52 26,46 50,42 74,46 98,52 98,82 92,82"),
        *_arc(80, 82, 12, 12, 0, -180, 10),
        (62, 82),
        *_arc(50, 82, 12, 12, 0, -180, 10),
        (32, 82),
        *_arc(20, 82, 12, 12, 0, -180, 10),
        (2, 82),
    ]


def _arch() -> list[Point]:
    return [
        *_pts("2,4 98,4 98,16 94,16 94,96 68,96 68,56"),
        *_arc(50, 56, 18, 18, 0, -180, 12),
        *_pts("32,96 6,96 6,16 2,16"),
    ]


def _lighthouse() -> list[Point]:
    return _mirror(
        _pts("50,1 56,5 58,11 60,11 60,24 66,24 66,29 62,29 68,90 75,90 75,97 50,97")
    )


def _ferris_wheel() -> list[Point]:
    cx, cy, r = 50.0, 42.0, 34.0
    points: list[Point] = []
    for k in range(8):
        start = 112.5 + 45 * k
        if 67.5 < start % 360 < 112.5:
            continue
        points += _arc(cx, cy, r, r, start, start + 15, 2)
        # A cabin: a little bump out of the wheel.
        points += _arc(
            cx + (r + 4) * math.cos(math.radians(start + 22.5)),
            cy + (r + 4) * math.sin(math.radians(start + 22.5)),
            5,
            5,
            start + 22.5 - 100,
            start + 22.5 + 100,
            6,
        )
        points += _arc(cx, cy, r, r, start + 30, start + 45, 2)
    points += _pts("63,74 79,99 67,99 50,79 33,99 21,99 37,74")
    return points


def _castle() -> list[Point]:
    return [
        (2, 96),
        *_crenels(2, 26, 10, 7, 3),
        (26, 34),
        *_crenels(26, 74, 34, 6, 5)[1:-1],
        (74, 34),
        *_crenels(74, 98, 10, 7, 3),
        (98, 96),
        (60, 96),
        *_arc(50, 80, 10, 10, 0, -180, 8),
        (40, 96),
    ]


def _pyramid() -> list[Point]:
    steps = 5
    right = [(50.0, 8.0)]
    for k in range(steps):
        x = 58 + 9 * k
        right += [(x, 8 + 18 * k), (x, 8 + 18 * (k + 1))]
    right.append((50.0, 98.0))
    return _mirror(right)


def _skyscraper() -> list[Point]:
    return _mirror(_pts("50,0 51,0 51,10 56,10 56,18 60,18 60,30 64,30 64,98 50,98"))


# Drawn shapes: milestones and seasons.


def _gift() -> list[Point]:
    return _mirror(
        _pts("50,24 56,15 64,5 73,5 75,14 69,22 59,26 91,26 91,40 85,40 85,96 50,96")
    )


def _cake() -> list[Point]:
    return _mirror(
        _pts("50,0 54,7 53,11 53,24 70,24 70,50 88,50 88,88 95,90 96,96 50,96")
    )


def _medal() -> list[Point]:
    return _mirror([*_pts("50,24 63,2 79,2 65,44"), *_arc(50, 68, 28, 28, -58, 90, 12)])


def _trophy() -> list[Point]:
    return _mirror(
        _pts(
            "50,6 76,6 76,12 90,10 98,18 94,32 78,42 76,38 88,30 91,20 84,17"
            " 76,18 73,40 62,52 57,57 56,70 66,82 70,84 70,96 50,96"
        )
    )


def _umbrella() -> list[Point]:
    points = _arc(50, 48, 46, 44, 180, 360, 28)
    for x0, x1 in ((96, 73), (73, 52)):
        points += _arc((x0 + x1) / 2, 48, (x0 - x1) / 2, 6, 0, -180, 6)[1:]
    points += [(52, 86), *_arc(44, 86, 8, 8, 0, 180, 8), (36, 82), (40, 82)]
    points += _arc(44, 86, 4, 4, 180, 0, 6)
    points += [(48, 48)]
    for x0, x1 in ((48, 27), (27, 4)):
        points += _arc((x0 + x1) / 2, 48, (x0 - x1) / 2, 6, 0, -180, 6)[1:]
    return points


def _snowman() -> list[Point]:
    circles = [(50.0, 31.0, 12.0), (50.0, 56.0, 16.0), (50.0, 83.0, 20.0)]

    def meet(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
        """The angle on the right of circle `a` where it meets `b` below."""
        (_, ya, ra), (_, yb, rb) = a, b
        d = yb - ya
        y = (d * d + ra * ra - rb * rb) / (2 * d)
        return math.degrees(math.asin(max(-1.0, min(1.0, y / ra))))

    hat = _pts("50,1 59,1 59,15 66,15 66,19")
    head_end = meet(circles[0], circles[1])
    body_start = -meet(
        (circles[1][0], -circles[1][1], circles[1][2]),
        (circles[0][0], -circles[0][1], circles[0][2]),
    )
    body_end = meet(circles[1], circles[2])
    base_start = -meet(
        (circles[2][0], -circles[2][1], circles[2][2]),
        (circles[1][0], -circles[1][1], circles[1][2]),
    )
    right = [
        *hat,
        *_arc(50, 31, 12, 12, -40, head_end, 6),
        *_arc(50, 56, 16, 16, body_start, body_end, 8),
        *_arc(50, 83, 20, 20, base_start, 90, 8),
    ]
    return _mirror(right)


# Drawn shapes: legends.


def _shield() -> list[Point]:
    return _mirror(_pts("50,6 66,2 92,8 92,40 86,64 72,82 50,98"))


def _wand() -> list[Point]:
    star = _star(5, 30, 13, turn_deg=-153)
    # Shift the star up and right; the stick leaves from its inner corner
    # that faces down and to the left.
    star = [(x + 16, y - 18) for x, y in star]
    corner = max(range(len(star)), key=lambda i: star[i][1] - star[i][0])
    x, y = star[corner]
    return [
        *star[:corner],
        (x + 3, y + 2),
        (8, 98),
        (2, 94),
        (x - 2, y - 3),
        *star[corner + 1 :],
    ]


def _wizard_hat() -> list[Point]:
    return _pts(
        "60,2 66,22 72,60 94,62 97,69 80,76 50,78 20,76 3,69 6,62 28,60 40,26" " 52,12"
    )


def _unicorn() -> list[Point]:
    return _pts(
        "88,2 72,28 84,46 93,62 90,72 80,76 66,70 60,78 62,98 24,98 18,84 26,74"
        " 18,62 28,52 22,40 34,32 38,22 44,8 54,22 64,22"
    )


def _dragon() -> list[Point]:
    # Side view to the right: horned head, a bat wing up, a spade tail.
    return _pts(
        "98,30 90,23 87,12 83,23 74,33 66,30 58,16 42,6 16,1 26,14 32,11 38,24"
        " 45,20 50,35 38,40 28,45 18,52 11,60 3,58 5,71 14,70 12,64 20,58 30,54"
        " 34,58 32,70"
        " 40,70 42,58 56,58 60,66 66,66 66,56 72,48 80,40 88,36 97,36"
    )


def _phoenix() -> list[Point]:
    return _mirror(
        _pts(
            "50,8 55,11 57,19 66,22 80,10 98,4 90,18 98,22 86,32 94,38 78,42 62,44"
            " 58,54 66,70 76,96 62,84 58,98 54,80 50,96"
        )
    )


def _chest() -> list[Point]:
    return _mirror(
        [
            *_arc(50, 40, 46, 22, -90, 0, 8),
            *_pts("96,46 89,46 89,90 94,90 94,97 50,97"),
        ]
    )


def _lamp() -> list[Point]:
    return _pts(
        "2,40 12,44 26,56 36,60 44,52 48,46 50,40 54,32 58,30 62,32 66,40 68,46"
        " 74,52 82,46 92,48 95,58 87,68 77,68 66,74 68,80 36,80 40,74 30,68"
        " 18,58 2,46"
    )


def _mermaid() -> list[Point]:
    return _pts(
        "36,4 62,4 66,20 64,40 57,58 53,70 70,80 92,78 86,90 66,94 50,85 34,94"
        " 14,90 8,78 30,80 46,70 43,58 36,40 32,20"
    )


def _griffin() -> list[Point]:
    return _pts(
        "40,10 60,8 76,14 88,20 98,30 96,40 90,36 86,42 76,44 70,52 66,62 70,74"
        " 60,72 64,86 52,80 54,96 40,86 30,96 28,78 18,84 22,66 10,64 20,52"
        " 12,42 24,34 14,14 34,22"
    )


# Drawn shapes: ancient Greece.


def _amphora() -> list[Point]:
    return _mirror(
        _pts(
            "50,3 59,3 59,8 56,10 56,22 64,19 73,19 77,26 74,36 77,52 72,72 62,86"
            " 60,92 64,96 50,96"
        )
    )


def _laurel() -> list[Point]:
    outer: list[Point] = []
    inner: list[Point] = []
    start, end, leaves = -55.0, 235.0, 9
    for i in range(leaves * 6 + 1):
        a = start + (end - start) * i / (leaves * 6)
        bump = abs(math.sin(math.pi * i / 6))
        r = 38 + 10 * bump
        outer.append(
            (50 + r * math.cos(math.radians(a)), 50 + r * math.sin(math.radians(a)))
        )
        inner.append(
            (50 + 30 * math.cos(math.radians(a)), 50 + 30 * math.sin(math.radians(a)))
        )
    return [*outer, *reversed(inner)]


def _helmet() -> list[Point]:
    # A Corinthian helmet from the front: the crest, the dome, the cheek
    # guards and the slot between them.
    return _mirror(
        _pts("50,0 57,1 59,14 72,16 82,24 88,40 87,70 82,90 70,98 60,90 56,68 50,62")
    )


def _lyre() -> list[Point]:
    return _mirror(
        _pts(
            "50,70 60,66 66,40 64,20 70,12 78,6 86,10 82,16 76,24 80,44 78,66 68,84"
            " 56,92 50,94"
        )
    )


def _column() -> list[Point]:
    return _mirror(
        _pts(
            "50,4 84,4 84,8 88,10 91,16 85,21 70,18 66,20 66,86 74,88 74,92 80,92"
            " 80,96 50,96"
        )
    )


def _pegasus() -> list[Point]:
    # A horse's head to the right, a wing rising behind it to the left.
    return _pts(
        "60,30 68,34 84,52 94,68 92,78 82,82 70,76 64,84 66,99 34,99 30,80 14,76"
        " 2,66 14,62 4,50 18,48 8,34 24,34 16,18 32,24 30,6 44,22 48,36 52,22"
    )


def _torch() -> list[Point]:
    return _mirror(_pts("50,2 57,13 63,6 66,20 62,32 70,32 66,44 58,48 55,98 50,98"))


def _drawn(make: Callable[[], list[Point]]) -> tuple[Point, ...]:
    return _fit(make())


# --- The collections and the shapes ---

COLLECTIONS: tuple[Collection, ...] = (
    Collection(
        "geometry",
        _names("Geometry", "Geometrie", "Geometrie", "Geometría", "Géométrie"),
    ),
    Collection("animals", _names("Animals", "Tiere", "Animali", "Animales", "Animaux")),
    Collection("sea", _names("Sea", "Meer", "Mare", "Mar", "Mer")),
    Collection("sky", _names("Sky", "Himmel", "Cielo", "Cielo", "Ciel")),
    Collection("nature", _names("Nature", "Natur", "Natura", "Naturaleza", "Nature")),
    Collection("city", _names("City", "Stadt", "Città", "Ciudad", "Ville")),
    Collection(
        "milestones",
        _names("Milestones", "Meilensteine", "Traguardi", "Hitos", "Jalons"),
    ),
    Collection(
        "seasons",
        _names(
            "Holidays & seasons",
            "Feste & Jahreszeiten",
            "Feste e stagioni",
            "Fiestas y estaciones",
            "Fêtes et saisons",
        ),
    ),
    Collection(
        "legends", _names("Legends", "Legenden", "Leggende", "Leyendas", "Légendes")
    ),
    Collection(
        "greece",
        _names(
            "Ancient Greece",
            "Antikes Griechenland",
            "Antica Grecia",
            "Antigua Grecia",
            "Grèce antique",
        ),
    ),
)


def _km(km: float) -> DistanceGoal:
    return DistanceGoal(round(km * 1000))


def _pace(distance_m: int, pace: str) -> PaceGoal:
    minutes, seconds = pace.split(":")
    return PaceGoal(distance_m, int(minutes) * 60 + int(seconds))


def _one_run(distance_m: int) -> PaceGoal:
    return PaceGoal(distance_m, SINGLE_RUN_PACE_S, single_run=True)


MILE_M = 1_609
HALF_M = 21_097
MARATHON_M = 42_195

_N = _names

CATALOG: tuple[GameShape, ...] = (
    # Geometry: the first km, and two paces of TASK-296.
    GameShape(
        "oval",
        _N("Oval", "Oval", "Ovale", "Óvalo", "Ovale"),
        _km(1),
        _drawn(_oval),
        "geometry",
    ),
    GameShape(
        "pentagon",
        _N("Pentagon", "Fünfeck", "Pentagono", "Pentágono", "Pentagone"),
        _km(3),
        _polygon(5),
        "geometry",
    ),
    GameShape(
        "triangle",
        _N("Triangle", "Dreieck", "Triangolo", "Triángulo", "Triangle"),
        _km(5),
        _polygon(3),
        "geometry",
    ),
    GameShape(
        "square",
        _N("Square", "Quadrat", "Quadrato", "Cuadrado", "Carré"),
        _km(10),
        _polygon(4, 45.0),
        "geometry",
    ),
    GameShape(
        "octagon",
        _N("Octagon", "Achteck", "Ottagono", "Octógono", "Octogone"),
        _km(15),
        _polygon(8, 22.5),
        "geometry",
    ),
    GameShape(
        "hexagon",
        _N("Hexagon", "Sechseck", "Esagono", "Hexágono", "Hexagone"),
        _km(20),
        _polygon(6),
        "geometry",
    ),
    GameShape(
        "plus",
        _N("Plus", "Plus", "Più", "Más", "Plus"),
        _km(30),
        _drawn(_plus),
        "geometry",
    ),
    GameShape(
        "circle",
        _N("Circle", "Kreis", "Cerchio", "Círculo", "Cercle"),
        _km(42),
        _engine("circle"),
        "geometry",
    ),
    GameShape(
        "diamond",
        _N("Diamond", "Raute", "Diamante", "Diamante", "Losange"),
        _pace(5_000, "5:30"),
        _diamond(),
        "geometry",
    ),
    GameShape(
        "arrow",
        _N("Arrow", "Pfeil", "Freccia", "Flecha", "Flèche"),
        _pace(10_000, "6:00"),
        _engine("arrow"),
        "geometry",
    ),
    # Animals: 400 m and 1 km, from the snail to the cheetah.
    GameShape(
        "snail",
        _N("Snail", "Schnecke", "Lumaca", "Caracol", "Escargot"),
        _pace(400, "6:00"),
        _engine("snail"),
        "animals",
    ),
    GameShape(
        "turtle",
        _N("Turtle", "Schildkröte", "Tartaruga", "Tortuga", "Tortue"),
        _pace(400, "5:00"),
        _drawn(_turtle),
        "animals",
    ),
    GameShape(
        "duck",
        _N("Duck", "Ente", "Anatra", "Pato", "Canard"),
        _pace(400, "4:30"),
        _drawn(_duck),
        "animals",
    ),
    GameShape(
        "rabbit",
        _N("Rabbit", "Hase", "Coniglio", "Conejo", "Lapin"),
        _pace(400, "4:00"),
        _engine("rabbit_head"),
        "animals",
    ),
    GameShape(
        "dog",
        _N("Dog", "Hund", "Cane", "Perro", "Chien"),
        _pace(400, "3:30"),
        _engine("dog"),
        "animals",
    ),
    GameShape(
        "cheetah",
        _N("Cheetah", "Gepard", "Ghepardo", "Guepardo", "Guépard"),
        _pace(400, "3:00"),
        _drawn(_cheetah),
        "animals",
    ),
    GameShape(
        "penguin",
        _N("Penguin", "Pinguin", "Pinguino", "Pingüino", "Pingouin"),
        _pace(1_000, "7:00"),
        _drawn(_penguin),
        "animals",
    ),
    GameShape(
        "cat",
        _N("Cat", "Katze", "Gatto", "Gato", "Chat"),
        _pace(1_000, "6:30"),
        _engine("cat"),
        "animals",
    ),
    GameShape(
        "bear",
        _N("Bear", "Bär", "Orso", "Oso", "Ours"),
        _pace(1_000, "6:00"),
        _drawn(_bear),
        "animals",
    ),
    GameShape(
        "butterfly",
        _N("Butterfly", "Schmetterling", "Farfalla", "Mariposa", "Papillon"),
        _pace(1_000, "5:30"),
        _engine("butterfly"),
        "animals",
    ),
    GameShape(
        "bird",
        _N("Bird", "Vogel", "Uccello", "Pájaro", "Oiseau"),
        _pace(1_000, "4:30"),
        _engine("bird"),
        "animals",
    ),
    GameShape(
        "fox",
        _N("Fox", "Fuchs", "Volpe", "Zorro", "Renard"),
        _pace(1_000, "4:00"),
        _drawn(_fox),
        "animals",
    ),
    GameShape(
        "horse",
        _N("Horse", "Pferd", "Cavallo", "Caballo", "Cheval"),
        _pace(1_000, "3:30"),
        _engine("horse"),
        "animals",
    ),
    # Sea: the mile.
    GameShape(
        "crab",
        _N("Crab", "Krabbe", "Granchio", "Cangrejo", "Crabe"),
        _pace(MILE_M, "7:00"),
        _drawn(_crab),
        "sea",
    ),
    GameShape(
        "octopus",
        _N("Octopus", "Krake", "Polpo", "Pulpo", "Pieuvre"),
        _pace(MILE_M, "6:00"),
        _drawn(_octopus),
        "sea",
    ),
    GameShape(
        "fish",
        _N("Fish", "Fisch", "Pesce", "Pez", "Poisson"),
        _pace(MILE_M, "5:00"),
        _engine("fish"),
        "sea",
    ),
    GameShape(
        "whale",
        _N("Whale", "Wal", "Balena", "Ballena", "Baleine"),
        _pace(MILE_M, "4:30"),
        _drawn(_whale),
        "sea",
    ),
    GameShape(
        "dolphin",
        _N("Dolphin", "Delfin", "Delfino", "Delfín", "Dauphin"),
        _pace(MILE_M, "4:00"),
        _drawn(_dolphin),
        "sea",
    ),
    # Sky: the big km, up to 10 000.
    GameShape(
        "star",
        _N("Star", "Stern", "Stella", "Estrella", "Étoile"),
        _km(100),
        _engine("star"),
        "sky",
    ),
    GameShape(
        "lightning",
        _N("Lightning", "Blitz", "Fulmine", "Rayo", "Éclair"),
        _pace(1_000, "5:00"),
        _engine("lightning"),
        "sky",
    ),
    GameShape(
        "moon",
        _N("Moon", "Mond", "Luna", "Luna", "Lune"),
        _km(500),
        _engine("moon"),
        "sky",
    ),
    GameShape(
        "sun",
        _N("Sun", "Sonne", "Sole", "Sol", "Soleil"),
        _km(1_000),
        _engine("sun"),
        "sky",
    ),
    GameShape(
        "cloud",
        _N("Cloud", "Wolke", "Nuvola", "Nube", "Nuage"),
        _km(1_500),
        _engine("cloud"),
        "sky",
    ),
    GameShape(
        "rainbow",
        _N("Rainbow", "Regenbogen", "Arcobaleno", "Arcoíris", "Arc-en-ciel"),
        _km(2_000),
        _drawn(_rainbow),
        "sky",
    ),
    GameShape(
        "comet",
        _N("Comet", "Komet", "Cometa", "Cometa", "Comète"),
        _km(3_000),
        _drawn(_comet),
        "sky",
    ),
    GameShape(
        "planet",
        _N("Planet", "Planet", "Pianeta", "Planeta", "Planète"),
        _km(5_000),
        _drawn(_planet),
        "sky",
    ),
    GameShape(
        "rocket",
        _N("Rocket", "Rakete", "Razzo", "Cohete", "Fusée"),
        _km(10_000),
        _drawn(_rocket),
        "sky",
    ),
    # Nature: the middle km, and 15 km.
    GameShape(
        "drop",
        _N("Drop", "Tropfen", "Goccia", "Gota", "Goutte"),
        _km(50),
        _engine("drop"),
        "nature",
    ),
    GameShape(
        "leaf",
        _N("Leaf", "Blatt", "Foglia", "Hoja", "Feuille"),
        _km(75),
        _drawn(_leaf),
        "nature",
    ),
    GameShape(
        "tree",
        _N("Tree", "Baum", "Albero", "Árbol", "Arbre"),
        _km(150),
        _engine("tree"),
        "nature",
    ),
    GameShape(
        "flower",
        _N("Flower", "Blume", "Fiore", "Flor", "Fleur"),
        _km(200),
        _drawn(_flower),
        "nature",
    ),
    GameShape(
        "apple",
        _N("Apple", "Apfel", "Mela", "Manzana", "Pomme"),
        _km(300),
        _engine("apple"),
        "nature",
    ),
    GameShape(
        "mushroom",
        _N("Mushroom", "Pilz", "Fungo", "Seta", "Champignon"),
        _km(400),
        _drawn(_mushroom),
        "nature",
    ),
    GameShape(
        "mountain",
        _N("Mountain", "Berg", "Montagna", "Montaña", "Montagne"),
        _km(750),
        _drawn(_mountain),
        "nature",
    ),
    GameShape(
        "cactus",
        _N("Cactus", "Kaktus", "Cactus", "Cactus", "Cactus"),
        _pace(15_000, "7:00"),
        _drawn(_cactus),
        "nature",
    ),
    GameShape(
        "clover",
        _N("Clover", "Kleeblatt", "Quadrifoglio", "Trébol", "Trèfle"),
        _pace(15_000, "6:00"),
        _drawn(_clover),
        "nature",
    ),
    GameShape(
        "palm",
        _N("Palm tree", "Palme", "Palma", "Palmera", "Palmier"),
        _pace(15_000, "5:30"),
        _drawn(_palm),
        "nature",
    ),
    GameShape(
        "acorn",
        _N("Acorn", "Eichel", "Ghianda", "Bellota", "Gland"),
        _pace(15_000, "5:00"),
        _drawn(_acorn),
        "nature",
    ),
    GameShape(
        "volcano",
        _N("Volcano", "Vulkan", "Vulcano", "Volcán", "Volcan"),
        _pace(15_000, "4:30"),
        _drawn(_volcano),
        "nature",
    ),
    # City: 3 km and 5 km.
    GameShape(
        "house",
        _N("House", "Haus", "Casa", "Casa", "Maison"),
        _pace(3_000, "7:00"),
        _engine("house"),
        "city",
    ),
    GameShape(
        "igloo",
        _N("Igloo", "Iglu", "Igloo", "Iglú", "Igloo"),
        _pace(3_000, "6:00"),
        _drawn(_igloo),
        "city",
    ),
    GameShape(
        "shop",
        _N("Shop", "Laden", "Negozio", "Tienda", "Boutique"),
        _pace(3_000, "5:30"),
        _drawn(_shop),
        "city",
    ),
    GameShape(
        "windmill",
        _N("Windmill", "Windmühle", "Mulino a vento", "Molino", "Moulin"),
        _pace(3_000, "5:00"),
        _drawn(_windmill),
        "city",
    ),
    GameShape(
        "tower",
        _N("Tower", "Turm", "Torre", "Torre", "Tour"),
        _pace(3_000, "4:30"),
        _drawn(_tower),
        "city",
    ),
    GameShape(
        "clock_tower",
        _N(
            "Clock tower",
            "Uhrturm",
            "Torre dell'orologio",
            "Torre del reloj",
            "Tour de l'horloge",
        ),
        _pace(3_000, "4:00"),
        _drawn(_clock_tower),
        "city",
    ),
    GameShape(
        "bridge",
        _N("Bridge", "Brücke", "Ponte", "Puente", "Pont"),
        _pace(5_000, "7:30"),
        _drawn(_bridge),
        "city",
    ),
    GameShape(
        "arch",
        _N("Arch", "Torbogen", "Arco", "Arco", "Arc"),
        _pace(5_000, "7:00"),
        _drawn(_arch),
        "city",
    ),
    GameShape(
        "lighthouse",
        _N("Lighthouse", "Leuchtturm", "Faro", "Faro", "Phare"),
        _pace(5_000, "6:30"),
        _drawn(_lighthouse),
        "city",
    ),
    GameShape(
        "ferris_wheel",
        _N("Ferris wheel", "Riesenrad", "Ruota panoramica", "Noria", "Grande roue"),
        _pace(5_000, "6:00"),
        _drawn(_ferris_wheel),
        "city",
    ),
    GameShape(
        "castle",
        _N("Castle", "Burg", "Castello", "Castillo", "Château"),
        _pace(5_000, "5:00"),
        _drawn(_castle),
        "city",
    ),
    GameShape(
        "pyramid",
        _N("Pyramid", "Pyramide", "Piramide", "Pirámide", "Pyramide"),
        _pace(5_000, "4:30"),
        _drawn(_pyramid),
        "city",
    ),
    GameShape(
        "skyscraper",
        _N("Skyscraper", "Wolkenkratzer", "Grattacielo", "Rascacielos", "Gratte-ciel"),
        _pace(5_000, "4:00"),
        _drawn(_skyscraper),
        "city",
    ),
    # Milestones: one run.
    GameShape(
        "balloon",
        _N("Balloon", "Ballon", "Palloncino", "Globo", "Ballon"),
        _one_run(5_000),
        _engine("balloon"),
        "milestones",
    ),
    GameShape(
        "gift",
        _N("Gift", "Geschenk", "Regalo", "Regalo", "Cadeau"),
        _one_run(10_000),
        _drawn(_gift),
        "milestones",
    ),
    GameShape(
        "cake",
        _N("Cake", "Torte", "Torta", "Pastel", "Gâteau"),
        _one_run(HALF_M),
        _drawn(_cake),
        "milestones",
    ),
    GameShape(
        "heart",
        _N("Heart", "Herz", "Cuore", "Corazón", "Cœur"),
        _km(250),
        _engine("heart"),
        "milestones",
    ),
    GameShape(
        "fireworks",
        _N(
            "Fireworks",
            "Feuerwerk",
            "Fuochi d'artificio",
            "Fuegos artificiales",
            "Feu d'artifice",
        ),
        _one_run(30_000),
        _drawn(_fireworks),
        "milestones",
    ),
    GameShape(
        "medal",
        _N("Medal", "Medaille", "Medaglia", "Medalla", "Médaille"),
        _one_run(MARATHON_M),
        _drawn(_medal),
        "milestones",
    ),
    GameShape(
        "trophy",
        _N("Trophy", "Pokal", "Trofeo", "Trofeo", "Trophée"),
        _one_run(50_000),
        _drawn(_trophy),
        "milestones",
    ),
    # Holidays & seasons: 10 km.
    GameShape(
        "ice_cream",
        _N("Ice cream", "Eis", "Gelato", "Helado", "Glace"),
        _pace(10_000, "7:30"),
        _engine("ice_cream"),
        "seasons",
    ),
    GameShape(
        "umbrella",
        _N("Umbrella", "Regenschirm", "Ombrello", "Paraguas", "Parapluie"),
        _pace(10_000, "7:00"),
        _drawn(_umbrella),
        "seasons",
    ),
    GameShape(
        "snowman",
        _N(
            "Snowman",
            "Schneemann",
            "Pupazzo di neve",
            "Muñeco de nieve",
            "Bonhomme de neige",
        ),
        _pace(10_000, "6:30"),
        _drawn(_snowman),
        "seasons",
    ),
    GameShape(
        "pumpkin",
        _N("Pumpkin", "Kürbis", "Zucca", "Calabaza", "Citrouille"),
        _pace(10_000, "5:30"),
        _engine("pumpkin"),
        "seasons",
    ),
    GameShape(
        "ghost",
        _N("Ghost", "Gespenst", "Fantasma", "Fantasma", "Fantôme"),
        _pace(10_000, "5:00"),
        _engine("ghost"),
        "seasons",
    ),
    GameShape(
        "snowflake",
        _N("Snowflake", "Schneeflocke", "Fiocco di neve", "Copo de nieve", "Flocon"),
        _pace(10_000, "4:30"),
        _drawn(_snowflake),
        "seasons",
    ),
    GameShape(
        "christmas_tree",
        _N(
            "Christmas tree",
            "Weihnachtsbaum",
            "Albero di Natale",
            "Árbol de Navidad",
            "Sapin de Noël",
        ),
        _pace(10_000, "4:00"),
        _engine("christmas_tree"),
        "seasons",
    ),
    # Legends: the half and 30 km.
    GameShape(
        "shield",
        _N("Shield", "Schild", "Scudo", "Escudo", "Bouclier"),
        _pace(HALF_M, "7:30"),
        _drawn(_shield),
        "legends",
    ),
    GameShape(
        "wand",
        _N(
            "Magic wand",
            "Zauberstab",
            "Bacchetta magica",
            "Varita mágica",
            "Baguette magique",
        ),
        _pace(HALF_M, "7:00"),
        _drawn(_wand),
        "legends",
    ),
    GameShape(
        "wizard_hat",
        _N(
            "Wizard hat",
            "Zauberhut",
            "Cappello da mago",
            "Sombrero de mago",
            "Chapeau de magicien",
        ),
        _pace(HALF_M, "6:30"),
        _drawn(_wizard_hat),
        "legends",
    ),
    GameShape(
        "crown",
        _N("Crown", "Krone", "Corona", "Corona", "Couronne"),
        _pace(HALF_M, "6:00"),
        _engine("crown"),
        "legends",
    ),
    GameShape(
        "unicorn",
        _N("Unicorn", "Einhorn", "Unicorno", "Unicornio", "Licorne"),
        _pace(HALF_M, "5:30"),
        _drawn(_unicorn),
        "legends",
    ),
    GameShape(
        "dragon",
        _N("Dragon", "Drache", "Drago", "Dragón", "Dragon"),
        _pace(HALF_M, "5:00"),
        _drawn(_dragon),
        "legends",
    ),
    GameShape(
        "phoenix",
        _N("Phoenix", "Phönix", "Fenice", "Fénix", "Phénix"),
        _pace(HALF_M, "4:30"),
        _drawn(_phoenix),
        "legends",
    ),
    GameShape(
        "chest",
        _N("Treasure chest", "Schatztruhe", "Forziere", "Cofre", "Coffre au trésor"),
        _pace(30_000, "7:00"),
        _drawn(_chest),
        "legends",
    ),
    GameShape(
        "lamp",
        _N(
            "Magic lamp",
            "Wunderlampe",
            "Lampada magica",
            "Lámpara mágica",
            "Lampe magique",
        ),
        _pace(30_000, "6:00"),
        _drawn(_lamp),
        "legends",
    ),
    GameShape(
        "mermaid",
        _N("Mermaid", "Meerjungfrau", "Sirena", "Sirena", "Sirène"),
        _pace(30_000, "5:30"),
        _drawn(_mermaid),
        "legends",
    ),
    GameShape(
        "griffin",
        _N("Griffin", "Greif", "Grifone", "Grifo", "Griffon"),
        _pace(30_000, "5:00"),
        _drawn(_griffin),
        "legends",
    ),
    # Ancient Greece: the marathon, born there.
    GameShape(
        "amphora",
        _N("Amphora", "Amphore", "Anfora", "Ánfora", "Amphore"),
        _pace(MARATHON_M, "7:30"),
        _drawn(_amphora),
        "greece",
    ),
    GameShape(
        "laurel",
        _N(
            "Laurel wreath",
            "Lorbeerkranz",
            "Corona d'alloro",
            "Corona de laurel",
            "Couronne de laurier",
        ),
        _pace(MARATHON_M, "7:00"),
        _drawn(_laurel),
        "greece",
    ),
    GameShape(
        "helmet",
        _N("Helmet", "Helm", "Elmo", "Casco", "Casque"),
        _pace(MARATHON_M, "6:30"),
        _drawn(_helmet),
        "greece",
    ),
    GameShape(
        "lyre",
        _N("Lyre", "Leier", "Lira", "Lira", "Lyre"),
        _pace(MARATHON_M, "6:00"),
        _drawn(_lyre),
        "greece",
    ),
    GameShape(
        "column",
        _N("Column", "Säule", "Colonna", "Columna", "Colonne"),
        _pace(MARATHON_M, "5:30"),
        _drawn(_column),
        "greece",
    ),
    GameShape(
        "pegasus",
        _N("Pegasus", "Pegasus", "Pegaso", "Pegaso", "Pégase"),
        _pace(MARATHON_M, "5:00"),
        _drawn(_pegasus),
        "greece",
    ),
    GameShape(
        "torch",
        _N("Torch", "Fackel", "Fiaccola", "Antorcha", "Flambeau"),
        _pace(MARATHON_M, "4:30"),
        _drawn(_torch),
        "greece",
    ),
)

BY_ID: dict[str, GameShape] = {shape.id: shape for shape in CATALOG}
COLLECTION_BY_ID: dict[str, Collection] = {c.id: c for c in COLLECTIONS}
