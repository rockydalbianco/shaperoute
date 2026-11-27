"""Makes the coarse EGM96 geoid table of the app (TASK-479 part E2b, ADR-0388).

An Android phone gives the GPS altitude above the WGS84 ellipsoid; the
flight numbers, the airspace limits and the GPX want it above mean sea
level. The difference is the geoid height N (MSL = ellipsoid height - N),
about +47 to +50 m in the Alps, -30 m in India, +60 m in Iceland. iOS
already gives MSL.

The source is NGA's EGM96 geoid on a 15' grid (public domain). NGA's own
site does not always answer, so the script reads the same grid as PROJ
publishes it, unchanged, as a GeoTIFF:

    https://cdn.proj.org/us_nga_egm96_15.tif  (2,710,815 bytes,
    sha256 db493027562c9b004d7220fa881f5603adada4e1c5029b933fa7de4547b0e78d)

"WGS 84 (EPSG:4979) to EGM96 height (EPSG:5773). Converted from
egm96_15.gtx", "Derived from work by NGA. Public Domain".

The app keeps one node every ``STEP_DEG`` degrees (the 15' node itself, no
averaging) as whole centimetres, 16-bit, in base64, and interpolates them
bilinearly. The script also measures that table against every 15' node and
prints the error. Standard library only. Run from the repository's root,
with the file downloaded by hand:

    python3 tools/egm96_grid.py path/to/us_nga_egm96_15.tif

It writes ``apps/mobile/src/air/egm96Grid.ts``; with ``--check`` it only
prints the measures and the reference values used by ``geoid.test.ts``.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import math
import struct
import sys
import zlib
from collections.abc import Sequence
from pathlib import Path

SOURCE_SHA256 = "db493027562c9b004d7220fa881f5603adada4e1c5029b933fa7de4547b0e78d"
SOURCE_URL = "https://cdn.proj.org/us_nga_egm96_15.tif"

#: The app's table: one node every STEP_DEG degrees.
STEP_DEG = 1
OUT = Path("apps/mobile/src/air/egm96Grid.ts")

#: Places whose full-resolution value goes into the app's test: NGA's own
#: check points (OUTINTPT.DAT of its interpolation program) and a few
#: flying places.
CHECK_POINTS: tuple[tuple[str, float, float], ...] = (
    ("NGA check 1", 38.6281550, -90.2208450),
    ("NGA check 2", -14.6212170, -54.9788860),
    ("NGA check 3", 46.8743190, 102.4487290),
    ("NGA check 4", -23.6174460, 133.8747120),
    ("NGA check 5", 38.6254730, -0.0005000),
    ("NGA check 6", -0.4667440, 0.0023000),
    ("Monte Baldo", 45.7500, 10.8400),
    ("Chamonix", 45.9237, 6.8694),
    ("Bassano del Grappa", 45.7800, 11.7300),
    ("Interlaken", 46.6863, 7.8632),
    ("Ölüdeniz", 36.5500, 29.1200),
    ("Bir Billing", 32.0500, 76.7300),
    ("Valle de Bravo", 19.1900, -100.1300),
)

#: The Alps, where MuW's pilots fly most, for a measure of its own.
ALPS = (43.5, 48.5, 5.0, 17.0)


class Grid:
    """A global grid of geoid heights, rows from 90° N down, columns from
    180° W eastwards, ``step`` degrees apart, nodes on whole multiples."""

    def __init__(self, step: float, rows: int, cols: int, values: list[float]):
        self.step = step
        self.rows = rows
        self.cols = cols
        self.values = values

    def at(self, row: int, col: int) -> float:
        return self.values[row * self.cols + col % self.cols]

    def height(self, lat: float, lon: float) -> float:
        """Bilinear interpolation, as ``geoid.ts`` does it."""
        y = (90.0 - lat) / self.step
        x = (lon + 180.0) / self.step
        row = min(max(math.floor(y), 0), self.rows - 2)
        col = math.floor(x)
        fy = min(max(y - row, 0.0), 1.0)
        fx = x - col
        top = self.at(row, col) * (1 - fx) + self.at(row, col + 1) * fx
        bottom = self.at(row + 1, col) * (1 - fx) + self.at(row + 1, col + 1) * fx
        return top * (1 - fy) + bottom * fy


def undo_float_predictor(data: bytes, width: int, rows: int) -> list[float]:
    """TIFF predictor 3 (Adobe tech note 3): each row is its bytes in planes,
    the most significant first, differenced byte by byte."""
    out: list[float] = []
    row_bytes = 4 * width
    for r in range(rows):
        raw = bytearray(data[r * row_bytes : (r + 1) * row_bytes])
        for i in range(1, row_bytes):
            raw[i] = (raw[i] + raw[i - 1]) & 0xFF
        for c in range(width):
            word = bytes(
                (raw[c], raw[width + c], raw[2 * width + c], raw[3 * width + c])
            )
            out.append(struct.unpack(">f", word)[0])
    return out


def read_tiff(blob: bytes) -> Grid:
    """The tiled, deflated float32 GeoTIFF of PROJ, nothing more general."""
    order = "<" if blob[:2] == b"II" else ">"
    if struct.unpack(order + "H", blob[2:4])[0] != 42:
        raise ValueError("not a classic TIFF")
    (ifd,) = struct.unpack(order + "I", blob[4:8])
    (count,) = struct.unpack(order + "H", blob[ifd : ifd + 2])
    sizes = {2: 1, 3: 2, 4: 4, 12: 8}
    formats = {3: "H", 4: "I", 12: "d"}
    tags: dict[int, tuple[float, ...]] = {}
    for i in range(count):
        entry = blob[ifd + 2 + 12 * i : ifd + 14 + 12 * i]
        tag, kind, n = struct.unpack(order + "HHI", entry[:8])
        if kind not in formats:
            continue
        size = sizes[kind] * n
        if size <= 4:
            raw = entry[8 : 8 + size]
        else:
            (at,) = struct.unpack(order + "I", entry[8:12])
            raw = blob[at : at + size]
        tags[tag] = struct.unpack(order + f"{n}{formats[kind]}", raw)
    width, height = int(tags[256][0]), int(tags[257][0])
    tile_w, tile_h = int(tags[322][0]), int(tags[323][0])
    expected = {258: 32, 259: 8, 277: 1, 317: 3, 339: 3}
    for tag, want in expected.items():
        if int(tags[tag][0]) != want:
            raise ValueError(f"tag {tag} is {tags[tag][0]}, not {want}")
    step = float(tags[33550][0])
    if tags[33922][3:5] != (-180.0, 90.0) or tags[33550][1] != step:
        raise ValueError("the grid does not start at 90° N, 180° W")
    values = [0.0] * (width * height)
    across = math.ceil(width / tile_w)
    for index, (offset, length) in enumerate(zip(tags[324], tags[325], strict=True)):
        tile = undo_float_predictor(
            zlib.decompress(blob[int(offset) : int(offset + length)]), tile_w, tile_h
        )
        top, left = (index // across) * tile_h, (index % across) * tile_w
        for r in range(tile_h):
            if top + r >= height:
                break
            for c in range(tile_w):
                if left + c < width:
                    values[(top + r) * width + left + c] = tile[r * tile_w + c]
    return Grid(step, height, width, values)


def coarse(fine: Grid, step: int) -> Grid:
    """Every ``step``-degree node of the fine grid, rounded to centimetres."""
    every = round(step / fine.step)
    rows = 180 // step + 1
    cols = 360 // step
    values = [
        round(fine.at(r * every, c * every) * 100) / 100
        for r in range(rows)
        for c in range(cols)
    ]
    return Grid(float(step), rows, cols, values)


def encode(grid: Grid) -> str:
    """Whole centimetres as little-endian int16, in base64."""
    cm = [round(v * 100) for v in grid.values]
    return base64.b64encode(struct.pack(f"<{len(cm)}h", *cm)).decode("ascii")


def decode(text: str, rows: int, cols: int, step: float) -> Grid:
    raw = base64.b64decode(text)
    cm = struct.unpack(f"<{rows * cols}h", raw)
    return Grid(step, rows, cols, [v / 100 for v in cm])


def measure(fine: Grid, table: Grid, box: Sequence[float] | None = None) -> dict:
    """The table's error at every fine node (in ``box`` if given)."""
    errors: list[float] = []
    for r in range(fine.rows):
        lat = 90.0 - r * fine.step
        for c in range(fine.cols):
            lon = -180.0 + c * fine.step
            if box and not (box[0] <= lat <= box[1] and box[2] <= lon <= box[3]):
                continue
            errors.append(abs(table.height(lat, lon) - fine.at(r, c)))
    errors.sort()
    return {
        "nodes": len(errors),
        "max": errors[-1],
        "rms": math.sqrt(sum(e * e for e in errors) / len(errors)),
        "p99": errors[int(0.99 * (len(errors) - 1))],
        "p95": errors[int(0.95 * (len(errors) - 1))],
    }


