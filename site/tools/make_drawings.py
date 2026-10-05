"""Collect the drawings the website shows, from routes that already exist.

Two sets, written to ``site/data/drawings.js``:

* the routes of the «Try it» panel: one city of ``catalog/seed/``, a few
  shapes, three distances;
* the ten drawings of «Best drawings»: runs of the app's sample feed
  (``apps/mobile/src/feed/sampleFeed.json``) and paddled examples that ship
  with the app (``apps/mobile/src/paddle/paddleExamples.json``).

Every line was planned by the Route Engine on OpenStreetMap data; here it is
only projected to metres, thinned and fitted to a square. The app's files are
read, never written. Run from the repository root, standard library only::

    python3 site/tools/make_drawings.py
"""

from __future__ import annotations

import json
import math

from make_prints import BOX, REPO, SITE, fit, load_route, path_data, project

FEED = REPO / "apps" / "mobile" / "src" / "feed" / "sampleFeed.json"
PADDLE = REPO / "apps" / "mobile" / "src" / "paddle" / "paddleExamples.json"

# Points closer than this to the line through their neighbours are dropped:
# well under the width of the drawn line at any size the site shows.
THIN_M = 2.5

TRY_CITY = ("milano", "Milano")
TRY_SHAPES = (
    ("heart", "Heart"),
    ("star", "Star"),
    ("cat", "Cat"),
    ("horse", "Horse"),
    ("snail", "Snail"),
    ("butterfly", "Butterfly"),
)
TRY_DISTANCES_M = (5000, 10000, 21000)

# The runs: ids of the sample feed. The paddled ones: (place, shape, title),
# the same four the app's Feed shows (`paddlePosts.ts`).
RUN_POSTS = (
    "firenze-horse-10000-0",
    "milano-rabbit_head-21000-4",
    "torino-cat-10000-8",
    "roma-butterfly-21000-11",
    "trento-star-5000-0",
    "bologna-moon-5000-0",
)
PADDLE_POSTS = (
    ("Lago di Garda", "heart", "A heart on Lake Garda"),
    ("Lago di Como", "star", "Star off the lakefront"),
    ("Jesolo", "moon", "Morning moon off Jesolo"),
    ("Riccione", "dog_head", "Dog paddle off Riccione"),
)
# Runs and paddles alternate on the page, the runs first.
POST_ORDER = (0, 6, 1, 2, 7, 3, 4, 8, 5, 9)

CITY_LABELS = {
    "firenze": "Firenze",
    "milano": "Milano",
    "torino": "Torino",
    "roma": "Roma",
    "trento": "Trento",
    "bologna": "Bologna",
}

Point = tuple[float, float]


def thin(points: list[Point], tolerance_m: float = THIN_M) -> list[Point]:
    """Ramer–Douglas–Peucker on metres: the same line with fewer points."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        (x1, y1), (x2, y2) = points[first], points[last]
        length = math.hypot(x2 - x1, y2 - y1)
        worst, worst_distance = -1, tolerance_m
        for index in range(first + 1, last):
            x, y = points[index]
            if length == 0:
                distance = math.hypot(x - x1, y - y1)
            else:
                distance = abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / length
            if distance > worst_distance:
                worst, worst_distance = index, distance
        if worst != -1:
            keep[worst] = True
            stack.append((first, worst))
            stack.append((worst, last))
    return [point for point, kept in zip(points, keep, strict=True) if kept]


def drawing(points: list[list[float]]) -> dict[str, object]:
    """(lat, lon) points → the path and the start dot in the site's square."""
    fitted = fit(thin(project(points)))
    start_x, start_y = fitted[0]
    return {"d": path_data(fitted), "start": [round(start_x, 1), round(start_y, 1)]}


def km(route_m: float) -> float:
    return round(route_m / 1000, 1)


def try_routes() -> dict[str, object]:
    """The routes of «Try it», keyed «shape-distance»."""
    city, label = TRY_CITY
    routes = {}
    for shape, _ in TRY_SHAPES:
        for distance_m in TRY_DISTANCES_M:
            route = load_route(city, shape, distance_m)
            routes[f"{shape}-{distance_m}"] = {
                "km": km(route["route_m"]),
                **drawing(route["points"]),
            }
    return {
        "city": label,
        "shapes": [{"id": shape, "label": name} for shape, name in TRY_SHAPES],
        "distances": [distance_m // 1000 for distance_m in TRY_DISTANCES_M],
        "routes": routes,
    }


def run_posts() -> list[dict[str, object]]:
    feed = {post["id"]: post for post in json.loads(FEED.read_text(encoding="utf-8"))}
    posts = []
    for post_id in RUN_POSTS:
        post = feed[post_id]
        posts.append(
            {
                "id": post_id,
                "sport": "run",
                "title": post["title"],
                "place": CITY_LABELS[post["city"]],
                "km": km(post["route_m"]),
                **drawing(post["line"]),
            }
        )
    return posts


def paddle_posts() -> list[dict[str, object]]:
    examples = json.loads(PADDLE.read_text(encoding="utf-8"))["examples"]
    by_place = {routes[0]["city"]: routes for routes in examples.values()}
    posts = []
    for place, shape, title in PADDLE_POSTS:
        route = next(item for item in by_place[place] if item["shape"] == shape)
        posts.append(
            {
                "id": f"paddle-{place.lower().replace(' ', '-')}-{shape}",
                "sport": "paddle",
                "title": title,
                "place": place,
                "km": km(route["route_m"]),
                **drawing(route["points"]),
            }
        )
    return posts


def main() -> None:
    posts = run_posts() + paddle_posts()
    posts = [posts[index] for index in POST_ORDER]
    lines = [
        "// Written by site/tools/make_drawings.py: do not edit by hand.",
        "// Routes on OpenStreetMap data, (c) OpenStreetMap contributors.",
        f"export const box = {BOX:g};",
        "export const tryIt = "
        + json.dumps(try_routes(), ensure_ascii=False, separators=(",", ":"))
        + ";",
        "export const posts = "
        + json.dumps(posts, ensure_ascii=False, separators=(",", ":"))
        + ";",
    ]
    (SITE / "data").mkdir(parents=True, exist_ok=True)
    (SITE / "data" / "drawings.js").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
