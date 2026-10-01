"""The search insights (TASK-130, ADR-0101): events, vocabulary, analysis,
the command, the API's events, and the whole loop. No network, no AI."""

from __future__ import annotations

import json
import stat
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from route_engine.models import RouteResult
from route_engine.network import FileSource
from route_engine.optimizer import Plan
from route_engine.stops import Stop, StopsPlan

from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch
from shaperoute_api.insights import Insights, problems_of, route_fields, usable
from shaperoute_api.insights.__main__ import main
from shaperoute_api.insights.analyze import (
    compare,
    demand,
    impact,
    metrics,
    metrics_by_version,
    near_stem,
    proposals,
    sources,
)
from shaperoute_api.insights.events import (
    Event,
    EventLog,
    cell,
    language,
    read_events,
    redact,
    wanted,
)
from shaperoute_api.insights.vocabulary import Vocabulary
from shaperoute_api.recommended import RecommendedCatalog
from shaperoute_api.themed import StopFinder, ThemedJobs, ThemedRequestBody
from shaperoute_api.themes import (
    SHAPE_WORDS,
    THEME_WORDS,
    read_request,
    read_with_ai,
    request_core,
)

HERE = Path(__file__).parent
PLACES = json.loads((HERE / "fixtures" / "geoapify-places-bologna.json").read_text())
CITIES = json.loads((HERE / "fixtures" / "geoapify-city-milano.json").read_text())


def per_city(url: str) -> dict[str, Any]:
    """Geoapify finding the city asked for, whichever it is."""
    name = parse_qs(urlparse(url).query)["text"][0]
    return {"results": [{"name": name, "country": "Italy", "lat": 45.0, "lon": 9.0}]}


# --- events -----------------------------------------------------------------


def test_redact_blanks_emails_and_long_numbers() -> None:
    text = "Ciao  da MARIO@example.com, tel 333 123 4567, via Roma 12"
    assert redact(text) == "ciao da [email], tel [number], via roma 12"
    assert len(redact("x" * 500)) == 200


def test_cell_is_about_a_kilometre_and_language_a_guess() -> None:
    assert cell((45.46427, 9.18951)) == [45.46, 9.19]
    assert cell(None) is None
    assert language("voglio un percorso romantico a parigi") == "it"
    assert language("a romantic route in the city") == "en"
    assert language("tokyo") is None


def test_events_go_to_the_month_s_file_owner_only_and_read_back(
    tmp_path: Path,
) -> None:
    log = EventLog(tmp_path, clock=lambda: datetime(2026, 10, 1, tzinfo=UTC))
    log.write(Event(kind="city_search", text="paris", n=1))
    log.write(Event(kind="route", outcome="error", code="shape_not_drawable"))
    path = tmp_path / "events-2026-10.jsonl"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    path.write_text(path.read_text() + "{broken\n")
    got = list(read_events(tmp_path))
    assert [e["kind"] for e in got] == ["city_search", "route"]
    assert "lang" not in got[0]  # None fields are not written


def test_a_log_that_cannot_be_written_never_raises(tmp_path: Path) -> None:
    blocked = tmp_path / "file"
    blocked.write_text("not a folder")
    EventLog(blocked).write(Event(kind="route"))  # a warning, not an error


def test_on_unless_turned_off() -> None:
    assert wanted(False, {})
    assert not wanted(True, {})
    assert not wanted(False, {"SHAPEROUTE_INSIGHTS": "0"})


def test_route_fields_keep_the_cell_not_the_point() -> None:
    body = {"start": [45.464271, 9.189512], "word": "ciao", "distance_m": 15000}
    fields = route_fields(body, 0.912345, None)
    assert fields["word"] == "CIAO" and fields["shape"] is None
    assert fields["quality"] == 0.912
    assert fields["point"] == (45.464271, 9.189512)  # cut to a cell when written


# --- vocabulary ---------------------------------------------------------------


