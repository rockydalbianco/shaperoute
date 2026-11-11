"""Deterministic tests for tools/catalog_words.py: no network, no engine."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import catalog_seed as cs
import pytest
from catalog_words import (
    LANGUAGE,
    LETTER_M,
    LOCAL,
    LONG_LOCAL,
    LONG_OWN,
    LONG_POOL,
    MAX_LETTERS,
    OWN,
    POOL,
    POOL_PER_CITY,
    best_words,
    cities,
    doubled_share,
    drawn_m,
    language_of,
    long_words_of,
    main,
    pen_up_keep,
    pen_up_key,
    pen_up_page,
    pen_up_plan,
    pen_up_reasons,
    pen_up_words,
    pieces,
    plan,
    propose,
    reasons,
    registered_shapes,
    spare,
    word_keys,
    word_of_key,
    word_svg,
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


# --- The pen up (part B1) --------------------------------------------------------


def test_long_words_are_five_or_six_letters_of_the_engine_s_alphabet() -> None:
    words = set(LONG_POOL) | {w for ws in LONG_LOCAL.values() for w in ws}
    words |= {w for ws in LONG_OWN.values() for w in ws}
    for w in words:
        assert w.isascii() and w.isalpha() and w == w.upper(), w
        assert 5 <= len(w) <= 6, w
    assert set(LONG_OWN) <= set(cs.BY_NAME)
    assert set(LONG_LOCAL) <= set(LOCAL)


def test_a_city_has_its_name_a_turn_of_its_language_and_of_the_pool() -> None:
    words = long_words_of("milano", 0)
    assert words[0] == "MILANO"
    assert set(words[1:6]) <= set(LONG_LOCAL["it"])
    assert set(words[6:]) <= set(LONG_POOL) and len(words) == 8
    # The next city has the rest of the Italian list.
    assert set(long_words_of("roma", 1)) != set(long_words_of("roma", 0))
    # A language without long words of its own has the pool's.
    assert set(long_words_of("tokyo", 4)) <= set(LONG_POOL)


def test_a_key_with_the_pen_up_says_so_and_asks_three_km_a_letter() -> None:
    assert pen_up_key("roma", "CIAO") == "roma/CIAO:pen_up/12000"
    assert word_of_key("roma/CIAO:pen_up/12000") == ("roma", "CIAO")
    assert word_of_key("roma/CIAO:block/15000") == ("roma", "CIAO")
    assert LETTER_M == 3000


def test_the_words_with_the_pen_up_are_the_short_the_long_and_the_kept_ones() -> None:
    roma = cs.BY_NAME["roma"]
    words = pen_up_words(roma, 3, ["roma/SALVE:round/21000", "bari/NOPE:block/15000"])
    assert {"ROMA", "DAJE", "CIAO"} <= set(words)
    assert set(long_words_of("roma", 3)) <= set(words)
    assert "SALVE" in words and "NOPE" not in words
    assert len(words) == len(set(words))
    assert max(map(len, words)) == 6


def test_a_city_with_little_room_writes_only_what_fits() -> None:
    venezia = cs.BY_NAME["venezia"]
    index = [c.name for c in cs.CITIES].index("venezia")
    words = pen_up_words(venezia, index, ["venezia/CIAO:round/10000"])
    # 10 km of room: three letters of 3 km, no more.
    assert words and all(len(w) <= 3 for w in words)


def test_the_plan_with_the_pen_up_leaves_out_what_is_done() -> None:
    todo = pen_up_plan(names=["bari"])
    keys = [pen_up_key(c.name, w) for c, w in todo]
    assert len(keys) == len(set(keys)) and "bari/BARI:pen_up/12000" in keys
    rest = pen_up_plan(["bari/BARI:pen_up/12000"], ["bari"])
    assert len(rest) == len(todo) - 1
    assert 900 <= len(pen_up_plan()) <= 1300


LINE = [[46.0 + i / 1000, 11.0] for i in range(11)]


def test_the_pieces_are_what_is_drawn_and_what_is_walked() -> None:
    drawn, walked = pieces(LINE, [[2, 4], [7, 8]])
    assert drawn == [LINE[:3], LINE[4:8], LINE[8:]]
    assert walked == [LINE[2:5], LINE[7:9]]
    assert pieces(LINE, []) == ([LINE], [])


def test_the_drawing_is_the_route_without_its_walks() -> None:
    whole = cs.path_length_m([(p[0], p[1]) for p in LINE])
    assert drawn_m(LINE, []) == pytest.approx(whole)
    # Three of the ten steps are walked.
    assert drawn_m(LINE, [[2, 4], [7, 8]]) == pytest.approx(whole * 0.7)


def test_the_doubled_share_counts_the_drawing_alone() -> None:
    out_and_back = LINE[:4] + LINE[2::-1]
    assert doubled_share(out_and_back, []) == pytest.approx(1.0)
    assert doubled_share(LINE, []) == 0.0
    # The way back is walked, not drawn: nothing is drawn twice.
    assert doubled_share(out_and_back, [[3, 6]]) == 0.0


def pen_up(key: str, similarity: float, **more: object) -> dict[str, object]:
    city, word = word_of_key(key)
    asked = len(word) * LETTER_M
    line = [[46.0 + i * asked / 111_195 / 10, 11.0] for i in range(11)]
    return {
        "key": key,
        "city": city,
        "word": word,
        "style": "round",
        "pen_up": True,
        "distance_m": asked,
        "route_m": round(asked * 1.2),
        "drawn_m": asked,
        "similarity": similarity,
        "points": line,
        "walks": [[4, 6]],
        "planned_at": "2026-11-11T21:40:00Z",
        **more,
    }


def test_a_word_with_the_pen_up_is_judged_on_its_drawing_not_on_its_walks() -> None:
    good = pen_up("roma/VAI:pen_up/9000", 0.95)
    # 20% longer than asked with the walks: on one line it would be out.
    assert pen_up_reasons(good) == [] and reasons(good) == []
    assert cs.reasons(good) == ["distance +20% off"]
    assert pen_up_reasons(pen_up("roma/VAI:pen_up/9000", 0.89)) == [
        "similarity 0.89 < 0.90"
    ]
    short = pen_up("roma/VAI:pen_up/9000", 0.95, drawn_m=7500)
    assert pen_up_reasons(short) == ["drawing -17% off"]
    road = pen_up("roma/VAI:pen_up/9000", 0.95, road_shares={"trunk": 0.1, "path": 0.9})
    assert pen_up_reasons(road) == ["10% on motorway or trunk"]
    failed = {"key": "roma/VAI:pen_up/9000", "error_kind": "failed"}
    assert pen_up_reasons(failed) == ["failed"]


def test_a_shape_is_judged_as_before() -> None:
    assert reasons(run("trento/star/5000", 0.80)) == cs.reasons(
        run("trento/star/5000", 0.80)
    )


def test_keeping_takes_the_one_line_words_out_and_the_passing_ones_in() -> None:
    kept = [
        "trento/circle/5000",
        "trento/CIAO:block/15000",
        "roma/LOVE:round/15000",
        "trento/heart/5000",
    ]
    runs = [
        pen_up("trento/CIAO:pen_up/12000", 0.95),
        pen_up("roma/LOVE:pen_up/12000", 0.85),  # does not pass: LOVE leaves Rome
        pen_up("bari/VAI:pen_up/9000", 0.92),
    ]
    assert pen_up_keep(runs, kept) == [
        "trento/circle/5000",
        "trento/heart/5000",
        "bari/VAI:pen_up/9000",
        "trento/CIAO:pen_up/12000",
    ]
    # Run again on its own answer, nothing moves.
    assert pen_up_keep(runs, pen_up_keep(runs, kept)) == pen_up_keep(runs, kept)


def test_the_city_file_of_a_word_with_the_pen_up_says_its_walks() -> None:
    runs = [pen_up("trento/GO:pen_up/6000", 0.95), run("trento/circle/5000", 0.93)]
    files = cs.city_files(runs, [r["key"] for r in runs])
    word, shape = json.loads(files["trento.json"])["routes"]
    assert (word["word"], word["style"], word["walks"]) == ("GO", "round", [[4, 6]])
    assert (word["distance_m"], word["route_m"]) == (6000, 7200)
    assert "walks" not in shape and "pen_up" not in word


def test_the_page_draws_the_letters_and_dashes_the_walks() -> None:
    svg = word_svg(pen_up("trento/GO:pen_up/6000", 0.95))
    assert svg.count('class="pen"') == 2 and svg.count('class="walk"') == 1
    # Turned back as the app shows it: a line going north, turned a quarter
    # counterclockwise by the engine, is drawn level again.
    flat = word_svg(pen_up("trento/GO:pen_up/6000", 0.95, rotation_deg=90.0))
    ys = {xy.split(",")[1] for xy in flat.split('points="')[1].split('"')[0].split()}
    assert len(ys) == 1


def test_the_page_counts_by_length_and_fades_what_does_not_pass() -> None:
    page = pen_up_page(
        [
            pen_up("trento/GO:pen_up/6000", 0.95),
            pen_up("roma/VAI:pen_up/9000", 0.80),
            {"key": "roma/SI:pen_up/6000", "error_kind": "failed"},
        ]
    )
    assert "<td>2 lettere</td><td>1</td><td>1</td>" in page
    assert "<td>3 lettere</td><td>0</td><td>1</td>" in page
    assert page.count('<article class="in">') == 1
    assert page.count('<article class="out">') == 1
    assert "similarity 0.80 &lt; 0.90" in page and "<h3>SI" not in page


def test_pen_up_plan_and_propose_from_the_command_line(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    log, kept, page = (tmp_path / n for n in ("pen.jsonl", "kept.json", "page.html"))
    write_log(
        log,
        [pen_up("bari/BARI:pen_up/12000", 0.95), pen_up("bari/UE:pen_up/6000", 0.7)],
    )
    cs.write_kept(kept, ["bari/circle/5000", "bari/CIAO:round/15000"])
    args = ["--pen-up", "--pen-up-log", str(log), "--kept", str(kept)]
    assert main([*args, "--plan", "--cities", "bari"]) == 0
    out = capsys.readouterr()
    keys = out.out.split()
    assert "bari/CIAO:pen_up/12000" in keys and "bari/BARI:pen_up/12000" not in keys
    assert f"{len(keys)} words with the pen up" in out.err
    assert main([*args, "--propose", "--page", str(page)]) == 0
    assert json.loads(capsys.readouterr().out) == {
        "kept": ["bari/circle/5000", "bari/BARI:pen_up/12000"]
    }
    assert "<h3>BARI" in page.read_text(encoding="utf-8")


def test_write_reads_the_log_of_the_pen_up_too(tmp_path: Path) -> None:
    old, pen, kept = (tmp_path / n for n in ("old.jsonl", "pen.jsonl", "kept.json"))
    write_log(old, [run("trento/circle/5000", 0.93)])
    write_log(pen, [pen_up("trento/GO:pen_up/6000", 0.95)])
    cs.write_kept(kept, ["trento/circle/5000", "trento/GO:pen_up/6000"])
    out = tmp_path / "seed"
    args = ["--write", "--old-log", str(old), "--log", str(tmp_path / "none.jsonl")]
    args += ["--pen-up-log", str(pen), "--kept", str(kept), "--out", str(out)]
    assert main(args) == 0
    routes = json.loads((out / "trento.json").read_text(encoding="utf-8"))["routes"]
    assert [r.get("walks") for r in routes] == [[[4, 6]], None]
