"""The crops of the zone cache, listed and deleted only when asked (TASK-136,
ADR-0108). The command reads names and sizes only: the files here are a few
bytes, not graphs."""

from __future__ import annotations

from pathlib import Path

import pytest

from route_engine.network import BBox
from route_engine.prune_crops import CachedGraph, cached_graphs, crops, main

ZONE: BBox = (46.00000, 11.20000, 46.10000, 11.40000)
CROP: BBox = (46.01000, 11.25000, 46.05000, 11.32000)
CROP_OF_CROP: BBox = (46.02000, 11.26000, 46.04000, 11.30000)
OTHER_ZONE: BBox = (45.40000, 9.10000, 45.50000, 9.30000)
ACROSS: BBox = (46.08000, 11.35000, 46.12000, 11.45000)  # half out of ZONE


def _name(network: str, area: BBox) -> str:
    south, west, north, east = area
    return f"{network}_{south:.5f}_{west:.5f}_{north:.5f}_{east:.5f}"


def _graph(cache_dir: Path, area: BBox, size: int, network: str = "foot") -> Path:
    """A GraphML of `size` bytes and its pickle of as many."""
    path = cache_dir / f"{_name(network, area)}.graphml"
    path.write_bytes(b"g" * size)
    path.with_suffix(".pickle").write_bytes(b"p" * size)
    return path


def _cache(tmp_path: Path) -> Path:
    for area, size in [
        (ZONE, 900),
        (CROP, 300),
        (CROP_OF_CROP, 100),
        (OTHER_ZONE, 700),
        (ACROSS, 200),
    ]:
        _graph(tmp_path, area, size)
    _graph(tmp_path, CROP, 50, network="walk")  # TASK-014's, kept
    (tmp_path / f"{_name('names', CROP)}.json").write_text("{}", encoding="utf-8")
    (tmp_path / "http").mkdir()
    (tmp_path / "http" / "answer.json").write_text("{}", encoding="utf-8")
    return tmp_path


def _names(directory: Path) -> set[str]:
    return {p.name for p in directory.iterdir()}


def test_the_crops_are_the_graphs_a_larger_one_contains(tmp_path: Path) -> None:
    found = crops(cached_graphs(_cache(tmp_path)))

    by_name = {g.path.stem: z.path.stem for g, z in found.items()}
    assert by_name == {
        _name("foot", CROP): _name("foot", ZONE),
        _name("foot", CROP_OF_CROP): _name("foot", ZONE),
    }


def test_without_delete_nothing_is_deleted(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    cache = _cache(tmp_path)
    before = _names(cache)

    assert main([f"--cache-dir={cache}"]) == 0

    assert _names(cache) == before
    out = capsys.readouterr().out
    assert "5 graphs" in out
    assert "2 crops" in out
    assert f"inside {_name('foot', ZONE)}.graphml" in out
    assert "Nothing deleted" in out


def test_delete_takes_only_the_crops_and_their_pickles(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    cache = _cache(tmp_path)
    before = _names(cache)

    assert main([f"--cache-dir={cache}", "--delete"]) == 0

    gone = {
        f"{_name('foot', area)}.{suffix}"
        for area in (CROP, CROP_OF_CROP)
        for suffix in ("graphml", "pickle")
    }
    assert _names(cache) == before - gone
    assert (cache / "http" / "answer.json").exists()
    assert "Deleted 2 crops" in capsys.readouterr().out
    # What stays has nothing left to prune.
    assert crops(cached_graphs(cache)) == {}


def test_a_crop_goes_only_if_a_graph_that_stays_contains_it() -> None:
    """Rounded names let each graph reach 1e-5° past the one containing
    it: the smallest here reaches past the zone, and stays."""
    zone = CachedGraph(Path("zone.graphml"), (46.0, 11.0, 46.1, 11.1))
    middle = CachedGraph(Path("middle.graphml"), (45.999994, 11.01, 46.09, 11.09))
    small = CachedGraph(Path("small.graphml"), (45.999988, 11.02, 46.08, 11.08))

    found = crops([zone, middle, small])

    assert found == {middle: zone}


def test_an_empty_cache_has_no_crops(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([f"--cache-dir={tmp_path}", "--delete"]) == 0
    assert "No crops." in capsys.readouterr().out


def test_a_missing_folder_is_an_error(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([f"--cache-dir={tmp_path / 'missing'}"]) == 2
    assert "is not a folder" in capsys.readouterr().err
