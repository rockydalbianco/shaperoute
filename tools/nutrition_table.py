"""The base food table of «Nutrition», from USDA FoodData Central (TASK-489,
ADR-0397).

    python3 tools/nutrition_table.py --usda PATH/TO/ARCHIVE.zip

reads the foods chosen by hand in tools/nutrition_foods.csv (FDC id, the
short name the app shows, USDA's own description), takes energy, protein,
carbohydrate and fat of 100 g of each from USDA's download, and writes
apps/mobile/src/nutrition/foodTable.ts. No number of the table is written by
hand: to add a food, add its line to the list and run this again. `--check`
writes nothing and fails when the file in the repository is not what the list
and the archive give.

The archive is ARCHIVE, downloaded from https://fdc.nal.usda.gov
(download-datasets) and recognised by its SHA-256. It stays outside the
repository; USDA publishes it under CC0 1.0.

Standard library only: no network, no engine.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import zipfile
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOODS = ROOT / "tools" / "nutrition_foods.csv"
TABLE = ROOT / "apps" / "mobile" / "src" / "nutrition" / "foodTable.ts"

# What the table is made from, as it is shown in «How we calculate».
SOURCE = "USDA FoodData Central, SR Legacy"
RELEASE = "2018-04"
DOWNLOADED = "2026-11-23"
LICENCE = "CC0 1.0"
URL = "https://fdc.nal.usda.gov"
ARCHIVE = "FoodData_Central_sr_legacy_food_csv_2018-04.zip"
ARCHIVE_SHA256 = "b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0"

# USDA's nutrient ids: all four are amounts in 100 g of the food.
ENERGY_KCAL = 1008
PROTEIN_G = 1003
CARBOHYDRATE_G = 1005
FAT_G = 1004

# What apps/mobile/src/nutrition/foods.ts keeps: outside these a food would
# not read back in the app.
NAME_MAX = 60
KCAL_MAX = 900
GRAMS_MAX = 100

# USDA's note on some descriptions: not part of the food's name.
PROGRAM_NOTE = " (Includes foods for USDA's Food Distribution Program)"


class TableError(Exception):
    """The list or the archive cannot give the table."""


@dataclass(frozen=True)
class Chosen:
    """A line of the list: which food of USDA, and its name in the app."""

    fdc_id: int
    name: str
    usda: str


@dataclass(frozen=True)
class Row:
    """A food of the table: what 100 g of it hold."""

    fdc_id: int
    name: str
    kcal: int
    protein: Decimal | None
    carbs: Decimal | None
    fat: Decimal | None


def read_chosen(lines: Iterable[str]) -> list[Chosen]:
    """The list, in its own order: every id once, every name once."""
    chosen: list[Chosen] = []
    ids: set[int] = set()
    names: set[str] = set()
    for row in csv.DictReader(lines):
        try:
            fdc_id = int(row["fdc_id"])
        except (KeyError, TypeError, ValueError):
            raise TableError(f"not an FDC id: {row!r}") from None
        name = " ".join((row.get("name") or "").split())
        usda = (row.get("usda_description") or "").strip()
        if not name or len(name) > NAME_MAX:
            raise TableError(f"{fdc_id}: a name has 1 to {NAME_MAX} letters")
        if not usda:
            raise TableError(f"{fdc_id}: USDA's description is missing")
        if fdc_id in ids:
            raise TableError(f"{fdc_id}: twice in the list")
        if name.casefold() in names:
            raise TableError(f"{name}: twice in the list")
        ids.add(fdc_id)
        names.add(name.casefold())
        chosen.append(Chosen(fdc_id, name, usda))
    if not chosen:
        raise TableError("the list is empty")
    return chosen


def member(archive: zipfile.ZipFile, name: str) -> io.TextIOWrapper:
    """The table `name` of the archive, whatever folder it is in."""
    for info in archive.infolist():
        if info.filename == name or info.filename.endswith(f"/{name}"):
            return io.TextIOWrapper(archive.open(info), encoding="utf-8", newline="")
    raise TableError(f"{name} is not in the archive")


def amount(text: str) -> Decimal | None:
    try:
        value = Decimal(text)
    except InvalidOperation:
        return None
    return value if value.is_finite() else None


def read_usda(
    archive: zipfile.ZipFile, ids: set[int]
) -> tuple[dict[int, str], dict[int, dict[int, Decimal]]]:
    """Of the foods `ids`: USDA's description, and the four amounts it has."""
    descriptions: dict[int, str] = {}
    with member(archive, "food.csv") as lines:
        for row in csv.DictReader(lines):
            fdc_id = int(row["fdc_id"])
            if fdc_id in ids:
                descriptions[fdc_id] = row["description"].strip()
    wanted = {ENERGY_KCAL, PROTEIN_G, CARBOHYDRATE_G, FAT_G}
    amounts: dict[int, dict[int, Decimal]] = {fdc_id: {} for fdc_id in ids}
    with member(archive, "food_nutrient.csv") as lines:
        for row in csv.DictReader(lines):
            fdc_id = int(row["fdc_id"])
            nutrient = int(row["nutrient_id"])
            if fdc_id in ids and nutrient in wanted:
                value = amount(row["amount"])
                if value is not None:
                    amounts[fdc_id][nutrient] = value
    return descriptions, amounts


def grams(value: Decimal | None, fdc_id: int) -> Decimal | None:
    """Grams in 100 g, to a tenth; None when USDA has no amount."""
    if value is None:
        return None
    tenth = value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    if not 0 <= tenth <= GRAMS_MAX:
        raise TableError(f"{fdc_id}: {value} g in 100 g")
    return tenth


