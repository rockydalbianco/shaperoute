"""The review page of the big "Explore" catalogue (TASK-419, ADR-0347).

Usage (from the repository root, standard library only):

    python tools/catalog_review.py out/TASK-419/runs.jsonl --out out/review.html

One self-contained HTML page: every drawn candidate of the run logs as a
card, city by city, with a thumbnail drawn in SVG from its own points
(projected to metres around the start: no map tiles, it opens from
``file://`` without the network and shows a thousand drawings at once), its
measures, why the automatic filter leaves it out when it does, and a "keep"
box ticked for the preselection (`catalog_seed.preselect`). The user ticks
what stays; "Copy kept keys" gives the JSON for `tools/catalog_kept.json`.
A card's "map" link opens the route on OpenStreetMap, for the doubts.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from collections.abc import Sequence
from pathlib import Path

from catalog_seed import (
    Run,
    big_roads,
    distance_off,
    drawn,
    local_xy,
    name_of,
    preselect,
    read_kept,
    read_logs,
    reasons,
    score,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "out" / "TASK-419" / "review.html"

THUMB_PX = 150
THUMB_PAD_PX = 6
# Coordinates in the SVG to a tenth of a pixel: enough, and the page stays small.
SVG_DECIMALS = 1
# A thumbnail of 150 px needs no more points than this: a route of 21 km has
# a thousand, and a page of a thousand routes would weigh ten megabytes.
THUMB_POINTS = 160

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; color: #222; background: #f6f6f4;
         font: 14px/1.4 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  header { position: sticky; top: 0; z-index: 2; background: #fff;
           border-bottom: 1px solid #ddd; padding: 10px 16px;
           display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  header h1 { font-size: 16px; margin: 0 8px 0 0; }
  header .count { font-weight: 600; }
  header label { white-space: nowrap; }
  header button { padding: 4px 10px; }
  main { padding: 8px 16px 40px; }
  h2 { font-size: 15px; margin: 22px 0 8px; display: flex; gap: 10px;
       align-items: baseline; }
  h2 .sub { color: #666; font-weight: normal; font-size: 13px; }
  .grid { display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
  .card { background: #fff; border: 1px solid #ddd; border-radius: 6px;
          padding: 6px; display: flex; flex-direction: column; gap: 4px; }
  .card.kept { border-color: #2a7; box-shadow: 0 0 0 2px #2a7 inset; }
  .card.rejected { opacity: 0.75; }
  .card.rejected.kept { opacity: 1; }
  body.hide-rejected .card.rejected:not(.kept) { display: none; }
  .card svg { width: 100%; height: auto; display: block; background: #fafaf8;
              border-radius: 4px; }
  .card .line { stroke: #1b4f9c; stroke-width: 1.6; fill: none;
                stroke-linejoin: round; }
  .card .start { fill: #e0401b; }
  .card .name { font-weight: 600; }
  .card .meta { color: #555; font-size: 12px; }
  .card .why { color: #b03a2e; font-size: 12px; }
  .card .src { color: #888; font-size: 11px; }
  .card label { display: flex; gap: 6px; align-items: center; margin-top: auto; }
  .card a { color: #1b4f9c; font-size: 12px; }
  #kept-json { width: 100%; height: 90px; font: 12px monospace; display: none;
               margin-top: 8px; }
  #kept-json.shown { display: block; }
</style>
</head>
<body class="hide-rejected">
<header>
  <h1>__TITLE__</h1>
  <span><span class="count" id="kept-count">0</span> kept of
    <span id="cards-count">0</span> candidates</span>
  <label><input type="checkbox" id="show-rejected"> show the rejected too</label>
  <button id="reset">Back to the preselection</button>
  <button id="copy">Copy kept keys</button>
  <span id="copied"></span>
</header>
<main>
<div id="cities"></div>
<textarea id="kept-json" readonly></textarea>
</main>
<script type="application/json" id="cards">__CARDS_JSON__</script>
<script>
  const cards = JSON.parse(document.getElementById("cards").textContent);
  const kept = new Set(cards.filter(c => c.preselected).map(c => c.key));
  const byCity = new Map();
  for (const c of cards) {
    if (!byCity.has(c.city)) byCity.set(c.city, []);
    byCity.get(c.city).push(c);
  }
  const root = document.getElementById("cities");
  for (const [city, mine] of byCity) {
    const h = document.createElement("h2");
    h.innerHTML = '<span class="city"></span><span class="sub"></span>';
    h.querySelector(".city").textContent = city;
    h.querySelector(".sub").textContent = mine.length + " candidates, "
      + mine.filter(c => c.reasons.length === 0).length + " pass the filter";
    root.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const c of mine) grid.appendChild(card(c));
    root.appendChild(grid);
  }
  function card(c) {
    const div = document.createElement("div");
    div.className = "card" + (c.reasons.length ? " rejected" : "");
    div.dataset.key = c.key;
    div.innerHTML = c.svg
      + '<div class="name"></div><div class="meta"></div><div class="why"></div>'
      + '<div class="src"></div><label><input type="checkbox"> keep</label>'
      + '<a target="_blank" rel="noopener"></a>';
    div.querySelector(".name").textContent =
      c.name + " \\u00b7 " + c.distance_km + " km";
    div.querySelector(".meta").textContent = c.meta;
    div.querySelector(".why").textContent = c.reasons.join("; ");
    div.querySelector(".src").textContent = c.key + " \\u00b7 " + c.source;
    const a = div.querySelector("a");
    a.href = c.map_url; a.textContent = "map";
    const box = div.querySelector("input");
    box.checked = kept.has(c.key);
    div.classList.toggle("kept", box.checked);
    box.addEventListener("change", () => {
      if (box.checked) kept.add(c.key); else kept.delete(c.key);
      div.classList.toggle("kept", box.checked);
      update();
    });
    return div;
  }
  function update() {
    document.getElementById("kept-count").textContent = kept.size;
    document.getElementById("cards-count").textContent = cards.length;
    const area = document.getElementById("kept-json");
    const keys = cards.map(c => c.key).filter(k => kept.has(k));
    area.value = JSON.stringify({ kept: keys }, null, 1);
  }
  document.getElementById("show-rejected").addEventListener("change", e => {
    document.body.classList.toggle("hide-rejected", !e.target.checked);
  });
  document.getElementById("reset").addEventListener("click", () => {
    kept.clear();
    for (const c of cards) if (c.preselected) kept.add(c.key);
    for (const div of document.querySelectorAll(".card")) {
      const on = kept.has(div.dataset.key);
      div.querySelector("input").checked = on;
      div.classList.toggle("kept", on);
    }
    update();
  });
  document.getElementById("copy").addEventListener("click", async () => {
    const area = document.getElementById("kept-json");
    area.classList.add("shown");
    area.select();
    let said = "shown below";
    try {
      await navigator.clipboard.writeText(area.value);
      said = "copied";
    } catch (e) {}
    document.getElementById("copied").textContent = said + " (" + kept.size + " keys)";
  });
  update();
</script>
</body>
</html>
"""


