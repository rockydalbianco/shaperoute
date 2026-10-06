"""Deterministic tests for the seed catalogue (TASK-125): a fake planner,
no network, no road graph."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from route_engine import seed_catalog
from route_engine.models import RouteResult
from route_engine.network import LatLon
from route_engine.optimizer import ShapeNotDrawableError
from route_engine.seed_catalog import (
    CITIES,
    FAILED,
    FEATURED,
    LICENSE,
    NOT_DRAWABLE,
    PHRASES,
    Case,
    cases,
    catalogue_files,
    gpx_files,
    main,
    read_runs,
    run_cases,
    select,
    word_cases,
    word_distance,
)


def _result(similarity: float) -> RouteResult:
    return RouteResult(
        points=[(46.0, 11.0), (46.0012345678, 11.0), (46.0, 11.0)],
        distance_m=5123.4,
        similarity=similarity,
        shape="heart",
    )


def _run(key: str, similarity: float | None = None, **extra: object) -> dict:
    city, shape, distance = key.split("/")
    run: dict = {"key": key, "city": city, "shape": shape}
    run["distance_m"] = int(distance)
    if similarity is not None:
        run.update(
            similarity=similarity,
            route_m=5000,
            points=[[46.0, 11.0]],
            planned_at="2026-10-01T10:00:00Z",
        )
    run.update(extra)
    return run


def test_cases_go_city_by_city_largest_distance_first() -> None:
    got = cases(["trento", "levico"], ["heart", "star"], [5000, 21000])
    assert [c.key for c in got] == [
        "trento/heart/21000",
        "trento/star/21000",
        "trento/heart/5000",
        "trento/star/5000",
        "levico/heart/21000",
        "levico/star/21000",
        "levico/heart/5000",
        "levico/star/5000",
    ]


def test_run_cases_logs_results_and_errors(tmp_path: Path) -> None:
    log = tmp_path / "runs.jsonl"

    def planner(case: Case, start: LatLon) -> RouteResult:
        assert start == CITIES[case.city]
        if case.shape == "star":
            raise ShapeNotDrawableError("no roads")
        if case.shape == "cat":
            raise OSError("Overpass timed out")
        return _result(0.91234)

    todo = cases(["levico"], ["heart", "star", "cat"], [5000])
    assert run_cases(todo, planner, log, say=lambda _: None) == 3
    runs = {r["key"]: r for r in read_runs(log)}
    heart = runs["levico/heart/5000"]
    assert heart["similarity"] == 0.9123
    assert heart["route_m"] == 5123
    assert heart["points"][1] == [46.001235, 11.0]
    assert runs["levico/star/5000"]["error_kind"] == NOT_DRAWABLE
    assert runs["levico/cat/5000"]["error_kind"] == FAILED
    assert "Overpass timed out" in runs["levico/cat/5000"]["error"]


def test_run_cases_resumes_and_retries_only_network_failures(
    tmp_path: Path,
) -> None:
    log = tmp_path / "runs.jsonl"
    lines = [
        _run("levico/heart/5000", 0.9),
        _run("levico/star/5000", error_kind=NOT_DRAWABLE, error="x"),
        _run("levico/cat/5000", error_kind=FAILED, error="y"),
    ]
    log.write_text("".join(json.dumps(r) + "\n" for r in lines), encoding="utf-8")
    planned: list[str] = []

    def planner(case: Case, start: LatLon) -> RouteResult:
        planned.append(case.key)
        return _result(0.95)

    todo = cases(["levico"], ["heart", "star", "cat", "moon"], [5000])
    assert run_cases(todo, planner, log, say=lambda _: None) == 2
    assert planned == ["levico/cat/5000", "levico/moon/5000"]
    # The retried case's later line wins.
    runs = {r["key"]: r for r in read_runs(log)}
    assert runs["levico/cat/5000"]["similarity"] == 0.95
    assert len(runs) == 4


def test_select_keeps_every_route_above_the_threshold_best_first() -> None:
    runs = [
        _run("trento/heart/5000", 0.90),
        _run("trento/star/5000", 0.95),
        _run("trento/moon/5000", 0.87),
        _run("trento/cat/5000", 0.90),  # as good as the heart: both kept
        _run("levico/heart/5000", 0.88),  # at the threshold: kept
        _run("levico/star/5000", error_kind=NOT_DRAWABLE, error="x"),
    ]
    got = [r["key"] for r in select(runs, 0.88)]
    assert got == [
        "levico/heart/5000",
        "trento/star/5000",
        "trento/cat/5000",
        "trento/heart/5000",
    ]


def test_select_leaves_out_what_the_eye_rejected() -> None:
    runs = [_run("trento/fish/21000", 0.99), _run("milano/fish/21000", 0.99)]
    assert [r["key"] for r in select(runs, 0.5)] == ["milano/fish/21000"]


def test_select_leaves_out_one_distance_judged_unreadable() -> None:
    runs = [_run("levico/star/5000", 0.99), _run("levico/star/10000", 0.99)]
    assert [r["key"] for r in select(runs, 0.5)] == ["levico/star/10000"]


def test_catalogue_files_one_per_city_same_input_same_text() -> None:
    selected = select([_run("trento/heart/5000", 0.9), _run("bari/star/10000", 0.93)])
    files = catalogue_files(selected, 0.88)
    assert sorted(files) == ["bari.json", "trento.json"]
    assert catalogue_files(selected, 0.88) == files
    trento = json.loads(files["trento.json"])
    assert trento["centre"] == list(CITIES["trento"])
    assert trento["license"] == LICENSE
    assert trento["min_similarity"] == 0.88
    assert trento["routes"] == [
        {
            "shape": "heart",
            "distance_m": 5000,
            "route_m": 5000,
            "similarity": 0.9,
            "planned_at": "2026-10-01T10:00:00Z",
            "points": [[46.0, 11.0]],
        }
    ]


def test_main_plans_then_writes_only_the_kept(tmp_path: Path) -> None:
    def planner(case: Case, start: LatLon) -> RouteResult:
        return _result(0.92 if case.shape == "heart" else 0.5)

    out = tmp_path / "seed"
    argv = [
        "--run",
        "--cities",
        "verona",
        "--shapes",
        "heart,star",
        "--distances",
        "5000",
        "--log",
        str(tmp_path / "runs.jsonl"),
        "--out",
        str(out),
    ]
    assert main(argv, planner=planner) == 0
    verona = json.loads((out / "verona.json").read_text(encoding="utf-8"))
    assert [r["shape"] for r in verona["routes"]] == ["heart"]


def test_gpx_files_one_per_kept_route() -> None:
    files = gpx_files([_run("trento/heart/10000", 0.9)])
    assert list(files) == ["trento_heart_10km.gpx"]
    text = files["trento_heart_10km.gpx"]
    assert "heart 10 km · 2026-10-01" in text
    assert text.count("<trkpt ") == 1


def test_unknown_city_is_refused() -> None:
    with pytest.raises(SystemExit):
        main(["--cities", "atlantide"])


def test_featured_cities_stay_out_of_the_whole_tour() -> None:
    assert not set(FEATURED) & set(CITIES)
    assert seed_catalog._build_parser().parse_args([]).cities == list(CITIES)


def test_featured_plans_a_heart_a_circle_and_a_star_of_5_km(tmp_path: Path) -> None:
    asked: list[tuple[str, LatLon]] = []

    def planner(case: Case, start: LatLon) -> RouteResult:
        asked.append((case.key, start))
        return _result(0.9)

    out = tmp_path / "seed"
    argv = ["--run", "--featured", "--log", str(tmp_path / "runs.jsonl")]
    assert main([*argv, "--out", str(out)], planner=planner) == 0
    assert [key for key, _ in asked] == [
        f"{city}/{shape}/5000"
        for city in FEATURED
        for shape in ("heart", "circle", "star")
    ]
    # From its own square, which the file keeps as the centre.
    assert asked[0][1] == FEATURED["london"]
    london = json.loads((out / "london.json").read_text(encoding="utf-8"))
    assert london["centre"] == list(FEATURED["london"])
    assert [r["shape"] for r in london["routes"]] == ["circle", "heart", "star"]
    assert sorted(p.stem for p in out.glob("*.json")) == sorted(FEATURED)


def test_word_distance_is_3750_m_a_letter_within_the_limits() -> None:
    assert word_distance("UE") == 8000
    assert word_distance("CIAO") == 15000
    assert word_distance("HELLO") == 19000
    assert word_distance("GRAZIE") == 21000
    assert word_distance("ILOVENY") == 21000


def _word(key: str, similarity: float) -> dict:
    city, written, distance = key.split("/")
    word, style = written.split(":")
    run = _run(f"{city}/{word}/{distance}", similarity, style=style)
    run["word"] = run.pop("shape")
    return run


def test_select_leaves_out_a_word_judged_unreadable() -> None:
    runs = [
        _word("trento/CIAO:block/15000", 0.99),
        _word("trento/CIAO:round/15000", 0.99),
    ]
    assert [r["style"] for r in select(runs, 0.5)] == ["round"]


def test_select_leaves_out_a_word_no_longer_among_the_phrases() -> None:
    runs = [
        _word("torino/CEREA:round/19000", 0.99),
        _word("torino/CIAO:round/15000", 0.95),
    ]
    assert [r["word"] for r in select(runs, 0.5)] == ["CIAO"]


def test_phrases_are_short_words_only() -> None:
    assert max(len(w) for words in PHRASES.values() for w in words) <= 5


def test_prepare_downloads_nothing_when_every_zone_is_cached(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    loaded: list[tuple[float, ...]] = []

    class Source:
        def __init__(self, cache_dir: Path) -> None:
            pass

        def is_cached(self, box: tuple[float, ...]) -> bool:
            return cached

        def load(self, box: tuple[float, ...]) -> None:
            loaded.append(box)

    monkeypatch.setattr(seed_catalog, "OsmnxSource", Source)
    prepare = seed_catalog.engine_prepare(tmp_path, pause=lambda s: None)
    todo = cases(["bari"], ["heart", "star"], [5000])
    cached = True
    prepare("bari", todo)
    assert loaded == []
    cached = False
    prepare("bari", todo)
    assert len(loaded) == 1


def test_every_city_has_phrases_the_engine_can_write() -> None:
    assert set(PHRASES) == set(CITIES)
    for words in PHRASES.values():
        for word in words:
            assert word.isalpha() and word.isupper() and len(word) <= 7


def test_word_cases_each_style_and_their_keys() -> None:
    got = word_cases(["bari"], {"bari": ("UE", "BUONGIORNO")}, ["round", "block"])
    assert [c.key for c in got] == ["bari/UE:round/8000", "bari/UE:block/8000"]


def test_a_word_is_logged_and_kept_as_a_word(tmp_path: Path) -> None:
    styles: set[str | None] = set()

    def planner(case: Case, start: LatLon) -> RouteResult:
        styles.add(case.style)
        return _result(0.95)

    out = tmp_path / "seed"
    main(
        [
            "--run",
            "--kinds",
            "words",
            "--cities",
            "bari",
            "--log",
            str(tmp_path / "runs.jsonl"),
            "--out",
            str(out),
            "--gpx",
            str(tmp_path / "gpx"),
        ],
        planner=planner,
    )
    bari = json.loads((out / "bari.json").read_text(encoding="utf-8"))
    words = {r["word"] for r in bari["routes"]}
    assert words == set(PHRASES["bari"])
    assert all("shape" not in r for r in bari["routes"])
    assert styles == {"round", "block"}
    assert (tmp_path / "gpx" / "bari_UE-round_8km.gpx").exists()


def test_each_city_is_prepared_once_before_its_cases(tmp_path: Path) -> None:
    order: list[str] = []

    def planner(case: Case, start: LatLon) -> RouteResult:
        order.append(case.key)
        return _result(0.9)

    def prepare(city: str, todo: list[Case]) -> None:
        order.append(f"prepare {city} ({len(todo)})")
        if city == "bari":
            raise OSError("Overpass refused")

    todo = cases(["bari", "verona"], ["heart", "star"], [5000])
    said: list[str] = []
    assert (
        run_cases(
            todo, planner, tmp_path / "runs.jsonl", say=said.append, prepare=prepare
        )
        == 2
    )
    # Bari's zone did not load: its cases wait for the next run.
    assert order == [
        "prepare bari (2)",
        "prepare verona (2)",
        "verona/heart/5000",
        "verona/star/5000",
    ]
    assert said[0] == "bari: zone not loaded (OSError), skipped"
    assert run_cases(todo, planner, tmp_path / "runs.jsonl", say=said.append) == 2


def test_a_shape_the_engine_turned_is_logged_and_written_with_its_turn(
    tmp_path: Path,
) -> None:
    """TASK-232 part C: `rotation_deg` in the log and in the city file, only
    when the shape is turned; the API's catalogue reads it, and the app
    draws the route turned back. A route north up is written as before."""
    log = tmp_path / "runs.jsonl"

    def planner(case: Case, start: LatLon) -> RouteResult:
        result = _result(0.9)
        if case.shape == "star":
            return RouteResult(
                points=result.points,
                distance_m=result.distance_m,
                similarity=0.9,
                shape="star",
                rotation_deg=-30.0,
            )
        return result

    todo = cases(["levico"], ["heart", "star"], [5000])
    assert run_cases(todo, planner, log, say=lambda _: None) == 2
    runs = {r["key"]: r for r in read_runs(log)}
    assert runs["levico/star/5000"]["rotation_deg"] == -30.0
    assert "rotation_deg" not in runs["levico/heart/5000"]
    kept = [runs["levico/heart/5000"], runs["levico/star/5000"]]
    heart, star = json.loads(catalogue_files(kept, 0.88)["levico.json"])["routes"]
    assert star["shape"] == "star" and star["rotation_deg"] == -30.0
    assert heart["shape"] == "heart" and "rotation_deg" not in heart
