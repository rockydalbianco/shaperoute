"""Heights of the ground, from the Terrarium tiles (ADR-0300 part G, ADR-0342).

The one module of the engine that knows the heights: the snow of a
snowshoe route keeps off steep slopes with it (TASK-413), and the climb and
the profile of a route (TASK-347 part G) and the slope under a ski tour
(TASK-415) are to read them here too, not from a module of their own
(docs/sports/CONDIVISO.md, «Le quote»).

The source is the one the app's 3D map already uses: the Terrain Tiles of
AWS in the «terrarium» encoding, free and without a key, PNG tiles of
256 × 256 pixels, zoom 13 (about 19 m a pixel at 46° N, the data about 30 m
in Italy). A tile is downloaded once and kept in `<cache_dir>/heights/`;
nothing here needs the network but a tile missing from it, through a
`fetch` the caller may replace (the tests do: no network). Coordinates are
(lat, lon) in and heights are metres; the slope grid is in metres on the
plane tangent at an origin, as all the geometry of the engine (geo.py).
"""

from __future__ import annotations

import io
import math
import os
import urllib.request
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import numpy as np
import shapely
from shapely.geometry import Polygon, box
from shapely.geometry.base import BaseGeometry

from route_engine.geo import EARTH_RADIUS_M, LatLon

# The tiles: zoom 13 is what the app's hills and the ski studies read
# (CONDIVISO.md); a finer zoom has no finer data in Italy.
ZOOM = 13
TILE_PX = 256
TERRARIUM_URL = (
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
)
FETCH_TIMEOUT_S = 60
# The slope is measured on cells of this size: a little more than a pixel
# of zoom 13, so each cell reads its own heights (the bench of TASK-413).
SLOPE_CELL_M = 25.0

# (south, west, north, east) in degrees, as network.BBox.
BBox = tuple[float, float, float, float]
# (x0, y0, x1, y1) in metres on the plane tangent at an origin.
Bounds = tuple[float, float, float, float]
# A URL in, the bytes of the answer out.
Fetch = Callable[[str], bytes]

EMPTY = Polygon()


class HeightsNotCachedError(LookupError):
    """A tile the heights need is not in the cache, and downloading was not
    allowed."""


class Heights(Protocol):
    """Where the heights come from: the tiles, or a function in the tests."""

    def heights(self, points: np.ndarray) -> np.ndarray:
        """The height in metres of each (lat, lon) row of `points`."""
        ...


def decode_terrarium(rgb: np.ndarray) -> np.ndarray:
    """The heights in metres of an (h, w, 3) array of Terrarium pixels:
    red × 256 + green + blue / 256 − 32768."""
    rgb = np.asarray(rgb, dtype=np.float64)
    return rgb[..., 0] * 256.0 + rgb[..., 1] + rgb[..., 2] / 256.0 - 32768.0


def encode_terrarium(heights: np.ndarray) -> np.ndarray:
    """The Terrarium pixels of `heights` (the inverse of decode_terrarium,
    to 1/256 m): to write tiles for tests and samples."""
    value = np.round((np.asarray(heights, dtype=np.float64) + 32768.0) * 256.0)
    value = np.clip(value, 0, 256**3 - 1).astype(np.int64)
    return np.stack(
        [(value >> 16) & 255, (value >> 8) & 255, value & 255], axis=-1
    ).astype(np.uint8)


def read_tile(data: bytes) -> np.ndarray:
    """The heights of one PNG tile, (256, 256) metres, row 0 to the north."""
    from PIL import Image

    with Image.open(io.BytesIO(data)) as image:
        rgb = np.asarray(image.convert("RGB"))
    return decode_terrarium(rgb)


