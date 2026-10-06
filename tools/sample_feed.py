"""Write the example drawings of the app's «Feed» from the seed catalogue.

Usage (from the repository root):

    python tools/sample_feed.py

It reads ``catalog/seed/*.json`` and writes
``apps/mobile/src/feed/sampleFeed.json``: fifteen drawings, the figures that
came out best in the cities of the catalogue, each with a made-up runner, a
made-up title, a time and a score (TASK-156, ADR-0127). They fill «Feed»
until runners publish their own (TASK-118).

The lines are the route engine's own, from the catalogue, with fewer points:
nothing here invents a coordinate. Runners, titles, times and scores are
invented, and are the same at every run: the file changes only when the
catalogue does. After a run, format the file as the rest of the app:

    npx prettier --write apps/mobile/src/feed/sampleFeed.json

Standard library only: it runs with any Python 3.11+, without the route-engine
virtual environment, and it does not import the route-engine.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

LatLon = tuple[float, float]

# Same radius as route_engine/geo.py.
EARTH_RADIUS_M = 6_371_000.0
# As the previews of the API (recommended.py): about one metre.
COORD_DECIMALS = 5

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SEED = REPO_ROOT / "catalog" / "seed"
DEFAULT_OUT = REPO_ROOT / "apps" / "mobile" / "src" / "feed" / "sampleFeed.json"

POSTS = 15
# Every city gives two figures; the one left over goes to the best remaining.
PER_CITY = 2
# No figure more than twice: a feed of fifteen horses says little.
PER_SHAPE = 2
# From here up a figure "came out well": a city prefers a shape not yet in
# the feed only among these.
GOOD_SIMILARITY = 0.95
# Enough points for a drawing as wide as the phone, few enough for the app,
# which draws every stretch as one view.
LINE_POINTS = 120

# Made-up runners, in the order of the feed: 3 to 20 letters, digits, _ or .
# as the usernames of the app (apps/mobile/src/account/fields.ts).
RUNNERS = (
    "marta_b",
    "dade.runs",
    "giulia_trail",
    "tommy_92",
    "sara.corre",
    "fede_km",
    "nico_runner",
    "elisa.go",
    "pietro_10k",
    "chiara_slow",
    "matte.fast",
    "bea_onroad",
    "vale.pace",
    "simo_loop",
    "anna_sprint",
)

# Two titles for each shape, one for each time it may come up (PER_SHAPE).
TITLES: dict[str, tuple[str, str]] = {
    "circle": ("Round and round {city}", "A circle around {city}"),
    "heart": ("A heart for {city}", "Heart on the map"),
    "star": ("A star over {city}", "Star before work"),
    "horse": ("A horse through {city}", "Galloping in {city}"),
    "moon": ("Moon over {city}", "Night moon in {city}"),
    "cat": ("The cat of {city}", "Cat ears on the map"),
    "fish": ("A fish in {city}", "Fish out of water"),
    "butterfly": ("Butterfly in {city}", "Wings over {city}"),
    "snail": ("The snail took a while", "Slow and steady in {city}"),
    "dog_head": ("Dog walk, without the dog", "Good dog, {city}"),
    "rabbit_head": ("Bunny ears in {city}", "Rabbit run in {city}"),
    "pumpkin": ("Pumpkin run in {city}", "A pumpkin on the map"),
    "christmas_tree": ("Christmas tree in {city}", "A tree for {city}"),
}


class SampleFeedError(Exception):
    """The catalogue cannot fill the feed."""


@dataclass(frozen=True)
class Figure:
    """One route of the catalogue that draws a shape."""

    id: str
    city: str
    shape: str
    route_m: int
    similarity: float
    points: tuple[LatLon, ...]
    rotation_deg: float = 0.0
    """How far the engine turned the shape (TASK-232, ADR-0195), as the city
    file says it; 0 for a route north up, or one that does not say."""


def turn_of(route: dict[str, object]) -> float:
    """`rotation_deg` of a route of a city file, as the API reads it
    (recommended.turn_of): 0 unless it is a number between -180 and 180."""
    turn = route.get("rotation_deg")
    if isinstance(turn, bool) or not isinstance(turn, int | float):
        return 0.0
    return float(turn) if math.isfinite(turn) and -180 <= turn <= 180 else 0.0


def read_city(path: Path) -> list[Figure]:
    """The shapes of one city file, with the ids the API gives them
    (recommended.py: city, name, distance and place in the file)."""
    body = json.loads(path.read_text(encoding="utf-8"))
    city = str(body["city"])
    figures = []
    for i, route in enumerate(body["routes"]):
        shape = route.get("shape")
        points = tuple((float(lat), float(lon)) for lat, lon in route["points"])
        if shape is None or len(points) < 2:
            continue  # a word is not a figure; a point is not a line
        figures.append(
            Figure(
                id=f"{city}-{shape}-{int(route['distance_m'])}-{i}",
                city=city,
                shape=str(shape),
                route_m=int(route["route_m"]),
                similarity=float(route["similarity"]),
                points=points,
                rotation_deg=turn_of(route),
            )
        )
    return figures


def read_catalogue(seed: Path) -> list[Figure]:
    figures: list[Figure] = []
    for path in sorted(seed.glob("*.json")):
        figures.extend(read_city(path))
    return figures


def choose(
    figures: Sequence[Figure],
    posts: int = POSTS,
    per_city: int = PER_CITY,
    per_shape: int = PER_SHAPE,
    good: float = GOOD_SIMILARITY,
) -> list[Figure]:
    """The figures of the feed: the ones that came out best, from every city,
    and as many different shapes as the good ones allow.

    Every city gives `per_city` figures of different shapes, its best first.
    Among the ones that came out well it takes a shape not yet in the feed
    before repeating one, and no shape comes up more than `per_shape` times.
    The cities with fewer good figures choose first: the others have plenty
    to choose from. What is left of `posts` goes to the best figures left.
    """
    best_first = sorted(figures, key=lambda f: (-f.similarity, f.route_m, f.id))
    chosen: list[Figure] = []
    used: Counter[str] = Counter()

    def free(figure: Figure) -> bool:
        return (
            figure not in chosen
            and used[figure.shape] < per_shape
            and not any(
                c.city == figure.city and c.shape == figure.shape for c in chosen
            )
        )

    def take(figure: Figure) -> None:
        chosen.append(figure)
        used[figure.shape] += 1

    well = Counter(f.city for f in figures if f.similarity >= good)
    cities = sorted({f.city for f in figures}, key=lambda city: (well[city], city))
    for _ in range(per_city):
        for city in cities:
            if len(chosen) == posts:
                break
            mine = [f for f in best_first if f.city == city and free(f)]
            new = [f for f in mine if used[f.shape] == 0 and f.similarity >= good]
            if new or mine:
                take((new or mine)[0])
    for figure in best_first:
        if len(chosen) == posts:
            break
        if free(figure):
            take(figure)
    return chosen


def to_metres(points: Sequence[LatLon]) -> list[tuple[float, float]]:
    """The points on a plane, in metres east and north: distances from a
    line are measured there, not in degrees."""
    k = math.cos(math.radians(sum(lat for lat, _ in points) / len(points)))
    return [
        (math.radians(lon) * EARTH_RADIUS_M * k, math.radians(lat) * EARTH_RADIUS_M)
        for lat, lon in points
    ]


def kept(plane: Sequence[tuple[float, float]], tolerance_m: float) -> list[int]:
    """Douglas-Peucker: the points that stay when the ones nearer than
    `tolerance_m` to the line between their neighbours go."""
    stay = [False] * len(plane)
    stay[0] = stay[-1] = True
    spans = [(0, len(plane) - 1)]
    while spans:
        a, b = spans.pop()
        (x1, y1), (x2, y2) = plane[a], plane[b]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        far, at = -1.0, a
        for i in range(a + 1, b):
            px, py = plane[i]
            if length < 1e-9:  # a closed line: how far from where it starts
                d = math.hypot(px - x1, py - y1)
            else:
                d = abs((px - x1) * dy - (py - y1) * dx) / length
            if d > far:
                far, at = d, i
        if far > tolerance_m:
            stay[at] = True
            spans.append((a, at))
            spans.append((at, b))
    return [i for i, stays in enumerate(stay) if stays]


def simplified(points: Sequence[LatLon], most: int = LINE_POINTS) -> list[LatLon]:
    """The line with at most `most` points: its corners stay, the points
    along a straight stretch go. First and last are kept."""
    if len(points) <= most:
        return list(points)
    plane = to_metres(points)
    low, high = 0.0, 1.0
    while len(kept(plane, high)) > most:
        low, high = high, high * 2
    for _ in range(24):  # the smallest tolerance that fits, to a hair
        middle = (low + high) / 2
        if len(kept(plane, middle)) <= most:
            high = middle
        else:
            low = middle
    return [points[i] for i in kept(plane, high)]


def city_name(city: str) -> str:
    """The city as the app writes it (recommendedRoutes.ts, cityName)."""
    return "New York" if city == "newyork" else city[:1].upper() + city[1:]


def title(shape: str, city: str, nth: int) -> str:
    """A made-up title; `nth` is how many times the shape came up before."""
    known = TITLES.get(shape)
    if known is None:
        return f"{shape.replace('_', ' ').capitalize()} in {city_name(city)}"
    return known[nth % len(known)].format(city=city_name(city))


def minutes(route_m: int, place: int) -> int:
    """A made-up time: between 5:15 and 6:40 a kilometre, by place in the feed."""
    pace_s = 315 + (place * 37) % 86
    return round(route_m / 1000 * pace_s / 60)


def score(similarity: float, place: int) -> int:
    """A made-up score: a few points under how well the route draws the shape,
    as a run that followed it closely would get (ADR-0090)."""
    return max(60, min(99, round(similarity * 100) - 2 - (place * 5) % 7))


def build(figures: Sequence[Figure]) -> list[dict[str, object]]:
    """The posts of the feed, in the order they are shown."""
    chosen = choose(figures)
    if len(chosen) < POSTS:
        raise SampleFeedError(
            f"the catalogue gives {len(chosen)} figures, the feed wants {POSTS}"
        )
    seen: Counter[str] = Counter()
    posts: list[dict[str, object]] = []
    for place, figure in enumerate(chosen):
        posts.append(
            {
                "id": figure.id,
                "user": RUNNERS[place],
                "title": title(figure.shape, figure.city, seen[figure.shape]),
                "city": figure.city,
                "shape": figure.shape,
                "route_m": figure.route_m,
                "minutes": minutes(figure.route_m, place),
                "score": score(figure.similarity, place),
                "line": [
                    [round(lat, COORD_DECIMALS), round(lon, COORD_DECIMALS)]
                    for lat, lon in simplified(figure.points)
                ],
                # Only a figure the engine turned (TASK-232): the app draws
                # it turned back, so the drawing reads upright.
                **(
                    {"rotation_deg": figure.rotation_deg} if figure.rotation_deg else {}
                ),
            }
        )
        seen[figure.shape] += 1
    return posts


def to_json(posts: Sequence[dict[str, object]]) -> str:
    """The file as Prettier writes JSON: one field a line, one point a line."""
    blocks = []
    for post in posts:
        fields = []
        for key, value in post.items():
            if key == "line":
                assert isinstance(value, list)
                pairs = ",\n".join(f"      [{lat}, {lon}]" for lat, lon in value)
                fields.append(f'    "line": [\n{pairs}\n    ]')
            else:
                fields.append(f"    {json.dumps(key)}: {json.dumps(value)}")
        blocks.append("  {\n" + ",\n".join(fields) + "\n  }")
    return "[\n" + ",\n".join(blocks) + "\n]\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    try:
        posts = build(read_catalogue(args.seed))
    except SampleFeedError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(to_json(posts), encoding="utf-8")
    for post in posts:
        print(
            f"{post['city']:8} {post['shape']:14} {post['route_m']:>6} m  "
            f"{post['user']:14} {post['title']}"
        )
    print(f"Wrote {args.out}: {len(posts)} drawings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
