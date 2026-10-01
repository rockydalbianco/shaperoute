"""The learned vocabulary (TASK-130, ADR-0101): data, never code.

A JSON file in the repository, `learned/vocabulary.json`, read when the API
starts: phrases the AI has read the same way many times, so the API answers
them without the AI (fewer calls, fewer tokens), and the wishlist of cities
and phrases the catalogue lacks. It changes only through `apply` and
`revert` (python -m shaperoute_api.insights), each a new version with its
reason in `changes`; the file is reviewed and committed like code, so git
keeps every version too.

The state is rebuilt from `changes`: a revert is one more change, and
nothing of the history is lost.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "learned" / "vocabulary.json"

SECTIONS = ("themes", "shapes", "cities", "phrases")


def phrase_key(text: str) -> str:
    """How a phrase is looked up: lower case, single spaces."""
    return " ".join(text.lower().split())


@dataclass
class Vocabulary:
    version: int = 0
    # phrase -> theme / shape, as the AI read it many times
    themes: dict[str, str] = field(default_factory=dict)
    shapes: dict[str, str] = field(default_factory=dict)
    # wished for in the catalogue: city -> [lat, lon]; phrase -> times asked
    cities: dict[str, list[float]] = field(default_factory=dict)
    phrases: dict[str, int] = field(default_factory=dict)
    changes: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path = DEFAULT_PATH) -> Vocabulary:
        if not path.exists():
            return cls()
        body = json.loads(path.read_text(encoding="utf-8"))
        return cls.rebuild(body.get("changes", []))

    @classmethod
    def rebuild(
        cls, changes: list[dict[str, Any]], upto: int | None = None
    ) -> Vocabulary:
        """The state after every change, or after version `upto`."""
        vocab = cls()
        for change in changes:
            if upto is not None and change["version"] > upto:
                break
            if change.get("revert_to") is not None:
                kept = cls.rebuild(changes, change["revert_to"])
                for name in SECTIONS:
                    setattr(vocab, name, getattr(kept, name))
            else:
                for name in SECTIONS:
                    getattr(vocab, name).update(change.get("add", {}).get(name, {}))
            vocab.version = change["version"]
        vocab.changes = [c for c in changes if upto is None or c["version"] <= upto]
        return vocab

    def save(self, path: Path = DEFAULT_PATH) -> None:
        body = {
            "about": "python -m shaperoute_api.insights; docs/INSIGHTS.md",
            "version": self.version,
            **{name: dict(sorted(getattr(self, name).items())) for name in SECTIONS},
            "changes": self.changes,
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(body, indent=1, ensure_ascii=False) + "\n", "utf-8")

    def theme_for(self, text: str) -> str | None:
        return self.themes.get(phrase_key(text))

    def shape_for(self, text: str) -> str | None:
        return self.shapes.get(phrase_key(text))

    def applied(self, proposal_id: str) -> bool:
        return any(c.get("proposal") == proposal_id for c in self.changes)

    def add(
        self,
        additions: dict[str, dict[str, Any]],
        proposal_id: str,
        reason: str,
        today: str | None = None,
    ) -> Vocabulary:
        """A new version with `additions`; the history keeps why."""
        change = {
            "version": self.version + 1,
            "date": today or datetime.now(UTC).strftime("%Y-%m-%d"),
            "proposal": proposal_id,
            "reason": reason,
            "add": additions,
        }
        return Vocabulary.rebuild([*self.changes, change])

    def revert(self, to_version: int, today: str | None = None) -> Vocabulary:
        """A new version equal to `to_version`: nothing is erased."""
        if not 0 <= to_version < self.version:
            raise ValueError(f"no version {to_version} before {self.version}")
        change = {
            "version": self.version + 1,
            "date": today or datetime.now(UTC).strftime("%Y-%m-%d"),
            "revert_to": to_version,
            "reason": f"back to version {to_version}",
        }
        return Vocabulary.rebuild([*self.changes, change])
