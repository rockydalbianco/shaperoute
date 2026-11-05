"""Web Risk for the links of the items (TASK-394, ADR-0333, docs/API.md,
«Outfit tags»), without network: Google is FakeGoogle.

A link is canonicalized and hashed as Web Risk's documentation says; the
lists are kept from RESET and DIFF answers, checked with their SHA-256; a
link whose hash is listed is unsafe, one with a prefix that matches and no
full hash is safe, and asked once until negativeExpireTime; without a key,
with old lists or with Google not answering, "unknown". **Only hash
prefixes ever reach Google**, and the key goes in a header, never in an
address."""

from __future__ import annotations

import base64
import hashlib
import logging
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from shaperoute_api import web_risk
from shaperoute_api.web_risk import (
    THREAT_TYPES,
    GoogleTransport,
    HashList,
    WebRisk,
    WebRiskError,
    canonical,
    expressions,
)

NOW = datetime(2026, 11, 5, 12, 0, tzinfo=UTC)
PHISHING = "https://login.example-bank.test/secure/account?step=1"
CLEAN = "https://www.nike.com/it/t/pegasus-41?size=44"


def b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def sha(text: str) -> bytes:
    return hashlib.sha256(text.encode("ascii")).digest()


def stamp(at: datetime) -> str:
    """RFC 3339 with nanoseconds, as Google writes it."""
    return at.strftime("%Y-%m-%dT%H:%M:%S.000000000Z")


class Clock:
    def __init__(self) -> None:
        self.t = NOW

    def __call__(self) -> datetime:
        return self.t


class FakeGoogle:
    """Web Risk with lists of our own: no network, the same answers. It
    keeps every call, to show what would have left the server."""

    def __init__(
        self,
        listed: Iterable[str] = (),
        threat: str = "SOCIAL_ENGINEERING",
        prefixes_only: Iterable[str] = (),
    ) -> None:
        # The full hashes of the expressions listed, and prefixes of
        # expressions that match no full hash.
        self.full = {sha(expression): threat for expression in listed}
        self.loose = {sha(expression)[:4] for expression in prefixes_only}
        self.diffs: list[tuple[str, str]] = []
        self.searches: list[tuple[bytes, tuple[str, ...]]] = []
        self.down = False

    def prefixes(self, threat: str) -> list[bytes]:
        mine = {h[:4] for h, t in self.full.items() if t == threat}
        if threat == "MALWARE":
            mine |= self.loose
        return sorted(mine)

    def compute_diff(self, threat_type: str, version_token: str) -> dict[str, Any]:
        self.diffs.append((threat_type, version_token))
        if self.down:
            raise OSError("no network")
        prefixes = self.prefixes(threat_type)
        answer: dict[str, Any] = {
            "responseType": "RESET",
            "newVersionToken": b64(b"v1"),
            "checksum": {"sha256": b64(hashlib.sha256(b"".join(prefixes)).digest())},
            "recommendedNextDiff": stamp(NOW + timedelta(minutes=30)),
        }
        if prefixes:
            answer["additions"] = {
                "rawHashes": [{"prefixSize": 4, "rawHashes": b64(b"".join(prefixes))}]
            }
        return answer

    def search_hashes(
        self, prefix: bytes, threat_types: Iterable[str]
    ) -> dict[str, Any]:
        self.searches.append((prefix, tuple(threat_types)))
        if self.down:
            raise OSError("no network")
        return {
            "threats": [
                {
                    "threatTypes": [threat],
                    "hash": b64(full),
                    "expireTime": stamp(NOW + timedelta(minutes=5)),
                }
                for full, threat in self.full.items()
                if full.startswith(prefix)
            ],
            "negativeExpireTime": stamp(NOW + timedelta(minutes=10)),
        }


def ready_risk(google: FakeGoogle, clock: Clock | None = None) -> WebRisk:
    risk = WebRisk(google, clock or Clock())
    risk.update()
    assert risk.ready()
    return risk


# --- A link as Web Risk hashes it ---

