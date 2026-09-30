"""The request log (TASK-090, ADR-0085): one JSON line for each route
request, to ask the engine the same thing again.

A route seen in the app could not be redone (TASK-075): the start was the
phone's GPS, and 25-100 m change a heart. The line keeps the body as it
arrived and how it ended; python -m shaperoute_api.replay redoes it.

The body holds where the user starts from. So the log is off unless asked
for, stays in a file of this computer outside the repository, readable by
its owner only, and never holds the API key, a header or a picture: only
route requests are recorded, and they carry an outline, not the image.
Writing must never stop a request: a file that cannot be written is a
warning in the API log, without the body.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
from collections.abc import Callable, Mapping, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from route_engine.models import RouteResult

from shaperoute_api.schemas import ErrorDetail

log = logging.getLogger(__name__)

# Set to 1 to record, like --request-log (docs/API.md).
ON_VARIABLE = "SHAPEROUTE_REQUEST_LOG"
ON_VALUES = ("1", "true", "yes", "on")
DEFAULT_DIR = Path("data/requests")
FILE_NAME = "requests.jsonl"
# The file before this one: kept once, then replaced.
OLD_FILE_NAME = "requests.old.jsonl"
# A request with an outline is a few kB: thousands of requests a file, and
# never more than twice this on disk.
MAX_BYTES = 5_000_000

Kind = Literal["shape", "word", "image"]
Body = Mapping[str, Any]


def wanted(flag: bool, environ: Mapping[str, str] = os.environ) -> bool:
    """Whether to record: --request-log, or the variable set to 1."""
    return flag or environ.get(ON_VARIABLE, "").strip().lower() in ON_VALUES


def kind_of(body: Body) -> Kind:
    if "outline" in body:
        return "image"
    return "word" if body.get("word") else "shape"


def fingerprint(points: Sequence[tuple[float, float]]) -> str:
    """A short name for a route: two routes have the same one only if they
    are the same, point for point (to the centimetre)."""
    text = ";".join(f"{lat:.7f},{lon:.7f}" for lat, lon in points)
    return hashlib.sha256(text.encode("ascii")).hexdigest()[:16]


def outcome_of(
    result: RouteResult | None, error: ErrorDetail | None, elapsed_s: float
) -> dict[str, Any]:
    """How a request ended: the route's numbers, the error's code, or
    cancelled before there was either."""
    elapsed = round(elapsed_s, 1)
    if result is not None:
        return {
            "status": "done",
            "distance_m": round(result.distance_m, 1),
            "similarity": round(result.similarity, 4),
            "points": len(result.points),
            "route": fingerprint(result.points),
            "elapsed_s": elapsed,
        }
    if error is not None:
        return {"status": "failed", "code": error.code, "elapsed_s": elapsed}
    return {"status": "cancelled", "elapsed_s": elapsed}


def now_utc() -> datetime:
    return datetime.now(UTC)


class RequestLog:
    def __init__(
        self,
        directory: Path = DEFAULT_DIR,
        max_bytes: int = MAX_BYTES,
        now: Callable[[], datetime] = now_utc,
    ) -> None:
        self.path = directory / FILE_NAME
        self._old = directory / OLD_FILE_NAME
        self._max_bytes = max_bytes
        self._now = now
        self._lock = threading.Lock()

    def record(
        self,
        body: Body | None,
        result: RouteResult | None,
        error: ErrorDetail | None,
        elapsed_s: float,
        job_id: str | None = None,
    ) -> None:
        """Appends the line of a request that ended. Never raises."""
        if body is None:
            return
        try:
            entry = {
                "time": self._now().isoformat(timespec="seconds"),
                "kind": kind_of(body),
                "job_id": job_id,
                "request": dict(body),
                "outcome": outcome_of(result, error, elapsed_s),
            }
            line = json.dumps(entry, separators=(",", ":")) + "\n"
            with self._lock:
                self._append(line.encode("utf-8"))
        except Exception as exc:
            # Not the body: the API log must not hold the start.
            log.warning(
                "request log: %s not written (%s: %s)",
                self.path,
                type(exc).__name__,
                exc,
            )

    def _append(self, line: bytes) -> None:
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        try:
            size = self.path.stat().st_size
        except FileNotFoundError:
            size = 0
        if size and size + len(line) > self._max_bytes:
            os.replace(self.path, self._old)
        flags = os.O_WRONLY | os.O_APPEND | os.O_CREAT
        descriptor = os.open(self.path, flags, 0o600)
        with os.fdopen(descriptor, "ab") as file:
            file.write(line)


def read_entries(path: Path) -> list[dict[str, Any]]:
    """The lines of a request log, oldest first; a line cut short by a
    crash is skipped."""
    entries: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as file:
        for line in file:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(entry, dict) and isinstance(entry.get("request"), dict):
                entries.append(entry)
    return entries
