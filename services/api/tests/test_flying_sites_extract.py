"""The takeoffs and landings of an OpenStreetMap extract (TASK-493 part A,
ADR-0400): what is kept of made-up sites, and the command that writes them.

No network, no osmium: the extract is the hand-written OSM XML of
fixtures/flying_sites.osm.xml (not `.osm`, which git leaves out).
"""

from __future__ import annotations

import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

import pytest
from test_personal_bests import database  # noqa: F401  (the bests' fixture)

from shaperoute_api.db import Database
from shaperoute_api.flying_sites import Site
from shaperoute_api.flying_sites_extract import (
    ele_of,
    flying_sites,
    kinds_of,
    main,
    official_of,
    orientation_of,
    osmium_cat_args,
)
from shaperoute_api.water_extract import read_osm_xml

SITES = Path(__file__).parent / "fixtures/flying_sites.osm.xml"
FIRST = datetime(2026, 11, 23, 8, 0, tzinfo=UTC)
LATER = datetime(2026, 11, 30, 8, 0, tzinfo=UTC)


def _by_key() -> dict[tuple[str, int, str], Site]:
    return {
        (s.osm_type, s.osm_id, s.kind): s for s in flying_sites(read_osm_xml(SITES))
    }


def test_keeps_the_takeoffs_and_the_landings() -> None:
    assert sorted(_by_key()) == [
        ("node", 1, "takeoff"),
        ("node", 2, "landing"),
        ("node", 3, "landing"),
        ("node", 4, "landing"),
        ("node", 5, "landing"),
        ("node", 5, "takeoff"),
        ("node", 6, "takeoff"),
        ("way", 100, "takeoff"),
    ]


def test_a_takeoff_with_every_tag() -> None:
    site = _by_key()[("node", 1, "takeoff")]
    assert site == Site(
        osm_type="node",
        osm_id=1,
        kind="takeoff",
        point=(46.0, 11.0),
        name="Monte Prova",
        ele_m=1200,
        orientation=("SE", "S", "SW"),
        official=True,
    )


def test_a_way_is_the_middle_of_its_nodes_the_first_once() -> None:
    site = _by_key()[("way", 100, "takeoff")]
    assert site.point == pytest.approx((45.91, 10.91))
    assert site.name == "Prato Alto"
    # «high» is not a number; «SW-NW» is a range, left out.
    assert site.ele_m is None
    assert site.orientation == ("W", "NW")
    assert site.official is None


def test_both_kinds_at_once_and_feet() -> None:
    sites = _by_key()
    assert sites[("node", 5, "takeoff")].ele_m == 1219
    assert sites[("node", 5, "landing")].ele_m == 1219
    assert sites[("node", 6, "takeoff")].orientation == ("S",)
    assert sites[("node", 6, "takeoff")].official is False


def test_kinds_of_the_old_and_the_new_keys() -> None:
    assert kinds_of({"free_flying:site": "takeoff"}) == ["takeoff"]
    assert kinds_of({"free_flying:site": "Launch"}) == ["takeoff"]
    assert kinds_of({"free_flying:site": "takeoff,landing"}) == ["takeoff", "landing"]
    assert kinds_of({"free_flying:site": "toplanding"}) == ["landing"]
    assert kinds_of({"free_flying:landing": "yes"}) == ["landing"]
    assert kinds_of({"free_flying:takeoff": "Yes "}) == ["takeoff"]
    assert kinds_of({"free_flying:takeoff": "no"}) == []
    assert kinds_of({"free_flying:site": "training"}) == []
    assert kinds_of({"sport": "free_flying"}) == []


def test_orientation_in_compass_order_each_once() -> None:
    assert orientation_of("SW;S;SE;S") == ("SE", "S", "SW")
    assert orientation_of("n, ne / e") == ("N", "NE", "E")
    assert orientation_of("0") == ("N",)
    assert orientation_of("350") == ("N",)
    assert orientation_of("100") == ("E",)
    assert orientation_of("400") == ()
    assert orientation_of("south") == ()
    assert orientation_of("") == ()


