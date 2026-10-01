"""What the search events say, and what to change (TASK-130, ADR-0101).

`metrics` measures how useful the searches were, overall and for each
vocabulary version; `impact` says whether a version did better than the one
before, and only when the events are enough to tell. `proposals` turns
repeated evidence into changes of the vocabulary: never code, never applied
here. Each proposal carries its evidence (how many events, from how many
days and places, a few examples), the checks it passed and why it was made;
the same events always give the same proposals, with the same ids.

Everything here reads local files: no AI, no service, no cost.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from typing import Any

from shaperoute_api.insights.vocabulary import Vocabulary, fold, phrase_key

# A phrase must be read the same way this many times before it is learned,
# and never another way: once is chance, three times is a habit.
MIN_EVIDENCE = 3
# ...on this many different days or places. The model answers the same
# words always the same way (temperature 0), so a repeat proves nothing by
# itself, and one person asking again and again must not teach the API.
MIN_SOURCES = 2
# A misspelling has two signals, the spelling and the requests: two suffice.
MIN_CORRECTION = 2
# Words shorter than this are not corrected: too many real words are near.
MIN_WORD = 5
EXAMPLES = 3
# A rate is compared between versions only with this many events on each
# side, and called better or worse only past this |z| (95%, two-sided).
MIN_COMPARE = 20
Z_SIGNIFICANT = 1.96

Event = dict[str, Any]
# The tables of the API, to check a proposal does not contradict them:
# themes.read_request(text).theme, and the shape of the same words.
TableTheme = Callable[[str], str | None]
# The words of a request without its city and km (themes.request_core):
# how themed requests are grouped and keyed, so cities add up.
Core = Callable[[str], str]
# The tables' words: name -> stems (themes) or whole words (shapes).
Words = Mapping[str, tuple[str, ...]]


def _rate(part: int, whole: int) -> float | None:
    return None if whole == 0 else round(part / whole, 3)


def _mean(values: list[float]) -> float | None:
    return None if not values else round(sum(values) / len(values), 3)


def _is_reading(e: Event) -> bool:
    return e["kind"] in ("themed", "shape_reading")


def _is_route(e: Event) -> bool:
    return e["kind"] in ("route", "themed")


def read_ms(e: Event) -> float | None:
    """How long reading the words took: a shape reading is only that; a
    themed request also plans a route, so it counts its read_ms."""
    ms = e.get("read_ms") if e["kind"] == "themed" else e.get("ms")
    return None if ms is None else float(ms)


def _ok_route(e: Event) -> bool:
    return _is_route(e) and e.get("outcome") == "ok"


@dataclass(frozen=True)
class Rate:
    """A metric as a share of events: `part` of the events `of`. `better` is
    the way it should move: "up" or "down". `cost` rates tell what a search
    costs, not how useful it was: a worse one never asks for a revert."""

    better: str
    part: Callable[[Event], bool]
    of: Callable[[Event], bool]
    cost: bool = False


RATES: dict[str, Rate] = {
    # Fewer is cheaper: each is a call to the model.
    "ai_rate": Rate(
        "down", lambda e: _is_reading(e) and e.get("by") == "ai", _is_reading, True
    ),
    "learned_rate": Rate(
        "up", lambda e: _is_reading(e) and e.get("by") == "learned", _is_reading, True
    ),
    "theme_unknown_rate": Rate(
        "down",
        lambda e: e["kind"] == "themed" and e.get("code") == "theme_unknown",
        lambda e: e["kind"] == "themed",
    ),
    "themed_success_rate": Rate(
        "up",
        lambda e: e["kind"] == "themed" and e.get("outcome") == "ok",
        lambda e: e["kind"] == "themed",
    ),
    "route_success_rate": Rate("up", _ok_route, _is_route),
    "explore_empty_rate": Rate(
        "down",
        lambda e: e["kind"] == "recommended_list" and e.get("outcome") == "empty",
        lambda e: e["kind"] == "recommended_list",
    ),
    # GPX exported for each route shown: the route was worth running.
    "gpx_per_route": Rate(
        "up",
        lambda e: e["kind"] == "gpx_export",
        lambda e: _ok_route(e) or e["kind"] == "recommended_open",
    ),
}


def counts(events: Iterable[Event]) -> dict[str, tuple[int, int]]:
    """Each rate as (part, of): what the comparisons need."""
    events = list(events)
    return {
        name: (sum(r.part(e) for e in events), sum(r.of(e) for e in events))
        for name, r in RATES.items()
    }


def metrics(events: Iterable[Event]) -> dict[str, Any]:
    """The usefulness of the searches, for one set of events."""
    events = list(events)
    by_kind = Counter(e["kind"] for e in events)
    themed = [e for e in events if e["kind"] == "themed"]
    routes = [e for e in events if _is_route(e)]
    errors = Counter(
        e.get("code") or "unknown" for e in events if e.get("outcome") == "error"
    )
    readers: dict[str, list[float]] = defaultdict(list)
    for e in events:
        ms = read_ms(e) if _is_reading(e) else None
        if e.get("by") and ms is not None:
            readers[e["by"]].append(ms)
    return {
        "events": len(events),
        "by_kind": dict(sorted(by_kind.items())),
        **{name: _rate(part, of) for name, (part, of) in counts(events).items()},
        "themed_mean_passed": _mean(
            [float(e["passed"]) for e in themed if e.get("passed") is not None]
        ),
        "route_mean_similarity": _mean(
            [float(e["quality"]) for e in routes if e.get("quality") is not None]
        ),
        # Each learned reading is a call to the model that was not made.
        "ai_calls_saved": sum(
            _is_reading(e) and e.get("by") == "learned" for e in events
        ),
        # How long a reading took, by who answered: what the AI costs in time.
        "reading_ms": {by: _mean(ms) for by, ms in sorted(readers.items())},
        "errors": dict(errors.most_common()),
    }


def metrics_by_version(events: Iterable[Event]) -> dict[int, dict[str, Any]]:
    """The metrics of the events of each vocabulary version: what a change
    did is the difference between its version and the one before."""
    return {v: metrics(es) for v, es in _by_version(events).items()}


def _by_version(events: Iterable[Event]) -> dict[int, list[Event]]:
    grouped: dict[int, list[Event]] = defaultdict(list)
    for e in events:
        grouped[int(e.get("vocab", 0))].append(e)
    return dict(sorted(grouped.items()))


# --- what is asked ---------------------------------------------------------


def top_queries(
    events: Iterable[Event], limit: int = 20
) -> list[tuple[str, str, int, float | None]]:
    """(kind, text, times, share that went well), the most asked first."""
    asked: dict[tuple[str, str], list[Event]] = defaultdict(list)
    for e in events:
        if e.get("text") is not None:
            asked[(e["kind"], e["text"])].append(e)
    ranked = sorted(asked.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    return [
        (kind, text, len(es), _rate(sum(e.get("outcome") == "ok" for e in es), len(es)))
        for (kind, text), es in ranked[:limit]
    ]


def demand(events: Iterable[Event], limit: int = 10) -> dict[str, Any]:
    """What is asked for most: languages, cities, shapes and words; the
    requests that work and could be suggested to others, and the ones that
    keep failing (a result missing from the catalogue or the tables)."""
    events = list(events)
    queries = top_queries(events, limit=10_000)
    return {
        "languages": dict(
            Counter(e["lang"] for e in events if e.get("lang")).most_common()
        ),
        "cities": dict(
            Counter(
                str(e["city"]).split(",")[0]
                for e in events
                if e.get("city") and e["kind"] in ("themed", "city_search")
            ).most_common(limit)
        ),
        "shapes": dict(
            Counter(
                e["shape"] for e in events if _is_route(e) and e.get("shape")
            ).most_common(limit)
        ),
        "words": dict(
            Counter(
                e["word"] for e in events if _is_route(e) and e.get("word")
            ).most_common(limit)
        ),
        # Asked often and nearly always fine: examples for "Ask for a route".
        "worth_suggesting": [
            (text, times)
            for kind, text, times, ok in queries
            if kind == "themed" and times >= MIN_EVIDENCE and (ok or 0) >= 0.8
        ][:limit],
        # Asked more than once and mostly failed: what is missing.
        "failing": [
            (kind, text, times, ok)
            for kind, text, times, ok in queries
            if times >= 2 and (ok or 0) < 0.5
        ][:limit],
    }


# --- did a version help? -----------------------------------------------------


def compare(
    before: tuple[int, int], after: tuple[int, int], better: str
) -> dict[str, Any]:
    """Two shares of events, and whether the change between them is more
    than chance (a two-proportion z-test): "better", "worse", "same", or
    "too few" events to tell."""
    (x1, n1), (x2, n2) = before, after
    out: dict[str, Any] = {
        "before": _rate(x1, n1),
        "n_before": n1,
        "after": _rate(x2, n2),
        "n_after": n2,
    }
    if min(n1, n2) < MIN_COMPARE:
        return {**out, "z": None, "verdict": "too few"}
    p = (x1 + x2) / (n1 + n2)
    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    z = 0.0 if se == 0 else (x2 / n2 - x1 / n1) / se
    if abs(z) < Z_SIGNIFICANT:
        verdict = "same"
    else:
        verdict = "better" if (z > 0) == (better == "up") else "worse"
    return {**out, "z": round(z, 2), "verdict": verdict}


def _touches(e: Event, additions: dict[str, dict[str, Any]], core: Core) -> bool:
    """Whether a change's additions answer this event's words."""
    if not e.get("text"):
        return False
    if e["kind"] == "themed" and key_of(e, core) in additions.get("themes", {}):
        return True
    if e["kind"] == "shape_reading" and e["text"] in additions.get("shapes", {}):
        return True
    words = {fold(w) for w in e["text"].split()}
    return bool(words & set(additions.get("corrections", {})))


def impact(
    events: Iterable[Event], vocab: Vocabulary, core: Core = phrase_key
) -> list[dict[str, Any]]:
    """For each version of the vocabulary that served searches, against the
    last version before it that did: each rate compared, the requests the
    change itself answered, and a verdict. "worse" names the version to
    revert to; nothing is reverted here."""
    grouped = _by_version(events)
    found = []
    served = sorted(grouped)
    for i, version in enumerate(served):
        if i == 0:
            continue
        base = served[i - 1]
        before, after = counts(grouped[base]), counts(grouped[version])
        rates = {
            name: compare(before[name], after[name], r.better)
            for name, r in RATES.items()
        }
        change = next(
            (c for c in vocab.changes if c["version"] == version), {"reason": "?"}
        )
        additions = change.get("add", {})
        mine_after = [e for e in grouped[version] if _touches(e, additions, core)]
        mine_before = [e for e in grouped[base] if _touches(e, additions, core)]
        ms_ai = [
            ms
            for e in mine_before
            if e.get("by") == "ai" and (ms := read_ms(e)) is not None
        ]
        ms_now = [
            ms
            for e in mine_after
            if e.get("by") == "learned" and (ms := read_ms(e)) is not None
        ]
        worse = [
            n for n, c in rates.items() if c["verdict"] == "worse" and not RATES[n].cost
        ]
        better = [n for n, c in rates.items() if c["verdict"] == "better"]
        if worse:
            verdict = f"worse ({', '.join(worse)}): consider `revert {base}`"
        elif better:
            verdict = f"better ({', '.join(better)})"
        elif all(c["verdict"] == "too few" for c in rates.values()):
            verdict = f"too few events to tell (at least {MIN_COMPARE} each side)"
        else:
            verdict = "no clear change"
        found.append(
            {
                "version": version,
                "against": base,
                "reason": change.get("reason"),
                "proposal": change.get("proposal"),
                "events": len(grouped[version]),
                "rates": rates,
                # The requests the change was made for, after it.
                "answered": len(mine_after),
                "ai_calls_saved": sum(e.get("by") == "learned" for e in mine_after),
                "ms_ai_before": _mean(ms_ai),
                "ms_learned_after": _mean(ms_now),
                "verdict": verdict,
            }
        )
    return found


# --- proposals -----------------------------------------------------------------


@dataclass
class Proposal:
    id: str
    kind: str
    """theme_synonym, shape_synonym, correction, conflict (the AI and the
    spelling disagree: applied, the spelling wins), catalog_city,
    catalog_phrase: they change the vocabulary when applied; review_*: for a
    person to look at, nothing to apply."""
    reason: str
    additions: dict[str, dict[str, Any]] = field(default_factory=dict)
    evidence: int = 0
    examples: list[Event] = field(default_factory=list)
    # The rules it passed, in words: why it was proposed (explain).
    checks: list[str] = field(default_factory=list)

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
            "checks": self.checks,
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


def sources(events: Iterable[Event]) -> int:
    """On how many different days, or from how many places, the events
    came: a city or a ~1 km cell, else the day alone."""
    seen = set()
    for e in events:
        place = e.get("city") or (tuple(e["cell"]) if e.get("cell") else None)
        seen.add((str(e.get("ts", ""))[:10], place))
    return len(seen)


def _outcomes(es: list[Event]) -> str:
    done = [e for e in es if e.get("outcome") is not None]
    ok = sum(e.get("outcome") == "ok" for e in done)
    return f"{ok} of {len(done)} went well"


def _ai_readings(
    events: list[Event], kind: str, field_name: str, core: Core = phrase_key
) -> dict[str, list[Event]]:
    """The AI's readings of each phrase, grouped as they are learned."""
    answers: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        if e["kind"] == kind and e.get("by") == "ai" and e.get("text"):
            answers[key_of(e, core)].append(e)
    return answers


