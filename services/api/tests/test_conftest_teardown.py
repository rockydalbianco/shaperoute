"""The throwaway test database leaves nothing behind (TASK-274): the
container goes, and with it the anonymous volume of its data."""

from __future__ import annotations

import subprocess
from typing import Any

import conftest
import pytest

CONTAINER = "c0ffee"


class _Docker:
    """Answers the docker commands of `_docker_server` without docker."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def __call__(self, args: list[str], **_: Any) -> subprocess.CompletedProcess[str]:
        self.calls.append(args)
        out = {"run": CONTAINER + "\n", "port": "127.0.0.1:55432\n"}.get(args[1], "")
        return subprocess.CompletedProcess(args, 0, stdout=out, stderr="")


@pytest.fixture
def docker(monkeypatch: pytest.MonkeyPatch) -> _Docker:
    fake = _Docker()
    monkeypatch.setattr(conftest.subprocess, "run", fake)
    return fake


def test_the_container_goes_with_its_volume(
    docker: _Docker, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(conftest, "_wait_for", lambda url: None)
    server = conftest._docker_server()
    assert next(server) == "postgresql://postgres:test-only@127.0.0.1:55432/postgres"
    with pytest.raises(StopIteration):
        next(server)
    assert "--rm" in docker.calls[0]
    assert docker.calls[-1] == ["docker", "rm", "-f", "-v", CONTAINER]


def test_a_server_that_never_starts_is_removed_too(
    docker: _Docker, monkeypatch: pytest.MonkeyPatch
) -> None:
    def never(url: str) -> None:
        raise TimeoutError(url)

    monkeypatch.setattr(conftest, "_wait_for", never)
    with pytest.raises(TimeoutError):
        next(conftest._docker_server())
    assert docker.calls[-1] == ["docker", "rm", "-f", "-v", CONTAINER]
