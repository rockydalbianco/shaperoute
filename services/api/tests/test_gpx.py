"""POST /gpx: the route as the same GPX file the CLI writes (ADR-0033)."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient
from route_engine.export_gpx import GPX_NAMESPACE, route_name, to_gpx
from route_engine.network import FileSource

from shaperoute_api.app import create_app

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "packages" / "shared-types" / "fixtures"
WHEN = datetime(2026, 9, 23, 18, 30, tzinfo=UTC)
NS = {"gpx": GPX_NAMESPACE}


def body() -> Any:
    return json.loads((FIXTURES / "gpx-request.json").read_text(encoding="utf-8"))


def client() -> TestClient:
    app = create_app(FileSource(Path("unused.graphml")), now=lambda: WHEN)
    return TestClient(app)


def test_the_gpx_is_the_one_the_cli_writes() -> None:
    data = body()
    response = client().post("/gpx", json=data)
    assert response.status_code == 200
    points = [tuple(point) for point in data["result"]["points"]]
    name = route_name(data["request"]["shape"], data["request"]["distance_m"], WHEN)
    assert response.text == to_gpx(points, name, WHEN)


def test_one_point_per_route_point_and_the_attribution() -> None:
    data = body()
    root = ET.fromstring(client().post("/gpx", json=data).content)
    points = root.findall("gpx:trk/gpx:trkseg/gpx:trkpt", NS)
    assert len(points) == len(data["result"]["points"])
    assert points[0].attrib == {"lat": "46.0671000", "lon": "11.1214000"}
    assert root.findtext("gpx:metadata/gpx:name", namespaces=NS) == (
        "heart 5 km · 2026-09-23"
    )
    copyright_ = root.find("gpx:metadata/gpx:copyright", NS)
    assert copyright_ is not None
    assert copyright_.get("author") == "OpenStreetMap contributors"


def test_headers_give_type_and_file_name() -> None:
    response = client().post("/gpx", json=body())
    assert response.headers["content-type"].startswith("application/gpx+xml")
    assert response.headers["content-disposition"] == (
        'attachment; filename="shaperoute-heart-5km-2026-09-23.gpx"'
    )


def test_a_bad_body_is_an_invalid_request() -> None:
    without_result = {"request": body()["request"]}
    too_short = {**body(), "request": {**body()["request"], "distance_m": 100}}
    for data in (without_result, too_short):
        response = client().post("/gpx", json=data)
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "invalid_request"
