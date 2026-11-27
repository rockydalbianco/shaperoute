import { useMemo } from "react";

import { addDays, type LocalDay } from "./localDay";
import { useDaysEnergy } from "./useDayEnergy";
import { intakeOf } from "./intake";
import { useNutrition } from "./useNutrition";
import { type WeekTotal, weekRows, weekTotal } from "./weekBalance";

/**
 * The calorie balance of the weeks of the weigh-ins (TASK-489 part K1): what
 * the diary and the energy used add up to from the first weigh-in to today,
 * the same way as the week of the profile (weekBalance.ts): a day with
 * nothing written does not count, nor does today until it is over. Shown
 * beside the change of weight, with no judgement and without saying which
 * of the two numbers is right.
 */

/** The days from `from` to `to`, both in; none when `from` is after `to`. */
export function periodDays(from: LocalDay, to: LocalDay): LocalDay[] {
  const days: LocalDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

/** What the period adds up to; null with no day written, or before the
 * activities are read. */
export function useWeightPeriod(
  from: LocalDay | null,
  today: LocalDay,
  now: Date,
): WeekTotal | null {
  const nutrition = useNutrition();
  const days = useMemo(
    () => (from === null ? [] : periodDays(from, today)),
    [from, today],
  );
  const energies = useDaysEnergy(days, now);
  return useMemo(
    () =>
      // A day whose activities are still coming would leave the sum short.
      energies.some((energy) => energy.used === null)
        ? null
        : weekTotal(
            weekRows(energies, (day) => intakeOf(nutrition.mealsOn(day))?.kcal ?? null),
          ),
    [energies, nutrition],
  );
}
