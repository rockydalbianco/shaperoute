"""Show sample GPX tracks turned as the app shows them (TASK-232).

Usage (from the repository root):

    python tools/preview_turned.py "samples/TASK-232_*.gpx"

The engine may tilt a shape up to 45°, and the app turns the map back by
its `rotation_deg` so the drawing reads upright (ADR-0195). A GPX has only
the coordinates: the rotation of each sample is in
``samples/<task>_rotations.json`` (file name without ``.gpx`` → degrees
counterclockwise; a sample not listed is upright).

The page shows one case at a time: the versions of the same case
(``…_v1.gpx``, ``…_v2.gpx``) side by side, each on its own map turned by
``-rotation_deg`` (a MapLibre bearing), with a list of the cases and the
arrow keys to move between them. MapLibre and the OpenStreetMap tiles come
from the network, as Leaflet's do for ``preview_samples.py`` (ADR-0024).

Standard library only, like ``preview_samples.py``, whose GPX reader it
uses.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections.abc import Sequence
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from preview_samples import (  # noqa: E402
    COORD_DECIMALS,
    REPO_ROOT,
    PreviewError,
    Track,
    embed_json,
    expand_patterns,
    read_track,
)

DEFAULT_OUT = REPO_ROOT / "out" / "turned.html"

MAPLIBRE_CSS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
MAPLIBRE_CSS_SRI = (
    "sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V"
)
MAPLIBRE_JS_URL = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
MAPLIBRE_JS_SRI = (
    "sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj"
)

# A sample's case is its name without the version: TASK-232_heart_15km_levico.
VERSION = re.compile(r"^(?P<case>.+)_(?P<version>v\d+)$")

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<link rel="stylesheet" href="__MAPLIBRE_CSS_URL__"
  integrity="__MAPLIBRE_CSS_SRI__" crossorigin="">
<script src="__MAPLIBRE_JS_URL__"
  integrity="__MAPLIBRE_JS_SRI__" crossorigin=""></script>
<style>
  html, body { height: 100%; margin: 0; font: 14px system-ui, sans-serif; }
  body { display: flex; flex-direction: column; background: #fff; color: #222; }
  header { display: flex; gap: 12px; align-items: center; padding: 8px 12px;
           border-bottom: 1px solid #ddd; flex-wrap: wrap; }
  header select { font: inherit; max-width: 100%; }
  #maps { flex: 1; display: grid; gap: 8px; padding: 8px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  .pane { display: flex; flex-direction: column; min-height: 320px; }
  .pane h2 { font-size: 14px; margin: 0 0 4px; font-weight: 600; }
  .pane .note { color: #555; font-weight: 400; }
  .map { flex: 1; border: 1px solid #ccc; border-radius: 6px; }
</style>
</head>
<body>
<header>
  <button id="prev" aria-label="Previous case">&larr;</button>
  <select id="cases" aria-label="Case"></select>
  <button id="next" aria-label="Next case">&rarr;</button>
  <span id="count"></span>
</header>
<div id="maps"></div>
<script type="application/json" id="data">__DATA_JSON__</script>
<script>
  const cases = JSON.parse(document.getElementById("data").textContent);
  const select = document.getElementById("cases");
  const panes = document.getElementById("maps");
  let maps = [];
  cases.forEach((c, i) => select.add(new Option(c.name, String(i))));

  function style() {
    return {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    };
  }

  function show(index) {
    maps.forEach((m) => m.remove());
    maps = [];
    panes.textContent = "";
    select.value = String(index);
    document.getElementById("count").textContent =
      (index + 1) + " / " + cases.length;
    for (const sample of cases[index].samples) {
      const pane = document.createElement("div");
      pane.className = "pane";
      const title = document.createElement("h2");
      title.textContent = sample.version + " ";
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = sample.note;
      title.append(note);
      const box = document.createElement("div");
      box.className = "map";
      pane.append(title, box);
      panes.append(pane);
      const coords = sample.points.map(([lat, lon]) => [lon, lat]);
      const bounds = coords.reduce(
        (b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
      const bearing = -sample.rotation_deg;
      const map = new maplibregl.Map({
        container: box, style: style(), bearing, attributionControl: {},
      });
      map.addControl(new maplibregl.NavigationControl({ showZoom: false }));
      const camera = map.cameraForBounds(bounds, { padding: 30, bearing });
      if (camera) map.jumpTo({ ...camera, bearing });
      map.on("load", () => {
        map.addSource("route", { type: "geojson", data: {
          type: "Feature", geometry: { type: "LineString", coordinates: coords },
        } });
        map.addLayer({ id: "route", type: "line", source: "route",
          paint: { "line-color": "#e41a1c", "line-width": 3 } });
        map.addSource("start", { type: "geojson", data: {
          type: "Feature", geometry: { type: "Point", coordinates: coords[0] },
        } });
        map.addLayer({ id: "start", type: "circle", source: "start",
          paint: { "circle-radius": 5, "circle-color": "#fff",
                   "circle-stroke-color": "#e41a1c", "circle-stroke-width": 2 } });
      });
      maps.push(map);
    }
  }

  const step = (by) =>
    show((Number(select.value) + by + cases.length) % cases.length);
  select.addEventListener("change", () => show(Number(select.value)));
  document.getElementById("prev").addEventListener("click", () => step(-1));
  document.getElementById("next").addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (e.target === select) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  if (cases.length) show(0);
</script>
</body>
</html>
"""


