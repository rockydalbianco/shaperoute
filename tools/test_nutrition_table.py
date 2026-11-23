"""Deterministic tests of tools/nutrition_table.py (TASK-489, ADR-0397): the
script on small made-up archives, and the list against the table that is in
the repository. No network, and no need of USDA's download."""

from __future__ import annotations

import re
import zipfile
from decimal import Decimal
from pathlib import Path

import nutrition_table as nt
import pytest

FOLDER = "FoodData_Central_sr_legacy_food_csv_2018-04"

FOOD_CSV = f"""\
"fdc_id","data_type","description","food_category_id","publication_date"
"11","sr_legacy_food","Apples, raw, with skin{nt.PROGRAM_NOTE}","9","2019-04-01"
"12","sr_legacy_food","Oil, olive, salad or cooking","4","2019-04-01"
"13","sr_legacy_food","Tea, brewed","14","2019-04-01"
"14","sr_legacy_food","Water, tap","14","2019-04-01"
"""

NUTRIENT_CSV = """\
"id","fdc_id","nutrient_id","amount","data_points","derivation_id","min","max","median","footnote","min_year_acquired"
"1","11","1008","52.0","","","","","","",""
"2","11","1003","0.26","","","","","","",""
"3","11","1005","13.81","","","","","","",""
"4","11","1004","0.17","","","","","","",""
"5","11","1087","6.0","","","","","","",""
"6","12","1008","884","","","","","","",""
"7","12","1003","0.0","","","","","","",""
"8","12","1005","0.0","","","","","","",""
"9","12","1004","100.0","","","","","","",""
"10","13","1008","0.5","","","","","","",""
"11","13","1003","0.05","","","","","","",""
"12","13","1004","","","","","","","",""
"13","14","1003","0.0","","","","","","",""
"""

LIST = """\
fdc_id,name,usda_description
11,Apple,"Apples, raw, with skin"
12,Olive oil,"Oil, olive, salad or cooking"
13,Tea,"Tea, brewed"
"""


def chosen(text: str = LIST) -> list[nt.Chosen]:
    return nt.read_chosen(text.splitlines())


def archive_at(folder: Path, nutrients: str = NUTRIENT_CSV) -> Path:
    path = folder / nt.ARCHIVE
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(f"{FOLDER}/food.csv", FOOD_CSV)
        archive.writestr(f"{FOLDER}/food_nutrient.csv", nutrients)
    return path


def table(
    folder: Path, text: str = LIST, nutrients: str = NUTRIENT_CSV
) -> list[nt.Row]:
    foods = chosen(text)
    with zipfile.ZipFile(archive_at(folder, nutrients)) as archive:
        descriptions, amounts = nt.read_usda(archive, {food.fdc_id for food in foods})
    return nt.rows(foods, descriptions, amounts)


def test_the_list_is_read_in_its_own_order() -> None:
    assert chosen() == [
        nt.Chosen(11, "Apple", "Apples, raw, with skin"),
        nt.Chosen(12, "Olive oil", "Oil, olive, salad or cooking"),
        nt.Chosen(13, "Tea", "Tea, brewed"),
    ]


@pytest.mark.parametrize(
    "line",
    [
        'x,Quince,"Quinces, raw"',
        '15,,"Quinces, raw"',
        f'15,{"a" * 61},"Quinces, raw"',
        "15,Quince,",
        # A food twice, and a name twice (capitals do not make another name).
        '11,Quince,"Apples, raw, with skin"',
        '15,apple,"Quinces, raw"',
    ],
)
def test_a_line_that_makes_no_sense_stops_the_list(line: str) -> None:
    with pytest.raises(nt.TableError):
        chosen(f"{LIST}{line}\n")


def test_an_empty_list_is_no_table() -> None:
    with pytest.raises(nt.TableError):
        chosen("fdc_id,name,usda_description\n")


def test_the_numbers_are_the_ones_of_the_archive(tmp_path: Path) -> None:
    assert table(tmp_path) == [
        nt.Row(11, "Apple", 52, Decimal("0.3"), Decimal("13.8"), Decimal("0.2")),
        nt.Row(12, "Olive oil", 884, Decimal("0.0"), Decimal("0.0"), Decimal("100.0")),
        # Half a kilocalorie rounds up; an amount USDA does not have is unknown.
        nt.Row(13, "Tea", 1, Decimal("0.1"), None, None),
    ]


