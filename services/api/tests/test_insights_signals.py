"""The app's signals and what they teach (TASK-142, ADR-0111): POST /signals,
cancelled routes, learned city names, the reviews of what people did,
periods, weeks and `why`. No network, no AI."""

from __future__ import annotations

import json
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteRequest, RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import GraphLoader, Plan

from shaperoute_api.access import RateLimiter
from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch
from shaperoute_api.insights import Insights, problems_of, route_fields
from shaperoute_api.insights.__main__ import main
from shaperoute_api.insights.analyze import (
    by_week,
    compare_periods,
    demand,
    diagnose,
    impact,
    metrics,
    near_name,
    proposals,
)
from shaperoute_api.insights.events import Event, EventLog, read_events
from shaperoute_api.insights.vocabulary import Vocabulary
from shaperoute_api.signals import SignalBody, SignalGate, event_of
from shaperoute_api.themes import SHAPE_WORDS, THEME_WORDS, request_core

HERE = Path(__file__).parent
REPO = HERE.parents[2]
SIGNALS = json.loads((REPO / "packages/shared-types/fixtures/signals.json").read_text())
RESULT = RouteResult(
    points=[(46.0671, 11.1214), (46.0680, 11.1220), (46.0671, 11.1214)],
    distance_m=5100.0,
    similarity=0.9,
    shape="heart",
)


def asked_cities(seen: list[str]) -> Callable[[str], dict[str, Any]]:
    """Geoapify finding the city asked for, and remembering what was asked."""

    def fetch(url: str) -> dict[str, Any]:
        name = parse_qs(urlparse(url).query)["text"][0]
        seen.append(name)
        return {
            "results": [{"name": name, "country": "Italy", "lat": 46.0, "lon": 11.3}]
        }

    return fetch


def client(tmp_path: Path, **more: Any) -> TestClient:
    insights = more.pop("insights", None) or Insights(EventLog(tmp_path))
    return TestClient(create_app(FileSource(HERE), insights=insights, **more))


