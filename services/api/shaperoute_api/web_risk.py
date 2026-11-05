"""Google Web Risk for the links members put on their items (TASK-394,
ADR-0333, docs/API.md, «Outfit tags»).

The Update API, never the Lookup API: this server keeps in memory the hash
prefixes of three of Google's lists (malware, social engineering, unwanted
software), and asks Google only when the hash of a link starts with one of
them, sending that prefix: **never the link**, nor who wrote it or opens it.
Most links match no prefix and leave nothing.

- A link is hashed as Web Risk says («URLs and hashing»): canonical, then
  every host suffix with every path prefix, SHA-256.
- The lists come from threatLists.computeDiff, in a thread, when Google
  says (recommendedNextDiff); each update is checked against its SHA-256.
- A full hash is asked with hashes.search, with its prefix only; the answer
  is kept until Google's expireTime, or negativeExpireTime for a prefix
  found safe.

The key comes only from the environment, SHAPEROUTE_WEB_RISK_KEY, and goes
in a header, never in an address or a log. Without it, or with lists not
updated for STALE_AFTER, or when Google does not answer, a link is
"unknown": outfit_links.py then opens only the shops it knows, instead of
letting a link through unchecked. In the tests the transport is a fake:
no network, the same answers every time.
"""

from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import logging
import os
import re
import threading
import urllib.error
import urllib.request
from bisect import bisect_left
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, Literal, Protocol
from urllib.parse import unquote_to_bytes, urlencode

log = logging.getLogger(__name__)

KEY_VARIABLE = "SHAPEROUTE_WEB_RISK_KEY"
API_URL = "https://webrisk.googleapis.com/v1"
THREAT_TYPES = ("MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE")
# Prefixes kept for each list: Google sends the most relevant ones first.
# 2^18 prefixes of 4 bytes are about 12 MB in memory.
MAX_ENTRIES = 2**18
TIMEOUT_S = 5.0
# Between two updates of a list, whatever Google recommends.
MIN_WAIT_S = 60.0
MAX_WAIT_S = 6 * 3600.0
RETRY_S = 300.0
# A list not updated for this long is not trusted: as without the key.
STALE_AFTER = timedelta(hours=24)
# Answers of hashes.search kept, at most; the expired ones go first.
MAX_CACHED = 10_000

Verdict = Literal["safe", "unsafe", "unknown"]
EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


class WebRiskError(ValueError):
    """An answer of Google that cannot be used; says why."""


class Transport(Protocol):
    """The two calls of the Update API; GoogleTransport, or a fake."""

    def compute_diff(self, threat_type: str, version_token: str) -> dict[str, Any]:
        """threatLists.computeDiff: what changed since `version_token`."""
        ...

    def search_hashes(
        self, prefix: bytes, threat_types: Sequence[str]
    ) -> dict[str, Any]:
        """hashes.search: the full hashes of Google's lists with `prefix`."""
        ...


@dataclass(frozen=True)
class GoogleTransport:
    """Web Risk on Google Cloud, with the key of MuW's project."""

    key: str = field(repr=False)
    timeout_s: float = TIMEOUT_S

    def _get(self, method: str, params: Sequence[tuple[str, str]]) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{API_URL}/{method}?{urlencode(params)}",
            headers={"X-Goog-Api-Key": self.key, "Accept": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=self.timeout_s) as answer:
            body: dict[str, Any] = json.loads(answer.read())
        return body

    def compute_diff(self, threat_type: str, version_token: str) -> dict[str, Any]:
        params = [
            ("threatType", threat_type),
            ("constraints.maxDiffEntries", str(MAX_ENTRIES)),
            ("constraints.maxDatabaseEntries", str(MAX_ENTRIES)),
            ("constraints.supportedCompressions", "RAW"),
        ]
        if version_token:
            params.append(("versionToken", version_token))
        return self._get("threatLists:computeDiff", params)

    def search_hashes(
        self, prefix: bytes, threat_types: Sequence[str]
    ) -> dict[str, Any]:
        params = [("hashPrefix", base64.b64encode(prefix).decode("ascii"))]
        params += [("threatTypes", threat) for threat in threat_types]
        return self._get("hashes:search", params)


