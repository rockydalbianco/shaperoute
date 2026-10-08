"""Draw the shirt prints of the website from real catalogue routes.

Each print is one route of ``catalog/seed/<city>.json`` (planned by the Route
Engine on OpenStreetMap data), projected to metres and drawn as a single line
with its start dot and a caption. Nothing is invented here: the script only
turns coordinates that already exist into an SVG.

Run from the repository root, standard library only::

    python3 site/tools/make_prints.py

It rewrites ``site/prints/*.svg``, the MuW brand files in ``site/assets/``
(from ``docs/brand/``, ADR-0224) and the
drawing between the two ``hero-route`` comments of ``site/index.html``. The
output is deterministic: the same catalogue gives the same files.
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CATALOG = REPO / "catalog" / "seed"
BRAND = REPO / "docs" / "brand"
SITE = REPO / "site"

EARTH_RADIUS_M = 6_371_008.8

# The two inks of the shop, the brand's yellow and black (`tokens.ts`).
INK = {"yellow": "#FFD02B", "black": "#0A0A0B"}
# The ink of `docs/brand/muw-logo.svg` (`onAccent`), and the app's `text`.
BRAND_INK = "#0A0A0B"
TEXT = "#F5F5F4"

BOX = 1000.0  # side of the square the route is fitted into
PADDING = 70.0
STROKE = 13.0
CAPTION_HEIGHT = 170.0


@dataclass(frozen=True)
class Print:
    """One print: which route it shows and in which ink."""

    name: str
    city: str
    city_label: str
    shape: str
    distance_m: int
    ink: str


PRINTS = (
    Print("milano-heart", "milano", "MILANO", "heart", 10000, "yellow"),
    Print("torino-snail", "torino", "TORINO", "snail", 21000, "black"),
    Print("trento-star", "trento", "TRENTO", "star", 5000, "yellow"),
)

HERO = Print("hero-route", "milano", "MILANO", "heart", 10000, "yellow")


def load_route(city: str, shape: str, distance_m: int) -> dict:
    """The catalogue's route for a shape and a target distance."""
    catalog = json.loads((CATALOG / f"{city}.json").read_text(encoding="utf-8"))
    for route in catalog["routes"]:
        if route.get("shape") == shape and route["distance_m"] == distance_m:
            return route
    raise LookupError(f"no {shape} of {distance_m} m in {city}.json")


def project(points: list[list[float]]) -> list[tuple[float, float]]:
    """(lat, lon) in degrees → (x east, y north) in metres around the centre.

    An equirectangular projection on the route's own mean latitude: over the
    few kilometres of a route the error is far below the width of the line.
    """
    lat0 = sum(lat for lat, _ in points) / len(points)
    lon0 = sum(lon for _, lon in points) / len(points)
    k = math.cos(math.radians(lat0))
    return [
        (
            math.radians(lon - lon0) * k * EARTH_RADIUS_M,
            math.radians(lat - lat0) * EARTH_RADIUS_M,
        )
        for lat, lon in points
    ]


