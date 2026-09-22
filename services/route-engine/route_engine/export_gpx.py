"""GPX 1.1 export: one track, one segment, one point per coordinate."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from collections.abc import Sequence
from datetime import UTC, datetime

from route_engine.geo import LatLon

GPX_NAMESPACE = "http://www.topografix.com/GPX/1/1"
CREATOR = "ShapeRoute route-engine"

# 7 decimals of a degree are about 1 cm: enough, and diffs stay readable.
COORDINATE_DECIMALS = 7


def route_name(shape: str, distance_m: int, when: datetime) -> str:
    """Human-readable track name, e.g. 'heart 5 km · 2026-09-22'."""
    return f"{shape} {distance_m / 1000:g} km · {when:%Y-%m-%d}"


def to_gpx(points: Sequence[LatLon], name: str, when: datetime) -> str:
    """Serialize `points` as a GPX 1.1 document; `when` must be timezone-aware."""
    if when.tzinfo is None:
        raise ValueError("GPX time must be timezone-aware")
    timestamp = when.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    ET.register_namespace("", GPX_NAMESPACE)
    ns = f"{{{GPX_NAMESPACE}}}"
    gpx = ET.Element(f"{ns}gpx", {"version": "1.1", "creator": CREATOR})

    metadata = ET.SubElement(gpx, f"{ns}metadata")
    ET.SubElement(metadata, f"{ns}name").text = name
    author = ET.SubElement(metadata, f"{ns}author")
    ET.SubElement(author, f"{ns}name").text = CREATOR
    ET.SubElement(metadata, f"{ns}time").text = timestamp

    trk = ET.SubElement(gpx, f"{ns}trk")
    ET.SubElement(trk, f"{ns}name").text = name
    trkseg = ET.SubElement(trk, f"{ns}trkseg")
    for lat, lon in points:
        ET.SubElement(
            trkseg,
            f"{ns}trkpt",
            {
                "lat": f"{lat:.{COORDINATE_DECIMALS}f}",
                "lon": f"{lon:.{COORDINATE_DECIMALS}f}",
            },
        )

    ET.indent(gpx)
    body = ET.tostring(gpx, encoding="unicode")
    return f'<?xml version="1.0" encoding="UTF-8"?>\n{body}\n'
