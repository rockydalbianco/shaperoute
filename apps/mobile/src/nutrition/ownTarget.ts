/**
 * «My daily target» (TASK-489, ADR-0397, the user's choice of 2026-11-23):
 * a number of kilocalories a day that only the user writes, their own or
 * the one their dietitian gave them. MuW never proposes one and never
 * works one out: nothing here takes a body, a weight or an activity.
 */

/** The values the field takes: whole kilocalories. */
export const TARGET_KCAL = { min: 1, max: 20000 } as const;

/** The target as it is kept: whole; null when none is set or it does not
 * read. */
export function targetOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const kcal = Math.round(value);
  return kcal >= TARGET_KCAL.min && kcal <= TARGET_KCAL.max ? kcal : null;
}

/**
 * «Left»: the target less what was eaten; below zero once the day is over
 * it. Null without a target; a day with nothing written has all of it left.
 */
export function leftKcal(
  target: number | null,
  eatenKcal: number | null,
): number | null {
  return target === null ? null : target - (eatenKcal ?? 0);
}
