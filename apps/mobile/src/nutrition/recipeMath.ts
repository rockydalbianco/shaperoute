import type { Food } from "./foods";
import { FOOD_TABLE } from "./foodTable";
import { type Macros, portionsKcal } from "./intake";
import { GRAMS, type Portion } from "./plan";
import type { Recipe } from "./recipes";

/**
 * The numbers of a recipe (TASK-489 part L, ADR-0397): the same counts as
 * a day of the diary (intake.ts), on the recipe's ingredients, divided by
 * its servings. Nothing is rounded before the end, so a serving reads the
 * same whether its grams are many or few. An estimate, like every number
 * of «Nutrition»: the table gives the average of a food.
 */

/** How many servings a recipe is for, at least and at most. */
export const SERVINGS = { min: 1, max: 12 } as const;

/** The servings as they are kept: whole; null outside what a recipe makes. */
export function servingsOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  return value >= SERVINGS.min && value <= SERVINGS.max ? value : null;
}

const byKey = new Map<string, Food>(FOOD_TABLE.map((food) => [food.key, food]));

/** The food of the table with `key`; null when the table has none. */
export function tableFood(key: string): Food | null {
  return byKey.get(key) ?? null;
}

/** The ingredients of MuW's `recipe` as portions of the table's foods, for
 * all its servings. A key the table no longer has is left out. */
export function recipePortions(recipe: Recipe): readonly Portion[] {
  const portions: Portion[] = [];
  for (const { key, grams } of recipe.ingredients) {
    const food = tableFood(key);
    if (food !== null) {
      portions.push({ food, grams });
    }
  }
  return portions;
}

/** What a serving holds. */
export type ServingNumbers = {
  /** Whole kilocalories. */
  kcal: number;
  /** Protein, carbohydrates and fat in whole grams; null when no
   * ingredient has the three (a food of the user's written with its
   * calories alone). */
  macros: Macros | null;
};

/** What one of `servings` of `portions` holds; null with no ingredient. */
export function perServing(
  portions: readonly Portion[],
  servings: number,
): ServingNumbers | null {
  if (portions.length === 0 || servings < 1) {
    return null;
  }
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let counted = 0;
  for (const { food, grams } of portions) {
    if (
      food.proteinPer100g === null ||
      food.carbsPer100g === null ||
      food.fatPer100g === null
    ) {
      continue;
    }
    counted += 1;
    protein += (food.proteinPer100g * grams) / 100;
    carbs += (food.carbsPer100g * grams) / 100;
    fat += (food.fatPer100g * grams) / 100;
  }
  return {
    kcal: Math.round(portionsKcal(portions) / servings),
    macros:
      counted === 0
        ? null
        : {
            proteinG: Math.round(protein / servings),
            carbsG: Math.round(carbs / servings),
            fatG: Math.round(fat / servings),
            complete: counted === portions.length,
          },
  };
}

/** Whole grams within what a portion weighs. */
function wholeGrams(grams: number): number {
  return Math.min(GRAMS.max, Math.max(GRAMS.min, Math.round(grams)));
}

/** `portions` made for `to` servings instead of `from`: each grams times
 * `to` over `from`, whole, never under a gram. */
export function scaledPortions(
  portions: readonly Portion[],
  from: number,
  to: number,
): readonly Portion[] {
  if (from === to || from < 1) {
    return portions;
  }
  return portions.map((portion) => ({
    ...portion,
    grams: wholeGrams((portion.grams * to) / from),
  }));
}

/** The ingredients of one serving: what «Add to diary» and «Add to my
 * plan» write, one portion each, as foods of the day like any other. */
export function oneServing(
  portions: readonly Portion[],
  servings: number,
): readonly Portion[] {
  return scaledPortions(portions, servings, 1);
}