def test_versions_add_and_revert_without_losing_history(tmp_path: Path) -> None:
    path = tmp_path / "vocabulary.json"
    v1 = Vocabulary().add({"themes": {"un giro per innamorati": "romantic"}}, "p1", "r")
    v2 = v1.add({"shapes": {"stemma ferrari": "horse"}}, "p2", "r")
    v2.save(path)
    loaded = Vocabulary.load(path)
    assert loaded.version == 2
    assert loaded.theme_for("Un giro  per innamorati") == "romantic"
    assert loaded.shape_for("stemma ferrari") == "horse"
    assert loaded.applied("p2")
    v3 = loaded.revert(1)
    assert (v3.version, v3.shape_for("stemma ferrari")) == (3, None)
    assert v3.theme_for("un giro per innamorati") == "romantic"
    assert [c["version"] for c in v3.changes] == [1, 2, 3]
    with pytest.raises(ValueError):
        v3.revert(3)


def test_the_repository_vocabulary_reads() -> None:
    assert Vocabulary.load().version >= 0


# --- analysis -----------------------------------------------------------------


def ai_reads(text: str, theme: str, times: int, vocab: int = 0) -> list[dict[str, Any]]:
    """The AI reading the same words, once a day."""
    return [
        {
            "kind": "themed",
            "text": text,
            "theme": theme,
            "by": "ai",
            "vocab": vocab,
            "ts": f"2026-10-{day + 1:02d}T10:00:00Z",
        }
        for day in range(times)
    ]


def test_a_phrase_read_three_times_the_same_way_is_proposed() -> None:
    events = ai_reads("un giro per innamorati", "romantic", 3)
    found = proposals(events, Vocabulary(), table_theme=lambda t: read_request(t).theme)
    assert [p.kind for p in found] == ["theme_synonym"]
    assert found[0].additions == {"themes": {"un giro per innamorati": "romantic"}}
    assert found[0].evidence == 3 and len(found[0].examples) == 3
    assert any("3 different days or places" in c for c in found[0].checks)


def test_one_person_asking_again_and_again_teaches_nothing() -> None:
    # The model answers the same words the same way: ten times, same day and
    # place, is one source, not ten.
    same = [
        {**e, "ts": "2026-10-01T10:00:00Z", "city": "Roma"}
        for e in ai_reads("zzz qualcosa di strano", "romantic", 10)
    ]
    assert sources(same) == 1
    assert proposals(same, Vocabulary()) == []
    assert sources(same[:1] + [{**same[1], "city": "Milano"}]) == 2


def test_not_proposed_twice_nor_when_unsure_nor_against_the_tables() -> None:
    sure = ai_reads("un giro per innamorati", "romantic", 3)
    learned = Vocabulary().add(
        {"themes": {"un giro per innamorati": "romantic"}}, "x", "r"
    )
    assert proposals(sure, learned) == []
    mixed = ai_reads("boh", "food", 2) + ai_reads("boh", "nature", 1)
    assert proposals(mixed, Vocabulary()) == []
    # "ristoranti" is food in the tables: the AI saying romantic is ignored.
    against = ai_reads("ristoranti", "romantic", 3)
    assert (
        proposals(against, Vocabulary(), table_theme=lambda t: read_request(t).theme)
        == []
    )


def test_cities_with_an_empty_explore_and_frequent_words_are_wished() -> None:
    lisbon = {"kind": "city_search", "city": "Lisbon, Portugal", "cell": [38.72, -9.14]}
    empty = {"kind": "recommended_list", "outcome": "empty", "cell": [38.72, -9.14]}
    word = {"kind": "route", "word": "OLA", "outcome": "ok"}
    found = proposals(
        [lisbon] + [empty] * 3 + [word] * 4, Vocabulary(), catalog_cities=["milano"]
    )
    kinds = {p.kind: p for p in found}
    assert kinds["catalog_city"].additions == {
        "cities": {"Lisbon, Portugal": [38.72, -9.14]}
    }
    assert kinds["catalog_phrase"].additions == {"phrases": {"OLA": 4}}
    assert proposals([word] * 4, Vocabulary(), catalog_phrases=["OLA"]) == []


def test_review_proposals_change_nothing() -> None:
    unknown = [{"kind": "themed", "text": "boh boh", "code": "theme_unknown"}] * 3
    places = [
        {"kind": "themed", "code": "no_places", "city": "Caldonazzo", "theme": "nature"}
    ] * 3
    found = proposals(unknown + places, Vocabulary())
    assert {p.kind for p in found} == {"review_unknown_theme", "review_no_places"}
    assert not any(p.applicable for p in found)