def read_rotations(path: Path | None) -> dict[str, float]:
    """Sample name (no ``.gpx``) → rotation in degrees; empty without a file."""
    if path is None or not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PreviewError(f"{path}: not JSON ({exc.msg})") from None
    if not isinstance(data, dict) or not all(
        isinstance(v, int | float) and -180.0 <= v <= 180.0 for v in data.values()
    ):
        raise PreviewError(f"{path}: expected {{sample: degrees in [-180, 180]}}")
    return {str(k): float(v) for k, v in data.items()}


def case_data(
    tracks: Sequence[Track], rotations: dict[str, float]
) -> list[dict[str, object]]:
    """The cases, in the order their first sample came, each with its
    versions in order: what the page needs, JSON-ready."""
    cases: dict[str, list[dict[str, object]]] = {}
    for track in tracks:
        match = VERSION.match(track.name)
        case, version = (match["case"], match["version"]) if match else (track.name, "")
        rotation = rotations.get(track.name, 0.0)
        turned = f"turned {rotation:+.0f}°" if rotation else "north up"
        cases.setdefault(case, []).append(
            {
                "version": version or track.name,
                "rotation_deg": rotation,
                "note": f"{track.summary} · {turned}",
                "points": [
                    [round(lat, COORD_DECIMALS), round(lon, COORD_DECIMALS)]
                    for lat, lon in track.points
                ],
            }
        )
    for samples in cases.values():
        samples.sort(key=lambda s: _version_number(str(s["version"])))
    return [{"name": name, "samples": samples} for name, samples in cases.items()]


def _version_number(version: str) -> int:
    return int(version[1:]) if re.fullmatch(r"v\d+", version) else 0


def render_page(cases: list[dict[str, object]], title: str) -> str:
    """The whole HTML page. Same input, same output."""
    replacements = {
        "__TITLE__": html.escape(title),
        "__MAPLIBRE_CSS_URL__": MAPLIBRE_CSS_URL,
        "__MAPLIBRE_CSS_SRI__": MAPLIBRE_CSS_SRI,
        "__MAPLIBRE_JS_URL__": MAPLIBRE_JS_URL,
        "__MAPLIBRE_JS_SRI__": MAPLIBRE_JS_SRI,
        "__DATA_JSON__": embed_json(cases),
    }
    page = PAGE_TEMPLATE
    for placeholder, value in replacements.items():
        page = page.replace(placeholder, value)
    return page


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python tools/preview_turned.py",
        description="Show GPX samples on maps turned as the app turns them.",
    )
    parser.add_argument(
        "patterns",
        nargs="+",
        metavar="PATTERN",
        help='GPX files or glob patterns, e.g. "samples/TASK-232_*.gpx"',
    )
    parser.add_argument(
        "--rotations",
        type=Path,
        help="JSON of sample name → degrees (default: <task>_rotations.json "
        "next to the first sample)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="HTML file to write, overwritten if present (default: out/turned.html)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        paths = expand_patterns(args.patterns)
        rotations_path = args.rotations
        if rotations_path is None and paths:
            task = paths[0].name.split("_", 1)[0]
            rotations_path = paths[0].parent / f"{task}_rotations.json"
        rotations = read_rotations(rotations_path)
        tracks = [read_track(path) for path in paths]
    except PreviewError as exc:
        print(f"preview_turned: error: {exc}", file=sys.stderr)
        return 2
    cases = case_data(tracks, rotations)
    out: Path = args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    page = render_page(cases, title="Turned: " + " ".join(args.patterns))
    out.write_text(page, encoding="utf-8", newline="\n")
    print(f"{len(cases)} cases, {len(tracks)} tracks -> {out.resolve().as_uri()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
