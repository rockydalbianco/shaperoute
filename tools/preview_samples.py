"""Show sample GPX tracks on one self-contained HTML map page.

Usage (from the repository root):

    python tools/preview_samples.py "samples/TASK-017_*_v1.gpx"

Every matching file becomes one layer that can be switched on and off, labelled
with its name, distance and number of points. The tracks are embedded in the
page as JSON, so it opens from ``file://`` without a server; Leaflet and the
OpenStreetMap tiles come from the network (ADR-0024).

Standard library only: it runs with any Python 3.11+, without the route-engine
virtual environment, and it does not import the route-engine.
"""

from __future__ import annotations

import argparse
import glob
import html
import json
import math
import sys
import xml.etree.ElementTree as ET
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

LatLon = tuple[float, float]

GPX_NAMESPACE = "http://www.topografix.com/GPX/1/1"
# Same radius as route_engine/geo.py, so distances match the ones the CLI prints.
EARTH_RADIUS_M = 6_371_000.0
# GPX files written by the route-engine carry 7 decimals (about 1 cm).
COORD_DECIMALS = 7

REPO_ROOT = Path(__file__).resolve().parent.parent
# out/ is git-ignored: the page is disposable and rebuilt from versioned GPX.
DEFAULT_OUT = REPO_ROOT / "out" / "preview.html"

LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
LEAFLET_CSS_SRI = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
LEAFLET_JS_SRI = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="

# One colour per layer, in file order; repeats after twelve files.
PALETTE = (
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#a65628",
    "#f781bf",
    "#333333",
    "#1b9e77",
    "#e7298a",
    "#66a61e",
    "#1f2a7a",
)

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<link rel="stylesheet" href="__LEAFLET_CSS_URL__"
  integrity="__LEAFLET_CSS_SRI__" crossorigin="">
<script src="__LEAFLET_JS_URL__"
  integrity="__LEAFLET_JS_SRI__" crossorigin=""></script>
<style>
  html, body, #map { height: 100%; margin: 0; }
  .leaflet-control-layers-overlays label { white-space: nowrap; }
  .swatch { display: inline-block; width: 0.9em; height: 0.9em;
            margin-right: 0.3em; vertical-align: -0.1em; }
  .summary { color: #555; }
</style>
</head>
<body>
<div id="map"></div>
<script type="application/json" id="tracks">__TRACKS_JSON__</script>
<script>
  const tracks = JSON.parse(document.getElementById("tracks").textContent);
  const map = L.map("map");
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">'
      + "OpenStreetMap</a> contributors",
  }).addTo(map);

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  const overlays = {};
  const bounds = L.latLngBounds([]);
  for (const track of tracks) {
    const text = track.name + " \\u00b7 " + track.summary;
    const line = L.polyline(track.points, {
      color: track.color, weight: 3, opacity: 0.85,
    }).bindTooltip(escapeHtml(text), { sticky: true });
    const start = L.circleMarker(track.points[0], {
      radius: 5, color: track.color, fillColor: "#ffffff", fillOpacity: 1,
    }).bindTooltip(escapeHtml("start \\u00b7 " + track.name));
    const label = '<span class="swatch" style="background:' + track.color
      + '"></span>' + escapeHtml(track.name)
      + ' <span class="summary">' + escapeHtml(track.summary) + "</span>";
    overlays[label] = L.layerGroup([line, start]).addTo(map);
    bounds.extend(line.getBounds());
  }
  L.control.layers(null, overlays, { collapsed: false }).addTo(map);
  map.fitBounds(bounds, { padding: [20, 20] });