# --- A link as Web Risk hashes it ---


def _unescaped(text: str) -> bytes:
    """Percent-unescaped until nothing is left to unescape."""
    raw = text.encode("utf-8")
    while True:
        once = unquote_to_bytes(raw)
        if once == raw:
            return raw
        raw = once


def _escaped(raw: bytes) -> str:
    """Spaces, controls, non-ASCII bytes, # and % percent-escaped."""
    return "".join(
        f"%{byte:02X}" if byte <= 0x20 or byte >= 0x7F or byte in b"#%" else chr(byte)
        for byte in raw
    )


def _resolved(path: bytes) -> bytes:
    """/./ and /../ resolved, runs of / made one; a trailing / kept."""
    trailing = path.endswith((b"/", b"/.", b"/.."))
    parts: list[bytes] = []
    for part in path.split(b"/"):
        if part in (b"", b"."):
            continue
        if part == b"..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    if not parts:
        return b"/"
    return b"/" + b"/".join(parts) + (b"/" if trailing else b"")


def canonical(url: str) -> str:
    """The link as Web Risk canonicalizes it: no tab, CR or LF, no
    fragment, host and path unescaped and escaped again, the host lower
    case without stray dots, the path resolved."""
    url = re.sub(r"[\t\r\n]", "", url.strip()).split("#", 1)[0]
    scheme, _, rest = url.partition("://")
    end = min((i for i in (rest.find("/"), rest.find("?")) if i >= 0), default=-1)
    host, tail = (rest, "") if end < 0 else (rest[:end], rest[end:])
    path, mark, query = tail.partition("?")
    clean_host = re.sub(rb"\.{2,}", b".", _unescaped(host).lower().strip(b"."))
    shown = f"{scheme.lower()}://{_escaped(clean_host)}"
    shown += _escaped(_resolved(_unescaped(path)))
    if mark:
        shown += "?" + _escaped(_unescaped(query))
    return shown


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        return False
    return True


def expressions(canonical_url: str) -> list[str]:
    """What Web Risk hashes for a canonical link: the exact host and up to
    four suffixes of its last five labels (never the top-level domain
    alone), each with the path and query, the path, and up to four
    prefixes of the path from the root."""
    rest = canonical_url.split("://", 1)[1]
    host, path_query = rest[: rest.index("/")], rest[rest.index("/") :]
    path, mark, query = path_query.partition("?")
    hosts = [host]
    if not _is_ip(host):
        labels = host.split(".")[-5:]
        for start in range(len(labels) - 1):
            suffix = ".".join(labels[start:])
            if suffix not in hosts:
                hosts.append(suffix)
    paths = [f"{path}?{query}"] if mark else []
    paths.append(path)
    prefix = "/"
    from_root = [prefix]
    for part in path.split("/")[1:-1][:3]:
        prefix += part + "/"
        from_root.append(prefix)
    paths += [each for each in from_root if each not in paths]
    return [host + each for host in hosts for each in paths]


def full_hashes(url: str) -> list[bytes]:
    """The SHA-256 of each expression of the link."""
    return [
        hashlib.sha256(expression.encode("ascii")).digest()
        for expression in expressions(canonical(url))
    ]


# --- The lists of prefixes ---


def _bytes(text: str) -> bytes:
    """Base64, as Google's JSON writes bytes; padding optional."""
    padded = text.replace("-", "+").replace("_", "/") + "=" * (-len(text) % 4)
    return base64.b64decode(padded, validate=True)


