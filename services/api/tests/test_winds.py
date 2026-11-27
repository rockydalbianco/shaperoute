"""The wind aloft for paragliding (TASK-479 part H, ADR-0388): GRIB fields
read the right way up, cut to the areas of the take-offs, kept in bytes,
given back by GET /winds as numbers only. No network: the GRIB messages are
made here with eccodes' own samples, the transport is a fake."""

from __future__ import annotations

import bz2
import json
import math
from datetime import UTC, datetime, timedelta
from pathlib import Path

import eccodes
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from shaperoute_api.winds.api import install_winds, winds_routes
from shaperoute_api.winds.grid import (
    LEVELS,
    MISSING,
    UNIT_MS,
    Area,
    WindGrid,
    crop,
    quantize,
    speed_and_from,
)
from shaperoute_api.winds.sources import (
    ALPS,
    ECMWF,
    ICON_D2,
    ecmwf,
    ecmwf_ranges,
    ecmwf_url,
    fields_of,
    icon_d2,
    icon_d2_url,
    latest_run,
)
from shaperoute_api.winds.store import WindStore

RUN = datetime(2026, 11, 26, 6, 0, tzinfo=UTC)


def grib(
    var: str,
    level: int,
    values: np.ndarray,
    lat_first: float,
    lon_first: float,
    step: float,
    north_first: bool,
    missing: float | None = None,
) -> bytes:
    """One GRIB2 message on a regular grid, from eccodes' sample."""
    nj, ni = values.shape
    handle = eccodes.codes_grib_new_from_samples("regular_ll_pl_grib2")
    try:
        eccodes.codes_set(handle, "Ni", ni)
        eccodes.codes_set(handle, "Nj", nj)
        eccodes.codes_set(handle, "jScansPositively", 0 if north_first else 1)
        lat_last = (
            lat_first - (nj - 1) * step if north_first else lat_first + (nj - 1) * step
        )
        eccodes.codes_set(handle, "latitudeOfFirstGridPointInDegrees", lat_first)
        eccodes.codes_set(handle, "latitudeOfLastGridPointInDegrees", lat_last)
        eccodes.codes_set(handle, "longitudeOfFirstGridPointInDegrees", lon_first % 360)
        eccodes.codes_set(
            handle,
            "longitudeOfLastGridPointInDegrees",
            (lon_first + (ni - 1) * step) % 360,
        )
        eccodes.codes_set(handle, "iDirectionIncrementInDegrees", step)
        eccodes.codes_set(handle, "jDirectionIncrementInDegrees", step)
        eccodes.codes_set(handle, "shortName", var)
        eccodes.codes_set(handle, "level", level)
        if missing is not None:
            eccodes.codes_set(handle, "bitmapPresent", 1)
            eccodes.codes_set(handle, "missingValue", missing)
        eccodes.codes_set_values(handle, values.astype(float).ravel())
        return eccodes.codes_get_message(handle)
    finally:
        eccodes.codes_release(handle)


def field_values(var: str, level: int, hour: int, nj: int, ni: int) -> np.ndarray:
    """A made-up wind: u grows east, v north, both with the level and the hour."""
    base = 1.0 if var == "u" else -2.0
    rows = np.arange(nj, dtype=float)[:, None]
    cols = np.arange(ni, dtype=float)[None, :]
    return base + 0.5 * cols + 0.25 * rows + level / 1000 + hour


class Fake:
    def __init__(self, files: dict[str, bytes]) -> None:
        self.files = files
        self.asked: list[tuple[str, tuple[int, int] | None]] = []

    def get(self, url: str, byte_range: tuple[int, int] | None = None) -> bytes:
        self.asked.append((url, byte_range))
        body = self.files[url]
        if byte_range is None:
            return body
        return body[byte_range[0] : byte_range[0] + byte_range[1]]


def test_a_north_first_field_is_turned_south_up():
    values = np.array([[10.0, 11.0], [20.0, 21.0], [30.0, 31.0]])  # north row first
    [field] = fields_of(grib("u", 850, values, 46.0, 10.0, 0.5, north_first=True))
    assert (field.lat0, field.lon0) == (45.0, 10.0)
    assert field.values[0].tolist() == [30.0, 31.0]
    assert field.values[2].tolist() == [10.0, 11.0]


def test_a_value_the_model_does_not_have_is_missing():
    values = np.array([[5.0, 9999.0]])
    [field] = fields_of(
        grib("u", 850, values, 46.0, 10.0, 0.5, north_first=False, missing=9999.0)
    )
    assert field.values[0, 0] == 5.0
    assert math.isnan(field.values[0, 1])
    assert quantize(field.values).tolist() == [[10, MISSING]]