def test_metrics_overall_and_by_version() -> None:
    events = (
        ai_reads("x", "romantic", 2, vocab=0)
        + [
            {
                "kind": "themed",
                "by": "learned",
                "outcome": "ok",
                "passed": 3,
                "vocab": 1,
            }
        ]
        + [{"kind": "route", "outcome": "ok", "quality": 0.9, "vocab": 1}]
        + [{"kind": "gpx_export", "vocab": 1}]
        + [{"kind": "recommended_list", "outcome": "empty", "vocab": 1}]
    )
    m = metrics(events)
    assert m["ai_rate"] == round(2 / 3, 3) and m["learned_rate"] == round(1 / 3, 3)
    assert m["explore_empty_rate"] == 1.0
    by = metrics_by_version(events)
    assert by[0]["ai_rate"] == 1.0 and by[1]["ai_rate"] == 0.0
    assert by[1]["themed_mean_passed"] == 3.0


# --- the API records ------------------------------------------------------------


def fake_plan(
    shape: str, distance_m: int, centre: Any, stops: list[Stop], source: Any
) -> StopsPlan:
    result = RouteResult(
        points=[centre, centre], distance_m=distance_m, similarity=0.95, shape=shape
    )
    return StopsPlan(
        Plan(result=result, search=None), tuple(stops[:2]), tried=4, drawn=3
    )


def test_the_api_records_searches_and_signals(tmp_path: Path) -> None:
    insights = Insights(EventLog(tmp_path))
    cities = CitySearch("K", fetch=lambda url: CITIES)
    themed = ThemedJobs(
        FileSource(HERE),
        StopFinder("K", fetch=lambda url: PLACES),
        cities=cities,
        plan=fake_plan,
        run_inline=True,
        insights=insights,
    )
    client = TestClient(
        create_app(
            FileSource(HERE),
            cities=cities,
            themed=themed,
            recommended=RecommendedCatalog([]),
            insights=insights,
        )
    )
    client.get("/cities", params={"q": "Milano"})
    client.get("/recommended-routes", params={"lat": 45.4642, "lon": 9.1896})
    client.post("/themed-route-jobs", json={"text": "luoghi famosi a Milano"})
    events = list(read_events(tmp_path))
    assert [e["kind"] for e in events] == ["city_search", "recommended_list", "themed"]
    city, listed, done = events
    assert city["city"] == "Milan, Lombardy, Italy" and city["cell"] == [45.46, 9.19]
    assert listed["outcome"] == "empty" and listed["n"] == 0
    assert done["theme"] == "famous" and done["by"] == "table" and done["passed"] == 2
    assert done["found"] == 6 and done["outcome"] == "ok" and "ms" in done
    assert 0 <= done["read_ms"] <= done["ms"]
    # Nothing finer than the cell, anywhere.
    assert "45.4642" not in (tmp_path / next(tmp_path.iterdir()).name).read_text()


def test_a_learned_shape_answers_without_the_model(tmp_path: Path) -> None:
    vocab = Vocabulary().add({"shapes": {"stemma ferrari": "horse"}}, "p", "r")
    client = TestClient(
        create_app(FileSource(HERE), insights=Insights(EventLog(tmp_path), vocab))
    )
    # No reader at all: the AI is off, the vocabulary still answers.
    answer = client.post("/shape-readings", json={"text": "Stemma  Ferrari"})
    assert answer.json()["shape"] == "horse"
    (event,) = read_events(tmp_path)
    assert (event["by"], event["vocab"]) == ("learned", 1)


# --- the loop -------------------------------------------------------------------