def test_a_food_that_is_not_in_the_archive_stops_the_table(tmp_path: Path) -> None:
    with pytest.raises(nt.TableError, match="not in the archive"):
        table(tmp_path, LIST + '99,Quince,"Quinces, raw"\n')


def test_a_food_that_is_not_the_one_described_stops_the_table(tmp_path: Path) -> None:
    with pytest.raises(nt.TableError, match="USDA calls it"):
        table(tmp_path, LIST.replace("Tea, brewed", "Tea, black"))


def test_a_food_without_energy_stops_the_table(tmp_path: Path) -> None:
    with pytest.raises(nt.TableError, match="no energy"):
        table(tmp_path, LIST + '14,Water,"Water, tap"\n')


def test_a_number_the_app_would_not_keep_stops_the_table(tmp_path: Path) -> None:
    with pytest.raises(nt.TableError, match="kcal in 100 g"):
        table(tmp_path, nutrients=NUTRIENT_CSV.replace('"884"', '"902"'))
    with pytest.raises(nt.TableError, match="g in 100 g"):
        table(tmp_path, nutrients=NUTRIENT_CSV.replace('"100.0"', '"100.4"'))


def test_the_file_is_the_same_text_for_the_same_table(tmp_path: Path) -> None:
    text = nt.render(table(tmp_path))
    assert text == nt.render(table(tmp_path))
    assert '  [11, "Apple", 52, 0.3, 13.8, 0.2],\n' in text
    assert '  [12, "Olive oil", 884, 0, 0, 100],\n' in text
    assert '  [13, "Tea", 1, 0.1, null, null],\n' in text
    assert "3 common foods" in text
    assert f"SR Legacy ({nt.RELEASE})" in text
    assert f"downloaded {nt.DOWNLOADED}" in text
    assert nt.LICENCE in text


def test_the_script_writes_the_file_and_checks_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    usda = archive_at(tmp_path)
    monkeypatch.setattr(nt, "ARCHIVE_SHA256", nt.sha256(usda))
    foods = tmp_path / "foods.csv"
    foods.write_text(LIST, encoding="utf-8")
    out = tmp_path / "foodTable.ts"
    args = ["--usda", str(usda), "--foods", str(foods), "--out", str(out)]

    assert nt.main([*args, "--check"]) == 1
    assert not out.exists()
    assert nt.main(args) == 0
    assert "3 foods" in capsys.readouterr().out
    assert nt.main([*args, "--check"]) == 0

    out.write_text(
        out.read_text(encoding="utf-8").replace("52", "25"), encoding="utf-8"
    )
    assert nt.main([*args, "--check"]) == 1
    assert "not up to date" in capsys.readouterr().err


def test_another_archive_is_refused(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    usda = archive_at(tmp_path)
    out = tmp_path / "foodTable.ts"
    assert nt.main(["--usda", str(usda), "--out", str(out)]) == 1
    assert "as USDA published it" in capsys.readouterr().err
    assert not out.exists()


# --- the files in the repository ---

ROW = re.compile(r'^  \[(\d+), "((?:[^"\\]|\\.)*)", ', re.MULTILINE)


def test_the_table_in_the_app_has_the_foods_of_the_list() -> None:
    with open(nt.FOODS, encoding="utf-8", newline="") as lines:
        foods = nt.read_chosen(lines)
    written = ROW.findall(nt.TABLE.read_text(encoding="utf-8"))
    assert written == [(str(food.fdc_id), food.name) for food in foods]
    assert 300 <= len(foods) <= 400


def test_the_table_in_the_app_says_what_it_is_made_from() -> None:
    text = nt.TABLE.read_text(encoding="utf-8")
    assert text.startswith("// Generated by tools/nutrition_table.py")
    for value in (nt.SOURCE, nt.RELEASE, nt.DOWNLOADED, nt.LICENCE, nt.ARCHIVE):
        assert value in text
