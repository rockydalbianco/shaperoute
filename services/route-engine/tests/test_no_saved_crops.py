"""An area inside a cached zone is cropped in memory, never saved (TASK-136,
ADR-0108).

The CLI and the catalog script used to save every crop beside its zone,
3 to 170 MB for each new start: 346 files, 17.9 GB, on the Mac on
2026-10-01. A new zone, downloaded, is still saved. No network: the zone
is the Levico fixture, saved under the name of a larger area.
"""

from __future__ import annotations

import shutil
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import osmnx as ox
import pytest

import route_engine.network as network
from route_engine.__main__ import main
from route_engine.network import OsmnxSource, area_around, crop, read_graph

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"


def _names(directory: Path) -> set[str]:
    return {path.name for path in directory.iterdir()}


def _zone_files(zone: Path) -> set[str]:
    """A zone's GraphML and the pickle written the first time it is read."""
    return {zone.name, zone.with_suffix(".pickle").name}


def _zone(cache_dir: Path) -> tuple[OsmnxSource, Path]:
    """A cached zone graph around Levico, larger than the areas asked."""
    cache_dir.mkdir(exist_ok=True)
    source = OsmnxSource(cache_dir)
    zone = source.cache_path(area_around([LEVICO], margin_m=2000.0))
    shutil.copy(FIXTURE, zone)
    return source, zone


@pytest.fixture
def no_download(monkeypatch: pytest.MonkeyPatch) -> None:
    def refused(*args: object, **kwargs: object) -> None:
        raise AssertionError("graph was downloaded instead of cropped from cache")

    monkeypatch.setattr(ox, "graph_from_bbox", refused)


@pytest.mark.usefixtures("no_download")
def test_an_area_inside_a_cached_zone_writes_no_file(tmp_path: Path) -> None:
    source, zone = _zone(tmp_path)
    inner = area_around([LEVICO], margin_m=300.0)

    graph = source.load(inner)

    assert len(graph) > 0
    assert _names(tmp_path) == _zone_files(zone)
    assert source.covering_path(inner) == zone


@pytest.mark.usefixtures("no_download")
def test_the_crop_is_the_one_crop_gives_on_the_zone(tmp_path: Path) -> None:
    source, zone = _zone(tmp_path)
    inner = area_around([LEVICO], margin_m=300.0)

    graph = source.load(inner)
    expected = crop(read_graph(zone), inner)

    assert list(graph.nodes(data=True)) == list(expected.nodes(data=True))
    assert list(graph.edges(keys=True, data=True)) == list(
        expected.edges(keys=True, data=True)
    )


@pytest.mark.usefixtures("no_download")
def test_the_same_area_twice_is_cropped_twice_the_same(tmp_path: Path) -> None:
    source, zone = _zone(tmp_path)
    inner = area_around([LEVICO], margin_m=300.0)

    first = source.load(inner)
    second = source.load(inner)

    assert list(first.edges(keys=True)) == list(second.edges(keys=True))
    assert _names(tmp_path) == _zone_files(zone)


@pytest.mark.usefixtures("no_download")
def test_a_route_from_the_cli_inside_a_cached_zone_adds_no_file(
    tmp_path: Path,
) -> None:
    cache_dir = tmp_path / "cache"
    _, zone = _zone(cache_dir)
    out = tmp_path / "circle.gpx"

    code = main(
        [
            "--shape=circle",
            "--distance=1000",
            "--start=46.0122,11.2986",
            "--no-optimize",
            f"--cache-dir={cache_dir}",
            f"--out={out}",
        ]
    )

    assert code == 0
    assert out.exists()
    assert _names(cache_dir) == _zone_files(zone)


@contextmanager
def _anywhere(url: str) -> Iterator[None]:
    yield None


def test_a_new_zone_is_downloaded_once_and_saved(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    downloads: list[Any] = []

    def download(*args: object, **kwargs: Any) -> Any:
        downloads.append(kwargs["bbox"])
        return ox.load_graphml(FIXTURE)

    monkeypatch.setattr(ox, "graph_from_bbox", download)
    monkeypatch.setattr(network, "reachable", _anywhere)
    # load() points OSMnx's own cache inside the cache folder: put it back.
    monkeypatch.setattr(ox.settings, "cache_folder", ox.settings.cache_folder)
    source = OsmnxSource(tmp_path)
    bbox = area_around([LEVICO], margin_m=300.0)

    graph = source.load(bbox)
    again = source.load(bbox)

    zone = source.cache_path(bbox)
    assert len(downloads) == 1
    assert _names(tmp_path) == _zone_files(zone)
    assert len(again) == len(graph) == len(read_graph(zone))
