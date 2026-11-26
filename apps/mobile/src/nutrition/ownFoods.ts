import {
  barcodeOf,
  type Food,
  foodFrom,
  foodName,
  GRAMS_PER_100G,
  KCAL_PER_100G,
} from "./foods";

/**
 * The foods the user writes (TASK-489, ADR-0397): a name and the
 * kilocalories of 100 g, from a label or from the dietitian's sheet;
 * protein, carbohydrates and fat when the user has them. Kept only on this
 * phone (the user's choice).
 */

/** What the user types for a food. */
export type OwnFoodFields = {
  name: string;
  kcalPer100g: number;
  proteinPer100g?: number | null;
  carbsPer100g?: number | null;
  fatPer100g?: number | null;
  /** The barcode on its pack, when the food was found or written by it. */
  barcode?: string | null;
  /** Name and numbers are Open Food Facts' own: only with a barcode, and
   * not for a food the user rewrote. */
  fromOpenFoodFacts?: boolean;
};

export type OwnFoods = {
  /** The number of the next food: a key is never given twice, so a food
   * removed and one added later are never taken for each other. */
  next: number;
  foods: readonly Food[];
};

export const NO_OWN_FOODS: OwnFoods = { next: 1, foods: [] };

const KEY = /^own-(\d+)$/;

function inRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isFinite(value) && value >= range.min && value <= range.max;
}

function nutrient(value: number | null | undefined): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  return inRange(value, GRAMS_PER_100G) ? value : undefined;
}

/** The food `fields` make under `key`; null when the name is empty or too
 * long, or a number is outside what a food holds. */
function ownFood(fields: OwnFoodFields, key: string): Food | null {
  const name = foodName(fields.name);
  const protein = nutrient(fields.proteinPer100g);
  const carbs = nutrient(fields.carbsPer100g);
  const fat = nutrient(fields.fatPer100g);
  if (
    name === null ||
    !inRange(fields.kcalPer100g, KCAL_PER_100G) ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  ) {
    return null;
  }
  const barcode = barcodeOf(fields.barcode ?? null);
  return {
    key,
    name,
    kcalPer100g: fields.kcalPer100g,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    source: "own",
    ...(barcode !== null ? { barcode } : {}),
    ...(barcode !== null && fields.fromOpenFoodFacts === true
      ? { fromOpenFoodFacts: true as const }
      : {}),
  };
}

/** The food of the user's with the barcode `code`, the latest written
 * first; null when the phone has none. */
export function ownFoodByBarcode(foods: readonly Food[], code: string): Food | null {
  const barcode = barcodeOf(code);
  if (barcode === null) {
    return null;
  }
  for (let index = foods.length - 1; index >= 0; index -= 1) {
    if (foods[index].barcode === barcode) {
      return foods[index];
    }
  }
  return null;
}

/** `own` with a new food at its end, and the food; null when `fields` do
 * not make one. */
export function addOwnFood(
  own: OwnFoods,
  fields: OwnFoodFields,
): { own: OwnFoods; food: Food } | null {
  const food = ownFood(fields, `own-${own.next}`);
  if (food === null) {
    return null;
  }
  return { own: { next: own.next + 1, foods: [...own.foods, food] }, food };
}

/** `own` with the food `key` rewritten, and the food as it is now; null
 * when there is no such food or `fields` do not make one. */
export function changeOwnFood(
  own: OwnFoods,
  key: string,
  fields: OwnFoodFields,
): { own: OwnFoods; food: Food } | null {
  const food = ownFood(fields, key);
  if (food === null || !own.foods.some((kept) => kept.key === key)) {
    return null;
  }
  return {
    own: { ...own, foods: own.foods.map((kept) => (kept.key === key ? food : kept)) },
    food,
  };
}

/** `own` without the food `key`. The days already written keep it as it
 * was: a portion carries its food with it (plan.ts). */
export function removeOwnFood(own: OwnFoods, key: string): OwnFoods {
  return { ...own, foods: own.foods.filter((kept) => kept.key !== key) };
}

function numberOf(key: string): number {
  const match = KEY.exec(key);
  return match === null ? 0 : Number(match[1]);
}

/** What of `data` are the user's foods: a food that does not read, is not
 * the user's or has a key already taken is left out. */
export function ownFoodsFrom(data: unknown): OwnFoods {
  if (typeof data !== "object" || data === null) {
    return NO_OWN_FOODS;
  }
  const raw = data as Record<string, unknown>;
  const foods: Food[] = [];
  const taken = new Set<string>();
  for (const item of Array.isArray(raw.foods) ? raw.foods : []) {
    const food = foodFrom(item);
    if (
      food === null ||
      food.source !== "own" ||
      !KEY.test(food.key) ||
      taken.has(food.key)
    ) {
      continue;
    }
    taken.add(food.key);
    foods.push(food);
  }
  const highest = foods.reduce((most, food) => Math.max(most, numberOf(food.key)), 0);
  const next =
    typeof raw.next === "number" && Number.isInteger(raw.next) && raw.next > highest
      ? raw.next
      : highest + 1;
  return { next, foods };
}