def osa(a: str, b: str) -> int:
    """Edits from a to b: insert, delete, change, swap two neighbours."""
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        d[i][0] = i
    for j in range(len(b) + 1):
        d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[len(a)][len(b)]


def _allowed(word: str) -> int:
    return 1 if len(word) < 8 else 2


def near_stem(token: str, words: Words) -> tuple[str, str] | None:
    """(stem, name) a misspelt token is closest to, with stems matched as the
    tables match them, at the start of a word; None when the tables already
    know the token, or nothing is near enough, or two names are."""
    if any(token.startswith(s) for stems in words.values() for s in stems):
        return None
    best: dict[str, str] = {}
    for name, stems in words.items():
        for stem in stems:
            if " " in stem or len(stem) < MIN_WORD:
                continue
            lengths = [
                n for n in (len(stem) - 1, len(stem), len(stem) + 1) if n <= len(token)
            ]
            if lengths and min(osa(token[:n], stem) for n in lengths) <= _allowed(stem):
                best.setdefault(name, stem)
    if len(best) != 1:
        return None
    ((name, stem),) = best.items()
    return stem, name


def near_word(token: str, words: Words) -> tuple[str, str] | None:
    """(word, name) for a whole word, as the shapes are matched."""
    if any(token == w for ws in words.values() for w in ws):
        return None
    names = {
        name: w
        for name, ws in words.items()
        for w in ws
        if len(w) >= MIN_WORD and osa(token, w) <= _allowed(w)
    }
    if len(names) != 1:
        return None
    ((name, word),) = names.items()
    return word, name


