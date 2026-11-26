import { addDays, type LocalDay, localDayOf } from "./localDay";
import { usualUse } from "./targetEstimate";
import { useDaysEnergy } from "./useDayEnergy";

/** How many whole days before today a usual day is taken from. */
export const USUAL_DAYS = 7;

/** The `USUAL_DAYS` days before `today`, the earliest first. */
export function usualDays(today: LocalDay): LocalDay[] {
  return Array.from({ length: USUAL_DAYS }, (_, index) =>
    addDays(today, index - USUAL_DAYS),
  );
}

/**
 * What the body uses in a usual day (TASK-489 part J): the mean of the
 * last seven whole days, each its rest and its activities as «Diary»
 * counts them. Today is left out: it is not over. Null while the
 * activities are on their way.
 */
export function useUsualUse(now: Date): number | null {
  const energies = useDaysEnergy(usualDays(localDayOf(now)), now);
  return usualUse(energies.map((energy) => energy.used?.used ?? null));
}