</script>
</body>
</html>
"""


class PreviewError(Exception):
    """A problem with the input, reported as one line without a traceback."""


@dataclass(frozen=True)
class Track:
    """One GPX file: its name (the file stem) and its track points."""

    name: str
    points: tuple[LatLon, ...]

    @property
    def distance_m(self) -> float:
        return path_length_m(self.points)

    @property
    def summary(self) -> str:
        """Distance with one decimal, as in samples/LOG.md, and point count."""
        return f"{self.distance_m / 1000:.1f} km, {len(self.points)} points"


def haversine_m(a: LatLon, b: LatLon) -> float:
    """Great-circle distance in metres between two WGS84 points."""
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def path_length_m(points: Sequence[LatLon]) -> float:
    """Length in metres of a polyline of WGS84 points."""
    return sum(haversine_m(a, b) for a, b in zip(points, points[1:], strict=False))


def read_track(path: Path) -> Track:
    """Read the ``trkpt`` points of a GPX 1.1 file, in file order."""
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        raise PreviewError(f"{path}: not a valid GPX file ({exc})") from exc
    except OSError as exc:
        raise PreviewError(f"{path}: cannot read ({exc.strerror})") from exc
    points: list[LatLon] = []
    for trkpt in root.iter(f"{{{GPX_NAMESPACE}}}trkpt"):
        try:
            lat = float(trkpt.attrib["lat"])
            lon = float(trkpt.attrib["lon"])
        except (KeyError, ValueError) as exc:
            raise PreviewError(f"{path}: track point without valid lat/lon") from exc
        points.append((lat, lon))
    if not points:
        raise PreviewError(f"{path}: no GPX 1.1 track points")
    return Track(name=path.stem, points=tuple(points))


def expand_patterns(patterns: Sequence[str]) -> list[Path]:
    """Files matching the patterns, without duplicates, sorted by path.

    The script expands the patterns itself because PowerShell does not; when a
    shell has already expanded them, each argument is simply a file.
    """
    files: set[Path] = set()
    for pattern in patterns:
        if Path(pattern).is_file():
            files.add(Path(pattern))
            continue
        matches = [Path(m) for m in glob.glob(pattern) if Path(m).is_file()]
        if not matches:
            raise PreviewError(f"no file matches {pattern}")
        files.update(matches)
    return sorted(files, key=lambda p: p.as_posix())


def track_data(tracks: Sequence[Track]) -> list[dict[str, object]]:
    """What the page needs for each track, in a JSON-ready form."""
    return [
        {
            "name": track.name,
            "color": PALETTE[i % len(PALETTE)],
            "summary": track.summary,
            "points": [
                [round(lat, COORD_DECIMALS), round(lon, COORD_DECIMALS)]
                for lat, lon in track.points
            ],
        }
        for i, track in enumerate(tracks)
    ]


def embed_json(data: object) -> str:
    """JSON that is safe inside a ``<script>`` element.

    Writing every ``<`` as ``\\u003c`` means no string in the data can close
    the element (``</script>``) or open a comment; ``JSON.parse`` reads it back
    unchanged.
    """
    text = json.dumps(data, ensure_ascii=True, separators=(",", ":"))
    return text.replace("<", "\\u003c")


def render_page(tracks: Sequence[Track], title: str) -> str:
    """The whole HTML page. Same input, same output: no dates, no randomness."""
    replacements = {
        "__TITLE__": html.escape(title),
        "__LEAFLET_CSS_URL__": LEAFLET_CSS_URL,
        "__LEAFLET_CSS_SRI__": LEAFLET_CSS_SRI,
        "__LEAFLET_JS_URL__": LEAFLET_JS_URL,
        "__LEAFLET_JS_SRI__": LEAFLET_JS_SRI,
        "__TRACKS_JSON__": embed_json(track_data(tracks)),
    }
    page = PAGE_TEMPLATE
    for placeholder, value in replacements.items():
        page = page.replace(placeholder, value)
    return page


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python tools/preview_samples.py",
        description="Show GPX samples as switchable layers on one HTML map page.",
    )
    parser.add_argument(
        "patterns",
        nargs="+",
        metavar="PATTERN",
        help='GPX files or glob patterns, e.g. "samples/TASK-017_*_v1.gpx"',
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="HTML file to write, overwritten if present (default: out/preview.html)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        tracks = [read_track(path) for path in expand_patterns(args.patterns)]
    except PreviewError as exc:
        print(f"preview_samples: error: {exc}", file=sys.stderr)
        return 2
    out: Path = args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    page = render_page(tracks, title="Samples: " + " ".join(args.patterns))
    out.write_text(page, encoding="utf-8", newline="\n")
    print(f"{len(tracks)} tracks -> {out.resolve().as_uri()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
