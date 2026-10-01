"""Search insights: what users search for, and what to improve (TASK-130,
ADR-0101, docs/INSIGHTS.md).

The API records events (events.py) through `Insights.record`; the command
`python -m shaperoute_api.insights` reads them, measures (analyze.py) and
proposes changes of the learned vocabulary (vocabulary.py), applied and
reverted only by hand, as new versions of a file in the repository.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Mapping
from typing import Any

from shaperoute_api.insights.events import Event, EventLog, cell, language, redact
from shaperoute_api.insights.vocabulary import Vocabulary

log = logging.getLogger(__name__)


class Insights:
    """Records events with the vocabulary's version. Without a log it
    records nothing, and the vocabulary still answers."""

    def __init__(
        self, events: EventLog | None, vocab: Vocabulary | None = None
    ) -> None:
        self.events = events
        self.vocab = vocab or Vocabulary()

    @property
    def on(self) -> bool:
        return self.events is not None

    def record(
        self,
        kind: str,
        *,
        text: str | None = None,
        point: tuple[float, float] | None = None,
        started: float | None = None,
        **fields: Any,
    ) -> None:
        """One event; never raises, never slows the answer down much."""
        if self.events is None:
            return
        try:
            clean = None if text is None else redact(text)
            event = Event(
                kind=kind,
                text=clean,
                lang=None if clean is None else language(clean),
                cell=cell(point),
                ms=(
                    None
                    if started is None
                    else round((time.monotonic() - started) * 1000)
                ),
                vocab=self.vocab.version,
                **{k: v for k, v in fields.items() if v is not None},
            )
            self.events.write(event)
            log.debug("insights: %s %s", kind, event.outcome)
        except Exception as exc:  # an event is never worth a failed request
            log.warning("insights: %s not recorded (%s)", kind, type(exc).__name__)


def route_fields(
    body: Mapping[str, Any] | None,
    similarity: float | None,
    error_code: str | None,
) -> dict[str, Any]:
    """The fields of a "route" event from a request body and how it ended."""
    body = body or {}
    kind = "image" if "outline" in body else ("word" if body.get("word") else "shape")
    start = body.get("start")
    point = (
        (float(start[0]), float(start[1]))
        if isinstance(start, list | tuple) and len(start) == 2
        else None
    )
    return {
        "point": point,
        # An image has no shape name: "image" says what was drawn.
        "shape": {"shape": body.get("shape"), "image": "image"}.get(kind),
        "word": str(body["word"]).upper() if kind == "word" else None,
        "outcome": "error" if error_code else "ok",
        "code": error_code,
        "quality": None if similarity is None else round(float(similarity), 3),
    }


__all__ = ["Insights", "Vocabulary", "route_fields"]