def test_the_whole_loop_learns_and_the_ai_is_no_longer_asked(tmp_path: Path) -> None:
    events_dir, vocab_path = tmp_path / "events", tmp_path / "vocabulary.json"
    asked: list[str] = []

    def ai(text: str, themes: list[str]) -> str | None:
        asked.append(text)
        return "romantic"

    def jobs() -> ThemedJobs:
        vocab = Vocabulary.load(vocab_path)
        return ThemedJobs(
            FileSource(HERE),
            StopFinder("K", fetch=lambda url: PLACES),
            cities=CitySearch("K", fetch=per_city),
            ai=ai,
            plan=fake_plan,
            run_inline=True,
            insights=Insights(EventLog(events_dir), vocab),
        )

    # 1. Three people ask in words the tables do not know: the AI answers.
    before = jobs()
    for city in ("Milano", "Bologna", "Torino"):  # three places: three sources
        before.submit(ThemedRequestBody(text=f"un giro per innamorati a {city}"))
    assert len(asked) == 3

    # 2. The analysis proposes the phrase, with its evidence; it is applied.
    args = ["--dir", str(events_dir), "--vocab", str(vocab_path)]
    found = proposals(
        list(read_events(events_dir)), Vocabulary.load(vocab_path), core=request_core
    )
    (p,) = found
    assert p.additions == {"themes": {"un giro per innamorati": "romantic"}}
    assert main([*args, "apply", p.id]) == 0
    assert Vocabulary.load(vocab_path).version == 1
    with pytest.raises(SystemExit):
        main([*args, "apply", p.id])

    # 3. The next request is answered by the vocabulary: no AI call.
    jobs().submit(ThemedRequestBody(text="un giro per innamorati a Roma"))
    assert len(asked) == 3

    # 4. The metrics by version show it; a revert puts the AI back.
    by = metrics_by_version(read_events(events_dir))
    assert by[0]["ai_rate"] == 1.0 and by[1]["ai_rate"] == 0.0
    assert main([*args, "revert", "0"]) == 0
    jobs().submit(ThemedRequestBody(text="un giro per innamorati a Napoli"))
    assert len(asked) == 4