def thinned(
    points: Sequence[tuple[float, float]], size: int = THUMB_POINTS
) -> list[tuple[float, float]]:
    """At most `size` of the points, evenly spread by index, the first and
    the last kept (as the API's preview, recommended.py)."""
    if len(points) <= size:
        return list(points)
    step = (len(points) - 1) / (size - 1)
    return [points[round(i * step)] for i in range(size)]


def thumbnail(points: Sequence[tuple[float, float]], size: int = THUMB_PX) -> str:
    """The route as one SVG polyline in a `size` square, north up, the
    start marked: its points, thinned, in metres around the first one,
    scaled to fit."""
    points = thinned(points)
    xy = local_xy(points[0], points)
    xs, ys = [p[0] for p in xy], [p[1] for p in xy]
    span = max(max(xs) - min(xs), max(ys) - min(ys), 1.0)
    inner = size - 2 * THUMB_PAD_PX
    k = inner / span
    ox = THUMB_PAD_PX + (inner - (max(xs) - min(xs)) * k) / 2 - min(xs) * k
    oy = THUMB_PAD_PX + (inner - (max(ys) - min(ys)) * k) / 2 + max(ys) * k
    coords = " ".join(
        f"{x * k + ox:.{SVG_DECIMALS}f},{oy - y * k:.{SVG_DECIMALS}f}" for x, y in xy
    )
    sx, sy = xy[0]
    return (
        f'<svg viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">'
        f'<polyline class="line" points="{coords}"/>'
        f'<circle class="start" cx="{sx * k + ox:.{SVG_DECIMALS}f}" '
        f'cy="{oy - sy * k:.{SVG_DECIMALS}f}" r="3"/></svg>'
    )


def map_url(points: Sequence[tuple[float, float]]) -> str:
    lat, lon = points[0]
    return f"https://www.openstreetmap.org/?mlat={lat:.5f}&mlon={lon:.5f}#map=15/{lat:.5f}/{lon:.5f}"


def card_data(run: Run, preselected: bool) -> dict[str, object]:
    """What the page needs for one drawn candidate."""
    name = name_of(run)
    if "word" in run:
        name = f"{name} ({run['style']})"
    extra = run.get("extra_doubled")
    big = big_roads(run)
    meta = (
        f"sim {run['similarity']:.2f} · {run['route_m'] / 1000:.1f} km "
        f"({distance_off(run):+.0%}) · retraced "
        f"{'?' if extra is None else f'{extra:.0%}'} · big roads "
        f"{'?' if big is None else f'{big:.0%}'} · score {score(run):.2f}"
    )
    return {
        "key": run["key"],
        "city": run["city"],
        "name": name,
        "distance_km": run["distance_m"] // 1000,
        "meta": meta,
        "reasons": reasons(run),
        "source": str(run.get("source", "")),
        "preselected": preselected,
        "svg": thumbnail([tuple(p) for p in run["points"]]),
        "map_url": map_url(run["points"]),
    }


def cards(runs: Sequence[Run], kept: Sequence[str]) -> list[dict[str, object]]:
    """The drawn runs, city by city, the best score first."""
    kept_set = set(kept)
    mine = sorted(
        (r for r in runs if drawn(r)), key=lambda r: (r["city"], -score(r), r["key"])
    )
    return [card_data(r, r["key"] in kept_set) for r in mine]


def embed_json(data: object) -> str:
    """JSON safe inside a <script> block (as preview_samples.embed_json)."""
    return json.dumps(data, separators=(",", ":")).replace("</", "<\\/")


def render_page(runs: Sequence[Run], kept: Sequence[str], title: str) -> str:
    return PAGE_TEMPLATE.replace("__TITLE__", html.escape(title)).replace(
        "__CARDS_JSON__", embed_json(cards(runs, kept))
    )


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python tools/catalog_review.py",
        description="The review page of the big Explore catalogue (TASK-419).",
    )
    p.add_argument("logs", nargs="+", type=Path, help="run logs (JSON lines)")
    p.add_argument("--kept", type=Path, help="keys to tick instead of the preselection")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--title", default="Explore catalogue — review (TASK-419)")
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    runs = read_logs(args.logs)
    kept = read_kept(args.kept) if args.kept else preselect(runs)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(render_page(runs, kept, args.title), encoding="utf-8")
    shown = sum(drawn(r) for r in runs)
    print(f"{args.out}: {shown} candidates, {len(kept)} ticked", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
