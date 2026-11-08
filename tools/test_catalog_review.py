"""Deterministic tests for tools/catalog_review.py: synthetic runs, no network."""

from __future__ import annotations

import json
import re
from pathlib import Path

from catalog_review import (
    THUMB_POINTS,
    THUMB_PX,
    cards,
    main,
    render_page,
    thinned,
    thumbnail,
)
from catalog_seed import write_kept
from test_catalog_seed import DLAT, DLON, ORIGIN, SQUARE, run

CARDS_BLOCK = re.compile(
    r'<script type="application/json" id="cards">(.*?)</script>', re.DOTALL
)


def test_thumbnail_fits_the_square_north_up() -> None:
    svg = thumbnail(SQUARE, size=THUMB_PX)
    assert svg.startswith(f'<svg viewBox="0 0 {THUMB_PX} {THUMB_PX}"')
    points = re.search(r'points="([^"]+)"', svg)
    assert points is not None
    xy = [tuple(map(float, p.split(","))) for p in points.group(1).split()]
    assert len(xy) == len(SQUARE)
    xs, ys = [p[0] for p in xy], [p[1] for p in xy]
    assert 0 <= min(xs) and max(xs) <= THUMB_PX and 0 <= min(ys) and max(ys) <= THUMB_PX
    # The start is the south-west corner: left and, north up, at the bottom.
    assert xy[0][0] == min(xs) and xy[0][1] == max(ys)
    assert xy[1][1] == min(ys)  # one kilometre north is up
    assert '<circle class="start"' in svg


def test_thinned_keeps_the_ends_and_at_most_the_size() -> None:
    many = [(46.0 + i / 1e4, 11.0) for i in range(1001)]
    out = thinned(many)
    assert len(out) == THUMB_POINTS and out[0] == many[0] and out[-1] == many[-1]
    assert thinned(SQUARE) == SQUARE
    assert (
        len(re.search(r'points="([^"]+)"', thumbnail(many)).group(1).split())
        == THUMB_POINTS
    )


def test_thumbnail_of_a_point_does_not_divide_by_zero() -> None:
    assert "nan" not in thumbnail([ORIGIN, ORIGIN])


def test_cards_are_by_city_best_first_with_reasons_and_preselection() -> None:
    runs = [
        run("roma/heart/5000", similarity=0.92),
        run("roma/star/5000", similarity=0.99),
        run("roma/cat/5000", similarity=0.80, source="2026-10"),
        run("bari/CIAO:block/15000", similarity=0.95, route_m=15000, distance_m=15000),
        {"key": "bari/sun/5000", "city": "bari", "error_kind": "not_drawable"},
    ]
    data = cards(runs, ["roma/star/5000", "bari/CIAO:block/15000"])
    assert [c["key"] for c in data] == [
        "bari/CIAO:block/15000",
        "roma/star/5000",
        "roma/heart/5000",
        "roma/cat/5000",
    ]
    cat = data[-1]
    assert cat["reasons"] == ["similarity 0.80 < 0.90"] and cat["source"] == "2026-10"
    assert cat["preselected"] is False and data[1]["preselected"] is True
    assert data[0]["name"] == "CIAO (block)" and data[0]["distance_km"] == 15
    assert "retraced ?" in data[0]["meta"] and "big roads ?" in data[0]["meta"]
    assert data[0]["map_url"].startswith(
        "https://www.openstreetmap.org/?mlat=46.06700&mlon=11.12150"
    )


def test_page_embeds_the_cards_and_escapes_the_title() -> None:
    page = render_page([run()], ["trento/circle/5000"], "Review <TASK-419>")
    assert "<title>Review &lt;TASK-419&gt;</title>" in page
    blocks = CARDS_BLOCK.findall(page)
    assert len(blocks) == 1
    data = json.loads(blocks[0])
    assert data[0]["key"] == "trento/circle/5000" and data[0]["preselected"] is True
    assert "</script>" not in blocks[0]
    assert 'id="copy"' in page and 'id="show-rejected"' in page


def test_main_writes_the_page_from_logs_and_a_kept_file(tmp_path: Path, capsys) -> None:
    log = tmp_path / "runs.jsonl"
    log.write_text(
        json.dumps(run("roma/heart/5000", similarity=0.97))
        + "\n"
        + json.dumps(run("roma/star/5000", similarity=0.5))
        + "\n"
    )
    out = tmp_path / "review.html"
    assert main([str(log), "--out", str(out)]) == 0
    data = json.loads(CARDS_BLOCK.findall(out.read_text())[0])
    assert [c["preselected"] for c in data] == [True, True]  # at least three: both
    assert "2 candidates, 2 ticked" in capsys.readouterr().err

    kept = tmp_path / "kept.json"
    write_kept(kept, ["roma/star/5000"])
    assert main([str(log), "--out", str(out), "--kept", str(kept)]) == 0
    data = json.loads(CARDS_BLOCK.findall(out.read_text())[0])
    assert [(c["key"], c["preselected"]) for c in data] == [
        ("roma/heart/5000", False),
        ("roma/star/5000", True),
    ]


def test_square_fixture_is_a_kilometre() -> None:
    assert abs((SQUARE[1][0] - ORIGIN[0]) - DLAT) < 1e-12
    assert abs((SQUARE[2][1] - ORIGIN[1]) - DLON) < 1e-12