def _time(text: str | None, default: datetime) -> datetime:
    if not text:
        return default
    # RFC 3339; Python 3.11 reads "Z" but not more than six decimals.
    shown = re.sub(r"(\.\d{6})\d+", r"\1", text)
    try:
        return datetime.fromisoformat(shown).astimezone(UTC)
    except ValueError as exc:
        raise WebRiskError("a time that is not one") from exc


@dataclass(frozen=True)
class HashList:
    """One of Google's lists: its prefixes, sorted as bytes, and when it was
    updated last and should be next."""

    prefixes: tuple[bytes, ...] = ()
    version: str = ""
    updated_at: datetime | None = None
    next_at: datetime = EPOCH
    sizes: frozenset[int] = frozenset()

    def match(self, full: bytes) -> bytes | None:
        """The prefix of `full` in this list, or None."""
        for size in self.sizes:
            prefix = full[:size]
            at = bisect_left(self.prefixes, prefix)
            if at < len(self.prefixes) and self.prefixes[at] == prefix:
                return prefix
        return None

    def applied(self, answer: Mapping[str, Any], now: datetime) -> HashList:
        """The list after a computeDiff answer: a RESET starts again, a DIFF
        removes by index in the sorted list, then adds. WebRiskError when
        the SHA-256 of the result is not Google's: the list starts again."""
        kind = answer.get("responseType")
        if kind == "RESET":
            prefixes: list[bytes] = []
        elif kind == "DIFF":
            prefixes = list(self.prefixes)
        else:
            raise WebRiskError("neither DIFF nor RESET")
        removed = answer.get("removals", {}).get("rawIndices", {}).get("indices", [])
        if removed:
            gone = {int(index) for index in removed}
            prefixes = [p for at, p in enumerate(prefixes) if at not in gone]
        for added in answer.get("additions", {}).get("rawHashes", []):
            size = int(added.get("prefixSize", 0))
            raw = _bytes(added.get("rawHashes", ""))
            if not 4 <= size <= 32 or len(raw) % size:
                raise WebRiskError("prefixes of a size that is not one")
            prefixes += (raw[at : at + size] for at in range(0, len(raw), size))
        prefixes.sort()
        wanted = _bytes(answer.get("checksum", {}).get("sha256", ""))
        if hashlib.sha256(b"".join(prefixes)).digest() != wanted:
            raise WebRiskError("the checksum is not the list's")
        return HashList(
            prefixes=tuple(prefixes),
            version=str(answer.get("newVersionToken", "")),
            updated_at=now,
            next_at=_time(answer.get("recommendedNextDiff"), now),
            sizes=frozenset(len(prefix) for prefix in prefixes),
        )


def _clamped(seconds: float) -> float:
    return min(max(seconds, MIN_WAIT_S), MAX_WAIT_S)