def test_a_field_is_cut_to_an_area_on_its_own_grid():
    values = np.arange(20.0).reshape(4, 5)
    [field] = fields_of(grib("u", 700, values, 45.0, 10.0, 1.0, north_first=False))
    cut = crop(field, Area("test", 46.0, 47.0, 11.0, 13.0))
    assert (cut.lat0, cut.lon0) == (46.0, 11.0)
    assert cut.values.tolist() == [[6.0, 7.0, 8.0], [11.0, 12.0, 13.0]]


def test_the_speed_and_where_the_wind_comes_from():
    assert speed_and_from(0.0, -5.0) == (5.0, 0)  # blowing south: from the north
    assert speed_and_from(-3.0, 0.0) == (3.0, 90)  # blowing west: from the east
    speed, from_deg = speed_and_from(3.0, 4.0)
    assert speed == 5.0 and from_deg == 217


def icon_files(hours: range) -> dict[str, bytes]:
    # A made-up ICON-D2 grid over the Alps, south row first.
    files = {}
    for hour in hours:
        for level in LEVELS:
            for var in ("u", "v"):
                values = field_values(var, level, hour, 12, 30)
                message = grib(var, level, values, 43.0, 4.0, 0.5, north_first=False)
                files[icon_d2_url(RUN, var, level, hour)] = bz2.compress(message)
    return files


def test_icon_d2_hour_by_hour_cut_to_the_alps(tmp_path: Path):
    transport = Fake(icon_files(range(3)))
    grid = icon_d2(RUN, transport, hours=range(3))
    assert grid.source == ICON_D2 and grid.area == ALPS.name
    assert grid.hours == (0, 1, 2)
    assert (grid.lat0, grid.lon0) == (43.5, 4.5)
    assert grid.u.shape[:2] == (3, len(LEVELS))
    # The point at row 1, column 1 of the cut: row 2, column 2 of the file.
    expected = field_values("u", 850, 2, 12, 30)[2, 2]
    u, v = grid.at(44.0, 5.0)[2][0]
    assert abs(u - expected) <= UNIT_MS / 2
    assert len(transport.asked) == 3 * len(LEVELS) * 2
    assert all(url.endswith(".grib2.bz2") for url, _ in transport.asked)
    assert icon_d2_url(RUN, "u", 850, 7).endswith(
        "/06/u/icon-d2_germany_regular-lat-lon_pressure-level_2026112606_007_850_u.grib2.bz2"
    )


def test_ecmwf_fetches_only_the_wind_by_the_index():
    hours = (0, 3)
    files = {}
    for hour in hours:
        body = b""
        index_lines = []
        # A field the app does not want first, then the ones it does.
        other = grib("t", 850, np.zeros((3, 4)), 50.0, -10.0, 10.0, north_first=True)
        index_lines.append(
            {
                "levtype": "pl",
                "param": "t",
                "levelist": "850",
                "_offset": 0,
                "_length": len(other),
            }
        )
        body += other
        for level in (*LEVELS, 925):
            for var in ("u", "v"):
                message = grib(
                    var,
                    level,
                    field_values(var, level, hour, 9, 18),
                    80.0,
                    -170.0,
                    10.0,
                    north_first=True,
                )
                index_lines.append(
                    {
                        "levtype": "pl",
                        "param": var,
                        "levelist": str(level),
                        "_offset": len(body),
                        "_length": len(message),
                    }
                )
                body += message
        url = ecmwf_url(RUN, hour)
        files[url] = body
        files[url.removesuffix(".grib2") + ".index"] = "\n".join(
            json.dumps(x) for x in index_lines
        ).encode()
    transport = Fake(files)
    europe = Area("europe", 35.0, 72.0, -12.0, 35.0)
    usa = Area("usa", 24.0, 50.0, -125.0, -66.0)
    grids = ecmwf(RUN, transport, hours=hours, areas=(europe, usa))
    assert [g.area for g in grids] == ["europe", "usa"]
    assert all(g.source == ECMWF and g.hours == hours for g in grids)
    ranges = [r for _, r in transport.asked if r is not None]
    assert len(ranges) == len(hours) * len(LEVELS) * 2
    assert (
        ecmwf_ranges(
            files[ecmwf_url(RUN, 0).removesuffix(".grib2") + ".index"].decode()
        )[0][0]
        > 0
    )