def test_the_command_reports_proposes_and_explains(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    log = EventLog(tmp_path)
    for e in ai_reads("un giro per innamorati", "romantic", 3):
        log.write(Event(**e))
    args = ["--dir", str(tmp_path), "--vocab", str(tmp_path / "v.json")]
    assert main([*args, "report"]) == 0
    assert "ai_rate" in capsys.readouterr().out
    assert main([*args, "--json", "propose"]) == 0
    (p,) = json.loads(capsys.readouterr().out)
    assert main([*args, "explain", p["id"]]) == 0
    out = capsys.readouterr().out
    assert "would have answered without the AI: 3 past events" in out
    assert main([*args, "history"]) == 0


def test_history_is_imported_without_the_start(tmp_path: Path) -> None:
    requests = tmp_path / "requests.jsonl"
    line = {
        "time": "2026-09-30T10:00:00+00:00",
        "kind": "word",
        "request": {"start": [46.06712, 11.12149], "word": "ciao", "distance_m": 15000},
        "outcome": {"status": "done", "similarity": 0.91, "elapsed_s": 20.5},
    }
    requests.write_text(json.dumps(line) + "\n")
    args = [
        "--dir",
        str(tmp_path / "ev"),
        "import-history",
        "--requests",
        str(requests),
    ]
    assert main(args) == 0 and main(args) == 0  # twice: nothing doubles
    (event,) = read_events(tmp_path / "ev")
    assert event["word"] == "CIAO" and event["cell"] == [46.07, 11.12]
    assert event["ms"] == 20500 and "46.06712" not in json.dumps(event)


def test_request_core_drops_city_and_km() -> None:
    assert (
        request_core("Un giro per innamorati a New York, 8 km")
        == "un giro per innamorati"
    )
    learned = {"un giro per innamorati": "romantic"}.get
    reading = read_with_ai("un giro per innamorati a Parigi", None, learned)
    assert (reading.theme, reading.by, reading.city) == (
        "romantic",
        "learned",
        "Parigi",
    )


# --- corrections ------------------------------------------------------------------


def themed_unknown(text: str, day: int, **more: Any) -> dict[str, Any]:
    return {
        "kind": "themed",
        "text": text,
        "outcome": "error",
        "code": "theme_unknown",
        "by": "table",
        "ts": f"2026-10-{day:02d}T10:00:00Z",
        **more,
    }


def test_a_misspelt_theme_word_is_corrected_for_every_request() -> None:
    assert near_stem("rmantico", THEME_WORDS) == ("romanti", "romantic")
    assert near_stem("romantico", THEME_WORDS) is None  # the tables know it
    assert near_stem("giardinetto", THEME_WORDS) is None
    events = [
        themed_unknown("un giro rmantico a Roma", 1, core="un giro rmantico"),
        themed_unknown("giro rmantico", 2),
    ]
    (p,) = proposals(events, Vocabulary(), core=request_core, theme_words=THEME_WORDS)
    assert (p.kind, p.additions) == (
        "correction",
        {"corrections": {"rmantico": "romanti"}},
    )
    assert "the AI did not read them: spelling only" in p.checks
    vocab = Vocabulary().add(p.additions, p.id, p.reason)
    assert problems_of(vocab) == []
    # Any request, any city: the tables read it, no AI.
    reading = read_with_ai("Un percorso rmantico a Torino", None, None, vocab.correct)
    assert (reading.theme, reading.by, reading.city) == (
        "romantic",
        "learned",
        "Torino",
    )


def test_no_correction_when_the_ai_read_it_otherwise_or_once() -> None:
    against = [
        {
            **themed_unknown("cena rmantico", d),
            "by": "ai",
            "theme": "food",
            "code": None,
        }
        for d in (1, 2)
    ]
    assert proposals(against, Vocabulary(), theme_words=THEME_WORDS) == []
    once = [themed_unknown("giro rmantico", 1)]
    assert proposals(once, Vocabulary(), theme_words=THEME_WORDS) == []


def test_a_misspelt_shape_word_needs_the_ai_to_agree() -> None:
    def read(text: str, shape: str | None, day: int) -> dict[str, Any]:
        return {
            "kind": "shape_reading",
            "text": text,
            "shape": shape,
            "by": "ai",
            "outcome": "ok" if shape else "empty",
            "ts": f"2026-10-{day:02d}T09:00:00Z",
        }

    events = [read("curoe", "heart", 1), read("curoe", "heart", 2)]
    # "pesca" is near "pesce", but the AI read no shape in it: not a typo.
    events += [read("pesca", None, 1), read("pesca", None, 2)]
    (p,) = proposals(events, Vocabulary(), shape_words=SHAPE_WORDS)
    assert (p.kind, p.additions) == ("correction", {"shapes": {"curoe": "heart"}})
    assert any('1 edit(s) from "cuore"' in c for c in p.checks)


# --- validation -----------------------------------------------------------------


def test_the_repository_vocabulary_is_valid() -> None:
    # The gate of every change to learned/vocabulary.json: CI runs it.
    assert problems_of(Vocabulary.load()) == []


def test_a_wrong_vocabulary_is_never_used() -> None:
    wrong = Vocabulary().add(
        {
            "themes": {"Giro Bello": "romantic", "un giro bello": "dragons"},
            "shapes": {"stemma ferrari": "horse", "drago": "dragon"},
            "corrections": {"cuore": "stella", "pizz": "xyzzy"},
            "cities": {"Nowhere": [200.0, 0.0]},
        },
        "p",
        "by hand",
    )
    problems = {(p.section, p.key) for p in problems_of(wrong)}
    assert problems == {
        ("themes", "Giro Bello"),
        ("themes", "un giro bello"),
        ("shapes", "drago"),
        ("corrections", "cuore"),  # a word the tables know: it would change it
        ("corrections", "pizz"),  # to a word the tables do not read
        ("cities", "Nowhere"),
    }
    kept = Insights(None, wrong).vocab  # what the API uses
    assert kept.shapes == {"stemma ferrari": "horse"} and kept.themes == {}
    assert kept.corrections == {} and kept.version == 1
    assert usable(Vocabulary()) == Vocabulary()


def test_a_revert_is_remembered_and_a_revert_of_it_undone() -> None:
    v1 = Vocabulary().add({"themes": {"un giro bello": "romantic"}}, "p1", "r")
    v2 = v1.revert(0)
    assert v2.reverted("p1") and not v2.applied("p1")
    v3 = v2.revert(1)
    assert v3.applied("p1") and not v3.reverted("p1")
    assert v3.theme_for("un giro bello") == "romantic"


def test_the_command_validates_hides_reverted_and_dry_runs(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    log = EventLog(tmp_path)
    for e in ai_reads("un giro per innamorati", "romantic", 3):
        log.write(Event(**e))
    vocab_path = tmp_path / "v.json"
    args = ["--dir", str(tmp_path), "--vocab", str(vocab_path)]
    assert main([*args, "--json", "propose"]) == 0
    (p,) = json.loads(capsys.readouterr().out)
    assert main([*args, "apply", "--dry-run", p["id"]]) == 0
    assert "Nothing saved" in capsys.readouterr().out and not vocab_path.exists()
    assert main([*args, "apply", p["id"]]) == 0
    assert main([*args, "validate"]) == 0
    assert main([*args, "revert", "0"]) == 0
    capsys.readouterr()
    assert main([*args, "propose"]) == 0
    assert "1 reverted before, hidden" in capsys.readouterr().out
    with pytest.raises(SystemExit, match="--again"):
        main([*args, "apply", p["id"]])
    assert main([*args, "apply", "--again", p["id"]]) == 0
    assert Vocabulary.load(vocab_path).applied(p["id"])
    assert main([*args, "explain", p["id"]]) == 0
    out = capsys.readouterr().out
    assert "status: in effect in v3" in out and "3 days or places" in out
    # A file edited by hand into something wrong does not validate.
    body = json.loads(vocab_path.read_text())
    body["changes"][-1]["add"]["themes"]["un giro per innamorati"] = "dragons"
    vocab_path.write_text(json.dumps(body))
    assert main([*args, "validate"]) == 1


# --- did it help? ---------------------------------------------------------------


def themed_runs(ok: int, failed: int, vocab: int) -> list[dict[str, Any]]:
    good = {"kind": "themed", "outcome": "ok", "by": "table", "vocab": vocab}
    bad = {**good, "outcome": "error", "code": "no_places"}
    return [good] * ok + [bad] * failed


def test_compare_tells_a_change_from_chance() -> None:
    assert compare((15, 30), (28, 30), "up")["verdict"] == "better"
    assert compare((15, 30), (28, 30), "down")["verdict"] == "worse"
    assert compare((15, 30), (17, 30), "up")["verdict"] == "same"
    small = compare((1, 5), (5, 5), "up")
    assert (small["verdict"], small["z"]) == ("too few", None)
    assert compare((0, 30), (0, 30), "up")["verdict"] == "same"


def test_impact_says_better_worse_or_too_few_and_what_to_revert() -> None:
    v1 = Vocabulary().add(
        {"themes": {"un giro per innamorati": "romantic"}}, "p1", "r1"
    )
    v2 = v1.add({"themes": {"un giro bello": "nature"}}, "p2", "r2")
    learned = {
        "kind": "themed",
        "text": "un giro per innamorati a roma",
        "core": "un giro per innamorati",
        "by": "learned",
        "outcome": "ok",
        "ms": 30_000,  # the whole job: reading and planning
        "read_ms": 2,
        "vocab": 1,
    }
    asked = {**learned, "by": "ai", "read_ms": 4100, "vocab": 0}
    events = (
        themed_runs(15, 15, 0)
        + [asked] * 2
        + themed_runs(28, 2, 1)
        + [learned] * 3
        + themed_runs(10, 20, 2)
    )
    found = {v["version"]: v for v in impact(events, v2, request_core)}
    assert found[1]["verdict"].startswith("better (")
    assert found[1]["rates"]["themed_success_rate"]["verdict"] == "better"
    assert (found[1]["answered"], found[1]["ai_calls_saved"]) == (3, 3)
    assert (found[1]["ms_ai_before"], found[1]["ms_learned_after"]) == (4100.0, 2.0)
    assert metrics(events)["reading_ms"] == {"ai": 4100.0, "learned": 2.0}
    assert found[2]["verdict"] == (
        "worse (themed_success_rate, route_success_rate): consider `revert 1`"
    )
    few = impact(themed_runs(3, 1, 0) + themed_runs(4, 0, 1), v1)
    assert few[0]["verdict"].startswith("too few events")


def test_demand_shows_what_is_asked_what_works_and_what_fails() -> None:
    good = {
        "kind": "themed",
        "text": "luoghi famosi a roma",
        "outcome": "ok",
        "city": "Rome, Lazio, Italy",
        "lang": "it",
    }
    bad = {"kind": "city_search", "text": "atlantide", "outcome": "empty", "lang": None}
    word = {"kind": "route", "word": "CIAO", "shape": None, "outcome": "ok"}
    asked = demand([good] * 4 + [bad] * 2 + [word])
    assert asked["languages"] == {"it": 4} and asked["cities"] == {"Rome": 4}
    assert asked["worth_suggesting"] == [("luoghi famosi a roma", 4)]
    assert asked["failing"] == [("city_search", "atlantide", 2, 0.0)]
    assert asked["words"] == {"CIAO": 1}
