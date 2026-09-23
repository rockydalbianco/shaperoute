"""python -m shaperoute_api: only this PC by default, the Wi-Fi with --lan."""

from __future__ import annotations

from typing import Any

import pytest

from shaperoute_api import __main__ as entry


@pytest.fixture
def served(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    calls: dict[str, Any] = {}

    def run(app: object, host: str, port: int) -> None:
        calls.update(host=host, port=port)

    monkeypatch.setattr(entry.uvicorn, "run", run)
    monkeypatch.setattr(entry, "lan_address", lambda: "192.168.1.23")
    return calls


def test_only_this_pc_by_default(served: dict[str, Any]) -> None:
    entry.main([])
    assert served == {"host": "127.0.0.1", "port": 8000}


def test_lan_opens_to_the_wifi_and_prints_the_phone_address(
    served: dict[str, Any], capsys: pytest.CaptureFixture[str]
) -> None:
    entry.main(["--lan", "--port", "8123"])
    assert served == {"host": "0.0.0.0", "port": 8123}
    assert "http://192.168.1.23:8123/health" in capsys.readouterr().out