def test_ele_in_whole_metres_or_none() -> None:
    assert ele_of("1234") == 1234
    assert ele_of("1234.6 m") == 1235
    assert ele_of("1234,4m") == 1234
    assert ele_of("1000 ft") == 305
    assert ele_of("-20") == -20
    assert ele_of("9001") is None
    assert ele_of("about 1200") is None
    assert ele_of(None) is None


def test_official_yes_no_or_unknown() -> None:
    assert official_of("yes") is True
    assert official_of("No") is False
    assert official_of("false") is False
    assert official_of("maybe") is None
    assert official_of(None) is None


def test_osmium_turns_the_filtered_extract_into_xml(tmp_path: Path) -> None:
    pbf, out = tmp_path / "italy-flying.osm.pbf", tmp_path / "cut.osm"
    assert osmium_cat_args(pbf, out) == [
        "osmium",
        "cat",
        "--overwrite",
        "--output",
        str(out),
        str(pbf),
    ]


def _rows(database: Database) -> list[tuple[str, int, str]]:  # noqa: F811
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT osm_type, osm_id, kind FROM flying_sites"
            " ORDER BY osm_type, osm_id, kind"
        ).fetchall()
    return [(r["osm_type"], r["osm_id"], r["kind"]) for r in rows]


def _ids(database: Database) -> dict[tuple[str, int, str], int]:  # noqa: F811
    with database.connect() as conn:
        rows = conn.execute(
            "SELECT id, osm_type, osm_id, kind FROM flying_sites"
        ).fetchall()
    return {(r["osm_type"], r["osm_id"], r["kind"]): r["id"] for r in rows}


def test_the_command_writes_again_keeps_the_ids_and_a_clean_run_removes(
    database: Database,  # noqa: F811
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert main(["--osm", str(SITES)], database=database, now=FIRST) == 0
    out = capsys.readouterr().out
    assert "Saved 8 flying sites: 4 takeoffs, 4 landings; removed 0" in out
    first = _ids(database)
    assert sorted(first) == sorted(_by_key())

    # OSM drops node 4 and renames node 1: the same id, the new name.
    smaller = tmp_path / "smaller.osm.xml"
    text = SITES.read_text(encoding="utf-8")
    start = text.index("  <!-- A landing beyond 15 km")
    end = text.index("  <!-- Takeoff and landing at once")
    smaller.write_text(
        (text[:start] + text[end:]).replace("Monte   Prova", "Monte Nuovo"),
        encoding="utf-8",
    )
    assert main(["--osm", str(smaller)], database=database, now=LATER) == 0
    assert "removed 0" in capsys.readouterr().out
    assert _ids(database) == first

    assert main(["--osm", str(smaller), "--clean"], database=database, now=LATER) == 0
    assert "Saved 7 flying sites: 4 takeoffs, 3 landings; removed 1" in (
        capsys.readouterr().out
    )
    assert ("node", 4, "landing") not in _rows(database)
    after = _ids(database)
    assert after == {k: v for k, v in first.items() if k != ("node", 4, "landing")}
    with database.connect() as conn:
        row = conn.execute(
            "SELECT name FROM flying_sites WHERE osm_type = 'node' AND osm_id = 1"
        ).fetchone()
    assert row is not None and row["name"] == "Monte Nuovo"


def test_a_failing_osmium_writes_nothing(
    database: Database,  # noqa: F811
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def broken(args: list[str]) -> None:
        raise subprocess.CalledProcessError(1, args)

    pbf = tmp_path / "italy-flying.osm.pbf"
    pbf.write_bytes(b"")
    assert main(["--extract", str(pbf)], run=broken, database=database) == 1
    assert "nothing written" in capsys.readouterr().err
    assert _rows(database) == []


def test_the_extracts_go_through_osmium(
    database: Database,  # noqa: F811
    tmp_path: Path,
) -> None:
    def fake_osmium(args: list[str]) -> None:
        shutil.copy(SITES, args[4])

    one, two = tmp_path / "italy.osm.pbf", tmp_path / "austria.osm.pbf"
    one.write_bytes(b"")
    two.write_bytes(b"")
    # The same sites in two extracts (a border) are written once.
    assert (
        main(["--extract", str(one), str(two)], run=fake_osmium, database=database) == 0
    )
    assert _rows(database) == sorted(_by_key())
