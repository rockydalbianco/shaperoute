"""The search events (TASK-130, ADR-0101): one JSON line for each search the
API answers, and for each sign that a result was useful.

What a line holds, and what it never holds:
- the words of a search, normalised, at most MAX_TEXT characters, with
  e-mail addresses and long numbers blanked out;
- where, only as a cell of about 1 km (CELL_DECIMALS), or a city's name;
- how it went: outcome, error code, number of results, similarity, places
  passed, milliseconds; which vocabulary version and which reader (table,
  learned, ai) answered;
- never a person: no id, no address, no header, no key, no exact point.

Files are monthly (events-YYYY-MM.jsonl), never rewritten nor deleted, so
the history stays; readable by their owner only. Writing never stops a
request: a file that cannot be written is a warning in the API log.
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from collections.abc import Callable, Iterator
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

log = logging.getLogger(__name__)

DEFAULT_DIR = Path("data/insights")
# Set to 0 to stop collecting (the user's choice: on by default, ADR-0101).
OFF_VARIABLE = "SHAPEROUTE_INSIGHTS"
OFF_VALUES = ("0", "false", "no", "off")
MAX_TEXT = 200
# 0.01 degrees: about 1.1 km north-south, less east-west.
CELL_DECIMALS = 2

Kind = Literal[
    "shape_reading",  # the words of the shape field (/shape-readings)
    "route",  # a shape, a word or an image (/route-jobs, /routes)
    "themed",  # a shape through a theme's places (/themed-route-jobs)
    "city_search",  # "Search a city" (/cities)
    "recommended_list",  # "Explore" near a point (/recommended-routes)
    "recommended_open",  # a route of "Explore" opened
    "gpx_export",  # a route exported: it was worth running
    "run_scored",  # a run scored after it was run
]
Outcome = Literal["ok", "empty", "error"]

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_NUMBER = re.compile(r"\d[\d .-]{4,}\d")


def redact(text: str) -> str:
    """Single spaces, lower case, no e-mail address nor long number (a
    phone, a house number with its post code), at most MAX_TEXT."""
    plain = " ".join(text.split()).lower()
    plain = _EMAIL.sub("[email]", plain)
    plain = _NUMBER.sub("[number]", plain)
    return plain[:MAX_TEXT]


def cell(point: tuple[float, float] | None) -> list[float] | None:
    if point is None:
        return None
    return [round(point[0], CELL_DECIMALS), round(point[1], CELL_DECIMALS)]


_LANG_WORDS = {
    "it": {"a", "di", "il", "la", "un", "una", "per", "voglio", "percorso", "giro"},
    "en": {"the", "a", "in", "of", "to", "route", "run", "tour", "i", "want"},
    "fr": {"le", "la", "un", "une", "de", "à", "parcours", "je", "veux"},
}


def language(text: str) -> str | None:
    """A guess from the commonest small words; None for one word or a tie."""
    words = set(text.lower().split())
    scores = {lang: len(words & common) for lang, common in _LANG_WORDS.items()}
    best = max(scores.values())
    winners = [lang for lang, score in scores.items() if score == best]
    return winners[0] if best > 0 and len(winners) == 1 else None


@dataclass
class Event:
    kind: str
    outcome: str = "ok"
    text: str | None = None
    # A request's words without its city and km (themes.request_core),
    # worked out from the words as typed, when they still had capitals.
    core: str | None = None
    lang: str | None = None
    code: str | None = None
    city: str | None = None
    cell: list[float] | None = None
    n: int | None = None
    quality: float | None = None
    passed: int | None = None
    found: int | None = None
    shape: str | None = None
    word: str | None = None
    theme: str | None = None
    by: str | None = None
    ms: int | None = None
    vocab: int = 0
    ts: str = field(
        default_factory=lambda: datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    )

    def line(self) -> str:
        body = {k: v for k, v in asdict(self).items() if v is not None}
        return json.dumps(body, ensure_ascii=False, separators=(",", ":"))


def wanted(off_flag: bool, environ: dict[str, str] | None = None) -> bool:
    environ = dict(os.environ) if environ is None else environ
    if off_flag:
        return False
    return environ.get(OFF_VARIABLE, "").strip().lower() not in OFF_VALUES


class EventLog:
    """Appends events to the month's file; never raises."""

    def __init__(
        self, directory: Path = DEFAULT_DIR, clock: Callable[[], datetime] | None = None
    ) -> None:
        self.directory = directory
        self._clock = clock or (lambda: datetime.now(UTC))
        self._lock = threading.Lock()

    def path_for(self, when: datetime) -> Path:
        return self.directory / f"events-{when:%Y-%m}.jsonl"

    def write(self, event: Event) -> None:
        path = self.path_for(self._clock())
        try:
            with self._lock:
                self.directory.mkdir(parents=True, exist_ok=True)
                new = not path.exists()
                with path.open("a", encoding="utf-8") as f:
                    f.write(event.line() + "\n")
                if new:
                    path.chmod(0o600)
        except OSError as exc:
            log.warning("insights: %s not written (%s)", path.name, exc.strerror)


def read_events(directory: Path = DEFAULT_DIR) -> Iterator[dict[str, Any]]:
    """Every event of every month, oldest first; a line that does not read
    is skipped (a crash mid-write leaves at most one)."""
    for path in sorted(directory.glob("events-*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if isinstance(event, dict) and "kind" in event:
                yield event