def wait_until(check: Callable[[], bool], timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while not check():
        assert time.monotonic() < deadline, "not in time"
        time.sleep(0.01)


# --- POST /signals --------------------------------------------------------------


def test_every_signal_of_the_contract_is_recorded_without_a_person(
    tmp_path: Path,
) -> None:
    api = client(tmp_path)
    for body in SIGNALS:
        assert api.post("/signals", json=body).status_code == 204
    events = list(read_events(tmp_path))
    assert [e["kind"] for e in events] == [s["kind"] for s in SIGNALS]
    city, place, chosen, word, tried, picked = events
    assert city["city"] == "Vercelli, Piedmont, Italy" and city["cell"] == [45.33, 8.42]
    assert city["via"] == "suggestion" and "place" not in city
    assert place["place"] is True
    assert (chosen["shape"], chosen["index"], chosen["n"], chosen["via"]) == (
        "heart",
        1,
        3,
        "gpx",
    )
    assert word["word"] == "CIAO"
    assert (tried["hint"], tried["distance_m"], tried["to_m"]) == (
        "try_distance",
        3000,
        5000,
    )
    assert picked["shape"] == "star" and "to_m" not in picked
    # The point is a ~1 km cell, never finer.
    assert "45.3256" not in next(tmp_path.iterdir()).read_text()


def test_a_label_keeps_its_capitals_but_no_e_mail() -> None:
    body = {**SIGNALS[0], "label": "Mario@Example.com, 333 123 4567 Rome"}
    _, fields = event_of(SignalBody.model_validate(body).root)
    assert fields["city"] == "[email], [number] Rome"


@pytest.mark.parametrize(
    "body",
    [
        {"kind": "page_viewed"},
        {**SIGNALS[0], "user": "luca"},  # nothing more than the contract
        {**SIGNALS[0], "point": [95.0, 8.0]},
        {**SIGNALS[0], "via": "push"},
        {**SIGNALS[2], "shape": "dragon"},
        {**SIGNALS[2], "index": 2, "of": 2},
        {**SIGNALS[2], "index": 3, "of": 3},
        {"kind": "route_chosen", "index": 0, "of": 1, "via": "gpx"},  # drew nothing
        {**SIGNALS[3], "word": "CIAO!"},
        {**SIGNALS[4], "to_m": None},
        {**SIGNALS[5], "to_m": 5000},
    ],
)
def test_a_signal_outside_the_contract_is_refused(tmp_path: Path, body: Any) -> None:
    api = client(tmp_path)
    assert api.post("/signals", json=body).status_code == 422
    assert list(read_events(tmp_path)) == []


def test_past_the_limit_signals_are_answered_but_not_recorded(tmp_path: Path) -> None:
    api = client(tmp_path, signal_gate=SignalGate(RateLimiter(2)))
    answers = [api.post("/signals", json=SIGNALS[2]).status_code for _ in range(4)]
    assert answers == [204] * 4
    assert len(list(read_events(tmp_path))) == 2


def test_signals_without_insights_still_answer(tmp_path: Path) -> None:
    api = TestClient(create_app(FileSource(HERE), insights=Insights(None)))
    assert api.post("/signals", json=SIGNALS[0]).status_code == 204


# --- routes: offered, asked, cancelled ------------------------------------------


def test_a_route_event_says_how_many_routes_and_the_distance() -> None:
    body = {"start": [46.0, 11.0], "shape": "heart", "distance_m": 5000}
    fields = route_fields(body, 0.9, None, 3)
    assert (fields["n"], fields["distance_m"]) == (3, 5000)


def test_routes_record_the_routes_offered(tmp_path: Path) -> None:
    other = Plan(result=RESULT, search=None)
    plan = Plan(result=RESULT, search=None, alternatives=[other, other])
    api = client(tmp_path, planner=lambda request, source: plan)
    body = {"start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000}
    assert api.post("/routes", json=body).status_code == 200
    (event,) = read_events(tmp_path)
    assert (event["n"], event["distance_m"], event["outcome"]) == (3, 5000, "ok")


def test_a_cancelled_route_is_an_event_and_its_dropped_result_is_not(
    tmp_path: Path,
) -> None:
    opened, returned = threading.Event(), threading.Event()

    def planner(request: RouteRequest, source: GraphLoader) -> Plan:
        opened.wait(5)
        returned.set()
        return Plan(result=RESULT, search=None)

    api = client(tmp_path, planner=planner)
    body = {"start": [46.0671, 11.1214], "shape": "heart", "distance_m": 5000}
    job = api.post("/route-jobs", json=body).json()
    wait_until(
        lambda: api.get(f"/route-jobs/{job['job_id']}").json()["status"] == "computing"
    )
    assert api.delete(f"/route-jobs/{job['job_id']}").status_code == 204
    opened.set()
    wait_until(returned.is_set)
    time.sleep(0.2)  # the job ends in its thread, after the planner
    (event,) = read_events(tmp_path)
    assert (event["kind"], event["outcome"], event["code"]) == (
        "route",
        "cancelled",
        "computing",
    )
    assert event["cell"] == [46.07, 11.12] and event["shape"] == "heart"


# --- learned city names ------------------------------------------------------------


def day(d: int, second: int = 0) -> str:
    return f"2026-10-{d:02d}T18:33:{second:02d}Z"


def levic_then_levico(d: int, gap_s: int = 16) -> list[dict[str, Any]]:
    """The search of the Mac (2026-10-01): "levic" finds Levič, Slovenia, and
    the person goes back to Levico Terme 16 s later."""
    return [
        {
            "kind": "city_search",
            "text": "levic",
            "outcome": "ok",
            "city": "Levič, Slovenia",
            "cell": [46.35, 15.54],
            "ts": day(d),
        },
        {
            "kind": "city_chosen",
            "city": "Levič, Slovenia",
            "cell": [46.35, 15.54],
            "via": "typed",
            "ts": day(d),
        },
        {
            "kind": "city_chosen",
            "city": "Levico Terme, Trentino-Alto Adige, Italy",
            "cell": [46.01, 11.3],
            "via": "recent",
            "ts": (
                day(d, min(gap_s, 59)) if gap_s < 60 else f"2026-10-{d:02d}T19:40:00Z"
            ),
        },
    ]


def kinds(found: list[Any]) -> list[str]:
    return [p.kind for p in found]


def test_a_city_search_left_for_the_city_meant_on_two_days_is_learned() -> None:
    once = proposals(levic_then_levico(1), Vocabulary())
    assert "city_name" not in kinds(once)  # one day proves nothing
    events = levic_then_levico(1) + levic_then_levico(2)
    (p,) = [p for p in proposals(events, Vocabulary()) if p.kind == "city_name"]
    assert p.additions == {"city_names": {"levic": "Levico Terme"}}
    assert p.evidence == 2 and "2 different days" in " ".join(p.checks)
    assert "Levič" in p.reason


def test_no_city_name_when_late_unlike_the_words_or_seldom() -> None:
    late = levic_then_levico(1, gap_s=4000) + levic_then_levico(2, gap_s=4000)
    assert "city_name" not in kinds(proposals(late, Vocabulary()))
    # Paris, then London: a change of mind, not a wrong search.
    other = []
    for e in levic_then_levico(1) + levic_then_levico(2):
        other.append({**e, "city": "London"} if e.get("via") == "recent" else e)
    assert "city_name" not in kinds(proposals(other, Vocabulary()))
    # Most searches of the words kept their city: the answer was right.
    kept = [{**levic_then_levico(d)[0], "ts": day(d, 30)} for d in range(3, 9)]
    events = levic_then_levico(1) + levic_then_levico(2) + kept
    assert "city_name" not in kinds(proposals(events, Vocabulary()))


def test_city_searches_left_for_the_city_meant_are_a_rate_by_version() -> None:
    kept = {**levic_then_levico(3)[0], "text": "trento", "city": "Trento, Italy"}
    assert metrics(levic_then_levico(1) + [kept])["city_left_rate"] == 0.5
    vocab = Vocabulary().add({"city_names": {"levic": "Levico Terme"}}, "p", "r")
    learned = {
        **levic_then_levico(4)[0],
        "city": "Levico Terme, Italy",
        "by": "learned",
        "vocab": 1,
    }
    (v1,) = impact(levic_then_levico(1) + [learned], vocab)
    assert (v1["answered"], v1["ai_calls_saved"]) == (1, 0)
    assert v1["rates"]["city_left_rate"]["before"] == 1.0
    assert v1["rates"]["city_left_rate"]["after"] == 0.0


def test_near_name_is_the_start_or_a_few_letters() -> None:
    assert near_name("levic", "Levico Terme")
    assert near_name("milano", "Milan")
    assert not near_name("paris", "Parma")
    assert not near_name("le", "Levico Terme")  # too short to mean anything
    assert not near_name("levic", "Levič")  # the same name: no other city


def test_the_vocabulary_checks_city_names() -> None:
    vocab = Vocabulary(city_names={"levic": "Levico Terme", "Rome ": "Rome", "x": "x"})
    assert {p.key for p in problems_of(vocab)} == {"Rome ", "x"}


def test_an_old_vocabulary_without_city_names_reads(tmp_path: Path) -> None:
    path = tmp_path / "v.json"
    path.write_text(json.dumps({"version": 0, "themes": {}, "changes": []}))
    assert Vocabulary.load(path).city_names == {}


def test_cities_search_the_learned_name(tmp_path: Path) -> None:
    seen: list[str] = []
    vocab = Vocabulary().add({"city_names": {"levic": "Levico Terme"}}, "p", "r")
    api = client(
        tmp_path,
        cities=CitySearch("K", fetch=asked_cities(seen)),
        insights=Insights(EventLog(tmp_path), vocab),
    )
    first = api.get("/cities", params={"q": "Levic"}).json()["places"][0]
    assert seen == ["Levico Terme"] and first["label"].startswith("Levico Terme")
    (event,) = read_events(tmp_path)
    assert (event["text"], event["by"]) == ("levic", "learned")


def test_the_whole_loop_learns_a_city_name(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """Day 1 from the history, day 2 through the API and the app's signals:
    propose, apply, and the next search finds Levico Terme."""
    events, vocab_path = tmp_path / "events", tmp_path / "vocab.json"
    log = EventLog(events)
    for e in levic_then_levico(1):  # a day before the API's
        log.write(Event(**{**e, "ts": e["ts"].replace("2026-10-01", "2026-09-15")}))
    seen: list[str] = []

    def levic(url: str) -> dict[str, Any]:
        name = parse_qs(urlparse(url).query)["text"][0]
        seen.append(name)
        found = "Levič" if name == "levic" else name
        return {
            "results": [
                {"name": found, "country": "Slovenia", "lat": 46.35, "lon": 15.5}
            ]
        }

    api = client(events, cities=CitySearch("K", fetch=levic))
    api.get("/cities", params={"q": "levic"})
    api.post(
        "/signals",
        json={
            "kind": "city_chosen",
            "label": "Levico Terme, Trentino-Alto Adige, Italy",
            "point": [46.0103, 11.3017],
            "via": "recent",
        },
    )
    args = ["--dir", str(events), "--vocab", str(vocab_path)]
    assert main([*args, "--json", "propose"]) == 0
    (p,) = [p for p in json.loads(capsys.readouterr().out) if p["kind"] == "city_name"]
    assert main([*args, "apply", p["id"]]) == 0
    out = capsys.readouterr().out
    assert "would have searched Levico Terme: 2 past city searches" in out
    learned = Vocabulary.load(vocab_path)
    assert learned.city_for("Levic") == "Levico Terme"
    again = client(
        tmp_path / "after",
        cities=CitySearch("K", fetch=levic),
        insights=Insights(EventLog(tmp_path / "after"), learned),
    )
    again.get("/cities", params={"q": "levic"})
    assert seen == ["levic", "Levico Terme"]
    assert main([*args, "why", "levic"]) == 0
    assert "[x] city_name: left for Levico Terme" in capsys.readouterr().out


# --- the catalogue and what people did ---------------------------------------------


def explore(cell: list[float], outcome: str, ts: str) -> dict[str, Any]:
    return {"kind": "recommended_list", "cell": cell, "outcome": outcome, "ts": ts}


def test_a_city_chosen_among_suggestions_with_an_empty_explore_is_wished() -> None:
    """Vercelli, three times empty on the Mac, never a /cities search."""
    chosen = {
        "kind": "city_chosen",
        "city": "Vercelli, Piedmont, Italy",
        "cell": [45.33, 8.42],
        "via": "suggestion",
        "ts": day(1),
    }
    empty = [explore([45.33, 8.42], "empty", day(1, s)) for s in (1, 2, 3)]
    (p,) = [
        p for p in proposals([chosen, *empty], Vocabulary()) if p.kind == "catalog_city"
    ]
    assert p.additions == {"cities": {"Vercelli, Piedmont, Italy": [45.33, 8.42]}}
    # A place is in a city: the catalogue is by city.
    place = {**chosen, "city": "Arena di Verona, Verona, Italy", "place": True}
    assert "catalog_city" not in kinds(proposals([place, *empty], Vocabulary()))


def chose(index: int, d: int, of: int = 3, shape: str = "heart") -> dict[str, Any]:
    return {
        "kind": "route_chosen",
        "shape": shape,
        "index": index,
        "n": of,
        "via": "gpx",
        "ts": day(d),
    }


def test_people_taking_b_or_c_question_the_ranking() -> None:
    events = [chose(1, 1), chose(2, 1), chose(0, 2), chose(1, 2), chose(1, 3)]
    (p,) = [p for p in proposals(events, Vocabulary()) if p.kind == "review_ranking"]
    assert not p.applicable and p.evidence == 5
    assert "4 times out of 5" in p.reason
    agree = [chose(0, d) for d in (1, 2, 3)] + [chose(1, 1), chose(1, 2)]
    assert "review_ranking" not in kinds(proposals(agree, Vocabulary()))
    # A route alone is no choice.
    alone = [chose(0, d, of=1) for d in (1, 2, 3, 4, 5)]
    assert metrics(alone)["first_choice_rate"] is None


def test_try_n_km_taken_again_and_again_asks_for_a_review() -> None:
    tried = [
        {
            "kind": "hint_taken",
            "shape": "heart",
            "hint": "try_distance",
            "distance_m": 3000,
            "to_m": 5000,
            "ts": day(d),
        }
        for d in (1, 1, 2)
    ]
    (p,) = [p for p in proposals(tried, Vocabulary()) if p.kind == "review_distance"]
    assert "3 km" in p.reason and "Try 5 km" in p.reason and not p.applicable
    assert demand(tried)["hints"] == {"try_distance": 3}


def test_cancelled_routes_count_apart_from_the_ones_that_ended() -> None:
    events = [
        {"kind": "route", "outcome": "ok", "quality": 0.9},
        {"kind": "route", "outcome": "error", "code": "shape_not_drawable"},
        {"kind": "route", "outcome": "cancelled", "code": "computing"},
        {"kind": "route", "outcome": "cancelled", "code": "loading"},
    ]
    m = metrics(events)
    assert m["route_success_rate"] == 0.5 and m["cancel_rate"] == 0.5


def test_demand_counts_cities_chosen_places_and_ways() -> None:
    legacy = {"kind": "city_search", "text": "paris", "city": "Paris", "ts": day(1)}
    chosen = {
        "kind": "city_chosen",
        "city": "Torino, Italy",
        "via": "featured",
        "ts": day(2),
    }
    searched = {**legacy, "ts": day(3)}  # a search after the signals: not a choice
    place = {
        **chosen,
        "city": "Arena di Verona, Verona",
        "place": True,
        "via": "suggestion",
    }
    asked = demand([legacy, chosen, searched, place])
    assert asked["cities"] == {"Paris": 1, "Torino": 1}
    assert asked["places"] == {"Arena di Verona": 1}
    assert asked["chosen_via"] == {"featured": 1, "suggestion": 1}


# --- periods, weeks, why ---------------------------------------------------------


def routes(ok: int, failed: int, d: int) -> list[dict[str, Any]]:
    return [{"kind": "route", "outcome": "ok", "ts": day(d)}] * ok + [
        {"kind": "route", "outcome": "error", "ts": day(d)}
    ] * failed


def test_compare_periods_measures_any_change_by_its_day() -> None:
    events = routes(10, 30, 1) + routes(36, 4, 5)
    found = compare_periods(events, "2026-10-05")
    assert (found["events_before"], found["events_after"]) == (40, 40)
    assert found["rates"]["route_success_rate"]["verdict"] == "better"
    assert found["verdict"] == "better (route_success_rate)"
    worse = compare_periods(routes(36, 4, 1) + routes(10, 30, 5), "2026-10-05")
    assert worse["verdict"].startswith("worse (route_success_rate)")
    few = compare_periods(routes(3, 1, 1) + routes(1, 3, 5), "2026-10-05")
    assert few["verdict"].startswith("too few events")


def test_trend_is_week_by_week() -> None:
    events = routes(1, 1, 1) + routes(2, 0, 12)
    weeks = by_week(events)
    assert list(weeks) == ["2026-W40", "2026-W42"]
    assert weeks["2026-W40"]["route_success_rate"] == 0.5
    assert weeks["2026-W42"]["events"] == 2


def ai_read(text: str, d: int) -> dict[str, Any]:
    return {
        "kind": "themed",
        "text": text,
        "core": text,
        "by": "ai",
        "theme": "romantic",
        "outcome": "ok",
        "city": "Roma",
        "ts": day(d),
    }


def test_why_says_what_each_rule_still_misses() -> None:
    events = [
        ai_read("un giro per innamorati", 1),
        ai_read("un giro per innamorati", 1),
    ]
    found = diagnose(
        events,
        Vocabulary(),
        "un giro per innamorati",
        core=request_core,
        theme_words=THEME_WORDS,
        shape_words=SHAPE_WORDS,
    )
    (theme,) = [c for c in found["checks"] if c["rule"] == "theme_synonym"]
    assert not theme["met"]
    assert "2 times (needs 3)" in theme["detail"]
    assert "1 days or places (needs 2)" in theme["detail"]
    assert found["events"] == 2 and found["readers"] == {"ai": 2}
    events.append(ai_read("un giro per innamorati", 2))
    found = diagnose(events, Vocabulary(), "un giro per innamorati", core=request_core)
    assert [c["met"] for c in found["checks"] if c["rule"] == "theme_synonym"] == [True]


def test_the_command_compares_trends_and_says_why(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    log = EventLog(tmp_path)
    for e in routes(10, 30, 1) + routes(36, 4, 5):
        log.write(Event(**e))
    args = ["--dir", str(tmp_path), "--vocab", str(tmp_path / "v.json")]
    assert main([*args, "compare", "--split", "2026-10-05"]) == 0
    assert "better (route_success_rate)" in capsys.readouterr().out
    assert main([*args, "trend"]) == 0
    assert "2026-W40" in capsys.readouterr().out
    assert main([*args, "--since", "2026-10-05", "report"]) == 0
    assert "40 events" in capsys.readouterr().out
    assert main([*args, "why", "un", "giro", "romantico"]) == 0
    out = capsys.readouterr().out
    assert "the tables read it as romantic: nothing to learn there" in out
    assert "no proposal about these words" in out
