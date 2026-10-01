"""What the search events say, and what to change (TASK-130, ADR-0101).

`metrics` measures how useful the searches were, overall and for each
vocabulary version; `impact` says whether a version did better than the one
before, and only when the events are enough to tell; `compare_periods` does
the same before and after a date, for any change (the engine, the catalogue,
the app: TASK-142), and `by_week` shows the trend. `proposals` turns
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
from datetime import date, datetime
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
# A city search left for another city this soon after: the search was wrong
# (TASK-142). Seconds.
REFORMULATED_S = 180
# ...in at least this share of the searches of the same words.
MIN_SWITCH_SHARE = 0.5
# Choices among A, B, C before the ranking is questioned.
MIN_CHOICES = 5

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
    """A route that ended: found, or failed. A cancelled one never ended."""
    return e["kind"] in ("route", "themed") and e.get("outcome") != "cancelled"


def _is_choice(e: Event) -> bool:
    """A route chosen among two or three: the ones that tell a preference."""
    return e["kind"] == "route_chosen" and int(e.get("n") or 1) >= 2


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
    costs, not how useful it was; `behaviour` rates tell what people did, which
    the vocabulary does not change: a worse one of either never asks for a
    revert (compare_periods measures them, for the engine and the app)."""

    better: str
    part: Callable[[Event], bool]
    of: Callable[[Event], bool]
    cost: bool = False
    behaviour: bool = False
    # (part, of) from all the events at once, for a rate of sequences.
    whole: Callable[[list[Event]], tuple[int, int]] | None = None

    @property
    def guards(self) -> bool:
        """Worse, it asks to revert the vocabulary."""
        return not (self.cost or self.behaviour)


def _never(_: Event) -> bool:
    return False


def _cities_left(events: list[Event]) -> tuple[int, int]:
    """City searches left for another city soon after, of all of them."""
    seen = switches(events).values()
    return (
        sum(len(es) for s in seen for es in s["to"].values()),
        sum(len(s["searches"]) for s in seen),
    )


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
    # Routes given up while waiting (TASK-142): too slow, or not wanted.
    "cancel_rate": Rate(
        "down",
        lambda e: e["kind"] == "route" and e.get("outcome") == "cancelled",
        lambda e: e["kind"] == "route",
        behaviour=True,
    ),
    # A, the engine's first, is the one people start or export: the ranking
    # agrees with them.
    "first_choice_rate": Rate(
        "up",
        lambda e: _is_choice(e) and e.get("index") == 0,
        _is_choice,
        behaviour=True,
    ),
    # City searches whose answer people left for the city they meant
    # (TASK-142): what a learned city name brings down.
    "city_left_rate": Rate("down", _never, _never, whole=_cities_left),
}


