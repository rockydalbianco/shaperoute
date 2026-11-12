"""catalog_bike: the bike cases, the keys kept and the page, without the
engine and without the network (TASK-441 B2)."""

from __future__ import annotations

import json
from pathlib import Path

import catalog_bike as cb
import catalog_seed as cs
import catalog_words as cw


def _run(
    city: str, shape: str, distance_m: int, similarity: float = 0.95, **more: object
) -> cs.Run:
    return {
        "key": cb.bike_key(city, shape, distance_m),
        "city": city,
        "shape": shape,
        "activity": cb.ACTIVITY,
        "distance_m": distance_m,
        "route_m": distance_m,
        "similarity": similarity,
        "points": [[46.0, 11.0], [46.01, 11.0], [46.01, 11.01], [46.0, 11.0]],
        "extra_doubled": 0.0,
        "road_shares": {"residential": 1.0},
        "planned_at": "2026-11-12T10:00:00Z",
        "source": cb.SOURCE,
        **more,
    }


def test_a_bike_key_is_not_the_same_shape_on_foot_nor_a_word() -> None:
    key = cb.bike_key("milano", "heart", 30_000)
    assert key == "milano/heart@cycling/30000"
    assert key != cs.Case("milano", "heart", 30_000).key
    assert cb.is_bike_key(key)
    assert not cb.is_bike_key("milano/heart/10000")
    assert not cb.is_bike_key("milano/CIAO:pen_up/12000")
    assert not cw.is_word_key(key)


def test_the_plan_has_every_shape_once_a_city_longest_first() -> None:
    cases = cb.plan()
    assert len(cases) == len(cs.CITIES) * len(cb.SHAPES)
    assert len({c.key for c in cases}) == len(cases)
    first = cases[: len(cb.SHAPES)]
    assert {c.city.name for c in first} == {cs.CITIES[0].name}
    assert {c.shape for c in first} == set(cb.SHAPES)
    distances = [c.distance_m for c in first]
    assert distances == sorted(distances, reverse=True)
    assert set(distances) == set(cb.DISTANCES_M)


def test_a_distance_is_within_the_engine_limits_of_a_ride() -> None:
    assert min(cb.DISTANCES_M) >= 10_000
    assert max(cb.DISTANCES_M) <= 30_000


def test_over_the_cities_a_shape_is_drawn_at_every_distance() -> None:
    by_shape: dict[str, set[int]] = {}
    for c in cb.plan():
        by_shape.setdefault(c.shape, set()).add(c.distance_m)
    assert all(d == set(cb.DISTANCES_M) for d in by_shape.values())


def test_the_plan_of_some_cities_keeps_their_turn() -> None:
    whole = {c.key for c in cb.plan()}
    some = cb.plan(["trento", "milano"])
    assert {c.city.name for c in some} == {"trento", "milano"}
    assert {c.key for c in some} <= whole


def test_todo_leaves_out_what_is_done() -> None:
    cases = cb.plan(["trento"])
    left = cb.todo([cases[0].key], ["trento"])
    assert [c.key for c in left] == [c.key for c in cases[1:]]


def test_reasons_are_those_of_the_catalogue_filter() -> None:
    assert cb.reasons(_run("trento", "heart", 30_000)) == []
    assert cb.reasons(_run("trento", "heart", 30_000, similarity=0.85))
    assert cb.reasons(_run("trento", "heart", 30_000, route_m=34_000))
    assert cb.reasons(_run("trento", "heart", 30_000, extra_doubled=0.2))
    assert cb.reasons(
        _run("trento", "heart", 30_000, road_shares={"trunk": 0.1, "residential": 0.9})
    )
    failed = {
        "key": "k",
        "city": "trento",
        "shape": "heart",
        "distance_m": 30_000,
        "error_kind": cs.FAILED,
    }
    assert cb.reasons(failed) == [cs.FAILED]


def test_keep_adds_the_passing_bike_runs_and_touches_nothing_else() -> None:
    kept = [
        "trento/heart/5000",
        "trento/CIAO:pen_up/12000",
        cb.bike_key("trento", "sun", 20_000),
    ]
    runs = [
        _run("trento", "star", 25_000),
        _run("trento", "heart", 30_000),
        _run("trento", "moon", 20_000, similarity=0.80),
    ]
    assert cb.keep(runs, kept) == [
        "trento/heart/5000",
        "trento/CIAO:pen_up/12000",
        cb.bike_key("trento", "heart", 30_000),
        cb.bike_key("trento", "star", 25_000),
    ]