# From Web Risk's «URLs and hashing», «Canonicalization».
CANONICAL = [
    ("http://host/%25%32%35", "http://host/%25"),
    ("http://host/%25%32%35%25%32%35", "http://host/%25%25"),
    ("http://host/%2525252525252525", "http://host/%25"),
    ("http://host/asdf%25%32%35asd", "http://host/asdf%25asd"),
    ("http://host/%%%25%32%35asd%%", "http://host/%25%25%25asd%25%25"),
    ("http://www.google.com/", "http://www.google.com/"),
    (
        "http://%31%36%38%2e%31%38%38%2e%39%39%2e%32%36/%2E%73%65%63%75%72%65/"
        "%77%77%77%2E%65%62%61%79%2E%63%6F%6D/",
        "http://168.188.99.26/.secure/www.ebay.com/",
    ),
    (
        "http://host%23.com/%257Ea%2521b%2540c%2523d%2524e%25f%255E00%252611"
        "%252A22%252833%252944_55%252B",
        "http://host%23.com/~a!b@c%23d$e%25f^00&11*22(33)44_55+",
    ),
    ("http://www.GOOgle.com/", "http://www.google.com/"),
    ("http://www.google.com.../", "http://www.google.com/"),
    ("http://www.google.com/foo\tbar\rbaz\n2", "http://www.google.com/foobarbaz2"),
    ("http://www.google.com/q?", "http://www.google.com/q?"),
    ("http://www.google.com/q?r?", "http://www.google.com/q?r?"),
    ("http://www.google.com/q?r?s", "http://www.google.com/q?r?s"),
    ("http://evil.com/foo#bar#baz", "http://evil.com/foo"),
    ("http://evil.com/foo;", "http://evil.com/foo;"),
    ("http://evil.com/foo?bar;", "http://evil.com/foo?bar;"),
    ("http://notrailingslash.com", "http://notrailingslash.com/"),
    ("  http://www.google.com/  ", "http://www.google.com/"),
    ("http://www.google.com/blah/..", "http://www.google.com/"),
    ("http://host.com//twoslashes?more//slashes", "http://host.com/twoslashes?more//slashes"),
    ("http://host.com/ab%23cd", "http://host.com/ab%23cd"),
]


@pytest.mark.parametrize(("given", "wanted"), CANONICAL)
def test_a_link_is_canonical_as_web_risk_says(given: str, wanted: str) -> None:
    assert canonical(given) == wanted


def test_the_expressions_are_web_risks() -> None:
    # The two examples of «Suffix and prefix expressions».
    assert expressions("http://a.b.c/1/2.html?param=1") == [
        "a.b.c/1/2.html?param=1",
        "a.b.c/1/2.html",
        "a.b.c/",
        "a.b.c/1/",
        "b.c/1/2.html?param=1",
        "b.c/1/2.html",
        "b.c/",
        "b.c/1/",
    ]
    assert expressions("http://a.b.c.d.e.f.g/1.html") == [
        "a.b.c.d.e.f.g/1.html",
        "a.b.c.d.e.f.g/",
        "c.d.e.f.g/1.html",
        "c.d.e.f.g/",
        "d.e.f.g/1.html",
        "d.e.f.g/",
        "e.f.g/1.html",
        "e.f.g/",
        "f.g/1.html",
        "f.g/",
    ]
    assert expressions("http://1.2.3.4/1/") == ["1.2.3.4/1/", "1.2.3.4/"]
    # At most four paths from the root.
    deep = expressions("http://a.b/1/2/3/4/5/6.html")
    assert deep == [
        "a.b/1/2/3/4/5/6.html",
        "a.b/",
        "a.b/1/",
        "a.b/1/2/",
        "a.b/1/2/3/",
    ]


# --- The lists ---


def _answer(prefixes: list[bytes], kind: str = "RESET", **more: Any) -> dict[str, Any]:
    body = sorted(prefixes)
    return {
        "responseType": kind,
        "additions": {"rawHashes": [{"prefixSize": 4, "rawHashes": b64(b"".join(body))}]},
        "newVersionToken": "dG9rZW4=",
        "checksum": {"sha256": b64(hashlib.sha256(b"".join(body)).digest())},
        **more,
    }


