import { kcalOf } from "./foods";
import type { Weekday } from "./localDay";
import { type DayMeals, type Meal, MEALS, type Portion, type WeekPlan } from "./plan";

/**
 * The energy eaten (TASK-489, ADR-0397): for each portion the kilocalories
 * of 100 g of its food, times its grams, over 100. An estimate: the table
 * gives the average of a food, not what was on the plate. Rounded once, at
 * the end, to whole kilocalories.
 */
export type Intake = {
  /** The whole day. The meals below are rounded each on its own, so they
   * can add up to one more or one less. */
  kcal: number;
  meals: { readonly [M in Meal]: number };
};

/** The kilocalories of `portions`, unrounded. */
export function portionsKcal(portions: readonly Portion[]): number {
  return portions.reduce(
    (sum, portion) => sum + kcalOf(portion.food, portion.grams),
    0,
  );
}

/** What `meals` add up to; null for a day with nothing written: an empty
 * day is not a day of zero calories. */
export function intakeOf(meals: DayMeals | null): Intake | null {
  if (meals === null || MEALS.every((meal) => meals[meal].length === 0)) {
    return null;
  }
  const each = {
    breakfast: portionsKcal(meals.breakfast),
    lunch: portionsKcal(meals.lunch),
    dinner: portionsKcal(meals.dinner),
    snacks: portionsKcal(meals.snacks),
  };
  return {
    kcal: Math.round(each.breakfast + each.lunch + each.dinner + each.snacks),
    meals: {
      breakfast: Math.round(each.breakfast),
      lunch: Math.round(each.lunch),
      dinner: Math.round(each.dinner),
      snacks: Math.round(each.snacks),
    },
  };
}

/** What the plan has for `weekday`, the same way; null with nothing
 * planned that day. */
export function plannedIntake(plan: WeekPlan, weekday: Weekday): Intake | null {
  return intakeOf(plan[weekday]);
}

/**
 * Protein, carbohydrates and fat of a day (part H), in whole grams. An
 * estimate, as the calories: the table's average for each food.
 */
export type Macros = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Whether every portion of the day had the three numbers. A food the
   * user wrote with its calories alone has none: it is left out, and the
   * page says so. */
  complete: boolean;
};

/** What the portions of `meals` that have the three numbers add up to;
 * null when none has them, or the day has nothing written. A food with one
 * of the three missing is left out whole: half a food would mislead. */
export function macrosOf(meals: DayMeals | null): Macros | null {
  if (meals === null) {
    return null;
  }
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let counted = 0;
  let all = 0;
  for (const meal of MEALS) {
    for (const { food, grams } of meals[meal]) {
      all += 1;
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
  }
  if (counted === 0) {
    return null;
  }
  return {
    proteinG: Math.round(protein),
    carbsG: Math.round(carbs),
    fatG: Math.round(fat),
    complete: counted === all,
  };
}

/** The kilocalories a gram gives: the general factors of the food labels
 * (4, 4 and 9). */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** How much of the energy of the three comes from each, in whole percent
 * (they can add up to 99 or 101); all zero when there is none. */
export function macroShares(macros: Macros): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const protein = macros.proteinG * KCAL_PER_GRAM.protein;
  const carbs = macros.carbsG * KCAL_PER_GRAM.carbs;
  const fat = macros.fatG * KCAL_PER_GRAM.fat;
  const all = protein + carbs + fat;
  if (all <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }
  return {
    protein: Math.round((protein / all) * 100),
    carbs: Math.round((carbs / all) * 100),
    fat: Math.round((fat / all) * 100),
  };
}
