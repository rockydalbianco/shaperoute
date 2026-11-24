/**
 * A food of the diary (TASK-489, ADR-0397): its name and what 100 g of it
 * hold. The numbers come from a food composition table (USDA FoodData
 * Central, part A2) or from the user, who copies them from a label or from
 * the dietitian's sheet. MuW never makes one up, and neither does the AI:
 * every count of calories starts from a food that is here.
 *
 * Calories first (the user's choice): protein, carbohydrates and fat are
 * kept when known and not shown yet.
 */

/** Where a food's numbers come from: the table inside the app, or the user. */
export type FoodSource = "table" | "own";

export type Food = {
  /** Its name among the foods: the table's own, or «own-12» for the user's. */
  key: string;
  /** As the table or the user wrote it. */
  name: string;
  /** Kilocalories in 100 g. */
  kcalPer100g: number;
  /** Grams in 100 g; null when not known. */
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  source: FoodSource;
  /** The barcode on its pack, for a food of the user's found or written by
   * its code (part G); absent for every other food. */
  barcode?: string;
  /** Its name and numbers are the ones Open Food Facts gave for its
   * barcode, not yet rewritten by the user: shown «from Open Food Facts». */
  fromOpenFoodFacts?: true;
};

/** The values a field takes; outside them a food is not kept. Pure fat is
 * 900 kcal in 100 g: nothing holds more. */
export const KCAL_PER_100G = { min: 0, max: 900 } as const;
export const GRAMS_PER_100G = { min: 0, max: 100 } as const;
export const FOOD_NAME_MAX = 60;

function within(value: unknown, range: { min: number; max: number }): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= range.min &&
    value <= range.max
    ? value
    : null;
}

/** A name as it is kept: no spaces around it, one between words; null when
 * nothing is left or it is too long. */
export function foodName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const name = value.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= FOOD_NAME_MAX ? name : null;
}

/**
 * A barcode as it is kept: its digits alone, the spaces and dashes of a
 * typed one left out; null unless it is as long as the codes on a pack
 * (EAN-8, UPC-A, EAN-13, or 14 digits on a case).
 */
export function barcodeOf(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const digits = value.replace(/[\s-]/g, "");
  return /^\d+$/.test(digits) && [8, 12, 13, 14].includes(digits.length)
    ? digits
    : null;
}

function isSource(value: unknown): value is FoodSource {
  return value === "table" || value === "own";
}

/** What of `data` is a food; null without a key, a name, its calories or
 * where it comes from. A nutrient that does not read is left unknown. */
export function foodFrom(data: unknown): Food | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const name = foodName(raw.name);
  const kcal = within(raw.kcalPer100g, KCAL_PER_100G);
  if (
    typeof raw.key !== "string" ||
    raw.key.length === 0 ||
    name === null ||
    kcal === null ||
    !isSource(raw.source)
  ) {
    return null;
  }
  const barcode = barcodeOf(raw.barcode);
  return {
    key: raw.key,
    name,
    kcalPer100g: kcal,
    proteinPer100g: within(raw.proteinPer100g, GRAMS_PER_100G),
    carbsPer100g: within(raw.carbsPer100g, GRAMS_PER_100G),
    fatPer100g: within(raw.fatPer100g, GRAMS_PER_100G),
    source: raw.source,
    // Only a food of the user's has a pack: the table's have none.
    ...(raw.source === "own" && barcode !== null ? { barcode } : {}),
    ...(raw.source === "own" && barcode !== null && raw.fromOpenFoodFacts === true
      ? { fromOpenFoodFacts: true as const }
      : {}),
  };
}

/** The kilocalories of `grams` of `food`, unrounded: an estimate, rounded
 * once where it is shown. */
export function kcalOf(food: Food, grams: number): number {
  return (food.kcalPer100g * Math.max(0, grams)) / 100;
}

/** A text as it is searched: lower case, no accents, one space between
 * words («Caffè  Latte» is «caffe latte»). */
export function searchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * The foods whose name holds every word of `query`, at most `limit`: first
 * the names that begin with it, then the ones with a word that begins with
 * its first word, then the rest; inside each group, the order of `foods`.
 * Nothing for an empty query.
 */
export function searchFoods(
  foods: readonly Food[],
  query: string,
  limit: number = 30,
): Food[] {
  const wanted = searchText(query);
  if (wanted.length === 0) {
    return [];
  }
  const words = wanted.split(" ");
  const ranked: { food: Food; rank: number }[] = [];
  for (const food of foods) {
    const name = searchText(food.name);
    if (!words.every((word) => name.includes(word))) {
      continue;
    }
    const rank = name.startsWith(wanted)
      ? 0
      : name.split(" ").some((part) => part.startsWith(words[0]))
        ? 1
        : 2;
    ranked.push({ food, rank });
  }
  // A stable sort: the order of `foods` holds inside a rank.
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.slice(0, Math.max(0, limit)).map((entry) => entry.food);
}