def _tokens(text: str) -> list[str]:
    return [
        t for t in (fold(w) for w in text.split()) if t.isalpha() and len(t) >= MIN_WORD
    ]


DETERMINISTIC = (
    "note: the model answers the same words always the same way, so agreement "
    "is not proof: read the examples before applying"
)


def proposals(
    events: Iterable[Event],
    vocab: Vocabulary,
    table_theme: TableTheme | None = None,
    catalog_cities: Iterable[str] = (),
    catalog_phrases: Iterable[str] = (),
    core: Core = phrase_key,
    theme_words: Words | None = None,
    shape_words: Words | None = None,
) -> list[Proposal]:
    """What the events suggest, the strongest evidence first. Already in
    the vocabulary, or contradicting the tables: not proposed."""
    events = list(events)
    found: list[Proposal] = []

    # Phrases of themed requests the AI always read the same way.
    for phrase, es in _ai_readings(events, "themed", "theme", core).items():
        answers = {e.get("theme") for e in es}
        n, places = len(es), sources(es)
        if n < MIN_EVIDENCE or len(answers) != 1 or None in answers:
            continue
        theme = str(answers.pop())
        if places < MIN_SOURCES or vocab.theme_for(phrase) is not None:
            continue
        if table_theme is not None and table_theme(phrase) not in (None, theme):
            continue
        found.append(
            Proposal(
                _id("theme_synonym", [phrase, theme]),
                "theme_synonym",
                f'The AI read "{phrase}" as {theme} {n} times out of {n}: answer it '
                "from the vocabulary, without the AI.",
                {"themes": {phrase: theme}},
                n,
                [_example(e) for e in es[:EXAMPLES]],
                [
                    f"read by the AI {n} times (at least {MIN_EVIDENCE}), "
                    f"always {theme}",
                    f"on {places} different days or places (at least {MIN_SOURCES})",
                    "the tables do not read it as another theme",
                    f"the routes: {_outcomes(es)}",
                    DETERMINISTIC,
                ],
            )
        )

    # Words of the shape field: a misspelt catalogue word (two signals: the
    # spelling and the AI) or a phrase the AI always read the same way.
    for phrase, es in _ai_readings(events, "shape_reading", "shape").items():
        answers = {e.get("shape") for e in es}
        n, places = len(es), sources(es)
        if len(answers) != 1 or None in answers or vocab.shape_for(phrase) is not None:
            continue
        shape = str(answers.pop())
        near = [
            (t, *hit)
            for t in _tokens(phrase)
            if (hit := near_word(t, shape_words or {})) is not None
        ]
        spelt = [(t, word) for t, word, name in near if name == shape]
        other = [(t, word, name) for t, word, name in near if name != shape]
        if other and not spelt:
            # The AI and the spelling disagree ("curoe": the circle for the
            # AI, "cuore" misspelt): never learned alone, a person decides.
            token, word, name = other[0]
            if n >= MIN_CORRECTION and places >= MIN_SOURCES:
                found.append(
                    Proposal(
                        _id("conflict", ["shapes", phrase, name]),
                        "conflict",
                        f'The AI read "{phrase}" as the {shape} {n} times, but it '
                        f'looks like "{word}" misspelt (the {name}). Apply to answer '
                        f"the {name}; leave it if the AI is right.",
                        {"shapes": {phrase: name}},
                        n,
                        [_example(e) for e in es[:EXAMPLES]],
                        [
                            f'"{token}" is {osa(token, word)} edit(s) from "{word}", '
                            f"a word of the {name} in the tables",
                            f"read by the AI {n} times as the {shape}: the two "
                            "disagree, so it is not learned without a person",
                            f"on {places} different days (at least {MIN_SOURCES})",
                        ],
                    )
                )
            continue
        if spelt and n >= MIN_CORRECTION and places >= MIN_SOURCES:
            token, word = spelt[0]
            found.append(
                Proposal(
                    _id("correction", ["shapes", phrase, shape]),
                    "correction",
                    f'"{phrase}" looks like "{word}" misspelt, and the AI read it as '
                    f"the {shape} {n} times: answer it from the vocabulary.",
                    {"shapes": {phrase: shape}},
                    n,
                    [_example(e) for e in es[:EXAMPLES]],
                    [
                        f'"{token}" is {osa(token, word)} edit(s) from "{word}", a '
                        f"word of the {shape} in the tables, and of no other shape",
                        f"read by the AI {n} times (at least {MIN_CORRECTION}), always "
                        f"the {shape}",
                        f"on {places} different days (at least {MIN_SOURCES})",
                    ],
                )
            )
        elif n >= MIN_EVIDENCE and places >= MIN_SOURCES:
            found.append(
                Proposal(
                    _id("shape_synonym", [phrase, shape]),
                    "shape_synonym",
                    f'The AI read "{phrase}" as the {shape} {n} times out of {n}: '
                    "answer it from the vocabulary, without the AI.",
                    {"shapes": {phrase: shape}},
                    n,
                    [_example(e) for e in es[:EXAMPLES]],
                    [
                        f"read by the AI {n} times (at least {MIN_EVIDENCE}), always "
                        f"the {shape}",
                        f"on {places} different days (at least {MIN_SOURCES})",
                        DETERMINISTIC,
                    ],
                )
            )

    # Misspelt words of themed requests the tables did not read: corrected,
    # the tables read them, for every request and every city.
    if theme_words:
        failed = [
            e
            for e in events
            if e["kind"] == "themed"
            and e.get("text")
            and (e.get("by") in ("ai", "learned") or e.get("code") == "theme_unknown")
        ]
        by_token: dict[tuple[str, str, str], list[Event]] = defaultdict(list)
        for e in failed:
            for t in _tokens(key_of(e, core)):
                hit = near_stem(t, theme_words)
                if hit is not None:
                    by_token[(t, *hit)].append(e)
        for (token, stem, theme), es in sorted(by_token.items()):
            n, places = len(es), sources(es)
            ai = [e.get("theme") for e in es if e.get("by") == "ai"]
            if token in vocab.corrections or n < MIN_CORRECTION or places < MIN_SOURCES:
                continue
            if any(t != theme for t in ai):
                continue  # the AI read these requests otherwise: not a typo
            found.append(
                Proposal(
                    _id("correction", ["corrections", token, stem]),
                    "correction",
                    f'"{token}" looks like "{stem}…" ({theme}) misspelt, in {n} '
                    "requests the tables did not read: correct it before the tables.",
                    {"corrections": {token: stem}},
                    n,
                    [_example(e) for e in es[:EXAMPLES]],
                    [
                        f'"{token}" is near "{stem}…", a word of {theme} in the '
                        "tables, and of no other theme",
                        f"in {n} requests the tables did not read (at least "
                        f"{MIN_CORRECTION})",
                        f"on {places} different days or places (at least "
                        f"{MIN_SOURCES})",
                        (
                            f"the AI read {len(ai)} of them, always {theme}"
                            if ai
                            else "the AI did not read them: spelling only"
                        ),
                    ],
                )
            )

    # Cities searched for whose "Explore" was empty: the catalogue lacks them.
    known = {c.lower() for c in catalog_cities} | {c.lower() for c in vocab.cities}
    centres: dict[str, list[float]] = {}
    for e in events:
        if e["kind"] == "city_search" and e.get("city") and e.get("cell"):
            centres.setdefault(e["city"], e["cell"])
    empty = defaultdict(list)
    for e in events:
        if (
            e["kind"] == "recommended_list"
            and e.get("outcome") == "empty"
            and e.get("cell")
        ):
            empty[tuple(e["cell"])].append(e)
    for city, centre in centres.items():
        times = len(empty.get(tuple(centre), []))
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
                    [
                        f'"Explore" empty {times} times at its centre (at least '
                        f"{MIN_EVIDENCE})",
                        f"searched for {len(es)} times",
                        "not in the seed catalogue nor wished for already",
                    ],
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
                    [
                        f"drawn {times} times (at least {MIN_EVIDENCE})",
                        "not among the phrases of the seed catalogue",
                    ],
                )
            )

    # For a person: requests nobody understood, places that were missing.
    unknown: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        if e["kind"] == "themed" and e.get("code") == "theme_unknown" and e.get("text"):
            unknown[key_of(e, core)].append(e)
    for phrase, es in sorted(unknown.items(), key=lambda kv: -len(kv[1])):
        if len(es) >= MIN_EVIDENCE:
            found.append(
                Proposal(
                    _id("review_unknown_theme", phrase),
                    "review_unknown_theme",
                    f'"{phrase}" was asked {len(es)} times and neither the tables '
                    "nor the AI found a theme: a new theme, or a word for the tables?",
                    evidence=len(es),
                    examples=[_example(e) for e in es[:EXAMPLES]],
                    checks=[
                        f"no theme found {len(es)} times (at least {MIN_EVIDENCE})"
                    ],
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
                    checks=[f"too few places {times} times (at least {MIN_EVIDENCE})"],
                )
            )

    return sorted(found, key=lambda p: (-p.evidence, p.kind, p.id))