def counts(events: Iterable[Event]) -> dict[str, tuple[int, int]]:
    """Each rate as (part, of): what the comparisons need."""
    events = list(events)
    return {
        name: (
            r.whole(events)
            if r.whole is not None
            else (sum(r.part(e) for e in events), sum(r.of(e) for e in events))
        )
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


def name_of(label: Any) -> str:
    """ "Paris, Ile-de-France, France" → "Paris"."""
    return str(label).split(",")[0].strip()


def _chose_city(e: Event) -> bool:
    return e["kind"] == "city_chosen" and bool(e.get("city")) and not e.get("place")


def _asked_city(events: list[Event]) -> Callable[[Event], bool]:
    """The events that tell a city was wanted: the cities chosen and the
    themed requests; city searches too, before the app sent its choices
    (TASK-142), when they were the only trace and a search was a choice."""
    first = next((e.get("ts", "") for e in events if e["kind"] == "city_chosen"), None)

    def asked(e: Event) -> bool:
        if not e.get("city"):
            return False
        if e["kind"] == "city_search":
            return first is None or str(e.get("ts", "")) < str(first)
        return _chose_city(e) or e["kind"] == "themed"

    return asked


def demand(events: Iterable[Event], limit: int = 10) -> dict[str, Any]:
    """What is asked for most: languages, cities, places, themes, shapes and
    words, and how cities are chosen; the requests that work and could be
    suggested to others, and the ones that keep failing (a result missing
    from the catalogue or the tables)."""
    events = list(events)
    queries = top_queries(events, limit=10_000)
    asked = _asked_city(events)
    return {
        "languages": dict(
            Counter(e["lang"] for e in events if e.get("lang")).most_common()
        ),
        "cities": dict(
            Counter(name_of(e["city"]) for e in events if asked(e)).most_common(limit)
        ),
        # Places in a city chosen for "Explore" (TASK-138): Arena di Verona.
        "places": dict(
            Counter(
                name_of(e["city"])
                for e in events
                if e["kind"] == "city_chosen" and e.get("place") and e.get("city")
            ).most_common(limit)
        ),
        # Suggestion, recent, featured, typed: which way of choosing works.
        "chosen_via": dict(
            Counter(
                e["via"] for e in events if e["kind"] == "city_chosen" and e.get("via")
            ).most_common()
        ),
        # Ways out of a failed route taken (TASK-142): "Try N km", a shape.
        "hints": dict(
            Counter(
                e["hint"] for e in events if e["kind"] == "hint_taken" and e.get("hint")
            ).most_common()
        ),
        # The categories of "Ask for a route" and the themes in words.
        "themes": dict(
            Counter(
                e["theme"] for e in events if e["kind"] == "themed" and e.get("theme")
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
    if e["kind"] == "city_search" and phrase_key(e["text"]) in additions.get(
        "city_names", {}
    ):
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
            n for n, c in rates.items() if c["verdict"] == "worse" and RATES[n].guards
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
    keep = (
        "ts",
        "kind",
        "text",
        "theme",
        "shape",
        "word",
        "by",
        "outcome",
        "code",
        "city",
        "via",
        "index",
        "n",
        "hint",
        "distance_m",
        "to_m",
    )
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

    found.extend(city_names(events, vocab))

    # Cities searched for, or chosen among the suggestions (TASK-142), whose
    # "Explore" was empty: the catalogue lacks them.
    known = {c.lower() for c in catalog_cities} | {c.lower() for c in vocab.cities}
    centres: dict[str, list[float]] = {}
    for e in events:
        if (e["kind"] == "city_search" or _chose_city(e)) and e.get("cell"):
            if e.get("city"):
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
        name = name_of(city)
        if times >= MIN_EVIDENCE and name.lower() not in known:
            es = [
                e
                for e in events
                if e["kind"] in ("city_search", "city_chosen") and e.get("city") == city
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
                        f"searched for or chosen {len(es)} times",
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

    found.extend(review_behaviour(events))
    return sorted(found, key=lambda p: (-p.evidence, p.kind, p.id))


# --- what people did: signals of the app (TASK-142) ---------------------------


def when(e: Event) -> datetime | None:
    try:
        return datetime.strptime(str(e.get("ts", "")), "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None


def near_name(words: str, name: str) -> bool:
    """Whether words searched could mean a city's name: its start ("levic",
    Levico Terme), or a few letters off ("milano", Milan)."""
    typed, full = fold(phrase_key(words)), fold(phrase_key(name))
    if len(typed) < 3 or typed == full:
        return False
    if full.startswith(typed):
        return True
    return osa(typed, full[: len(typed)]) <= _allowed(full) or osa(
        typed, full
    ) <= _allowed(full)


def switches(events: list[Event]) -> dict[str, dict[str, Any]]:
    """For the words of each city search: its searches, and the ones left
    within REFORMULATED_S for a city whose name the words could mean, by
    that city. Events carry no person: two people's events close in time can
    mix, which is why a switch needs the words to fit the name, and several
    days."""
    chosen = [(t, e) for e in events if _chose_city(e) and (t := when(e)) is not None]
    out: dict[str, dict[str, Any]] = {}
    for e in events:
        t = when(e)
        if e["kind"] != "city_search" or not e.get("text") or t is None:
            continue
        words = phrase_key(e["text"])
        seen = out.setdefault(words, {"searches": [], "to": defaultdict(list)})
        seen["searches"].append(e)
        got = name_of(e.get("city") or "")
        for t2, c in chosen:
            name = name_of(c["city"])
            if (
                0 <= (t2 - t).total_seconds() <= REFORMULATED_S
                and fold(name) != fold(got)
                and near_name(words, name)
            ):
                seen["to"][name].append(e)
                break
    return out


def city_names(events: list[Event], vocab: Vocabulary) -> list[Proposal]:
    """Words searched as a city that people left for another city, the one
    the words could mean ("levic": Levič, then Levico Terme): search that
    name instead (vocabulary city_names, read by GET /cities)."""
    found = []
    for words, seen in sorted(switches(events).items()):
        if vocab.city_for(words) is not None:
            continue
        searches = seen["searches"]
        for name, es in sorted(seen["to"].items(), key=lambda kv: -len(kv[1])):
            n, places = len(es), sources(es)
            share = n / len(searches)
            if n < MIN_CORRECTION or places < MIN_SOURCES or share < MIN_SWITCH_SHARE:
                continue
            got = sorted({name_of(e.get("city") or "?") for e in es})
            found.append(
                Proposal(
                    _id("city_name", [words, name]),
                    "city_name",
                    f'"{words}" found {", ".join(got)}, and people went to {name} '
                    f"within {REFORMULATED_S // 60} minutes {n} times out of "
                    f"{len(searches)}: search {name} for it.",
                    {"city_names": {words: name}},
                    n,
                    [_example(e) for e in es[:EXAMPLES]],
                    [
                        f'"{words}" is the start of "{name}", or a few letters off',
                        f"left for {name} after {n} of {len(searches)} searches "
                        f"(at least {MIN_CORRECTION}, and "
                        f"{MIN_SWITCH_SHARE:.0%} of them)",
                        f"on {places} different days (at least {MIN_SOURCES})",
                    ],
                )
            )
            break
    return found


def drawn(e: Event) -> str:
    """What a route drew: its shape, its word, or "image"."""
    return str(e.get("shape") or (f"word {e['word']}" if e.get("word") else "?"))


def review_behaviour(events: list[Event]) -> list[Proposal]:
    """For a person: what people did says something the vocabulary cannot
    fix, in the engine or in the app."""
    found = []
    # The engine's first route is not the one people take.
    choices: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        if _is_choice(e):
            choices[drawn(e)].append(e)
    for what, es in sorted(choices.items()):
        others = [e for e in es if e.get("index") != 0]
        n, places = len(es), sources(es)
        if n < MIN_CHOICES or places < MIN_SOURCES or len(others) / n < 0.5:
            continue
        picked = dict(
            sorted(Counter("ABC"[int(e.get("index") or 0)] for e in es).items())
        )
        found.append(
            Proposal(
                _id("review_ranking", what),
                "review_ranking",
                f"For the {what}, people took another route than A, the engine's "
                f"first, {len(others)} times out of {n} ({picked})"
                ": does the ranking miss what they like (smoother, shorter)?",
                evidence=n,
                examples=[_example(e) for e in es[:EXAMPLES]],
                checks=[
                    f"{n} choices among two or three routes (at least {MIN_CHOICES})",
                    f"not A in {len(others)} of them (at least half)",
                    f"on {places} different days (at least {MIN_SOURCES})",
                ],
            )
        )
    # "Try N km" taken, again and again, for the same drawing.
    tried: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        if e["kind"] == "hint_taken" and e.get("hint") == "try_distance":
            tried[drawn(e)].append(e)
    for what, es in sorted(tried.items()):
        n, places = len(es), sources(es)
        if n < MIN_EVIDENCE or places < MIN_SOURCES:
            continue
        before = sorted(int(e.get("distance_m") or 0) for e in es)
        after = sorted(int(e.get("to_m") or 0) for e in es)
        found.append(
            Proposal(
                _id("review_distance", what),
                "review_distance",
                f"The {what} did not fit at {before[n // 2] / 1000:g} km (the "
                f'median), and people took "Try {after[n // 2] / 1000:g} km" {n} '
                "times: say it before drawing, or start from that distance?",
                evidence=n,
                examples=[_example(e) for e in es[:EXAMPLES]],
                checks=[
                    f'"Try N km" taken {n} times (at least {MIN_EVIDENCE})',
                    f"on {places} different days (at least {MIN_SOURCES})",
                ],
            )
        )
    return found


# --- any change, by date (TASK-142) -------------------------------------------


def between(
    events: Iterable[Event], since: str | None = None, until: str | None = None
) -> list[Event]:
    """The events from the day `since` to the day before `until`
    (YYYY-MM-DD); events without a time are kept only without limits."""
    out = []
    for e in events:
        day = str(e.get("ts", ""))[:10]
        if (since and day < since) or (until and day >= until):
            continue
        out.append(e)
    return out


def compare_periods(events: Iterable[Event], split: str) -> dict[str, Any]:
    """Every rate before the day `split` against from it on: what a change
    of that day did (a merge of the engine, a new catalogue, an app update),
    whatever it changed. The same test as `impact`."""
    events = list(events)
    before, after = between(events, until=split), between(events, since=split)
    b, a = counts(before), counts(after)
    rates = {
        name: compare(b[name], a[name], r.better) | {"behaviour": r.behaviour}
        for name, r in RATES.items()
    }
    worse = [n for n, c in rates.items() if c["verdict"] == "worse"]
    better = [n for n, c in rates.items() if c["verdict"] == "better"]
    if worse:
        verdict = f"worse ({', '.join(worse)})"
        if better:
            verdict += f", better ({', '.join(better)})"
    elif better:
        verdict = f"better ({', '.join(better)})"
    elif all(c["verdict"] == "too few" for c in rates.values()):
        verdict = f"too few events to tell (at least {MIN_COMPARE} each side)"
    else:
        verdict = "no clear change"
    means = {
        name: {"before": f(before), "after": f(after)}
        for name, f in (
            (
                "route_mean_similarity",
                lambda es: _mean(
                    [float(e["quality"]) for e in es if _is_route(e) and "quality" in e]
                ),
            ),
            (
                "route_mean_ms",
                lambda es: _mean(
                    [float(e["ms"]) for e in es if _ok_route(e) and "ms" in e]
                ),
            ),
        )
    }
    return {
        "split": split,
        "events_before": len(before),
        "events_after": len(after),
        "rates": rates,
        "means": means,
        "verdict": verdict,
    }


TREND = (
    "route_success_rate",
    "cancel_rate",
    "first_choice_rate",
    "explore_empty_rate",
    "city_left_rate",
    "themed_success_rate",
    "ai_rate",
    "gpx_per_route",
)


def week_of(e: Event) -> str:
    t = when(e)
    if t is None:
        return "?"
    year, week, _ = date(t.year, t.month, t.day).isocalendar()
    return f"{year}-W{week:02d}"


def by_week(events: Iterable[Event]) -> dict[str, dict[str, Any]]:
    """The main rates week by week: whether the search gets better."""
    grouped: dict[str, list[Event]] = defaultdict(list)
    for e in events:
        grouped[week_of(e)].append(e)
    out = {}
    for week, es in sorted(grouped.items()):
        m = metrics(es)
        out[week] = {"events": m["events"], **{k: m[k] for k in TREND}}
    return out


# --- why (not) a proposal (TASK-142) -------------------------------------------


@dataclass
class Check:
    """One rule of the proposals, for some words: met, and what is missing."""

    rule: str
    met: bool
    detail: str

    def as_dict(self) -> dict[str, Any]:
        return {"rule": self.rule, "met": self.met, "detail": self.detail}


def _needs(have: int, need: int, what: str) -> str:
    return f"{have} {what} (needs {need})" if have < need else f"{have} {what}"


def diagnose(
    events: Iterable[Event],
    vocab: Vocabulary,
    words: str,
    core: Core = phrase_key,
    theme_words: Words | None = None,
    shape_words: Words | None = None,
) -> dict[str, Any]:
    """Every rule of `proposals` against the events of some words: what they
    have, and what each rule still misses. The answer to "why was this not
    learned?", and the evidence of why it was."""
    events = list(events)
    key = core(words)
    text = phrase_key(words)
    mine = [
        e
        for e in events
        if (e.get("text") and (phrase_key(e["text"]) == text or key_of(e, core) == key))
        or str(e.get("word") or "").lower() == text
    ]
    checks: list[Check] = []

    themed = [e for e in mine if e["kind"] == "themed" and e.get("by") == "ai"]
    answers = sorted({str(e.get("theme")) for e in themed})
    n, places = len(themed), sources(themed)
    checks.append(
        Check(
            "theme_synonym",
            n >= MIN_EVIDENCE
            and places >= MIN_SOURCES
            and len(answers) == 1
            and "None" not in answers,
            f"read by the AI as a theme: {_needs(n, MIN_EVIDENCE, 'times')}, "
            f"answers {answers or 'none'}, "
            f"{_needs(places, MIN_SOURCES, 'days or places')}"
            + (
                f"; in the vocabulary: {vocab.theme_for(key)}"
                if vocab.theme_for(key)
                else ""
            ),
        )
    )

    shaped = [e for e in mine if e["kind"] == "shape_reading" and e.get("by") == "ai"]
    answers = sorted({str(e.get("shape")) for e in shaped})
    n, places = len(shaped), sources(shaped)
    near = [
        (t, *hit)
        for t in _tokens(text)
        if (hit := near_word(t, shape_words or {})) is not None
    ]
    spelt = ", ".join(f'"{t}" ~ "{w}" ({name})' for t, w, name in near) or "none"
    checks.append(
        Check(
            "shape_synonym / correction / conflict",
            places >= MIN_SOURCES
            and len(answers) == 1
            and "None" not in answers
            and n >= (MIN_CORRECTION if near else MIN_EVIDENCE),
            f"read by the AI as a shape: {n} times (needs {MIN_EVIDENCE}, or "
            f"{MIN_CORRECTION} when misspelt), answers {answers or 'none'}, "
            f"{_needs(places, MIN_SOURCES, 'days or places')}; near the "
            f"tables' words: {spelt}",
        )
    )

    if theme_words:
        tokens = [(t, near_stem(t, theme_words)) for t in _tokens(key)]
        hits = [(t, hit) for t, hit in tokens if hit is not None]
        failed = [
            e
            for e in mine
            if e["kind"] == "themed"
            and (e.get("by") in ("ai", "learned") or e.get("code") == "theme_unknown")
        ]
        n, places = len(failed), sources(failed)
        checks.append(
            Check(
                "correction (themes)",
                bool(hits) and n >= MIN_CORRECTION and places >= MIN_SOURCES,
                "misspelt words: "
                + (", ".join(f'"{t}" ~ "{s}…" ({th})' for t, (s, th) in hits) or "none")
                + f"; requests the tables did not read: "
                f"{_needs(n, MIN_CORRECTION, 'times')}, "
                f"{_needs(places, MIN_SOURCES, 'days or places')}",
            )
        )

    seen = switches(events).get(text)
    if seen is None:
        checks.append(Check("city_name", False, "never searched as a city"))
    else:
        searches = seen["searches"]
        best = max(seen["to"].items(), key=lambda kv: len(kv[1]), default=None)
        if best is None:
            detail = (
                f"searched {len(searches)} times as a city, never left within "
                f"{REFORMULATED_S // 60} minutes for a city it could mean"
            )
            met = False
        else:
            name, es = best
            n, places = len(es), sources(es)
            met = (
                n >= MIN_CORRECTION
                and places >= MIN_SOURCES
                and n / len(searches) >= MIN_SWITCH_SHARE
            )
            detail = (
                f"left for {name}: {_needs(n, MIN_CORRECTION, 'times')} of "
                f"{len(searches)} searches (needs {MIN_SWITCH_SHARE:.0%}), "
                f"{_needs(places, MIN_SOURCES, 'days')}"
            )
        if vocab.city_for(text):
            detail += f"; in the vocabulary: {vocab.city_for(text)}"
        checks.append(Check("city_name", met, detail))

    drawn_word = sum(
        e["kind"] == "route"
        and e.get("outcome") == "ok"
        and e.get("word") == text.upper()
        for e in events
    )
    checks.append(
        Check(
            "catalog_phrase",
            drawn_word >= MIN_EVIDENCE,
            f"drawn as a word: {_needs(drawn_word, MIN_EVIDENCE, 'times')}",
        )
    )
    unknown = sum(
        e["kind"] == "themed" and e.get("code") == "theme_unknown" for e in mine
    )
    checks.append(
        Check(
            "review_unknown_theme",
            unknown >= MIN_EVIDENCE,
            f"no theme found: {_needs(unknown, MIN_EVIDENCE, 'times')}",
        )
    )
    return {
        "words": words,
        "key": key,
        "events": len(mine),
        "by_kind": dict(sorted(Counter(e["kind"] for e in mine).items())),
        "outcomes": dict(sorted(Counter(str(e.get("outcome")) for e in mine).items())),
        "readers": dict(
            sorted(Counter(str(e.get("by")) for e in mine if e.get("by")).items())
        ),
        "sources": sources(mine),
        "checks": [c.as_dict() for c in checks],
        "examples": [_example(e) for e in mine[-EXAMPLES:]],
    }