def tile_xy(points: np.ndarray, zoom: int = ZOOM) -> np.ndarray:
    """The position of each (lat, lon) row in tiles of `zoom`, Web Mercator,
    as (n, 2) fractional (x, y): the tile is the integer part."""
    n = 2.0**zoom
    lat = np.radians(np.asarray(points, dtype=float)[:, 0])
    lon = np.asarray(points, dtype=float)[:, 1]
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - np.arcsinh(np.tan(lat)) / math.pi) / 2.0 * n
    return np.column_stack([x, y])


def fetch_url(url: str) -> bytes:
    """One download, one attempt."""
    with urllib.request.urlopen(url, timeout=FETCH_TIMEOUT_S) as answer:
        data: bytes = answer.read()
    return data


class TerrariumTiles:
    """The heights from the Terrarium tiles of `zoom`, cached in
    `<cache_dir>/heights/` as `<zoom>_<x>_<y>.png`, the PNG as downloaded,
    and kept decoded in memory while the object lives.

    `fetch` downloads a tile missing from the cache (fetch_url by default);
    with `download=False` a missing tile is a HeightsNotCachedError."""

    def __init__(
        self,
        cache_dir: Path,
        *,
        download: bool = True,
        fetch: Fetch | None = None,
        zoom: int = ZOOM,
    ) -> None:
        self.folder = cache_dir / "heights"
        self.download = download
        self.fetch = fetch_url if fetch is None else fetch
        self.zoom = zoom
        self._tiles: dict[tuple[int, int], np.ndarray] = {}

    def path(self, x: int, y: int) -> Path:
        return self.folder / f"{self.zoom}_{x}_{y}.png"

    def tiles_of(self, bbox: BBox) -> list[tuple[int, int]]:
        """The tiles an area needs, west to east and north to south."""
        south, west, north, east = bbox
        corners = tile_xy(np.array([[north, west], [south, east]]), self.zoom)
        (x0, y0), (x1, y1) = np.floor(corners).astype(int)
        return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]

    def is_cached(self, bbox: BBox) -> bool:
        return all(self.path(x, y).is_file() for x, y in self.tiles_of(bbox))

    def tile(self, x: int, y: int) -> np.ndarray:
        """The heights of tile (x, y): from memory, the cache or `fetch`."""
        key = (x, y)
        if key not in self._tiles:
            path = self.path(x, y)
            if path.is_file():
                data = path.read_bytes()
            elif not self.download:
                raise HeightsNotCachedError(f"no cached heights for tile {key}")
            else:
                data = self.fetch(TERRARIUM_URL.format(z=self.zoom, x=x, y=y))
                _write_whole(path, data)
            self._tiles[key] = read_tile(data)
        return self._tiles[key]

    def heights(self, points: np.ndarray) -> np.ndarray:
        """The height of each (lat, lon) row, bilinear between the centres
        of the four nearest pixels of its tile (at a tile's edge, its last
        pixels: half a pixel, a few metres)."""
        points = np.asarray(points, dtype=float).reshape(-1, 2)
        out = np.empty(len(points))
        if not len(points):
            return out
        fxy = tile_xy(points, self.zoom)
        txy = np.floor(fxy).astype(int)
        keys = np.unique(txy, axis=0)
        for x, y in keys.tolist():
            sel = (txy[:, 0] == x) & (txy[:, 1] == y)
            h = self.tile(x, y)
            last = TILE_PX - 1 - 1e-9
            px = np.clip((fxy[sel, 0] - x) * TILE_PX - 0.5, 0.0, last - 1)
            py = np.clip((fxy[sel, 1] - y) * TILE_PX - 0.5, 0.0, last - 1)
            i, j = py.astype(int), px.astype(int)
            a, b = py - i, px - j
            out[sel] = (
                h[i, j] * (1 - a) * (1 - b)
                + h[i, j + 1] * (1 - a) * b
                + h[i + 1, j] * a * (1 - b)
                + h[i + 1, j + 1] * a * b
            )
        return out


