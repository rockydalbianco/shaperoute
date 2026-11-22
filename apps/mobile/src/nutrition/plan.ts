import { type Food, foodFrom } from "./foods";
import { type Weekday, WEEKDAYS } from "./localDay";

/**
 * The plan the user writes (TASK-489, ADR-0397): what they have decided to
 * eat, or the diet their dietitian gave them, as a week of four meals a day
 * with foods and grams (the user's choice, «Settimana a pasti»). MuW never
 * writes or changes a plan, and proposes none.
 */

/** The meals of a day, in the order they are shown. */
export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;

export type Meal = (typeof MEALS)[number];

/**
 * So many grams of a food. The food is carried whole, as it was when the
 * portion was written: a day already in the diary keeps its numbers when
 * the food is changed or removed later.
 */
export type Portion = {
  food: Food;
  /** Whole grams. */
  grams: number;
};

/** What a portion weighs, at least and at most. */
export const GRAMS = { min: 1, max: 5000 } as const;

/** The portions of each meal of a day, in the order they were added. */
export type DayMeals = { readonly [M in Meal]: readonly Portion[] };

export type WeekPlan = { readonly [D in Weekday]: DayMeals };

export const NO_MEALS: DayMeals = { breakfast: [], lunch: [], dinner: [], snacks: [] };

export const NO_PLAN: WeekPlan = {
  mon: NO_MEALS,
  tue: NO_MEALS,
  wed: NO_MEALS,
  thu: NO_MEALS,
  fri: NO_MEALS,
  sat: NO_MEALS,
  sun: NO_MEALS,
};

/** The grams as they are kept: whole; null outside what a portion weighs. */
export function gramsOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const grams = Math.round(value);
  return grams >= GRAMS.min && grams <= GRAMS.max ? grams : null;
}

/** `grams` of `food`; null when the grams are not a portion's. */
export function portionOf(food: Food, grams: number): Portion | null {
  const kept = gramsOf(grams);
  return kept === null ? null : { food, grams: kept };
}

/** `meals` with `portion` at the end of `meal`. */
export function withPortion(meals: DayMeals, meal: Meal, portion: Portion): DayMeals {
  return { ...meals, [meal]: [...meals[meal], portion] };
}

/** `meals` with the grams of the portion at `index` of `meal` changed;
 * `meals` itself when there is no such portion or the grams are not one's. */
export function withGrams(
  meals: DayMeals,
  meal: Meal,
  index: number,
  grams: number,
): DayMeals {
  const kept = gramsOf(grams);
  if (kept === null || meals[meal][index] === undefined) {
    return meals;
  }
  return {
    ...meals,
    [meal]: meals[meal].map((portion, at) =>
      at === index ? { ...portion, grams: kept } : portion,
    ),
  };
}

/** `meals` without the portion at `index` of `meal`. */
export function withoutPortion(meals: DayMeals, meal: Meal, index: number): DayMeals {
  return { ...meals, [meal]: meals[meal].filter((_, at) => at !== index) };
}

/** Whether no meal has a portion: a day with nothing written, which is not
 * a day of zero calories. */
export function isEmptyMeals(meals: DayMeals): boolean {
  return MEALS.every((meal) => meals[meal].length === 0);
}

function portionsFrom(data: unknown): Portion[] {
  const portions: Portion[] = [];
  for (const item of Array.isArray(data) ? data : []) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const food = foodFrom(raw.food);
    const grams = gramsOf(raw.grams);
    if (food !== null && grams !== null) {
      portions.push({ food, grams });
    }
  }
  return portions;
}

/** What of `data` are the meals of a day: a portion that does not read is
 * left out. */
export function mealsFrom(data: unknown): DayMeals {
  if (typeof data !== "object" || data === null) {
    return NO_MEALS;
  }
  const raw = data as Record<string, unknown>;
  return {
    breakfast: portionsFrom(raw.breakfast),
    lunch: portionsFrom(raw.lunch),
    dinner: portionsFrom(raw.dinner),
    snacks: portionsFrom(raw.snacks),
  };
}

/** `plan` with the meals of `weekday` replaced. */
export function planWithDay(
  plan: WeekPlan,
  weekday: Weekday,
  meals: DayMeals,
): WeekPlan {
  return { ...plan, [weekday]: meals };
}

/** `plan` with the meals of `from` written over the ones of `to`. */
export function copyDay(plan: WeekPlan, from: Weekday, to: Weekday): WeekPlan {
  return planWithDay(plan, to, plan[from]);
}

/**
 * `plan` with every portion of the food `food.key` counting with `food` as
 * it is now: a food of the user's rewritten changes the plan from here on.
 * The diary is not touched (diary.ts).
 */
export function planWithFood(plan: WeekPlan, food: Food): WeekPlan {
  const renew = (portions: readonly Portion[]): readonly Portion[] =>
    portions.some((portion) => portion.food.key === food.key)
      ? portions.map((portion) =>
          portion.food.key === food.key ? { ...portion, food } : portion,
        )
      : portions;
  const day = (meals: DayMeals): DayMeals => ({
    breakfast: renew(meals.breakfast),
    lunch: renew(meals.lunch),
    dinner: renew(meals.dinner),
    snacks: renew(meals.snacks),
  });
  return {
    mon: day(plan.mon),
    tue: day(plan.tue),
    wed: day(plan.wed),
    thu: day(plan.thu),
    fri: day(plan.fri),
    sat: day(plan.sat),
    sun: day(plan.sun),
  };
}

export function isEmptyPlan(plan: WeekPlan): boolean {
  return WEEKDAYS.every((weekday) => isEmptyMeals(plan[weekday]));
}

/** What of `data` is a plan: a day that does not read is left empty. */
export function planFrom(data: unknown): WeekPlan {
  if (typeof data !== "object" || data === null) {
    return NO_PLAN;
  }
  const raw = data as Record<string, unknown>;
  return {
    mon: mealsFrom(raw.mon),
    tue: mealsFrom(raw.tue),
    wed: mealsFrom(raw.wed),
    thu: mealsFrom(raw.thu),
    fri: mealsFrom(raw.fri),
    sat: mealsFrom(raw.sat),
    sun: mealsFrom(raw.sun),
  };
}
