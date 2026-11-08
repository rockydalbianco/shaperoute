"""Deterministic tests for tools/catalog_seed.py: no network, no engine."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from catalog_seed import (
    ALL_SHAPES,
    AT_LEAST,
    BY_NAME,
    CITIES,
    CORE_SHAPES,
    LICENSE,
    MAX_WORD_LETTERS,
    NEW_SHAPES,
    PER_CITY,
    SIMPLE_SHAPES,
    Case,
    city_files,
    done_keys,
    doubled_share,
    imported,
    main,
    path_length_m,
    plan,
    preselect,
    read_kept,
    read_runs,
    reasons,
    road_shares,
    score,
    select_cities,
    slot_wait_s,
    summary,
    wait_for_slot,
    word_distance,
    write_kept,
)

# A square of 1 km around Trento's Piazza Duomo, as a route's points.
ORIGIN = (46.067, 11.1215)
DLAT = 1000 / 111_195  # a kilometre of latitude
DLON = DLAT / 0.6936  # a kilometre of longitude at 46°
SQUARE = [
    ORIGIN,
    (ORIGIN[0] + DLAT, ORIGIN[1]),
    (ORIGIN[0] + DLAT, ORIGIN[1] + DLON),
    (ORIGIN[0], ORIGIN[1] + DLON),
    ORIGIN,
]


def run(
    key: str = "trento/circle/5000",
    similarity: float = 0.95,
    route_m: int = 5100,
    distance_m: int = 5000,
    points: list[tuple[float, float]] = SQUARE,
    **extra: object,
) -> dict[str, object]:
    city, what, _ = key.split("/")
    body: dict[str, object] = {
        "key": key,
        "city": city,
        "distance_m": distance_m,
        "similarity": similarity,
        "route_m": route_m,
        "points": [list(p) for p in points],
        "planned_at": "2026-11-08T10:00:00Z",
        "seconds": 3.0,
    }
    if ":" in what:
        word, style = what.split(":")
        body.update(word=word, style=style)
    else:
        body["shape"] = what
    body.update(extra)
    return body


# --- The plan ----------------------------------------------------------------


def test_every_city_has_a_square_in_europe_or_is_featured() -> None:
    names = [c.name for c in CITIES]
    assert len(names) == len(set(names))
    for c in CITIES:
        lat, lon = c.square
        assert -90 < lat < 90 and -180 < lon < 180
        assert c.name == c.name.lower() and " " not in c.name
        if c.group in ("italy", "europe"):
            assert 35 < lat < 65 and -10 < lon < 30


def test_plan_has_about_a_thousand_cases_with_unique_keys() -> None:
    cases = plan()
    keys = [c.key for c in cases]
    assert len(keys) == len(set(keys))
    assert 1000 <= len(cases) <= 1400
    assert all(c.city in BY_NAME for c in cases)


def test_seed_cities_plan_only_the_shapes_never_seeded() -> None:
    cases = plan(select_cities(["seed"]))
    shapes = {c.shape for c in cases if c.style is None}
    assert shapes == set(NEW_SHAPES)
    assert not any(c.style for c in cases)  # their words came in 2026-10
    assert len(cases) == 14 * len(NEW_SHAPES) * 3


def test_new_cities_plan_the_core_and_the_simple_three_at_21_km() -> None:
    vienna = BY_NAME["vienna"]
    cases = plan([vienna])
    at21 = {c.shape for c in cases if c.distance_m == 21_000 and c.style is None}
    at5 = {c.shape for c in cases if c.distance_m == 5_000}
    assert at21 == set(SIMPLE_SHAPES)
    assert at5 == set(CORE_SHAPES)
    words = [c for c in cases if c.style is not None]
    assert [(c.shape, c.style) for c in words] == [
        ("HALLO", "round"),
        ("HALLO", "block"),
    ]
    assert all(c.distance_m == word_distance("HALLO") == 19_000 for c in words)


def test_venice_stays_within_10_km_without_a_15_km_word() -> None:
    cases = plan([BY_NAME["venezia"]])
    assert max(c.distance_m for c in cases) == 10_000
    assert not any(c.style for c in cases)


def test_largest_distance_comes_first_in_a_city() -> None:
    cases = [c for c in plan([BY_NAME["trento"]]) if c.style is None]
    distances = [c.distance_m for c in cases]
    assert distances == sorted(distances, reverse=True)


def test_word_distance_rounds_up_to_whole_km_within_the_limits() -> None:
    assert word_distance("GO") == 8_000
    assert word_distance("CIAO") == 15_000
    assert word_distance("HELLO") == 19_000
    assert word_distance("A") == 5_000
    assert word_distance("ABCDEFG") == 21_000
    assert MAX_WORD_LETTERS == 7


def test_case_key_matches_seed_catalog() -> None:
    assert Case("roma", "heart", 5000).key == "roma/heart/5000"
    assert Case("roma", "AMOR", 15000, "block").key == "roma/AMOR:block/15000"


def test_select_cities_by_group_or_name() -> None:
    assert [c.group for c in select_cities(["featured"])] == ["featured"] * 10
    assert [c.name for c in select_cities(names=["milano", "roma"])] == [
        "milano",
        "roma",
    ]
    with pytest.raises(ValueError, match="unknown city: atlantis"):
        select_cities(names=["atlantis"])


def test_all_shapes_are_the_seventeen_of_the_engine() -> None:
    assert len(ALL_SHAPES) == 17 and ALL_SHAPES[:3] == SIMPLE_SHAPES
    assert set(CORE_SHAPES) <= set(ALL_SHAPES)


# --- Geometry -----------------------------------------------------------------


def test_path_length_of_a_kilometre_square() -> None:
    assert path_length_m(SQUARE) == pytest.approx(4000, rel=0.01)


def test_doubled_share_sees_a_whisker_out_and_back() -> None:
    assert doubled_share(SQUARE) == 0.0
    whisker = (ORIGIN[0] + DLAT / 2, ORIGIN[1] + DLON / 2)
    with_whisker = SQUARE[:1] + [whisker, ORIGIN] + SQUARE[1:]
    # The whisker is run twice: ~707 m out and 707 m back of ~5414 m.
    assert doubled_share(with_whisker) == pytest.approx(1414 / 5414, rel=0.02)
    assert doubled_share([ORIGIN]) == 0.0


def test_road_shares_by_the_pieces_of_road() -> None:
    def piece(a: tuple[float, float], b: tuple[float, float]) -> frozenset:
        return frozenset(
            ((round(a[0], 6), round(a[1], 6)), (round(b[0], 6), round(b[1], 6)))
        )

    roads = {
        piece(SQUARE[0], SQUARE[1]): "primary",
        piece(SQUARE[2], SQUARE[1]): "residential",  # the other way round
        piece(SQUARE[2], SQUARE[3]): "residential",
    }
    shares = road_shares(SQUARE, roads)
    assert shares == {"primary": 0.25, "residential": 0.5, "unknown": 0.25}
    assert road_shares(SQUARE[:1], roads) == {}


# --- The filter, the score, the preselection --------------------------------


def test_filter_passes_a_good_route() -> None:
    assert reasons(run(extra_doubled=0.05, road_shares={"residential": 1.0})) == []


def test_filter_names_every_reason() -> None:
    assert reasons(run(similarity=0.89)) == ["similarity 0.89 < 0.90"]
    assert reasons(run(route_m=5600)) == ["distance +12% off"]
    assert reasons(run(route_m=4400)) == ["distance -12% off"]
    assert reasons(run(extra_doubled=0.11)) == ["retraced 11% > 10%"]
    assert reasons(run(road_shares={"residential": 0.9, "trunk": 0.1})) == [
        "10% on motorway or trunk"
    ]
    assert reasons(run(road_shares={"primary": 1.0})) == []  # big, not bad
    assert len(reasons(run(similarity=0.5, route_m=7000, extra_doubled=0.5))) == 3


def test_filter_judges_an_imported_run_on_what_it_has() -> None:
    assert reasons(run()) == []  # no extra_doubled, no road_shares


def test_filter_rejects_what_was_not_drawn() -> None:
    failed = {"key": "roma/heart/5000", "city": "roma", "error_kind": "failed"}
    assert reasons(failed) == ["failed"]
    assert score(failed) == float("-inf")


def test_score_is_the_engine_cost_with_its_sign_changed() -> None:
    assert score(
        run(similarity=0.95, route_m=5100, extra_doubled=0.04)
    ) == pytest.approx(0.95 - 1.5 * 0.04 - 0.02)
    assert score(run(similarity=0.95, route_m=5000)) == pytest.approx(0.95)


def test_preselect_keeps_the_best_per_city_and_at_least_three() -> None:
    runs = [
        run(f"vienna/{s}/5000", similarity=0.90 + i / 100)
        for i, s in enumerate(ALL_SHAPES)
    ]
    runs += [
        run(f"prague/{s}/5000", similarity=0.5 + i / 100)
        for i, s in enumerate(ALL_SHAPES[:5])
    ]
    runs.append(
        {"key": "prague/sun/5000", "city": "prague", "error_kind": "not_drawable"}
    )
    chosen = preselect(runs)
    vienna = [k for k in chosen if k.startswith("vienna/")]
    prague = [k for k in chosen if k.startswith("prague/")]
    assert len(vienna) == PER_CITY
    assert vienna[0] == "vienna/sun/5000"  # the best score first
    # None passes in Prague: the three best drawn ones are proposed anyway.
    assert len(prague) == AT_LEAST
    assert prague == ["prague/moon/5000", "prague/horse/5000", "prague/star/5000"]


def test_preselect_always_keeps_the_featured_three_of_5_km() -> None:
    runs = [
        run(f"london/{s}/10000", similarity=0.99, route_m=10000, distance_m=10000)
        for s in ALL_SHAPES
    ]
    runs += [run(f"london/{s}/5000", similarity=0.80) for s in SIMPLE_SHAPES]
    chosen = preselect(runs)
    assert {"london/heart/5000", "london/circle/5000", "london/star/5000"} <= set(
        chosen
    )
    assert len(chosen) == PER_CITY + 3
    # A seed city has no such rule.
    assert preselect(
        [run("roma/heart/10000", similarity=0.99, route_m=10000, distance_m=10000)]
    ) == ["roma/heart/10000"]


# --- The run log ---------------------------------------------------------------


def test_read_runs_keeps_the_last_line_of_a_key(tmp_path: Path) -> None:
    log = tmp_path / "runs.jsonl"
    lines = [run(similarity=0.5), run(similarity=0.9), run("roma/heart/5000")]
    log.write_text("\n".join(json.dumps(r) for r in lines) + "\n\n", encoding="utf-8")
    runs = read_runs(log)
    assert [r["key"] for r in runs] == ["trento/circle/5000", "roma/heart/5000"]
    assert runs[0]["similarity"] == 0.9
    assert read_runs(tmp_path / "missing.jsonl") == []


def test_done_keys_try_a_network_failure_again() -> None:
    runs = [
        run("a/circle/5000"),
        {"key": "b/circle/5000", "error_kind": "not_drawable"},
        {"key": "c/circle/5000", "error_kind": "failed"},
    ]
    assert done_keys(runs) == {"a/circle/5000", "b/circle/5000"}


def test_imported_marks_the_source_and_measures_the_simple_shapes() -> None:
    runs = [
        run(),
        run("roma/cat/5000"),
        {"key": "x/heart/5000", "error_kind": "failed"},
    ]
    out = imported(runs, "2026-10")
    assert [r["key"] for r in out] == ["trento/circle/5000", "roma/cat/5000"]
    assert all(r["source"] == "2026-10" for r in out)
    assert out[0]["extra_doubled"] == 0.0  # a circle draws nothing twice
    assert "extra_doubled" not in out[1]  # a cat does: the engine must say
    assert "source" not in runs[0]  # the input is left alone


# --- The city files -----------------------------------------------------------


def test_city_files_follow_the_format_of_the_readme() -> None:
    runs = [
        run("trento/heart/5000", similarity=0.91),
        run("trento/star/5000", similarity=0.97, rotation_deg=12.5),
        run(
            "trento/CIAO:round/15000", similarity=0.93, route_m=15200, distance_m=15000
        ),
        run("roma/heart/5000"),
    ]
    files = city_files(
        runs, ["trento/heart/5000", "trento/star/5000", "trento/CIAO:round/15000"]
    )
    assert list(files) == ["trento.json"]
    body = json.loads(files["trento.json"])
    assert body["city"] == "trento" and body["centre"] == [46.067, 11.1215]
    assert body["min_similarity"] == 0.9 and body["license"] == LICENSE
    assert [r["similarity"] for r in body["routes"]] == [0.97, 0.93, 0.91]  # best first
    star, ciao, heart = body["routes"]
    assert star["shape"] == "star" and star["rotation_deg"] == 12.5
    assert "rotation_deg" not in heart and set(heart) == {
        "shape",
        "distance_m",
        "route_m",
        "similarity",
        "planned_at",
        "points",
    }
    assert ciao["word"] == "CIAO" and ciao["style"] == "round" and "shape" not in ciao
    assert files == city_files(
        runs, ["trento/star/5000", "trento/CIAO:round/15000", "trento/heart/5000"]
    )


def test_city_files_refuse_a_kept_key_without_a_run() -> None:
    with pytest.raises(KeyError, match="roma/heart/5000"):
        city_files([run()], ["roma/heart/5000"])


def test_kept_file_round_trip(tmp_path: Path) -> None:
    path = tmp_path / "kept.json"
    write_kept(path, ["b/x/5000", "a/y/5000", "b/x/5000"], note="chosen by the user")
    assert read_kept(path) == ["b/x/5000", "a/y/5000"]
    assert json.loads(path.read_text())["note"] == "chosen by the user"
    path.write_text('["a/y/5000"]')
    assert read_kept(path) == ["a/y/5000"]
    path.write_text('{"kept": "a/y/5000"}')
    with pytest.raises(ValueError):
        read_kept(path)


def test_summary_counts_per_city() -> None:
    text = summary(
        [run(), run("roma/heart/5000", similarity=0.7)], ["trento/circle/5000"]
    )
    assert text.startswith("2 cases: 2 drawn, 1 pass the filter, 1 kept")
    assert (
        "  roma            0 kept,   0 pass of   1 drawn (1 planned), best 0.70" in text
    )


# --- Overpass -------------------------------------------------------------------


def test_slot_wait_from_the_status_page() -> None:
    assert slot_wait_s("Rate limit: 2\n2 slots available now.") == 0.0
    assert (
        slot_wait_s(
            "Slot available after: 2026-11-08T17:00:00Z, in 37 seconds.\n"
            "Slot available after: 2026-11-08T17:01:23Z, in 120 seconds."
        )
        == 37.0
    )
    assert slot_wait_s("# 502 Gateway Timeout") is None


def test_wait_for_slot_waits_as_told_then_gives_up() -> None:
    answers = iter([None, 42.0, 0.0])
    slept: list[float] = []
    said: list[str] = []
    assert wait_for_slot(lambda: next(answers), slept.append, said.append) is True
    assert slept == [300.0, 42.0]
    assert said[0].startswith("Overpass: no answer") and "slot in 42 s" in said[1]
    assert wait_for_slot(lambda: None, slept.append, said.append, max_s=500) is False


# --- Command line -------------------------------------------------------------


def test_main_plans_imports_preselects_and_writes(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(["--plan", "--cities", "vienna"]) == 0
    out = capsys.readouterr()
    assert out.out.splitlines()[0] == "vienna/circle/21000"
    assert "19 cases in 1 cities" in out.err

    old = tmp_path / "old.jsonl"
    old.write_text(json.dumps(run("trento/heart/5000", similarity=0.97)) + "\n")
    log = tmp_path / "runs.jsonl"
    assert main(["--import-log", str(old), "--log", str(log)]) == 0
    assert read_runs(log)[0]["source"] == "2026-10"
    assert main(["--import-log", str(old), "--log", str(log)]) == 0  # not twice
    assert len(log.read_text().splitlines()) == 1
    assert "1 runs imported" in capsys.readouterr().out

    assert main(["--preselect", "--log", str(log)]) == 0
    chosen = json.loads(capsys.readouterr().out)
    assert chosen == {"kept": ["trento/heart/5000"]}

    kept = tmp_path / "kept.json"
    write_kept(kept, chosen["kept"])
    seed = tmp_path / "seed"
    assert (
        main(["--write", "--log", str(log), "--kept", str(kept), "--out", str(seed)])
        == 0
    )
    body = json.loads((seed / "trento.json").read_text())
    assert body["routes"][0]["shape"] == "heart"
    assert "1 kept" in capsys.readouterr().err

    assert main(["--plan", "--cities", "atlantis"]) == 2