def rows(
    chosen: Sequence[Chosen],
    descriptions: dict[int, str],
    amounts: dict[int, dict[int, Decimal]],
) -> list[Row]:
    """The table, in the order of the list. A food that is not USDA's, that
    is not the one the list describes or that has no energy stops it: a
    wrong line never becomes a number in the app."""
    table: list[Row] = []
    for food in chosen:
        description = descriptions.get(food.fdc_id)
        if description is None:
            raise TableError(f"{food.fdc_id} ({food.name}): not in the archive")
        if description.removesuffix(PROGRAM_NOTE) != food.usda:
            raise TableError(
                f"{food.fdc_id} ({food.name}): USDA calls it «{description}»,"
                f" the list «{food.usda}»"
            )
        of_food = amounts.get(food.fdc_id, {})
        energy = of_food.get(ENERGY_KCAL)
        if energy is None:
            raise TableError(f"{food.fdc_id} ({food.name}): no energy")
        kcal = int(energy.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        if not 0 <= kcal <= KCAL_MAX:
            raise TableError(f"{food.fdc_id} ({food.name}): {kcal} kcal in 100 g")
        table.append(
            Row(
                fdc_id=food.fdc_id,
                name=food.name,
                kcal=kcal,
                protein=grams(of_food.get(PROTEIN_G), food.fdc_id),
                carbs=grams(of_food.get(CARBOHYDRATE_G), food.fdc_id),
                fat=grams(of_food.get(FAT_G), food.fdc_id),
            )
        )
    return table


def number(value: Decimal | None) -> str:
    """A number as TypeScript reads it: «0.3», «14», «null»."""
    if value is None:
        return "null"
    whole = value.to_integral_value()
    return str(int(whole)) if value == whole else str(value)


HEADER = """\
// Generated by tools/nutrition_table.py from tools/nutrition_foods.csv and
// USDA's download: do not edit by hand. To add or change a food, change the
// list and run the script again.
//
// Source: U.S. Department of Agriculture, Agricultural Research Service.
// FoodData Central, SR Legacy ({release}). fdc.nal.usda.gov. {licence}.
// Archive: {archive}, downloaded {downloaded}.

import type {{ Food }} from "./foods";

/**
 * The base table of «Nutrition» (TASK-489, ADR-0397): {count} common foods
 * with what 100 g of each hold, as USDA measured it. The names are in
 * English; the other languages are in foodNames.ts.
 */

/** Where the numbers come from, as «How we calculate» shows it. */
export const FOOD_TABLE_SOURCE = {{
  name: {name},
  release: {release_text},
  downloaded: {downloaded_text},
  licence: {licence_text},
  url: {url},
}} as const;

/** The key of a food of the table: USDA's own number for it. */
export function tableKey(fdcId: number): string {{
  return `usda-${{fdcId}}`;
}}

/** FDC id, name, then in 100 g: kilocalories, and grams of protein,
 * carbohydrate and fat (null when USDA has none). */
type Row = readonly [
  fdcId: number,
  name: string,
  kcal: number,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
];

// prettier-ignore
const ROWS: readonly Row[] = [
"""

FOOTER = """\
];

export const FOOD_TABLE: readonly Food[] = ROWS.map(
  ([fdcId, name, kcal, protein, carbs, fat]): Food => ({
    key: tableKey(fdcId),
    name,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    source: "table",
  }),
);
"""


def render(table: Sequence[Row]) -> str:
    """foodTable.ts, the same text for the same table."""
    text = HEADER.format(
        release=RELEASE,
        licence=LICENCE,
        archive=ARCHIVE,
        downloaded=DOWNLOADED,
        count=len(table),
        name=json.dumps(SOURCE),
        release_text=json.dumps(RELEASE),
        downloaded_text=json.dumps(DOWNLOADED),
        licence_text=json.dumps(LICENCE),
        url=json.dumps(URL),
    )
    for row in table:
        cells = [
            str(row.fdc_id),
            json.dumps(row.name, ensure_ascii=False),
            str(row.kcal),
            number(row.protein),
            number(row.carbs),
            number(row.fat),
        ]
        text += f"  [{', '.join(cells)}],\n"
    return text + FOOTER


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as data:
        for block in iter(lambda: data.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def build(usda: Path, foods: Path) -> str:
    """foodTable.ts from the list `foods` and the archive `usda`."""
    if sha256(usda) != ARCHIVE_SHA256:
        raise TableError(f"{usda.name} is not {ARCHIVE} as USDA published it")
    with open(foods, encoding="utf-8", newline="") as lines:
        chosen = read_chosen(lines)
    with zipfile.ZipFile(usda) as archive:
        descriptions, amounts = read_usda(archive, {food.fdc_id for food in chosen})
    return render(rows(chosen, descriptions, amounts))


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--usda", type=Path, required=True, help=f"path of {ARCHIVE}")
    parser.add_argument("--foods", type=Path, default=FOODS, help="the chosen foods")
    parser.add_argument("--out", type=Path, default=TABLE, help="the file to write")
    parser.add_argument(
        "--check", action="store_true", help="write nothing; fail when it differs"
    )
    args = parser.parse_args(argv)
    try:
        text = build(args.usda, args.foods)
    except (TableError, OSError, zipfile.BadZipFile) as error:
        print(f"nutrition_table: {error}", file=sys.stderr)
        return 1
    if args.check:
        same = args.out.exists() and args.out.read_text(encoding="utf-8") == text
        if not same:
            print(f"nutrition_table: {args.out} is not up to date", file=sys.stderr)
        return 0 if same else 1
    args.out.write_text(text, encoding="utf-8")
    print(f"{args.out}: {text.count(chr(10) + '  [')} foods")
    return 0


if __name__ == "__main__":
    sys.exit(main())