def typescript(grid: Grid, text: str) -> str:
    return f"""\
/**
 * EGM96 geoid heights, one every {STEP_DEG}°, for `geoid.ts` (TASK-479 part
 * E2b, ADR-0388). GENERATED by `tools/egm96_grid.py`: do not edit.
 *
 * Source: NGA's EGM96 15' grid, public domain, as published by PROJ:
 * {SOURCE_URL}
 * Rows from 90° N down to 90° S, columns from 180° W eastwards; each value
 * whole centimetres, little-endian int16, in base64.
 */
export const EGM96_STEP_DEG = {STEP_DEG};
export const EGM96_ROWS = {grid.rows};
export const EGM96_COLS = {grid.cols};
export const EGM96_CM_BASE64 =
  "{text}";
"""


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("tiff", type=Path, help="us_nga_egm96_15.tif")
    parser.add_argument("--check", action="store_true", help="measure only")
    parser.add_argument("--step", type=int, default=STEP_DEG)
    args = parser.parse_args(argv)
    blob = args.tiff.read_bytes()
    if hashlib.sha256(blob).hexdigest() != SOURCE_SHA256:
        print("warning: not the file this table was made from", file=sys.stderr)
    fine = read_tiff(blob)
    table = coarse(fine, args.step)
    text = encode(table)
    table = decode(text, table.rows, table.cols, table.step)
    for name, box in (("world", None), ("Alps", ALPS)):
        m = measure(fine, table, box)
        print(
            f"{args.step}° vs 15', {name}: {m['nodes']} nodes, max {m['max']:.2f} m,"
            f" p99 {m['p99']:.2f} m, p95 {m['p95']:.2f} m, rms {m['rms']:.2f} m"
        )
    print(f"base64: {len(text)} characters")
    for name, lat, lon in CHECK_POINTS:
        print(
            f"{name}: ({lat}, {lon}) 15' {fine.height(lat, lon):.2f} m,"
            f" {args.step}° {table.height(lat, lon):.2f} m"
        )
    if not args.check:
        OUT.write_text(typescript(table, text), encoding="utf-8")
        print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
