"""The zone cache never keeps half a file under its name (TASK-133, ADR-0104).

A write stopped half-way (Ctrl+C on the API, a restart, a killed script)
is simulated by a writer that writes part of the file, then raises an
exception that `except Exception` does not catch, as KeyboardInterrupt.
No network: the graphs are the Levico fixture, cropped or read.
"""

from __future__ import annotations

import os
import pickle
import shutil
from pathlib import Path
from typing import Any

import osmnx as ox
import pytest

from route_engine.network import (
    OsmnxSource,
    area_around,
    read_graph,
    read_named_roads,
)
from route_engine.sidewalks import NamedRoad

LEVICO = (46.0122, 11.2986)
FIXTURE = Path(__file__).parent / "fixtures" / "levico_walk_1km.graphml"
DANTE = NamedRoad("Via Dante", ((46.0120, 11.2980), (46.0125, 11.2990)))


class _Stopped(BaseException):
    """The process stopped mid-write, like KeyboardInterrupt."""


def _names(directory: Path) -> set[str]:
    return {path.name for path in directory.iterdir()}


def _zone(tmp_path: Path) -> tuple[OsmnxSource, Path]:
    """A cached zone graph around Levico, larger than the areas asked."""
    source = OsmnxSource(tmp_path)
    zone = source.cache_path(area_around([LEVICO], margin_m=2000.0))
    shutil.copy(FIXTURE, zone)
    return source, zone


def test_a_crop_stopped_while_saving_leaves_no_file_under_its_name(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source, zone = _zone(tmp_path)
    bbox = area_around([LEVICO], margin_m=300.0)
    real_save = ox.save_graphml

    def stopped(graph: Any, filepath: Path, **kwargs: Any) -> None:
        real_save(graph, filepath, **kwargs)
        data = Path(filepath).read_bytes()
        Path(filepath).write_bytes(data[: len(data) // 2])
        raise _Stopped

    monkeypatch.setattr(ox, "save_graphml", stopped)
    with pytest.raises(_Stopped):
        source.load(bbox)
    assert _names(tmp_path) == {zone.name, zone.with_suffix(".pickle").name}
    assert source.covering_path(bbox) == zone

    monkeypatch.setattr(ox, "save_graphml", real_save)
    graph = source.load(bbox)
    assert len(graph) > 0
    assert len(read_graph(source.cache_path(bbox))) == len(graph)


def test_a_pickle_stopped_while_written_leaves_no_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / FIXTURE.name
    shutil.copy(FIXTURE, path)

    def stopped(graph: Any, file: Any, protocol: int | None = None) -> None:
        file.write(b"\x80\x05half a graph")
        raise _Stopped

    monkeypatch.setattr(pickle, "dump", stopped)
    with pytest.raises(_Stopped):
        read_graph(path)
    assert _names(tmp_path) == {path.name}

    monkeypatch.undo()
    assert len(read_graph(path)) == len(ox.load_graphml(FIXTURE))
    assert _names(tmp_path) == {path.name, path.with_suffix(".pickle").name}


def test_a_broken_pickle_is_read_from_the_graphml_and_written_again(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / FIXTURE.name
    shutil.copy(FIXTURE, path)
    fast = path.with_suffix(".pickle")
    fast.write_bytes(b"\x80\x05half a graph")
    newer = path.stat().st_mtime + 10
    os.utime(fast, (newer, newer))

    graph = read_graph(path)
    assert len(graph) == len(ox.load_graphml(FIXTURE))

    def no_graphml(*args: object, **kwargs: object) -> None:
        raise AssertionError("the pickle written again was not used")

    monkeypatch.setattr(ox, "load_graphml", no_graphml)
    assert len(read_graph(path)) == len(graph)


def test_a_pickle_that_cannot_be_written_does_not_stop_the_graph(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / FIXTURE.name
    shutil.copy(FIXTURE, path)

    def disk_full(graph: Any, file: Any, protocol: int | None = None) -> None:
        file.write(b"\x80\x05half a graph")
        raise OSError(28, "No space left on device")

    monkeypatch.setattr(pickle, "dump", disk_full)
    assert len(read_graph(path)) == len(ox.load_graphml(FIXTURE))
    assert _names(tmp_path) == {path.name}


def test_named_roads_stopped_while_saved_leave_no_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = OsmnxSource(tmp_path)
    bbox = (46.0, 11.28, 46.02, 11.31)
    answer = {
        "elements": [
            {
                "type": "way",
                "tags": {"name": DANTE.name},
                "geometry": [{"lat": a, "lon": b} for a, b in DANTE.points],
            }
        ]
    }
    monkeypatch.setattr("route_engine.network._overpass", lambda query: answer)
    real_write = Path.write_text

    def stopped(self: Path, data: str, *args: Any, **kwargs: Any) -> int:
        real_write(self, data[: len(data) // 2], *args, **kwargs)
        raise _Stopped

    monkeypatch.setattr(Path, "write_text", stopped)
    with pytest.raises(_Stopped):
        source.named_roads(bbox)
    assert _names(tmp_path) == set()
    assert source.named_roads(bbox, download=False) == []

    monkeypatch.setattr(Path, "write_text", real_write)
    assert source.named_roads(bbox) == [DANTE]
    assert read_named_roads(source.names_path(bbox)) == [DANTE]


def test_files_left_by_a_killed_process_are_never_read(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A process killed outright cannot clean up: the file it was writing
    stays under its temporary name, and must not pass for a cache file."""
    source, zone = _zone(tmp_path)
    bbox = area_around([LEVICO], margin_m=300.0)
    temporary: list[str] = []

    def killed(src: str | Path, dst: str | Path) -> None:
        temporary.append(Path(src).name)
        raise _Stopped

    monkeypatch.setattr(os, "replace", killed)
    with pytest.raises(_Stopped):
        source.load(bbox)
    monkeypatch.undo()
    # Left whole, as if killed between the write and the rename.
    shutil.copy(FIXTURE, tmp_path / temporary[0])
    names = f".{source.names_path(bbox).name}.0a1b2c3d.part"
    (tmp_path / names).write_text('{"roads": []}', encoding="utf-8")

    assert source.covering_path(bbox) == zone
    assert source.named_roads(bbox, download=False) == []
