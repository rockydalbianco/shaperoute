"""Deterministic tests for tools/catalog_words.py: no network, no engine."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import catalog_seed as cs
import pytest
from catalog_words import (
    LANGUAGE,
    LOCAL,
    MAX_LETTERS,
    OWN,
    POOL,
    POOL_PER_CITY,
    best_words,
    cities,
    language_of,
    main,
    plan,
    propose,
    registered_shapes,
    spare,
    word_keys,
    words_of,
)
from test_catalog_seed import run

# --- The words -----------------------------------------------------------------


def test_every_word_is_short_and_of_the_engine_s_alphabet() -> None:
    words = set(POOL) | {w for ws in LOCAL.values() for w in ws}
    words |= {w for ws in OWN.values() for w in ws}
    for w in words:
        assert w.isascii() and w.isalpha() and w == w.upper(), w
        assert 2 <= len(w) <= MAX_LETTERS, w


def test_the_pool_names_no_word_twice() -> None:
    assert len(POOL) == len(set(POOL))


def test_languages_and_own_words_are_of_known_cities() -> None:
    assert set(LANGUAGE) <= set(cs.BY_NAME)
    assert set(OWN) <= set(cs.BY_NAME)
    assert set(LANGUAGE.values()) <= set(LOCAL)
    assert language_of("trento") == "it" and language_of("madrid") == "es"


def test_a_city_has_its_own_words_its_language_s_and_a_turn_of_the_pool() -> None:
    words = words_of("roma", 3)
    assert words[:3] == ("ROMA", "DAJE", "AO")
    assert set(LOCAL["it"]) <= set(words)
    turn = [POOL[(3 * POOL_PER_CITY + k) % len(POOL)] for k in range(POOL_PER_CITY)]
    assert set(turn) <= set(words)
    assert len(words) == len(set(words))


def test_every_word_of_the_pool_is_written_in_several_cities() -> None:
    count = Counter(w for i, c in enumerate(cs.CITIES) for w in words_of(c.name, i))
    for w in POOL:
        assert count[w] >= 5, (w, count[w])


def test_cities_keep_their_square_and_plan_no_shape() -> None:
    mine = cities()
    assert [c.name for c in mine] == [c.name for c in cs.CITIES]
    for c, old in zip(mine, cs.CITIES, strict=True):
        assert c.square == old.square and c.distances == old.distances
        assert c.shapes == ()
    assert [c.name for c in cities(names=["bari", "roma"])] == ["roma", "bari"]


def test_a_word_already_drawn_in_both_styles_is_left_out() -> None:
    roma = cs.BY_NAME["roma"]
    both = word_keys(roma, "DAJE")
    assert both == ["roma/DAJE:round/15000", "roma/DAJE:block/15000"]
    (with_one,) = cities([both[0]], ["roma"])
    assert "DAJE" in with_one.words
    (with_both,) = cities(both, ["roma"])
    assert "DAJE" not in with_both.words and "ROMA" in with_both.words


def test_the_plan_is_words_alone_in_two_styles_within_the_city_s_distances() -> None:
    cases = plan()
    keys = [c.key for c in cases]
    assert len(keys) == len(set(keys))
    assert 1000 <= len(cases) <= 1600
    assert all(c.style in cs.STYLES for c in cases)
    assert Counter(c.style for c in cases)["round"] * 2 == len(cases)
    # Venice has room for 10 km: only two letters fit there.
    assert {len(c.shape) for c in cases if c.city == "venezia"} == {2}
    assert plan(names=["venezia"]) == [c for c in cases if c.city == "venezia"]


# --- What to add ---------------------------------------------------------------

SOURCE = """
SHAPES: dict[str, ShapeFn] = {
    "circle": circle,
    # a comment
    "heart": heart,  # "not_this": one
    "wine_glass": read_outline(OUTLINES / "wine_glass.json"),
}