def _write_whole(path: Path, data: bytes) -> None:
    """Written whole or not at all, as every cache file (ADR-0104)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex[:8]}.part")
    try:
        temporary.write_bytes(data)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def to_latlon(origin: LatLon, xy: np.ndarray) -> np.ndarray:
    """geo.local_to_latlon for (n, 2) rows of (x, y) metres: (lat, lon) rows."""
    lat0, lon0 = origin
    xy = np.asarray(xy, dtype=float).reshape(-1, 2)
    lat = lat0 + np.degrees(xy[:, 1] / EARTH_RADIUS_M)
    lon = lon0 + np.degrees(xy[:, 0] / (EARTH_RADIUS_M * math.cos(math.radians(lat0))))
    return np.column_stack([lat, lon])


# --- The slope ---------------------------------------------------------------


@dataclass(frozen=True)
class SlopeGrid:
    """Heights and slopes on square cells of the plane tangent at `origin`:
    row 0 to the south, column 0 to the west, cell (r, c) from
    (x0 + c·cell, y0 + r·cell)."""

    origin: LatLon
    x0: float
    y0: float
    cell: float
    height: np.ndarray  # [row, col], metres
    slope_deg: np.ndarray  # [row, col], degrees from the horizontal

    def index(self, xy: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """The (row, col) of the cell of each (x, y) row, within the grid."""
        xy = np.asarray(xy, dtype=float).reshape(-1, 2)
        rows, cols = self.height.shape
        c = np.clip(np.floor((xy[:, 0] - self.x0) / self.cell), 0, cols - 1)
        r = np.clip(np.floor((xy[:, 1] - self.y0) / self.cell), 0, rows - 1)
        return r.astype(int), c.astype(int)

    def height_at(self, xy: np.ndarray) -> np.ndarray:
        r, c = self.index(xy)
        return np.asarray(self.height[r, c])

    def slope_at(self, xy: np.ndarray) -> np.ndarray:
        r, c = self.index(xy)
        return np.asarray(self.slope_deg[r, c])

    def cells(self, mask: np.ndarray) -> BaseGeometry:
        """The union of the cells where `mask` is true, as one geometry:
        a run of cells along a row is one rectangle."""
        boxes = []
        for r in range(mask.shape[0]):
            row = mask[r]
            if not row.any():
                continue
            edges = np.flatnonzero(np.diff(np.concatenate([[0], row.astype(int), [0]])))
            y0, y1 = self.y0 + r * self.cell, self.y0 + (r + 1) * self.cell
            for a, b in zip(edges[::2], edges[1::2], strict=True):
                boxes.append(
                    box(self.x0 + a * self.cell, y0, self.x0 + b * self.cell, y1)
                )
        return shapely.unary_union(boxes) if boxes else EMPTY

    def steeper_than(self, degrees: float) -> BaseGeometry:
        """Where the ground is steeper than `degrees`."""
        return self.cells(self.slope_deg > degrees)


def slope_grid(
    origin: LatLon,
    bounds: Bounds,
    heights: Heights,
    cell: float = SLOPE_CELL_M,
) -> SlopeGrid:
    """The heights at the centre of every `cell` of `bounds` (metres around
    `origin`) and the slope of each, from the height differences with its
    neighbours (central differences, one-sided at the edges)."""
    x0, y0, x1, y1 = bounds
    xs = np.arange(x0, x1, cell) + cell / 2.0
    ys = np.arange(y0, y1, cell) + cell / 2.0
    gx, gy = np.meshgrid(xs, ys)
    xy = np.column_stack([gx.ravel(), gy.ravel()])
    h = heights.heights(to_latlon(origin, xy)).reshape(gx.shape)
    if min(h.shape) >= 2:
        dy, dx = np.gradient(h, cell)
        slope = np.degrees(np.arctan(np.hypot(dx, dy)))
    else:
        slope = np.zeros_like(h)
    return SlopeGrid(origin, float(x0), float(y0), float(cell), h, slope)
