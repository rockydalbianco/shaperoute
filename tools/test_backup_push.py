"""Deterministic tests for the Storage Box push of deploy/backup.sh (TASK-122,
ADR-0123, update of 2026-10-02): the database copies mirrored, the search
events added to, nothing done without a Storage Box. No network and no
database: a stand-in for ssh runs the Storage Box side of rsync here."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy" / "backup.sh"

pytestmark = pytest.mark.skipif(
    shutil.which("rsync") is None or shutil.which("bash") is None,
    reason="needs bash and rsync",
)


def _write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return path


def _push(
    tmp_path: Path, box: bool = True, reachable: bool = True
) -> subprocess.CompletedProcess[str]:
    stand_in = tmp_path / "ssh"
    # rsync calls "<ssh> [-l user] <host> rsync --server …" (Linux splits
    # user@host, macOS does not): drop them and run the rest in the Storage
    # Box folder; or fail as a box out of reach does.
    body = (
        'if [ "$1" = "-l" ]; then shift 2; fi\nshift\nexec "$@"\n'
        if reachable
        else "exit 255\n"
    )
    stand_in.write_text("#!/bin/sh\n" + body)
    stand_in.chmod(0o755)
    remote = tmp_path / "box"
    remote.mkdir(exist_ok=True)
    env = {
        **os.environ,
        "BACKUP_DIR": str(tmp_path / "server" / "backups"),
        "INSIGHTS_DIR": str(tmp_path / "server" / "insights"),
        "STORAGEBOX_HOST": "u123456.your-storagebox.de" if box else "",
        "STORAGEBOX_USER": "u123456" if box else "",
        "BACKUP_SSH": str(stand_in),
    }
    return subprocess.run(
        ["bash", str(SCRIPT), "push"],
        env=env,
        cwd=remote,
        capture_output=True,
        text=True,
    )


def _names(folder: Path) -> list[str]:
    return sorted(p.name for p in folder.iterdir())


def test_the_copies_and_the_events_go_to_the_box(tmp_path: Path) -> None:
    server = tmp_path / "server"
    _write(server / "backups" / "shaperoute-2026-10-02T0200Z.dump", "today")
    _write(server / "backups" / "shaperoute-2026-10-01T0200Z.dump", "yesterday")
    # A copy being written, under its hidden name, stays here.
    _write(server / "backups" / ".shaperoute-2026-10-03T0200Z.dump.part", "half")
    _write(server / "insights" / "events-2026-10.jsonl", '{"kind": "route"}\n')

    result = _push(tmp_path)

    assert result.returncode == 0, result.stderr
    box = tmp_path / "box"
    assert _names(box / "sgrava-db") == [
        "shaperoute-2026-10-01T0200Z.dump",
        "shaperoute-2026-10-02T0200Z.dump",
    ]
    assert (box / "sgrava-insights" / "events-2026-10.jsonl").exists()
    assert "push: 2 copies and the search events" in result.stdout


def test_a_copy_deleted_here_goes_from_the_box_and_events_stay(
    tmp_path: Path,
) -> None:
    server = tmp_path / "server"
    _write(server / "backups" / "shaperoute-2026-10-02T0200Z.dump", "today")
    _write(server / "insights" / "events-2026-10.jsonl", "{}\n")
    box = tmp_path / "box"
    # Older than 13 days: the server deleted it last night.
    _write(box / "sgrava-db" / "shaperoute-2026-09-18T0200Z.dump", "old")
    # Something else in the folder is not the push's to delete.
    _write(box / "sgrava-db" / "notes.txt", "kept")
    _write(box / "sgrava-insights" / "events-2026-08.jsonl", "{}\n")

    assert _push(tmp_path).returncode == 0

    assert _names(box / "sgrava-db") == [
        "notes.txt",
        "shaperoute-2026-10-02T0200Z.dump",
    ]
    assert _names(box / "sgrava-insights") == [
        "events-2026-08.jsonl",
        "events-2026-10.jsonl",
    ]


def test_without_a_box_the_copies_stay_here(tmp_path: Path) -> None:
    _write(tmp_path / "server" / "backups" / "shaperoute-2026-10-02T0200Z.dump", "x")

    result = _push(tmp_path, box=False)

    assert result.returncode == 0
    assert "the copies stay on this server" in result.stdout
    assert _names(tmp_path / "box") == []


def test_a_box_out_of_reach_is_a_failure(tmp_path: Path) -> None:
    _write(tmp_path / "server" / "backups" / "shaperoute-2026-10-02T0200Z.dump", "x")

    result = _push(tmp_path, reachable=False)

    assert result.returncode != 0
    assert (tmp_path / "server" / "backups").exists()
