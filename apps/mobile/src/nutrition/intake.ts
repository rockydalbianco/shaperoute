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
