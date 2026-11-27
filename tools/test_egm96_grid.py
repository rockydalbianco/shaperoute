"""Deterministic tests of tools/egm96_grid.py (TASK-479 part E2b, ADR-0388):
the GeoTIFF reader on a small made-up file, the table's encoding, and the
table that is in the repository. No network, no need of the NGA file."""

from __future__ import annotations

import hashlib
import re
import struct
import zlib
from pathlib import Path

import egm96_grid as eg
import pytest

ROOT = Path(__file__).resolve().parent.parent


def predicted(values: list[float], width: int) -> bytes:
    """TIFF predictor 3, the other way: planes, then byte differences."""
    out = bytearray()
    for start in range(0, len(values), width):
        row = values[start : start + width]
        words = [struct.pack(">f", v) for v in row]
        planes = bytearray(w[p] for p in range(4) for w in words)
        diff = bytearray(planes)
        for i in range(len(planes) - 1, 0, -1):
            diff[i] = (planes[i] - planes[i - 1]) & 0xFF
        out += diff
    return bytes(out)


def tiff(width: int, height: int, tile: int, step: float, values: list[float]) -> bytes:
    """A little-endian tiled, deflated float32 GeoTIFF like PROJ's."""
    across = -(-width // tile)
    down = -(-height // tile)
    tiles: list[bytes] = []
    for t in range(across * down):
        top, left = (t // across) * tile, (t % across) * tile
        cells = [
            (
                values[(top + r) * width + left + c]
                if top + r < height and left + c < width
                else 0.0
            )
            for r in range(tile)
            for c in range(tile)
        ]
        tiles.append(zlib.compress(predicted(cells, tile)))
    header = 8
    count = 14
    ifd_size = 2 + 12 * count + 4
    extra_at = header + ifd_size
    scale = struct.pack("<3d", step, step, 0.0)
    tie = struct.pack("<6d", 0.0, 0.0, 0.0, -180.0, 90.0, 0.0)
    offsets_at = extra_at + len(scale) + len(tie)
    counts_at = offsets_at + 4 * len(tiles)
    data_at = counts_at + 4 * len(tiles)
    offsets, at = [], data_at
    for blob in tiles:
        offsets.append(at)
        at += len(blob)

    def entry(tag: int, kind: int, n: int, value: int) -> bytes:
        if kind == 3 and n == 1:
            return struct.pack("<HHIHH", tag, kind, n, value, 0)
        return struct.pack("<HHII", tag, kind, n, value)

    entries = [
        entry(256, 3, 1, width),
        entry(257, 3, 1, height),
        entry(258, 3, 1, 32),
        entry(259, 3, 1, 8),
        entry(277, 3, 1, 1),
        entry(317, 3, 1, 3),
        entry(322, 3, 1, tile),
        entry(323, 3, 1, tile),
        entry(324, 4, len(tiles), offsets_at if len(tiles) > 1 else offsets[0]),
        entry(325, 4, len(tiles), counts_at if len(tiles) > 1 else len(tiles[0])),
        entry(339, 3, 1, 3),
        entry(33550, 12, 3, extra_at),
        entry(33922, 12, 6, extra_at + len(scale)),
        entry(42113, 2, 1, 0),
    ]
    return (
        b"II*\x00"
        + struct.pack("<I", header)
        + struct.pack("<H", count)
        + b"".join(entries)
        + struct.pack("<I", 0)
        + scale
        + tie
        + struct.pack(f"<{len(tiles)}I", *offsets)
        + struct.pack(f"<{len(tiles)}I", *[len(b) for b in tiles])
        + b"".join(tiles)
    )


def made_up(step: float) -> tuple[int, int, list[float]]:
    rows, cols = int(180 / step) + 1, int(360 / step)
    values = [
        round(40 * ((r * 7 + c * 3) % 11) / 11 - 20 + 0.01 * c, 2)
        for r in range(rows)
        for c in range(cols)
    ]
    return rows, cols, values


def test_reads_a_tiled_float_tiff_with_its_predictor() -> None:
    rows, cols, values = made_up(15.0)
    grid = eg.read_tiff(tiff(cols, rows, 16, 15.0, values))
    assert (grid.rows, grid.cols, grid.step) == (rows, cols, 15.0)
    assert grid.values == pytest.approx(values, abs=1e-4)


def test_refuses_a_grid_that_does_not_start_at_the_corner() -> None:
    rows, cols, values = made_up(15.0)
    blob = bytearray(tiff(cols, rows, 16, 15.0, values))
    corner = struct.pack("<2d", -180.0, 90.0)
    at = bytes(blob).index(corner)
    blob[at : at + 16] = struct.pack("<2d", -179.0, 90.0)
    with pytest.raises(ValueError, match="does not start"):
        eg.read_tiff(bytes(blob))


def test_keeps_the_fine_nodes_and_interpolates_between() -> None:
    rows, cols, values = made_up(15.0)
    fine = eg.Grid(15.0, rows, cols, values)
    table = eg.coarse(fine, 30)
    assert (table.rows, table.cols) == (7, 12)
    assert table.at(1, 2) == fine.at(2, 4)
    assert table.height(60, -120) == pytest.approx(fine.at(2, 4))
    middle = (fine.at(2, 4) + fine.at(2, 6) + fine.at(4, 4) + fine.at(4, 6)) / 4
    assert table.height(45, -105) == pytest.approx(middle)
    assert table.height(0, 180) == pytest.approx(table.height(0, -180))


def test_encodes_centimetres_both_ways() -> None:
    grid = eg.Grid(90.0, 3, 4, [-107.5, 0.0, 85.39, 12.34] * 3)
    back = eg.decode(eg.encode(grid), 3, 4, 90.0)
    assert back.values == pytest.approx(grid.values, abs=0.005)


def test_measures_the_error_of_the_table() -> None:
    rows, cols, values = made_up(15.0)
    fine = eg.Grid(15.0, rows, cols, values)
    assert eg.measure(fine, fine)["max"] == pytest.approx(0, abs=1e-9)
    assert eg.measure(fine, eg.coarse(fine, 30))["max"] > 0


def test_the_table_in_the_app_is_whole_and_keeps_nga_nodes() -> None:
    text = (ROOT / eg.OUT).read_text(encoding="utf-8")
    numbers = {
        name: int(value)
        for name, value in re.findall(r"export const (EGM96_\w+) = (\d+);", text)
    }
    assert numbers == {"EGM96_STEP_DEG": 1, "EGM96_ROWS": 181, "EGM96_COLS": 360}
    (encoded,) = re.findall(r'"([A-Za-z0-9+/=]+)"', text)
    # The script is deterministic: NGA's file gives always this table.
    assert hashlib.sha256(encoded.encode("ascii")).hexdigest() == eg.TABLE_SHA256
    assert eg.TABLE_SHA256 == (
        "e30cb62a94f4d8acb3a97da3b7de92887dd5764eb26d7574b458b02c3fbfa563"
    )
    grid = eg.decode(encoded, 181, 360, 1.0)
    # NGA's 15' nodes, which the table keeps to the centimetre.
    assert grid.height(46, 11) == pytest.approx(49.28, abs=0.005)
    assert grid.height(5, 78) == pytest.approx(-104.68, abs=0.005)
    assert grid.height(64, -19) == pytest.approx(67.15, abs=0.005)
    assert min(grid.values) > -110 and max(grid.values) < 90
