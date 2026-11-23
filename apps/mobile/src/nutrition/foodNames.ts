import type { Language } from "../i18n/languages";
import { DE } from "./foodNames/de";
import { ES } from "./foodNames/es";
import { FR } from "./foodNames/fr";
import { IT } from "./foodNames/it";
import type { Food } from "./foods";
import { FOOD_TABLE } from "./foodTable";

/**
 * The names of the base table in the app's languages (TASK-489, ADR-0397).
 * USDA's table is in English; the other four languages are written by MuW,
 * a file each in foodNames/ and not in i18n/: they are three hundred names
 * a language, and they change with the table, not with the screens.
 *
 * Only the names are translated: the numbers of a food are the same in
 * every language.
 */

/** The names of a language, under each food's key. */
export type FoodNames = { readonly [key: string]: string };

/** English is the table itself. */
export const FOOD_NAMES: { readonly [L in Exclude<Language, "en">]: FoodNames } = {
  de: DE,
  es: ES,
  fr: FR,
  it: IT,
};

/**
 * The name of `food` in `language`. A food of the user's keeps the name
 * they wrote, and so does a food the table no longer has (a day of the
 * diary carries its foods as they were).
 */
export function foodNameIn(food: Food, language: Language): string {
  if (food.source !== "table" || language === "en") {
    return food.name;
  }
  return FOOD_NAMES[language][food.key] ?? food.name;
}

const tables = new Map<Language, readonly Food[]>();

/** The base table with its names in `language`, in the table's own order:
 * what the search of a food looks in. */
export function foodTableIn(language: Language): readonly Food[] {
  if (language === "en") {
    return FOOD_TABLE;
  }
  let table = tables.get(language);
  if (table === undefined) {
    table = FOOD_TABLE.map((food) => ({ ...food, name: foodNameIn(food, language) }));
    tables.set(language, table);
  }
  return table;
}
