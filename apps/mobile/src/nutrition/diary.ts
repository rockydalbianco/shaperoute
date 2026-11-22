import { isLocalDay, type LocalDay, monthOf, weekdayOf } from "./localDay";
import {
  type DayMeals,
  isEmptyMeals,
  type Meal,
  mealsFrom,
  NO_MEALS,
  type WeekPlan,
} from "./plan";

/**
 * The diary (TASK-489, ADR-0397): what the user ate, a day of the phone's
 * calendar at a time. Only the days with something written are here: a day
 * with no portion is empty, which is not a day of zero calories.
 */
export type Diary = { readonly [day: LocalDay]: DayMeals };

export const NO_DIARY: Diary = {};

/** What was written on `day`; null for a day with nothing. */
export function dayOf(diary: Diary, day: LocalDay): DayMeals | null {
  const meals = diary[day];
  return meals === undefined || isEmptyMeals(meals) ? null : meals;
}

/** `diary` with `meals` as the whole of `day`; meals with no portion take
 * the day out of the diary. */
export function diaryWithDay(diary: Diary, day: LocalDay, meals: DayMeals): Diary {
  if (!isLocalDay(day)) {
    return diary;
  }
  if (isEmptyMeals(meals)) {
    if (diary[day] === undefined) {
      return diary;
    }
    const rest: { [key: LocalDay]: DayMeals } = { ...diary };
    delete rest[day];
    return rest;
  }
  return { ...diary, [day]: meals };
}

/**
 * «Eaten as planned»: `day` becomes what `plan` has for its day of the
 * week, as the plan is now. A change to the plan afterwards does not reach
 * the day. With nothing planned for that day of the week the diary stays
 * as it is.
 */
export function eatenAsPlanned(diary: Diary, day: LocalDay, plan: WeekPlan): Diary {
  const planned = plan[weekdayOf(day)];
  return isEmptyMeals(planned) ? diary : diaryWithDay(diary, day, planned);
}

/** One meal of `day` becomes the plan's; the other meals stay. */
export function mealAsPlanned(
  diary: Diary,
  day: LocalDay,
  meal: Meal,
  plan: WeekPlan,
): Diary {
  const planned = plan[weekdayOf(day)][meal];
  if (planned.length === 0) {
    return diary;
  }
  const meals = dayOf(diary, day) ?? NO_MEALS;
  return diaryWithDay(diary, day, { ...meals, [meal]: planned });
}

/** The days of `diary` that are in `month` («2026-11»): what one file of
 * the phone keeps. */
export function diaryOfMonth(diary: Diary, month: string): Diary {
  const kept: { [key: LocalDay]: DayMeals } = {};
  for (const day of Object.keys(diary)) {
    if (monthOf(day) === month) {
      kept[day] = diary[day];
    }
  }
  return kept;
}

/** What of `data` is a diary: a key that is not a day, or a day with no
 * portion that reads, is left out. */
export function diaryFrom(data: unknown): Diary {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return NO_DIARY;
  }
  const kept: { [key: LocalDay]: DayMeals } = {};
  for (const [day, value] of Object.entries(data as Record<string, unknown>)) {
    if (!isLocalDay(day)) {
      continue;
    }
    const meals = mealsFrom(value);
    if (!isEmptyMeals(meals)) {
      kept[day] = meals;
    }
  }
  return kept;
}
