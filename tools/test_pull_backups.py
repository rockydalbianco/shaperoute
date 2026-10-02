"""Deterministic tests for deploy/mac/pull-backups.sh (TASK-122, ADR-0123):
the database copies mirrored from the server, the old ones deleted on the Mac
too, the search events added to. No network: a stand-in for ssh runs the
server side of rsync on this machine."""

from __future__ import annotations

import os
import shutil
import stat
import subprocess
import time
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy" / "mac" / "pull-backups.sh"
DAY_S = 24 * 60 * 60

pytestmark = pytest.mark.skipif(
    shutil.which("rsync") is None or shutil.which("bash") is None,
    reason="needs bash and rsync",
)


def _write(path: Path, text: str, age_days: float = 0) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    when = time.time() - age_days * DAY_S
    os.utime(path, (when, when))
    return path


def _pull(tmp_path: Path, ssh: str = "local") -> subprocess.CompletedProcess[str]:
    stand_in = tmp_path / f"ssh-{ssh}"
    # rsync calls "<ssh> <host> rsync --server …": drop the host, run the rest
    # here; or fail as an unreachable server does.
    body = 'shift\nexec "$@"\n' if ssh == "local" else "exit 255\n"
    stand_in.write_text("#!/bin/sh\n" + body)
    stand_in.chmod(0o755)
    env = {
        **os.environ,
        "SHAPEROUTE_BACKUP_SERVER": "server",
        "SHAPEROUTE_BACKUP_REMOTE_DIR": str(tmp_path / "server"),
        "SHAPEROUTE_BACKUP_DIR": str(tmp_path / "mac"),
        "SHAPEROUTE_BACKUP_SSH": str(stand_in),
    }
    return subprocess.run(
        ["bash", str(SCRIPT)], env=env, capture_output=True, text=True
    )


def _names(folder: Path) -> list[str]:
    return sorted(p.name for p in folder.iterdir())


def test_the_copies_come_to_the_mac(tmp_path: Path) -> None:
    server = tmp_path / "server"
    _write(server / "backups" / "shaperoute-2026-10-02T0200Z.dump", "today")
    _write(server / "backups" / "shaperoute-2026-10-01T0200Z.dump", "1", age_days=1)
    # A copy being written, under its hidden name, stays on the server.
    _write(server / "backups" / ".shaperoute-2026-10-03T0200Z.dump.part", "half")
    _write(server / "insights" / "events-2026-10.jsonl", '{"kind": "route"}\n')

    result = _pull(tmp_path)

    assert result.returncode == 0, result.stderr
    mac = tmp_path / "mac"
    assert _names(mac / "db") == [
        "shaperoute-2026-10-01T0200Z.dump",
        "shaperoute-2026-10-02T0200Z.dump",
    ]
    assert (mac / "insights" / "events-2026-10.jsonl").read_text().startswith("{")
    assert stat.S_IMODE(mac.stat().st_mode) == 0o700
    assert "pulled: 2 database copies" in result.stdout


def test_old_copies_go_from_the_mac_too(tmp_path: Path) -> None:
    server = tmp_path / "server"
    _write(server / "backups" / "shaperoute-2026-10-02T0200Z.dump", "today")
    # Still on a server whose nightly run has not deleted it yet.
    _write(server / "backups" / "shaperoute-2026-09-18T0200Z.dump", "old", 14)
    _write(server / "insights" / "events-2026-09.jsonl", "{}\n")
    mac_db = tmp_path / "mac" / "db"
    # Deleted on the server since the last pull.
    _write(mac_db / "shaperoute-2026-09-25T0200Z.dump", "gone", age_days=7)
    _write(tmp_path / "mac" / "insights" / "events-2026-08.jsonl", "{}\n", 40)

    assert _pull(tmp_path).returncode == 0

    assert _names(mac_db) == ["shaperoute-2026-10-02T0200Z.dump"]
    # The search events are only added to.
    assert _names(tmp_path / "mac" / "insights") == [
        "events-2026-08.jsonl",
        "events-2026-09.jsonl",
    ]


def test_a_server_out_of_reach_still_ages_the_copies(tmp_path: Path) -> None:
    mac_db = tmp_path / "mac" / "db"
    _write(mac_db / "shaperoute-2026-09-10T0200Z.dump", "old", age_days=22)
    _write(mac_db / "shaperoute-2026-09-30T0200Z.dump", "recent", age_days=2)

    result = _pull(tmp_path, ssh="down")

    assert result.returncode != 0
    assert _names(mac_db) == ["shaperoute-2026-09-30T0200Z.dump"]
