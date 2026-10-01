"""Deterministic tests for the seed catalogue (TASK-125): a fake planner,
no network, no road graph."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from route_engine.models import RouteResult
from route_engine.network import LatLon
from route_engine.optimizer import ShapeNotDrawableError
from route_engine.seed_catalog import (
    CITIES,
    FAILED,
    LICENSE,
    NOT_DRAWABLE,
    Case,
    cases,
    catalogue_files,
    gpx_files,
    main,
    read_runs,
    run_cases,
    select,
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