ROUND: frozenset[str] = frozenset({"donut"})
"""


def test_registered_shapes_are_the_names_of_the_engine_s_table() -> None:
    assert registered_shapes(SOURCE) == {"circle", "heart", "wine_glass"}


def test_registered_shapes_of_the_repository() -> None:
    shapes = registered_shapes()
    assert set(cs.ALL_SHAPES) <= shapes
    assert "swan" in shapes  # registered by TASK-418 B
    assert "penguin" not in shapes  # still a candidate outline


def test_spare_is_what_passes_is_not_kept_and_the_engine_has() -> None:
    runs = [
        run("trento/circle/5000", 0.93),
        run("trento/heart/5000", 0.97),
        run("trento/star/5000", 0.80),  # below the filter
        run("trento/penguin/5000", 0.99, outline="penguin.json"),
        run("trento/moon/5000", 0.96),
        run("trento/CIAO:round/15000", 0.95, route_m=15_200, distance_m=15_000),
    ]
    keys = spare(runs, ["trento/moon/5000"], {"circle", "heart", "star", "moon"})
    assert keys == [
        "trento/heart/5000",
        "trento/CIAO:round/15000",
        "trento/circle/5000",
    ]


def word(key: str, similarity: float) -> dict[str, object]:
    d = int(key.rsplit("/", 1)[1])
    return run(key, similarity, route_m=d, distance_m=d)


def test_best_words_takes_the_better_style_of_each_city_and_word() -> None:
    runs = [
        word("roma/VAI:round/12000", 0.93),
        word("roma/VAI:block/12000", 0.96),
        word("roma/DAI:round/12000", 0.85),  # neither style passes
        word("roma/DAI:block/12000", 0.80),
        word("bari/VAI:round/12000", 0.91),
        run("roma/heart/5000", 0.99),  # not a word
    ]
    assert best_words(runs) == ["bari/VAI:round/12000", "roma/VAI:block/12000"]


def test_best_words_leaves_a_word_the_city_already_has() -> None:
    runs = [word("roma/VAI:block/12000", 0.96), word("bari/VAI:round/12000", 0.91)]
    assert best_words(runs, ["roma/VAI:round/12000"]) == ["bari/VAI:round/12000"]


def test_equally_good_styles_are_told_apart_by_the_key() -> None:
    runs = [word("roma/GO:round/8000", 0.95), word("roma/GO:block/8000", 0.95)]
    assert best_words(runs) == ["roma/GO:block/8000"]
    assert best_words(runs[::-1]) == ["roma/GO:block/8000"]


def test_the_proposal_is_the_kept_then_the_spare_then_the_words() -> None:
    old = [
        run("trento/circle/5000", 0.93),
        run("trento/heart/5000", 0.97),
        word("trento/CIAO:block/15000", 0.94),
    ]
    new = [
        word("trento/CIAO:round/15000", 0.99),  # CIAO enters with the spare
        word("trento/VAI:round/12000", 0.92),
    ]
    keys = propose(old, new, ["trento/circle/5000"], {"circle", "heart"})
    assert keys == [
        "trento/circle/5000",
        "trento/heart/5000",
        "trento/CIAO:block/15000",
        "trento/VAI:round/12000",
    ]


# --- Command line ---------------------------------------------------------------


def write_log(path: Path, runs: list[dict[str, object]]) -> None:
    path.write_text("".join(json.dumps(r) + "\n" for r in runs), encoding="utf-8")


def test_plan_prints_the_cases_not_drawn_before(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    old = tmp_path / "old.jsonl"
    write_log(
        old,
        [word("roma/DAJE:round/15000", 0.95), word("roma/DAJE:block/15000", 0.95)],
    )
    assert main(["--plan", "--cities", "roma", "--old-log", str(old)]) == 0
    out = capsys.readouterr()
    keys = out.out.split()
    assert "roma/ROMA:round/15000" in keys
    assert not any("DAJE" in k for k in keys)
    assert f"{len(keys)} cases in 1 cities" in out.err


def test_an_unknown_city_is_refused(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["--plan", "--cities", "atlantis"]) == 2
    assert "unknown city: atlantis" in capsys.readouterr().err


def test_propose_prints_the_keys_to_keep(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    old, new, kept = (tmp_path / n for n in ("old.jsonl", "new.jsonl", "kept.json"))
    write_log(old, [run("trento/circle/5000", 0.93), run("trento/heart/5000", 0.97)])
    write_log(new, [word("trento/VAI:round/12000", 0.92)])
    cs.write_kept(kept, ["trento/circle/5000"])
    args = ["--propose", "--log", str(new), "--old-log", str(old), "--kept", str(kept)]
    assert main(args) == 0
    assert json.loads(capsys.readouterr().out) == {
        "kept": ["trento/circle/5000", "trento/heart/5000", "trento/VAI:round/12000"]
    }


def test_write_rebuilds_the_city_files_from_the_kept_keys_of_both_logs(
    tmp_path: Path,
) -> None:
    old, new, kept = (tmp_path / n for n in ("old.jsonl", "new.jsonl", "kept.json"))
    write_log(old, [run("trento/circle/5000", 0.93), run("trento/heart/5000", 0.97)])
    write_log(
        new, [word("trento/VAI:round/12000", 0.92), word("roma/GO:block/8000", 0.95)]
    )
    cs.write_kept(kept, ["trento/circle/5000", "trento/VAI:round/12000"])
    out = tmp_path / "seed"
    args = ["--write", "--log", str(new), "--old-log", str(old)]
    assert main([*args, "--kept", str(kept), "--out", str(out)]) == 0
    assert [f.name for f in out.iterdir()] == ["trento.json"]
    body = json.loads((out / "trento.json").read_text(encoding="utf-8"))
    assert body["license"] == cs.LICENSE
    assert [(r.get("shape"), r.get("word")) for r in body["routes"]] == [
        ("circle", None),
        (None, "VAI"),
    ]
