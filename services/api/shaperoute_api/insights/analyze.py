"""What the search events say, and what to change (TASK-130, ADR-0101).

`metrics` measures how useful the searches were, overall and for each
vocabulary version, so a change can be judged by what came after it.
`proposals` turns repeated evidence into changes of the vocabulary: never
code, never applied here. Each proposal carries its evidence (how many
events, a few examples) and the reason it was made; the same events always
give the same proposals, with the same ids.

Everything here reads local files: no AI, no service, no cost.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Any

from shaperoute_api.insights.vocabulary import Vocabulary, phrase_key

# A phrase must be read the same way this many times before it is learned,
# and never another way: once is chance, three times is a habit.
MIN_EVIDENCE = 3
EXAMPLES = 3

Event = dict[str, Any]
# The tables of the API, to check a proposal does not contradict them:
# themes.read_request(text).theme, and the shape of the same words.
TableTheme = Callable[[str], str | None]
# The words of a request without its city and km (themes.request_core):
# how themed requests are grouped and keyed, so cities add up.
Core = Callable[[str], str]


def _rate(part: int, whole: int) -> float | None:
    return None if whole == 0 else round(part / whole, 3)


def _mean(values: list[float]) -> float | None:
    return None if not values else round(sum(values) / len(values), 3)


def metrics(events: Iterable[Event]) -> dict[str, Any]:
    """The usefulness of the searches, for one set of events."""
    events = list(events)
    by_kind = Counter(e["kind"] for e in events)
    themed = [e for e in events if e["kind"] == "themed"]
    readings = [e for e in events if e["kind"] in ("themed", "shape_reading")]
    lists = [e for e in events if e["kind"] == "recommended_list"]
    routes = [e for e in events if e["kind"] in ("route", "themed")]
    errors = Counter(
        e.get("code") or "unknown" for e in events if e.get("outcome") == "error"
    )
    return {
        "events": len(events),
        "by_kind": dict(sorted(by_kind.items())),
        # Fewer is cheaper: each is a call to the model.
        "ai_rate": _rate(sum(e.get("by") == "ai" for e in readings), len(readings)),
        "learned_rate": _rate(
            sum(e.get("by") == "learned" for e in readings), len(readings)
        ),
        "theme_unknown_rate": _rate(
            sum(e.get("code") == "theme_unknown" for e in themed), len(themed)
        ),
        "themed_success_rate": _rate(
            sum(e.get("outcome") == "ok" for e in themed), len(themed)
        ),
        "themed_mean_passed": _mean(
            [float(e["passed"]) for e in themed if e.get("passed") is not None]
        ),
        "route_success_rate": _rate(
            sum(e.get("outcome") == "ok" for e in routes), len(routes)
        ),
        "route_mean_similarity": _mean(
            [float(e["quality"]) for e in routes if e.get("quality") is not None]
        ),
        "explore_empty_rate": _rate(
            sum(e.get("outcome") == "empty" for e in lists), len(lists)
        ),
        "gpx_per_route": _rate(
            by_kind.get("gpx_export", 0),
            sum(e.get("outcome") == "ok" for e in routes)
            + by_kind.get("recommended_open", 0),
        ),
        "errors": dict(errors.most_common()),
    }


def metrics_by_version(events: Iterable[Event]) -> dict[int, dict[str, Any]]:
    """The metrics of the events of each vocabulary version: what a change
    did is the difference between its version and the one before."""
    grouped: dict[int, list[Event]] = defaultdict(list)
    for e in events:
        grouped[int(e.get("vocab", 0))].append(e)
    return {v: metrics(es) for v, es in sorted(grouped.items())}


def top_queries(events: Iterable[Event], limit: int = 20) -> list[tuple[str, str, int]]:
    """(kind, text, times), the most asked first."""
    counted = Counter(
        (e["kind"], e["text"]) for e in events if e.get("text") is not None
    )
    return [(k, t, n) for (k, t), n in counted.most_common(limit)]


@dataclass
class Proposal:
    id: str
    kind: str
    """theme_synonym, shape_synonym, catalog_city, catalog_phrase: they
    change the vocabulary when applied; review_*: for a person to look at,
    nothing to apply."""
    reason: str
    additions: dict[str, dict[str, Any]] = field(default_factory=dict)
    evidence: int = 0
    examples: list[Event] = field(default_factory=list)

    @property
    def applicable(self) -> bool:
        return bool(self.additions)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "reason": self.reason,
            "additions": self.additions,
            "evidence": self.evidence,
            "examples": self.examples,
        }


def _id(kind: str, what: Any) -> str:
    raw = json.dumps([kind, what], sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]


def _example(e: Event) -> Event:
    keep = ("ts", "kind", "text", "theme", "shape", "by", "outcome", "code", "city")
    return {k: e[k] for k in keep if k in e}


def key_of(e: Event, core: Core = phrase_key) -> str:
    """The phrase an event is grouped and learned by: its core when it was
    recorded, else its words through `core`."""
    return str(e.get("core") or core(e["text"]))


def _learned_readings(
    events: list[Event], kind: str, field_name: str, core: Core = phrase_key
) -> dict[str, tuple[str, list[Event]]]:
    """Phrases the AI read, always to the same answer, MIN_EVIDENCE times."""
    answers: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        if e["kind"] == kind and e.get("by") == "ai" and e.get("text"):
            answers[key_of(e, core)].append(e)
    learned = {}
    for phrase, es in answers.items():
        values = {e.get(field_name) for e in es}
        if len(es) >= MIN_EVIDENCE and len(values) == 1 and None not in values:
            learned[phrase] = (str(values.pop()), es)
    return learned


def proposals(
    events: Iterable[Event],
    vocab: Vocabulary,
    table_theme: TableTheme | None = None,
    catalog_cities: Iterable[str] = (),
    catalog_phrases: Iterable[str] = (),
    core: Core = phrase_key,
) -> list[Proposal]:
    """What the events suggest, the strongest evidence first. Already in
    the vocabulary, or contradicting the tables: not proposed."""
    events = list(events)
    found: list[Proposal] = []

    for phrase, (theme, es) in _learned_readings(
        events, "themed", "theme", core
    ).items():
        if vocab.theme_for(phrase) is not None:
            continue
        if table_theme is not None and table_theme(phrase) not in (None, theme):
            continue
        found.append(
            Proposal(
                _id("theme_synonym", [phrase, theme]),
                "theme_synonym",
                f'The AI read "{phrase}" as {theme} {len(es)} times out of '
                f"{len(es)}: answer it from the vocabulary, without the AI.",
                {"themes": {phrase: theme}},
                len(es),
                [_example(e) for e in es[:EXAMPLES]],
            )
        )

    for phrase, (shape, es) in _learned_readings(
        events, "shape_reading", "shape"
    ).items():
        if vocab.shape_for(phrase) is not None:
            continue
        found.append(
            Proposal(
                _id("shape_synonym", [phrase, shape]),
                "shape_synonym",
                f'The AI read "{phrase}" as the {shape} {len(es)} times out of '
                f"{len(es)}: answer it from the vocabulary, without the AI.",
                {"shapes": {phrase: shape}},
                len(es),
                [_example(e) for e in es[:EXAMPLES]],
            )
        )

    # Cities searched for whose "Explore" was empty: the catalogue lacks them.
    known = {c.lower() for c in catalog_cities} | {c.lower() for c in vocab.cities}
    centres: dict[str, list[float]] = {}
    for e in events:
        if e["kind"] == "city_search" and e.get("city") and e.get("cell"):
            centres.setdefault(e["city"], e["cell"])
    empty_cells = Counter(
        tuple(e["cell"])
        for e in events
        if e["kind"] == "recommended_list"
        and e.get("outcome") == "empty"
        and e.get("cell")
    )
    for city, centre in centres.items():
        times = empty_cells.get(tuple(centre), 0)
        name = city.split(",")[0].strip()
        if times >= MIN_EVIDENCE and name.lower() not in known:
            es = [
                e
                for e in events
                if e["kind"] == "city_search" and e.get("city") == city
            ]
            found.append(
                Proposal(
                    _id("catalog_city", city),
                    "catalog_city",
                    f'"Explore" was empty {times} times at {city}: add it to the '
                    "seed catalogue (TASK-128).",
                    {"cities": {city: centre}},
                    times,
                    [_example(e) for e in es[:EXAMPLES]],
                )
            )

    # Words written as routes, often, that the catalogue has no route of.
    have = {p.upper() for p in catalog_phrases} | {p.upper() for p in vocab.phrases}
    words = Counter(
        e["word"]
        for e in events
        if e["kind"] == "route" and e.get("word") and e.get("outcome") == "ok"
    )
    for word, times in words.most_common():
        if times >= MIN_EVIDENCE and word.upper() not in have:
            es = [e for e in events if e["kind"] == "route" and e.get("word") == word]
            found.append(
                Proposal(
                    _id("catalog_phrase", word),
                    "catalog_phrase",
                    f'"{word}" was drawn {times} times: add it to the phrases of '
                    "the seed catalogue.",
                    {"phrases": {word.upper(): times}},
                    times,
                    [_example(e) for e in es[:EXAMPLES]],
                )
            )

    # For a person: requests nobody understood, places that were missing.
    unknown = Counter(
        key_of(e, core)
        for e in events
        if e["kind"] == "themed" and e.get("code") == "theme_unknown" and e.get("text")
    )
    for phrase, times in unknown.most_common():
        if times >= MIN_EVIDENCE:
            found.append(
                Proposal(
                    _id("review_unknown_theme", phrase),
                    "review_unknown_theme",
                    f'"{phrase}" was asked {times} times and neither the tables '
                    "nor the AI found a theme: a new theme, or a word for the tables?",
                    evidence=times,
                )
            )
    no_places = Counter(
        (e.get("city") or "?", e.get("theme") or "?")
        for e in events
        if e["kind"] == "themed" and e.get("code") == "no_places"
    )
    for (city, theme), times in no_places.most_common():
        if times >= MIN_EVIDENCE:
            found.append(
                Proposal(
                    _id("review_no_places", [city, theme]),
                    "review_no_places",
                    f"{times} {theme} requests at {city} found too few verified "
                    "places: other categories for the theme, or a wider radius?",
                    evidence=times,
                )
            )

    return sorted(found, key=lambda p: (-p.evidence, p.kind, p.id))