def fit(metres: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Scale the route into the padded box, north up, centred."""
    xs = [x for x, _ in metres]
    ys = [y for _, y in metres]
    width = max(xs) - min(xs)
    height = max(ys) - min(ys)
    scale = (BOX - 2 * PADDING) / max(width, height)
    left = (BOX - width * scale) / 2
    top = (BOX - height * scale) / 2
    return [
        (left + (x - min(xs)) * scale, top + (max(ys) - y) * scale) for x, y in metres
    ]


def path_data(fitted: list[tuple[float, float]]) -> str:
    """SVG path through the points, one decimal, consecutive duplicates dropped."""
    rounded: list[tuple[float, float]] = []
    for x, y in fitted:
        point = (round(x, 1), round(y, 1))
        if not rounded or rounded[-1] != point:
            rounded.append(point)
    head, *tail = rounded
    return f"M{head[0]:g} {head[1]:g}" + "".join(f"L{x:g} {y:g}" for x, y in tail)


def caption(print_: Print, route: dict) -> str:
    """«MILANO · 10.1 KM», from the length the engine measured."""
    return f"{print_.city_label} · {route['route_m'] / 1000:.1f} KM"


def route_svg(print_: Print) -> str:
    """The print: the route, its start dot and the caption."""
    route = load_route(print_.city, print_.shape, print_.distance_m)
    fitted = fit(project(route["points"]))
    ink = INK[print_.ink]
    start_x, start_y = fitted[0]
    label = caption(print_, route)
    title = f"{print_.shape.capitalize()} route, {label}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {BOX:g} {BOX + CAPTION_HEIGHT:g}" role="img" '
        f'aria-label="{title}">\n'
        f"  <title>{title}</title>\n"
        f'  <path d="{path_data(fitted)}" fill="none" stroke="{ink}" '
        f'stroke-width="{STROKE:g}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'  <circle cx="{start_x:.1f}" cy="{start_y:.1f}" r="{STROKE * 1.5:g}" '
        f'fill="{ink}"/>\n'
        f'  <text x="{BOX / 2:g}" y="{BOX + 95:g}" text-anchor="middle" fill="{ink}" '
        f'font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="64" '
        f'font-weight="700" letter-spacing="14">{label}</text>\n'
        "</svg>\n"
    )


def hero_markup(print_: Print, indent: str) -> str:
    """The route of the top of the page, as markup for `index.html`.

    It sits in the page, not in an image, because the page's stylesheet draws
    it: colours and the animation are in `styles.css`.
    """
    route = load_route(print_.city, print_.shape, print_.distance_m)
    fitted = fit(project(route["points"]))
    start_x, start_y = fitted[0]
    lines = [
        f'<svg class="hero__drawing" data-try-drawing viewBox="0 0 {BOX:g} {BOX:g}" '
        'role="img" '
        f'aria-label="A {print_.shape} drawn by a running route on the streets of '
        f'{print_.city_label.capitalize()}">',
        f'  <path class="hero__line" pathLength="1" d="{path_data(fitted)}" />',
        f'  <circle class="hero__start" cx="{start_x:.1f}" cy="{start_y:.1f}" '
        f'r="{STROKE * 1.5:g}" />',
        "</svg>",
    ]
    return "".join(f"{indent}{line}\n" for line in lines)


def write_hero(print_: Print) -> None:
    """Put the route between the two `hero-route` comments of the page."""
    page = SITE / "index.html"
    html = page.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(?P<indent>[ \t]*)<!-- hero-route:.*?-->\n.*?[ \t]*<!-- /hero-route -->\n",
        re.DOTALL,
    )
    match = pattern.search(html)
    if match is None:
        raise LookupError("index.html has no hero-route comments")
    indent = match["indent"]
    block = (
        f"{indent}<!-- hero-route: written by site/tools/make_prints.py -->\n"
        f"{hero_markup(print_, indent)}"
        f"{indent}<!-- /hero-route -->\n"
    )
    html = html[: match.start()] + block + html[match.end() :]
    page.write_text(html, encoding="utf-8")


def logo_svg(ink: str) -> str:
    """The brand's wordmark (`docs/brand/muw-logo.svg`) in one of the shop's inks."""
    logo = (BRAND / "muw-logo.svg").read_text(encoding="utf-8")
    return logo.replace(BRAND_INK, INK[ink])


def site_logo_svg() -> str:
    """The wordmark for the page's dark background: the app's text colour."""
    logo = (BRAND / "muw-logo.svg").read_text(encoding="utf-8")
    return logo.replace(BRAND_INK, TEXT)


def main() -> None:
    (SITE / "prints").mkdir(parents=True, exist_ok=True)
    (SITE / "assets").mkdir(parents=True, exist_ok=True)
    for print_ in PRINTS:
        (SITE / "prints" / f"{print_.name}.svg").write_text(
            route_svg(print_), encoding="utf-8"
        )
    (SITE / "prints" / "logo-black.svg").write_text(logo_svg("black"), encoding="utf-8")
    write_hero(HERO)
    (SITE / "assets" / "muw-logo.svg").write_text(site_logo_svg(), encoding="utf-8")
    (SITE / "assets" / "muw-mark.svg").write_text(
        (BRAND / "muw-mark.svg").read_text(encoding="utf-8"), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
