"""The GPX of a saved run: a time on every point, a segment for each
stretch between two pauses (TASK-187, docs/GPX.md)."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta, timezone

import pytest

from shaperoute_api.run_gpx import run_gpx, segments

GPX = "{http://www.topografix.com/GPX/1/1}"
START = datetime(2026, 9, 21, 14, 13, 20, tzinfo=UTC)
FIXES = [
    (46.0671, 11.1214, 0.0),
    (46.0672, 11.1224, 10.0),
    (46.0673, 11.1234, 20.5),
    (46.0674, 11.1244, 95.0),
    (46.0675, 11.1254, 105.0),
]


def test_a_run_without_pauses_is_one_segment() -> None:
    assert segments(FIXES, []) == [FIXES]
    assert segments([], []) == []


def test_a_pause_between_two_fixes_opens_a_segment() -> None:
    assert segments(FIXES, [(30.0, 90.0)]) == [FIXES[:3], FIXES[3:]]


def test_a_pause_that_begins_on_a_fix_leaves_it_before() -> None:
    assert segments(FIXES, [(20.5, 90.0)]) == [FIXES[:3], FIXES[3:]]


def test_fixes_taken_inside_a_pause_are_left_out() -> None:
    cut = segments(FIXES, [(15.0, 100.0)])
    assert cut == [FIXES[:2], FIXES[4:]]


def test_two_pauses_are_three_segments() -> None:
    cut = segments(FIXES, [(5.0, 6.0), (96.0, 97.0)])
    assert [len(segment) for segment in cut] == [1, 3, 1]


def test_every_point_has_its_time_to_the_millisecond() -> None:
    root = ET.fromstring(run_gpx(FIXES, [(30.0, 90.0)], START, "Heart in Trento"))

    assert root.tag == f"{GPX}gpx"
    assert (root.get("version"), root.get("creator")) == ("1.1", "Sgrava")
    assert root.findtext(f"{GPX}metadata/{GPX}name") == "Heart in Trento"
    assert root.findtext(f"{GPX}metadata/{GPX}time") == "2026-09-21T14:13:20.000Z"
    assert root.findtext(f"{GPX}trk/{GPX}name") == "Heart in Trento"
    cut = root.findall(f"{GPX}trk/{GPX}trkseg")
    assert [len(segment) for segment in cut] == [3, 2]
    points = root.findall(f".//{GPX}trkpt")
    assert [(p.get("lat"), p.get("lon")) for p in points][0] == (
        "46.0671000",
        "11.1214000",
    )
    assert [p.findtext(f"{GPX}time") for p in points] == [
        "2026-09-21T14:13:20.000Z",
        "2026-09-21T14:13:30.000Z",
        "2026-09-21T14:13:40.500Z",
        "2026-09-21T14:14:55.000Z",
        "2026-09-21T14:15:05.000Z",
    ]


def test_a_run_without_a_name_has_none() -> None:
    root = ET.fromstring(run_gpx(FIXES, [], START))
    assert root.find(f"{GPX}metadata/{GPX}name") is None
    assert root.find(f"{GPX}trk/{GPX}name") is None


def test_times_are_written_in_utc() -> None:
    rome = START.astimezone(timezone(timedelta(hours=2)))
    assert run_gpx(FIXES, [], rome) == run_gpx(FIXES, [], START)
    with pytest.raises(ValueError):
        run_gpx(FIXES, [], START.replace(tzinfo=None))
