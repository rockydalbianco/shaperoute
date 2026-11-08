"""The heights of the Terrarium tiles and the slopes (TASK-413, ADR-0342; the
shared module of ADR-0300 part G). Tiles written here, fetched by a fake:
no network."""

from __future__ import annotations

import io
import math
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from route_engine.geo import latlon_to_local_array
from route_engine.heights import (
    TILE_PX,
    HeightsNotCachedError,
    SlopeGrid,
    TerrariumTiles,
    decode_terrarium,
    encode_terrarium,
    read_tile,
    slope_grid,
    tile_xy,
    to_latlon,
)

ORIGIN = (46.0, 11.0)


def _png(heights: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(encode_terrarium(heights), "RGB").save(buffer, format="PNG")
    return buffer.getvalue()


class _Fetch:
    """Tiles of a height that grows by `step` metres a pixel eastward,
    from `base`, counting the downloads."""

    def __init__(self, base: float = 1000.0, step: float = 1.0) -> None:
        self.base, self.step = base, step
        self.urls: list[str] = []

    def __call__(self, url: str) -> bytes:
        self.urls.append(url)
        cols = np.arange(TILE_PX, dtype=float)
        return _png(np.tile(self.base + self.step * cols, (TILE_PX, 1)))


class _Plane:
    """Heights rising `deg` degrees eastward from `origin`, with a floor."""

    def __init__(self, deg: float, from_x: float | None = None) -> None:
        self.rise = math.tan(math.radians(deg))
        self.from_x = from_x

    def heights(self, points: np.ndarray) -> np.ndarray:
        x = latlon_to_local_array(ORIGIN, np.asarray(points, dtype=float))[:, 0]
        if self.from_x is not None:
            x = np.maximum(x - self.from_x, 0.0)
        return 1500.0 + self.rise * x


def test_terrarium_encodes_and_decodes_to_a_256th_of_a_metre() -> None:
    heights = np.array([[-10.5, 0.0], [1555.25, 8848.0]])
    assert np.allclose(decode_terrarium(encode_terrarium(heights)), heights)
    # The documented example: rgb (128, 0, 0) is 0 m.
    assert decode_terrarium(np.array([128, 0, 0])) == 0.0
    tile = read_tile(_png(np.full((TILE_PX, TILE_PX), 1234.5)))
    assert tile.shape == (TILE_PX, TILE_PX)
    assert np.allclose(tile, 1234.5)


def test_the_tile_of_a_point_is_web_mercator() -> None:
    assert np.allclose(tile_xy(np.array([[0.0, 0.0]]), 1), [[1.0, 1.0]])
    # Trento at zoom 13, as the textbook formula with sec and log gives it.
    lat = math.radians(46.0670)
    expected_y = (1 - math.log(math.tan(lat) + 1 / math.cos(lat)) / math.pi) / 2
    x, y = tile_xy(np.array([[46.0670, 11.1210]]), 13)[0]
    assert x == pytest.approx((11.1210 + 180) / 360 * 2**13)
    assert y == pytest.approx(expected_y * 2**13)
    assert (int(x), int(y)) == (4349, 2912)


def test_to_latlon_inverts_the_local_plane() -> None:
    xy = np.array([[0.0, 0.0], [1200.0, -800.0], [-3000.0, 2500.0]])
    back = latlon_to_local_array(ORIGIN, to_latlon(ORIGIN, xy))
    assert np.allclose(back, xy, atol=1e-6)


def test_a_tile_is_downloaded_once_and_read_from_the_cache(tmp_path: Path) -> None:
    fetch = _Fetch()
    tiles = TerrariumTiles(tmp_path, fetch=fetch)
    points = to_latlon(ORIGIN, np.array([[0.0, 0.0], [10.0, 0.0], [20.0, 5.0]]))
    first = tiles.heights(points)
    again = tiles.heights(points)
    assert len(fetch.urls) == 1 and "/terrarium/13/" in fetch.urls[0]
    assert np.array_equal(first, again)
    # Heights between pixels are bilinear: 1000 m plus a metre a pixel east.
    assert np.all((first >= 1000.0) & (first <= 1000.0 + TILE_PX))
    assert first[0] < first[1] < first[2]
    assert len(list((tmp_path / "heights").glob("13_*.png"))) == 1
    # Another object, the network refused: the cache serves.
    cached = TerrariumTiles(tmp_path, download=False)
    assert np.allclose(cached.heights(points), first)
    assert cached.is_cached((45.999, 10.999, 46.001, 11.001))


def test_a_tile_missing_without_download_is_an_error(tmp_path: Path) -> None:
    tiles = TerrariumTiles(tmp_path, download=False)
    assert not tiles.is_cached((45.999, 10.999, 46.001, 11.001))
    with pytest.raises(HeightsNotCachedError):
        tiles.heights(np.array([ORIGIN]))


def test_the_tiles_of_an_area_cover_it(tmp_path: Path) -> None:
    tiles = TerrariumTiles(tmp_path)
    one = tiles.tiles_of((45.999, 10.999, 46.001, 11.001))
    assert len(one) == 1
    # About 6.6 km at zoom 13 (≈ 3.4 km a tile at 46° N): 3-4 tiles a side.
    wide = tiles.tiles_of((45.97, 10.957, 46.03, 11.043))
    assert 9 <= len(wide) <= 16
    assert len(set(wide)) == len(wide)


def test_a_plane_has_its_slope_everywhere() -> None:
    grid = slope_grid(ORIGIN, (-500.0, -500.0, 500.0, 500.0), _Plane(20.0))
    assert grid.height.shape == (40, 40)
    assert np.allclose(grid.slope_deg, 20.0, atol=0.01)
    assert grid.steeper_than(25.0).is_empty
    assert grid.steeper_than(15.0).area == pytest.approx(1000.0 * 1000.0)


def test_the_steep_cells_are_where_the_ground_is_steep() -> None:
    # Flat to the west of x = 0, 35° to the east.
    grid = slope_grid(ORIGIN, (-500.0, -500.0, 500.0, 500.0), _Plane(35.0, 0.0))
    steep = grid.steeper_than(25.0)
    x0, _, x1, _ = steep.bounds
    assert -50.0 <= x0 <= 0.0 and x1 == 500.0
    assert grid.slope_at(np.array([[-300.0, 0.0]]))[0] == pytest.approx(0.0)
    assert grid.slope_at(np.array([[300.0, 0.0]]))[0] == pytest.approx(35.0, abs=0.01)
    assert grid.height_at(np.array([[-300.0, 0.0]]))[0] == pytest.approx(1500.0)


def test_cells_join_along_a_row() -> None:
    grid = SlopeGrid(ORIGIN, 0.0, 0.0, 25.0, np.zeros((2, 4)), np.zeros((2, 4)))
    mask = np.array([[True, True, False, True], [False, False, False, False]])
    cells = grid.cells(mask)
    assert cells.area == pytest.approx(3 * 25.0 * 25.0)
    assert grid.cells(np.zeros((2, 4), dtype=bool)).is_empty
    # Points outside the grid read its nearest edge cell.
    r, c = grid.index(np.array([[-10.0, 1000.0], [60.0, 10.0]]))
    assert r.tolist() == [1, 0] and c.tolist() == [0, 2]
