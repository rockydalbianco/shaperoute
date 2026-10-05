"""The paddling examples the app comes with (TASK-227, ADR-0189): drawn by
the engine as the API draws a paddling route, written as the app keeps its
examples, under the key it reads them by.

No network: the water is the engine's hand-built lake
(make_water_fixtures.py), written in a cache folder as a download would
leave it. The app checks the file it ships against its own `asRecommended`
(apps/mobile/src/paddle/paddleExamples.test.ts).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from route_engine import water
from route_engine.geo import local_to_latlon
from route_engine.water import FileWaterSource, OverpassWaterSource

from shaperoute_api.paddle_examples import (
    ENGINE,
    LICENSE,
    OUT,
    SHAPES,
    WaterPlace,
    apart_on_water,
    engine_files,
    engine_fingerprint,
    examples,
    main,
    place_key,
    read_places,
)

REPO = Path(__file__).resolve().parents[3]
LAKE = REPO / "services/route-engine/tests/fixtures/water_lake.json"
LAKE_ORIGIN = (45.0, 10.0)
# Beside the lakeside road, as the engine's test_paddling.py.
LAKE_START = local_to_latlon(LAKE_ORIGIN, -700.0, 0.0)


def test_the_places_are_those_of_the_app() -> None:
    places = read_places()
    assert places == [
        WaterPlace("Lago di Garda", (45.88114, 10.84559)),
        WaterPlace("Lago di Como", (45.8132, 9.08029)),
        WaterPlace("Jesolo", (45.50137, 12.63925)),
        WaterPlace("Riccione", (44.00355, 12.66338)),
    ]


def test_a_place_s_key_is_the_app_s() -> None:
    assert place_key((45.88114, 10.84559)) == "paddling:45.8811,10.8456"
    assert place_key((44.00355, 12.66338)) == "paddling:44.0035,12.6634"
    assert SHAPES[:3] == ("heart", "circle", "star")
    assert len(SHAPES) == 8


def test_each_example_is_the_app_s_detail_of_a_paddling_route() -> None:
    place = WaterPlace("Lago di prova, Italia", LAKE_START)
    found = examples([place], FileWaterSource(LAKE), shapes=("heart", "circle"))
    key = place_key(LAKE_START)
    assert list(found) == [key]
    heart, circle = found[key]
    assert heart["id"] == f"example:heart:{key}"
    assert circle["id"] == f"example:circle:{key}"
    assert heart["city"] == "Lago di prova"
    assert {k: heart[k] for k in ("shape", "word", "style", "distance_m")} == {
        "shape": "heart",
        "word": None,
        "style": None,
        "distance_m": 2000,
    }
    assert heart["activity"] == "paddling"
    assert heart["alternatives"] == []
    assert heart["license"] == LICENSE
    assert heart["similarity"] == 1.0
    points = heart["points"]
    assert points[0] == points[-1]
    assert abs(heart["route_m"] - 2000) <= 200
    assert all(len(f"{v}".split(".")[1]) <= 6 for p in points for v in p)
    # Where the shape is, for «Move the shape» (TASK-244): inside its line.
    lat, lon = heart["centre"]
    assert min(p[0] for p in points) < lat < max(p[0] for p in points)
    assert min(p[1] for p in points) < lon < max(p[1] for p in points)
    assert all(len(f"{v}".split(".")[1]) <= 6 for v in heart["centre"])


def test_a_shape_in_pieces_is_drawn_piece_by_piece_but_the_sun() -> None:
    """As the app asks for it on the water (TASK-226, its apartOnWater)."""
    apart = [shape for shape in SHAPES if apart_on_water(shape)]
    assert apart == ["dog_head", "rabbit_head"]
    assert apart_on_water("cat") and apart_on_water("donut")
    assert not apart_on_water("sun") and not apart_on_water("heart")
    place = WaterPlace("Lago di prova", LAKE_START)
    found = examples([place], FileWaterSource(LAKE), shapes=("heart", "dog_head"))
    heart, dog = found[place_key(LAKE_START)]
    assert "walks" not in heart
    # To each eye and back to the outline, each stretch two points.
    assert len(dog["walks"]) == 3
    assert all(b == a + 1 for a, b in dog["walks"])
    assert dog["points"][0] == dog["points"][-1]
    assert abs(dog["route_m"] - 2000) <= 200


def test_the_command_writes_every_place_from_the_cache(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    places = tmp_path / "waterPlaces.ts"
    places.write_text(
        "export const WATER_PLACES = [\n"
        f'  {{ name: "Lago di prova", from: "x", point: [{LAKE_START[0]}, '
        f"{LAKE_START[1]}] }},\n];\n",
        encoding="utf-8",
    )
    cache = tmp_path / "cache"
    lat, lon = LAKE_START
    box = (lat - 0.1, lon - 0.1, lat + 0.1, lon + 0.1)
    elements = FileWaterSource(LAKE).elements(box)
    water.write_water(OverpassWaterSource(cache).path(box), box, elements)
    out = tmp_path / "paddleExamples.json"

    code = main(["--cache-dir", str(cache), "--places", str(places), "--out", str(out)])

    assert code == 0
    written = json.loads(out.read_text(encoding="utf-8"))
    assert written["engine"] == engine_fingerprint()
    assert [d["shape"] for d in written["examples"][place_key(LAKE_START)]] == list(
        SHAPES
    )
    assert "8 examples in 1 places" in capsys.readouterr().out


def test_without_the_water_nothing_is_downloaded_nor_written(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    out = tmp_path / "paddleExamples.json"
    code = main(["--cache-dir", str(tmp_path / "empty"), "--out", str(out)])
    assert code == 1
    assert not out.exists()
    assert "No water for a place" in capsys.readouterr().err


def test_the_engine_is_what_draws_on_the_water_and_no_more() -> None:
    files = {path.relative_to(ENGINE).as_posix() for path in engine_files()}
    assert {"paddling.py", "water.py", "water_fit.py", "validation.py"} <= files
    assert {"shapes/outlines/star.json", "shapes/outlines/rabbit_head.json"} <= files
    # The run's search and the pen up do not draw on the water.
    assert not files & {"optimizer.py", "pen_up.py", "shapes/outlines/cat.json"}


def test_the_app_s_examples_were_drawn_by_this_engine() -> None:
    """As the phone's engine zip (tools/phone_engine): an engine that draws
    on the water otherwise leaves the app's examples behind."""
    drawn = json.loads(OUT.read_text(encoding="utf-8"))["engine"]
    assert drawn == engine_fingerprint(), (
        "the engine that draws on the water changed: write the app's examples "
        "again with `python -m shaperoute_api.paddle_examples --cache-dir "
        "<cache with the server's water/>` (TASK-227), then Prettier on "
        f"{OUT.relative_to(REPO)}"
    )
