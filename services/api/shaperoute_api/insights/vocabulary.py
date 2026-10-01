"""The learned vocabulary (TASK-130, ADR-0101): data, never code.

A JSON file in the repository, `learned/vocabulary.json`, read when the API
starts: phrases the AI has read the same way many times, so the API answers
them without the AI (fewer calls, fewer tokens), misspelt words and the word
the tables know, and the wishlist of cities and phrases the catalogue lacks.
It changes only through `apply` and `revert` (python -m
shaperoute_api.insights), each a new version with its reason in `changes`;
the file is reviewed and committed like code, so git keeps every version
too, and `check` must find nothing wrong in it (a test of the API runs it).

The state is rebuilt from `changes`: a revert is one more change, and
nothing of the history is lost.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Callable, Collection
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "learned" / "vocabulary.json"

SECTIONS = ("themes", "shapes", "corrections", "cities", "phrases")
# As events.MAX_TEXT: a longer phrase was never recorded whole.
MAX_PHRASE = 200

# The tables of the API: the theme or the shape they read in some words.
Table = Callable[[str], str | None]


def phrase_key(text: str) -> str:
    """How a phrase is looked up: lower case, single spaces."""
    return " ".join(text.lower().split())


def fold(word: str) -> str:
    """A word as the tables compare it: lower case, accents off."""
    folded = unicodedata.normalize("NFKD", word.lower())
    return "".join(c for c in folded if not unicodedata.combining(c))


_WORD = re.compile(r"\w+")


@dataclass(frozen=True)
class Problem:
    """Something wrong in the vocabulary: an entry (section and key) or a
    change of its history (section "changes")."""

    section: str
    key: str
    message: str

    def __str__(self) -> str:
        return f"{self.section}[{self.key!r}]: {self.message}"


@dataclass
class Vocabulary:
    version: int = 0
    # phrase -> theme / shape, as the AI read it many times
    themes: dict[str, str] = field(default_factory=dict)
    shapes: dict[str, str] = field(default_factory=dict)
    # a misspelt word -> the word (or stem) the tables know
    corrections: dict[str, str] = field(default_factory=dict)
    # wished for in the catalogue: city -> [lat, lon]; phrase -> times asked
    cities: dict[str, list[float]] = field(default_factory=dict)
    phrases: dict[str, int] = field(default_factory=dict)
    changes: list[dict[str, Any]] = field(default_factory=list)
    # The proposals whose additions are in effect now (rebuilt, not saved).
    active: set[str] = field(default_factory=set)

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
                vocab.active = kept.active
            else:
                for name in SECTIONS:
                    getattr(vocab, name).update(change.get("add", {}).get(name, {}))
                if change.get("proposal"):
                    vocab.active = vocab.active | {change["proposal"]}
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

    def correct(self, text: str) -> str:
        """The words with the misspelt ones replaced, the rest as typed
        (capitals too: they tell the city)."""
        if not self.corrections:
            return text
        return _WORD.sub(lambda m: self.corrections.get(fold(m[0]), m[0]), text)

    def applied(self, proposal_id: str) -> bool:
        """In effect now: applied, and not undone by a revert since."""
        return proposal_id in self.active

    def reverted(self, proposal_id: str) -> bool:
        """Applied once, then undone: judged worse, so not proposed again
        unless asked (apply --again)."""
        ever = any(c.get("proposal") == proposal_id for c in self.changes)
        return ever and not self.applied(proposal_id)

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

    def check(
        self,
        themes: Collection[str],
        shapes: Collection[str],
        table: Table | None = None,
    ) -> list[Problem]:
        """What is wrong: answers outside the catalogue, keys the API would
        never look up, corrections of words the tables already know (they
        would change a meaning) or that the tables still do not read, a
        history with holes. Empty: the vocabulary is safe to use."""
        found: list[Problem] = []
        for section, allowed in (("themes", themes), ("shapes", shapes)):
            for key, value in getattr(self, section).items():
                if not key or len(key) > MAX_PHRASE or key != phrase_key(key):
                    found.append(Problem(section, key, "not a looked-up phrase"))
                if value not in allowed:
                    found.append(Problem(section, key, f"{value!r} is unknown"))
        for wrong, right in self.corrections.items():
            if not _WORD.fullmatch(wrong) or wrong != fold(wrong) or wrong == right:
                found.append(Problem("corrections", wrong, "not a misspelt word"))
            elif table is not None and table(wrong) is not None:
                found.append(
                    Problem("corrections", wrong, "the tables already know it")
                )
            elif table is not None and table(right) is None:
                found.append(
                    Problem("corrections", wrong, f"the tables do not read {right!r}")
                )
        for city, centre in self.cities.items():
            ok = (
                isinstance(centre, list)
                and len(centre) == 2
                and -90 <= centre[0] <= 90
                and -180 <= centre[1] <= 180
            )
            if not ok:
                found.append(Problem("cities", city, "not a (lat, lon) centre"))
        for phrase, times in self.phrases.items():
            if phrase != phrase.upper() or not isinstance(times, int) or times < 1:
                found.append(Problem("phrases", phrase, "not an upper case count"))
        for number, change in enumerate(self.changes, start=1):
            if change.get("version") != number:
                found.append(Problem("changes", str(number), "a version is missing"))
                break
            back = change.get("revert_to")
            if back is not None and not 0 <= back < number:
                found.append(Problem("changes", str(number), "reverts to nothing"))
            if not change.get("reason"):
                found.append(Problem("changes", str(number), "no reason"))
        return found

    def without(self, problems: Collection[Problem]) -> Vocabulary:
        """The same version without the entries `problems` name: what the
        API uses when the file was edited by hand and is wrong."""
        drop = {(p.section, p.key) for p in problems}
        kept = {
            name: {
                k: v for k, v in getattr(self, name).items() if (name, k) not in drop
            }
            for name in SECTIONS
        }
        return replace(self, **kept)