@dataclass
class WebRisk:
    """The three lists in memory and what Google answered about full
    hashes; without a transport, every link is "unknown"."""

    transport: Transport | None
    now: Callable[[], datetime] = lambda: datetime.now(UTC)
    lists: dict[str, HashList] = field(default_factory=dict)
    _unsafe: dict[bytes, datetime] = field(default_factory=dict)
    _safe_prefixes: dict[bytes, datetime] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _stop: threading.Event = field(default_factory=threading.Event)
    _thread: threading.Thread | None = None

    @classmethod
    def from_env(cls, environ: Mapping[str, str] = os.environ) -> WebRisk:
        key = environ.get(KEY_VARIABLE, "").strip()
        return cls(GoogleTransport(key) if key else None)

    def ready(self) -> bool:
        """A key, and every list updated less than STALE_AFTER ago."""
        if self.transport is None:
            return False
        now = self.now()
        return all(
            (kept := self.lists.get(threat)) is not None
            and kept.updated_at is not None
            and now - kept.updated_at <= STALE_AFTER
            for threat in THREAT_TYPES
        )

    def update(self) -> float:
        """Each list due brought up to date; the seconds until the next
        update. Never raises: a list not updated is said in the log, by its
        name only, and tried again in RETRY_S."""
        assert self.transport is not None
        now = self.now()
        waits: list[float] = []
        for threat in THREAT_TYPES:
            kept = self.lists.get(threat, HashList())
            if kept.next_at > now and kept.updated_at is not None:
                waits.append((kept.next_at - now).total_seconds())
                continue
            try:
                answer = self.transport.compute_diff(threat, kept.version)
                fresh = kept.applied(answer, now)
            except WebRiskError as exc:
                log.warning("web risk: %s starts again (%s)", threat, exc)
                self.lists[threat] = HashList()
                waits.append(MIN_WAIT_S)
                continue
            except (OSError, ValueError, LookupError, TypeError, AttributeError) as exc:
                log.warning("web risk: %s not updated (%s)", threat, _why(exc))
                waits.append(RETRY_S)
                continue
            self.lists[threat] = fresh
            waits.append((fresh.next_at - now).total_seconds())
        return _clamped(min(waits))

    def start(self) -> None:
        """The lists kept up to date in a thread, with a transport only."""
        if self.transport is None or self._thread is not None:
            return
        self._thread = threading.Thread(
            target=self._keep_updated, name="web-risk", daemon=True
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _keep_updated(self) -> None:
        while not self._stop.wait(self.update()):
            pass

    def _match(self, full: bytes) -> bytes | None:
        for kept in self.lists.values():
            prefix = kept.match(full)
            if prefix is not None:
                return prefix
        return None

    def verdict(self, url: str) -> Verdict:
        """"unsafe" when a hash of the link is on a list; "safe" when none
        is; "unknown" when that cannot be said (no key, old lists, Google
        not answering). Only prefixes leave the server."""
        if not self.ready():
            return "unknown"
        assert self.transport is not None
        now = self.now()
        asked: dict[bytes, list[bytes]] = {}
        with self._lock:
            for full in full_hashes(url):
                listed = self._unsafe.get(full)
                if listed is not None and listed > now:
                    return "unsafe"
                prefix = self._match(full)
                if prefix is None:
                    continue
                # A full hash listed before and expired is asked again.
                if listed is None and self._safe_prefixes.get(prefix, EPOCH) > now:
                    continue
                asked.setdefault(prefix, []).append(full)
        for prefix, fulls in asked.items():
            try:
                answer = self.transport.search_hashes(prefix, THREAT_TYPES)
                listed_now = self._kept(prefix, answer, now)
            except (OSError, ValueError, LookupError, TypeError, AttributeError) as exc:
                log.warning("web risk: a search failed (%s)", _why(exc))
                return "unknown"
            if any(full in listed_now for full in fulls):
                return "unsafe"
        return "safe"

    def _kept(
        self, prefix: bytes, answer: Mapping[str, Any], now: datetime
    ) -> set[bytes]:
        """The full hashes listed in a hashes.search answer, kept until they
        expire, and the prefix safe until negativeExpireTime."""
        listed: dict[bytes, datetime] = {}
        for threat in answer.get("threats", []):
            listed[_bytes(threat["hash"])] = _time(threat.get("expireTime"), now)
        safe_until = _time(answer.get("negativeExpireTime"), now)
        with self._lock:
            for cached in (self._unsafe, self._safe_prefixes):
                if len(cached) >= MAX_CACHED:
                    for gone in [k for k, until in cached.items() if until <= now]:
                        del cached[gone]
                    if len(cached) >= MAX_CACHED:
                        cached.clear()
            self._unsafe.update(listed)
            self._safe_prefixes[prefix] = safe_until
        return set(listed)


def _why(exc: Exception) -> str:
    """For the log: the kind of error and an HTTP status, never an address
    (it could hold a prefix) nor the key."""
    if isinstance(exc, urllib.error.HTTPError):
        return f"HTTP {exc.code}"
    return type(exc).__name__
