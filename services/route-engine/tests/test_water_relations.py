"""Lakes drawn as multipolygons, downloaded from Overpass (TASK-230).

Overpass writes the members of a relation only from `out body` up: with
`out tags geom` a relation comes with its id and tags alone. The water
query used it, and a lake drawn as a multipolygon (Garda, Como, Milano's
Idroscalo) had no shape: a download found no lake (TASK-225, on the
server, 2026-10-04). The fake Overpass here answers as the real one does
at the level the query asks, from the hand-built lake (make_water_fixtures),
whose lake is a relation of two outer ways and an inner one.

No network: `water.overpass` is replaced for every test.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import pytest
import test_paddling as paddling

from route_engine import water
from route_engine.models import RouteRequest
from route_engine.paddling import plan_paddling
from route_engine.water import FileWaterSource, NoWaterError, OverpassWaterSource

LAKE = Path(__file__).parent / "fixtures" / "water_lake.json"
LAKE_ID = 100
OUT = re.compile(r"out (ids|skel|body|tags|meta)? ?geom;$")


def answer_as_overpass(elements: list[dict[str, Any]], query: str) -> dict[str, Any]:
    """`elements` (in the `out body geom` format, with members) as Overpass
    answers the query's `out ... geom;`: with `tags` a relation has no
    members and a way no node ids; from `body` up both are there. A way's
    node ids are made up from its position in the answer."""
    found = OUT.search(query)
    assert found is not None, "the water query ends with an out statement"
    level = found.group(1) or "body"
    out = []
    for n, element in enumerate(elements):
        row = dict(element)
        if row["type"] == "way":
            if level != "tags":
                points = row.get("geometry", [])
                row["nodes"] = [1000 * n + k for k in range(len(points))]
        elif row["type"] == "relation" and level == "tags":
            row.pop("members", None)
        out.append(row)
    return {"version": 0.6, "generator": "fake Overpass", "elements": out}


@pytest.fixture
def lake() -> list[dict[str, Any]]:
    elements: list[dict[str, Any]] = json.loads(LAKE.read_text(encoding="utf-8"))[
        "elements"
    ]
    return elements


@pytest.fixture
def overpass(lake: list[dict[str, Any]], monkeypatch: pytest.MonkeyPatch) -> list[str]:
    asked: list[str] = []

    def answer(query: str) -> dict[str, Any]:
        asked.append(query)
        return answer_as_overpass(lake, query)

    monkeypatch.setattr(water, "overpass", answer)
    return asked


def request() -> RouteRequest:
    return paddling._request(paddling.LAKE_START, 2000, "heart")


def points_of(source: water.WaterSource) -> list[tuple[float, float]]:
    return list(plan_paddling(request(), source).result.points)


def test_the_query_asks_for_the_members_of_the_relations() -> None:
    query = water.water_query((45.0, 10.0, 45.1, 10.1))
    found = OUT.search(query)
    assert found is not None
    assert found.group(1) in ("body", "meta", None)


def test_a_multipolygon_lake_comes_with_its_members(
    overpass: list[str], tmp_path: Path
) -> None:
    elements = OverpassWaterSource(tmp_path).elements((45.0, 10.0, 45.1, 10.1))
    assert len(overpass) == 1
    lake = next(e for e in elements if e["type"] == "relation")
    assert lake["id"] == LAKE_ID
    assert [(m["ref"], m["role"]) for m in lake["members"]] == [
        (101, "outer"),
        (102, "outer"),
        (103, "inner"),
    ]
    assert all(m["geometry"] for m in lake["members"])
    # The node ids of `out body` are not kept: the water reads geometry.
    assert all("nodes" not in e for e in elements)


def test_a_route_on_a_downloaded_lake_is_the_route_on_the_lake(
    overpass: list[str], tmp_path: Path
) -> None:
    downloaded = points_of(OverpassWaterSource(tmp_path))
    assert len(overpass) == 1
    assert downloaded == points_of(FileWaterSource(LAKE))
    text = ";".join(f"{lat:.7f},{lon:.7f}" for lat, lon in downloaded)
    # The lake heart of test_bike_on_foot.py, pinned before TASK-230.
    assert hashlib.sha256(text.encode("ascii")).hexdigest()[:16] == ("1aff621a6cf076da")


def test_with_out_tags_the_lake_was_lost(
    overpass: list[str], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """What happened before TASK-230: the relation without its members,
    so no lake, only the pond and the marina."""
    before = water.WATER_QUERY.replace("out body geom;", "out tags geom;")
    monkeypatch.setattr(water, "WATER_QUERY", before)
    elements = OverpassWaterSource(tmp_path).elements((45.0, 10.0, 45.1, 10.1))
    lake = next(e for e in elements if e["type"] == "relation")
    assert lake["members"] == []
    with pytest.raises(NoWaterError):
        points_of(OverpassWaterSource(tmp_path))