def test_a_list_is_reset_then_changed() -> None:
    first = HashList().applied(_answer([b"cccc", b"aaaa", b"bbbb"]), NOW)
    assert first.prefixes == (b"aaaa", b"bbbb", b"cccc")
    assert first.version == "dG9rZW4=" and first.updated_at == NOW
    # The indices are those of the sorted list before the additions.
    after = sorted([b"aaaa", b"cccc", b"dddd"])
    diff = {
        "responseType": "DIFF",
        "removals": {"rawIndices": {"indices": [1]}},
        "additions": {"rawHashes": [{"prefixSize": 4, "rawHashes": b64(b"dddd")}]},
        "newVersionToken": "djI=",
        "checksum": {"sha256": b64(hashlib.sha256(b"".join(after)).digest())},
        "recommendedNextDiff": "2026-11-05T12:42:00Z",
    }
    second = first.applied(diff, NOW)
    assert second.prefixes == tuple(after)
    assert second.next_at == datetime(2026, 11, 5, 12, 42, tzinfo=UTC)
    assert second.match(b"dddd" + bytes(28)) == b"dddd"
    assert second.match(b"bbbb" + bytes(28)) is None


def test_a_list_that_is_not_googles_is_refused() -> None:
    wrong = _answer([b"aaaa"])
    wrong["checksum"]["sha256"] = b64(bytes(32))
    with pytest.raises(WebRiskError):
        HashList().applied(wrong, NOW)
    with pytest.raises(WebRiskError):
        HashList().applied({"responseType": "NEITHER"}, NOW)
    odd = _answer([b"aaaa"])
    odd["additions"]["rawHashes"][0]["prefixSize"] = 3
    with pytest.raises(WebRiskError):
        HashList().applied(odd, NOW)


def test_a_list_that_fails_starts_again() -> None:
    google = FakeGoogle(listed=["login.example-bank.test/"])
    risk = ready_risk(google)
    tokens = {threat: risk.lists[threat].version for threat in THREAT_TYPES}
    assert set(tokens.values()) == {b64(b"v1")}

    def broken(threat_type: str, version_token: str) -> dict[str, Any]:
        google.diffs.append((threat_type, version_token))
        return _answer([b"aaaa"]) | {"checksum": {"sha256": b64(bytes(32))}}

    google.compute_diff = broken  # type: ignore[method-assign]
    risk.now = lambda: NOW + timedelta(hours=1)
    risk.update()
    assert not risk.ready()
    assert all(risk.lists[threat].version == "" for threat in THREAT_TYPES)


# --- Links ---


def test_a_listed_link_is_unsafe_and_the_others_safe() -> None:
    google = FakeGoogle(listed=["login.example-bank.test/"])
    risk = ready_risk(google)
    assert risk.verdict(PHISHING) == "unsafe"
    # A page under it, on another host of the same domain: still listed.
    assert risk.verdict("https://login.example-bank.test/other") == "unsafe"
    assert risk.verdict(CLEAN) == "safe"
    assert risk.verdict("https://example-bank.test/") == "safe"


def test_only_prefixes_reach_google() -> None:
    google = FakeGoogle(
        listed=["login.example-bank.test/"], prefixes_only=["www.nike.com/"]
    )
    risk = ready_risk(google)
    assert risk.verdict(PHISHING) == "unsafe"
    assert risk.verdict(CLEAN) == "safe"
    assert len(google.searches) == 2
    sent = [repr(call) for call in google.diffs + google.searches]
    for prefix, threats in google.searches:
        assert len(prefix) == 4 and threats == THREAT_TYPES
    for link in (PHISHING, CLEAN):
        for piece in (link, "nike", "example-bank", "pegasus"):
            assert all(piece not in call for call in sent)
    for threat, token in google.diffs:
        assert threat in THREAT_TYPES and token in ("", b64(b"v1"))