def test_keep_takes_the_last_run_of_a_case() -> None:
    runs = [
        _run("trento", "star", 25_000),
        _run("trento", "star", 25_000, similarity=0.5),
    ]
    assert cb.keep(runs, []) == []


def test_a_city_file_says_the_activity_and_lists_the_rides_last() -> None:
    foot = {
        "key": "trento/heart/5000",
        "city": "trento",
        "shape": "heart",
        "distance_m": 5000,
        "route_m": 5100,
        "similarity": 0.91,
        "points": [[46.0, 11.0], [46.001, 11.0], [46.0, 11.0]],
        "planned_at": "2026-11-08T10:00:00Z",
    }
    bike = _run("trento", "heart", 30_000, similarity=0.99)
    files = cs.city_files([bike, foot], [bike["key"], foot["key"]])
    routes = json.loads(files["trento.json"])["routes"]
    # The ride is more alike, and still after the run: a run keeps its place
    # in the file, so its id (TASK-441 B2).
    assert [r.get("activity") for r in routes] == [None, "cycling"]
    assert "activity" not in routes[0]
    assert routes[1]["distance_m"] == 30_000


def test_the_sample_is_the_worst_the_middle_and_the_best() -> None:
    runs = [_run(f"c{i}", "heart", 30_000, similarity=0.90 + i / 100) for i in range(9)]
    bands = cb.sample(runs, per_band=2)
    assert [label for label, _ in bands] == [
        "i meno somiglianti",
        "quelli di mezzo",
        "i più somiglianti",
    ]
    assert [r["city"] for r in bands[0][1]] == ["c0", "c1"]
    assert [r["city"] for r in bands[1][1]] == ["c3", "c4"]
    assert [r["city"] for r in bands[2][1]] == ["c7", "c8"]
    few = cb.sample(runs[:4], per_band=2)
    assert len(few) == 1 and len(few[0][1]) == 4


def test_the_page_shows_the_passing_runs_and_with_whole_the_rejected_too() -> None:
    runs = [
        _run("trento", "heart", 30_000),
        _run("milano", "heart", 25_000, similarity=0.7),
        {
            "key": "x",
            "city": "bari",
            "shape": "star",
            "distance_m": 20_000,
            "error_kind": cs.FAILED,
        },
    ]
    sample = cb.page(runs)
    assert "1 disegni in bici passano il filtro su 2 disegnati, in 1 città" in sample
    assert "trento" in sample and "milano" not in sample
    assert sample.count("<svg") == 1
    whole = cb.page(runs, whole=True)
    assert whole.count("<svg") == 2
    assert "similarity 0.70" in whole


def test_plan_on_the_command_line(capsys, tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    assert (
        cb.main(["--plan", "--cities", "trento", "--log", str(tmp_path / "none.jsonl")])
        == 0
    )
    out = capsys.readouterr()
    assert len(out.out.splitlines()) == len(cb.SHAPES)
    assert all(cb.is_bike_key(line) for line in out.out.splitlines())
    assert cb.main(["--plan", "--cities", "atlantis"]) == 2


def test_propose_and_write_on_the_command_line(capsys, tmp_path: Path) -> None:  # type: ignore[no-untyped-def]
    log = tmp_path / "bike.jsonl"
    cs.append_run(log, _run("trento", "heart", 30_000))
    kept = tmp_path / "kept.json"
    cs.write_kept(kept, [])
    none = str(tmp_path / "none.jsonl")
    logs = [
        "--log",
        str(log),
        "--old-log",
        none,
        "--words-log",
        none,
        "--pen-up-log",
        none,
    ]
    assert cb.main(["--propose", "--kept", str(kept), *logs]) == 0
    keys = json.loads(capsys.readouterr().out)["kept"]
    assert keys == [cb.bike_key("trento", "heart", 30_000)]
    cs.write_kept(kept, keys)
    out = tmp_path / "seed"
    assert cb.main(["--write", "--kept", str(kept), "--out", str(out), *logs]) == 0
    body = json.loads((out / "trento.json").read_text())
    assert body["routes"][0]["activity"] == "cycling"