def a_grid(run: datetime, source: str = ICON_D2, area: str = "alps") -> WindGrid:
    u = np.full((3, len(LEVELS), 4, 4), 6, dtype=np.int8)  # 3 m/s
    v = np.full((3, len(LEVELS), 4, 4), 8, dtype=np.int8)  # 4 m/s
    u[:, 0] = MISSING  # 850 hPa under the ground
    return WindGrid(source, area, run, (0, 1, 2), 46.0, 11.0, 0.1, 0.1, u, v)


def test_a_grid_is_kept_whole_and_read_back(tmp_path: Path):
    store = WindStore(tmp_path)
    path = store.save(a_grid(RUN))
    assert path.name == "icon-d2-alps.npz"
    back = WindGrid.load(path)
    assert back.run == RUN and back.hours == (0, 1, 2)
    assert np.array_equal(back.u, a_grid(RUN).u)
    assert not list(tmp_path.glob("*.part"))


def test_the_finest_fresh_model_is_given(tmp_path: Path):
    store = WindStore(tmp_path)
    store.save(a_grid(RUN, ICON_D2, "alps"))
    store.save(a_grid(RUN - timedelta(hours=6), ECMWF, "europe"))
    assert store.best(46.1, 11.1, RUN + timedelta(hours=2)).source == ICON_D2
    # ICON-D2 too old: ECMWF.
    assert store.best(46.1, 11.1, RUN + timedelta(hours=13)).source == ECMWF
    # Outside every grid: none.
    assert store.best(40.0, 0.0, RUN) is None
    assert WindStore(None).best(46.1, 11.1, RUN) is None


def test_get_winds_numbers_only_from_the_hour_on(tmp_path: Path):
    store = WindStore(tmp_path)
    store.save(a_grid(RUN))
    app = FastAPI()
    app.include_router(winds_routes(store, now=lambda: RUN + timedelta(minutes=70)))
    client = TestClient(app)
    answer = client.get("/winds", params={"lat": 46.1234, "lon": 11.1789})
    assert answer.status_code == 200
    body = answer.json()
    assert body["source"] == ICON_D2
    assert body["attribution"] == "DWD ICON-D2, CC BY 4.0"
    assert (body["lat"], body["lon"]) == (46.12, 11.18)
    assert body["levels"] == list(LEVELS)
    # The run's hour 0 is past at 07:10: hours 1 and 2.
    assert [h["time"][:16] for h in body["hours"]] == [
        "2026-11-26T07:00",
        "2026-11-26T08:00",
    ]
    first = body["hours"][0]["winds"]
    assert first[0] == {"hpa": 850, "speed_ms": None, "from_deg": None}
    assert first[1] == {"hpa": 700, "speed_ms": 5.0, "from_deg": 217}
    assert client.get("/winds", params={"lat": 10, "lon": 10}).status_code == 503
    assert client.get("/winds", params={"lat": 95, "lon": 10}).status_code == 422


def test_the_newest_run_ready():
    now = datetime(2026, 11, 26, 9, 30, tzinfo=UTC)
    assert latest_run(now, 6, 2.5) == datetime(2026, 11, 26, 6, 0, tzinfo=UTC)
    assert latest_run(now, 12, 8) == datetime(2026, 11, 26, 0, 0, tzinfo=UTC)
    assert latest_run(datetime(2026, 11, 26, 1, 0, tzinfo=UTC), 6, 2.5) == datetime(
        2026, 11, 25, 18, 0, tzinfo=UTC
    )


def test_install_reads_the_directory_of_the_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SHAPEROUTE_WINDS_DIR", str(tmp_path))
    app = FastAPI()
    install_winds(app)
    # No run kept yet: no wind, said so.
    assert (
        TestClient(app).get("/winds", params={"lat": 46, "lon": 11}).status_code == 503
    )


def test_the_job_says_so_without_a_directory(monkeypatch: pytest.MonkeyPatch):
    from shaperoute_api.winds import job

    monkeypatch.delenv("SHAPEROUTE_WINDS_DIR", raising=False)
    assert job.run([ICON_D2]) == 2


def test_the_job_keeps_one_source_when_the_other_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    from shaperoute_api.winds import job

    monkeypatch.setenv("SHAPEROUTE_WINDS_DIR", str(tmp_path))
    monkeypatch.setattr(job, "icon_d2", lambda run, transport: a_grid(run))

    def broken(run, transport):
        raise OSError("ECMWF did not answer")

    monkeypatch.setattr(job, "ecmwf", broken)
    assert job.run([ICON_D2, ECMWF], now=RUN + timedelta(hours=3)) == 0
    assert [p.name for p in tmp_path.glob("*.npz")] == ["icon-d2-alps.npz"]
