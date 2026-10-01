"""The memory a new process can take on Linux (TASK-147), from files laid
out as /proc and /sys/fs/cgroup lay them out."""

from __future__ import annotations

from pathlib import Path

import pytest

from route_engine.memory import available_mb
from route_engine.nearby_starts import MEMORY_RESERVE_MB, workers_that_fit

# The server's /proc/meminfo on 2026-10-02: most of the memory is page
# cache, the zones read from disk.
SERVER_MEMINFO = """\
MemTotal:        7937220 kB
MemFree:          585936 kB
MemAvailable:    6940580 kB
Buffers:           46084 kB
Cached:          6327160 kB
"""
SERVER_AVAILABLE_MB = 6940580 / 1024


def _layout(
    tmp_path: Path,
    meminfo: str = SERVER_MEMINFO,
    self_cgroup: str = "0::/\n",
    cgroup: dict[str, str] | None = None,
    folder: str = "",
) -> dict[str, Path]:
    (tmp_path / "meminfo").write_text(meminfo)
    (tmp_path / "self_cgroup").write_text(self_cgroup)
    root = tmp_path / "cgroup"
    (root / folder).mkdir(parents=True)
    for name, text in (cgroup or {}).items():
        (root / folder / name).write_text(text)
    return {
        "meminfo": tmp_path / "meminfo",
        "self_cgroup": tmp_path / "self_cgroup",
        "cgroup_root": root,
    }


def test_the_page_cache_counts_as_available(tmp_path: Path) -> None:
    assert available_mb(**_layout(tmp_path)) == pytest.approx(SERVER_AVAILABLE_MB)


def test_on_the_server_the_nearby_starts_fit_again(tmp_path: Path) -> None:
    # MemFree alone (572 MB) is below the reserve: no worker at all.
    assert workers_that_fit(3, 50.0, 585936 / 1024) == 0
    assert workers_that_fit(3, 50.0, available_mb(**_layout(tmp_path))) == 3


def test_a_container_without_a_limit(tmp_path: Path) -> None:
    cgroup = {"memory.max": "max\n", "memory.current": "238927872\n"}
    found = available_mb(**_layout(tmp_path, cgroup=cgroup))
    assert found == pytest.approx(SERVER_AVAILABLE_MB)


def test_a_container_limit_caps_the_memory(tmp_path: Path) -> None:
    mb = 2**20
    cgroup = {
        "memory.max": f"{2048 * mb}\n",
        "memory.current": f"{1500 * mb}\n",
        "memory.stat": f"anon {1000 * mb}\ninactive_file {300 * mb}\n",
    }
    found = available_mb(**_layout(tmp_path, cgroup=cgroup))
    assert found == pytest.approx(2048 - 1500 + 300)
    assert found < MEMORY_RESERVE_MB  # not room for a worker


def test_the_limit_of_this_process_cgroup(tmp_path: Path) -> None:
    mb = 2**20
    cgroup = {"memory.max": f"{3000 * mb}\n", "memory.current": f"{1000 * mb}\n"}
    layout = _layout(
        tmp_path,
        self_cgroup="0::/system.slice/shaperoute.service\n",
        cgroup=cgroup,
        folder="system.slice/shaperoute.service",
    )
    assert available_mb(**layout) == pytest.approx(2000)


def test_no_mem_available_is_not_known(tmp_path: Path) -> None:
    layout = _layout(tmp_path, meminfo="MemTotal: 7937220 kB\nMemFree: 1 kB\n")
    assert available_mb(**layout) is None


def test_no_proc_is_not_known(tmp_path: Path) -> None:
    missing = tmp_path / "missing"
    assert available_mb(missing, missing, missing) is None
