"""Memory a new process can take, on Linux (TASK-147).

The nearby starts (ADR-0071) get one worker each only when it fits in the
memory left. On Linux the free pages (`SC_AVPHYS_PAGES`, MemFree) leave out
the page cache, which the kernel gives back on demand: on the server, with
the zones read from disk, 0.5 GB free of 6.8 GB available, so no nearby
start was ever planned, and no alternatives to choose from (TASK-093).
The kernel's own estimate is MemAvailable; under a cgroup v2 memory limit
(a container, a service), what is left of the limit counts too.
"""

from __future__ import annotations

from pathlib import Path

MEMINFO = Path("/proc/meminfo")
SELF_CGROUP = Path("/proc/self/cgroup")
CGROUP_ROOT = Path("/sys/fs/cgroup")


def available_mb(
    meminfo: Path = MEMINFO,
    self_cgroup: Path = SELF_CGROUP,
    cgroup_root: Path = CGROUP_ROOT,
) -> float | None:
    """Memory available to a new process now, in MB: the kernel's
    MemAvailable, no more than what is left of this process's cgroup limit;
    None where there is no MemAvailable (Linux before 3.14, not Linux)."""
    available_kb = _field(_read(meminfo), "MemAvailable", ":")
    if available_kb is None:
        return None
    mb = available_kb / 1024
    left = _cgroup_left_mb(self_cgroup, cgroup_root)
    return mb if left is None else min(mb, left)


def _cgroup_left_mb(self_cgroup: Path, cgroup_root: Path) -> float | None:
    """What is left of this process's cgroup v2 memory limit, in MB, the
    page cache the kernel can drop (inactive_file) counted as left, as
    `docker stats` does; None without a limit."""
    folder = _cgroup_folder(_read(self_cgroup), cgroup_root)
    if folder is None:
        return None
    limit = _read(folder / "memory.max").strip()
    current = _read(folder / "memory.current").strip()
    if not limit.isdigit() or not current.isdigit():
        return None  # "max": no limit; or no memory controller here
    reclaimable = _field(_read(folder / "memory.stat"), "inactive_file", " ") or 0.0
    return (int(limit) - int(current) + reclaimable) / 2**20


def _cgroup_folder(self_cgroup: str, cgroup_root: Path) -> Path | None:
    """The cgroup v2 folder of this process ("0::/system.slice/x.service";
    "0::/" in a container with its own cgroup namespace)."""
    for line in self_cgroup.splitlines():
        if line.startswith("0::"):
            return cgroup_root / line[3:].strip().lstrip("/")
    return None


def _field(text: str, name: str, separator: str) -> float | None:
    """The number after `name` in "name<separator> number [unit]" lines."""
    for line in text.splitlines():
        key, found, value = line.partition(separator)
        if found and key.strip() == name:
            try:
                return float(value.split()[0])
            except (IndexError, ValueError):
                return None
    return None


def _read(path: Path) -> str:
    try:
        return path.read_text()
    except OSError:
        return ""