def test_a_prefix_found_safe_is_asked_once_until_it_expires() -> None:
    clock = Clock()
    google = FakeGoogle(prefixes_only=["www.nike.com/"])
    risk = ready_risk(google, clock)
    assert risk.verdict(CLEAN) == "safe"
    assert risk.verdict(CLEAN) == "safe"
    assert len(google.searches) == 1
    clock.t = NOW + timedelta(minutes=11)
    assert risk.verdict(CLEAN) == "safe"
    assert len(google.searches) == 2


def test_an_unsafe_hash_is_kept_until_it_expires() -> None:
    clock = Clock()
    google = FakeGoogle(listed=["login.example-bank.test/"])
    risk = ready_risk(google, clock)
    assert risk.verdict(PHISHING) == "unsafe"
    assert risk.verdict(PHISHING) == "unsafe"
    assert len(google.searches) == 1
    clock.t = NOW + timedelta(minutes=6)
    assert risk.verdict(PHISHING) == "unsafe"
    assert len(google.searches) == 2


def test_without_a_key_nothing_can_be_said() -> None:
    risk = WebRisk(None)
    assert not risk.ready()
    assert risk.verdict(CLEAN) == "unknown"
    risk.start()
    assert risk._thread is None
    assert WebRisk.from_env({}).transport is None
    assert WebRisk.from_env({web_risk.KEY_VARIABLE: "  "}).transport is None
    kept = WebRisk.from_env({web_risk.KEY_VARIABLE: "the-key"}).transport
    assert isinstance(kept, GoogleTransport) and kept.key == "the-key"
    assert "the-key" not in repr(kept)


def test_old_lists_or_google_down_say_unknown(caplog: pytest.LogCaptureFixture) -> None:
    clock = Clock()
    google = FakeGoogle(listed=["login.example-bank.test/"])
    risk = ready_risk(google, clock)
    google.down = True
    # A search that fails: the link cannot be said safe.
    with caplog.at_level(logging.WARNING, logger="shaperoute_api.web_risk"):
        assert risk.verdict(PHISHING) == "unknown"
        clock.t = NOW + web_risk.STALE_AFTER + timedelta(seconds=1)
        assert risk.update() == web_risk.RETRY_S
    assert not risk.ready()
    assert risk.verdict(CLEAN) == "unknown"
    logged = caplog.text
    assert "OSError" in logged
    assert "example-bank" not in logged and "nike" not in logged


def test_the_next_update_is_when_google_says() -> None:
    clock = Clock()
    google = FakeGoogle()
    risk = WebRisk(google, clock)
    assert risk.update() == 30 * 60
    assert len(google.diffs) == len(THREAT_TYPES)
    # Not due yet: nothing asked.
    clock.t = NOW + timedelta(minutes=10)
    assert risk.update() == 20 * 60
    assert len(google.diffs) == len(THREAT_TYPES)
    clock.t = NOW + timedelta(minutes=31)
    risk.update()
    assert [token for _, token in google.diffs[-3:]] == [b64(b"v1")] * 3


def test_the_key_goes_in_a_header(monkeypatch: pytest.MonkeyPatch) -> None:
    asked: list[Any] = []

    class Answer:
        def __enter__(self) -> Answer:
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def read(self) -> bytes:
            return b"{}"

    def urlopen(request: Any, timeout: float) -> Answer:
        asked.append(request)
        return Answer()

    monkeypatch.setattr(web_risk.urllib.request, "urlopen", urlopen)
    google = GoogleTransport("secret-key")
    google.search_hashes(b"\x01\x02\x03\x04", THREAT_TYPES)
    google.compute_diff("MALWARE", "")
    search, diff = asked
    for request in asked:
        assert request.get_header("X-goog-api-key") == "secret-key"
        assert "secret-key" not in request.full_url
    assert search.full_url == (
        "https://webrisk.googleapis.com/v1/hashes:search?hashPrefix=AQIDBA%3D%3D"
        "&threatTypes=MALWARE&threatTypes=SOCIAL_ENGINEERING"
        "&threatTypes=UNWANTED_SOFTWARE"
    )
    assert diff.full_url.startswith(
        "https://webrisk.googleapis.com/v1/threatLists:computeDiff?threatType=MALWARE"
    )
    assert "versionToken" not in diff.full_url
