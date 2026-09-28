"""The API key and the limit on requests (TASK-081, ADR-0076): without
SHAPEROUTE_API_KEY everything answers as at home."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api import __main__ as entry
from shaperoute_api.access import (
    Access,
    AccessConfigError,
    RateLimiter,
    protect,
)
from shaperoute_api.app import create_app

REPO = Path(__file__).resolve().parents[3]
UNUSED = FileSource(REPO / "unused.graphml")
KEY = "a-long-enough-test-key"
READING = {"text": "   "}


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def guarded(access: Access, clock: Clock | None = None) -> TestClient:
    """A small app with a GET and a POST behind the check."""
    app = FastAPI()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/thing")
    def get_thing() -> dict[str, str]:
        return {"thing": "read"}

    @app.post("/thing")
    def post_thing() -> dict[str, str]:
        return {"thing": "made"}

    protect(app, access, clock=clock or Clock())
    return TestClient(app)


@pytest.fixture(autouse=True)
def no_access_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SHAPEROUTE_API_KEY", raising=False)
    monkeypatch.delenv("SHAPEROUTE_RATE_LIMIT", raising=False)


def test_without_a_key_everything_answers() -> None:
    client = guarded(Access())
    assert client.get("/thing").status_code == 200
    assert client.post("/thing").status_code == 200


def test_with_a_key_the_right_header_passes() -> None:
    client = guarded(Access(key=KEY))
    assert client.get("/thing", headers={"X-API-Key": KEY}).json() == {"thing": "read"}
    assert client.post("/thing", headers={"X-API-Key": KEY}).status_code == 200


@pytest.mark.parametrize("headers", [{}, {"X-API-Key": "wrong"}, {"X-API-Key": ""}])
def test_with_a_key_a_missing_or_wrong_one_is_unauthorized(
    headers: dict[str, str],
) -> None:
    client = guarded(Access(key=KEY))
    for answer in (
        client.get("/thing", headers=headers),
        client.post("/thing", headers=headers),
    ):
        assert answer.status_code == 401
        assert answer.json()["error"]["code"] == "unauthorized"
        assert "X-API-Key" in answer.json()["error"]["message"]


def test_health_needs_no_key() -> None:
    assert guarded(Access(key=KEY)).get("/health").json() == {"status": "ok"}


def test_posts_over_the_limit_wait_and_gets_do_not_count() -> None:
    clock = Clock()
    client = guarded(Access(posts_per_minute=2), clock)
    assert [client.post("/thing").status_code for _ in range(2)] == [200, 200]
    refused = client.post("/thing")
    assert refused.status_code == 429
    assert refused.json()["error"]["code"] == "too_many_requests"
    assert refused.headers["Retry-After"] == "60"
    # Polling a route job is a GET: never limited.
    assert all(client.get("/thing").status_code == 200 for _ in range(10))
    clock.now += 60
    assert client.post("/thing").status_code == 200


def test_the_limit_is_for_each_client() -> None:
    clock = Clock()
    limiter = RateLimiter(1, clock=clock)
    assert limiter.wait_s("phone") == 0
    assert limiter.wait_s("phone") == 60
    assert limiter.wait_s("laptop") == 0
    clock.now += 20
    assert limiter.wait_s("phone") == 40


def test_a_limit_of_zero_is_no_limit() -> None:
    client = guarded(Access(posts_per_minute=0))
    assert all(client.post("/thing").status_code == 200 for _ in range(50))


def test_from_env() -> None:
    assert Access.from_env({}) == Access(key=None, posts_per_minute=30)
    assert Access.from_env(
        {"SHAPEROUTE_API_KEY": f"  {KEY} ", "SHAPEROUTE_RATE_LIMIT": "5"}
    ) == Access(key=KEY, posts_per_minute=5)
    assert Access.from_env({"SHAPEROUTE_API_KEY": ""}).key is None


@pytest.mark.parametrize(
    "environ",
    [
        {"SHAPEROUTE_API_KEY": "short"},
        {"SHAPEROUTE_RATE_LIMIT": "many"},
        {"SHAPEROUTE_RATE_LIMIT": "-1"},
    ],
)
def test_unusable_settings_are_refused(environ: dict[str, str]) -> None:
    with pytest.raises(AccessConfigError):
        Access.from_env(environ)


def test_the_api_reads_the_key_from_the_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SHAPEROUTE_API_KEY", KEY)
    client = TestClient(create_app(UNUSED))
    assert client.get("/health").status_code == 200
    refused = client.post("/shape-readings", json=READING)
    assert refused.status_code == 401
    assert refused.json()["error"]["code"] == "unauthorized"
    # With the key the request reaches the API, which then answers as usual.
    answer = client.post("/shape-readings", json=READING, headers={"X-API-Key": KEY})
    assert answer.status_code != 401


def test_the_api_is_open_without_the_environment() -> None:
    client = TestClient(create_app(UNUSED))
    assert client.post("/shape-readings", json=READING).status_code != 401


def test_start_refuses_a_short_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SHAPEROUTE_API_KEY", "short")
    monkeypatch.setattr(entry.uvicorn, "run", lambda *a, **k: None)
    with pytest.raises(SystemExit, match="too short"):
        entry.main([])


def test_start_says_whether_a_key_is_needed(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(entry.uvicorn, "run", lambda *a, **k: None)
    entry.main([])
    assert "No API key" in capsys.readouterr().out
    monkeypatch.setenv("SHAPEROUTE_API_KEY", KEY)
    entry.main([])
    out = capsys.readouterr().out
    assert "API key required in the X-API-Key header" in out
    assert KEY not in out
