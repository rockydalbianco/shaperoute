import { ageIn, type BodyProfile, type Sex } from "../body/bodyProfile";

/**
 * MuW's estimate of a daily target (TASK-489 part J; ADR-0397,
 * precisazione 5): a number of kilocalories a day worked out from what the
 * body uses and from why the user is here. A demonstration, kept behind the
 * user's own number: the user asked for it on 2026-11-24 («MuW», then
 * «solo una demo») and no health professional reviewed it.
 *
 * Every amount here is what an official public source says, read on
 * 2026-11-24 and cited in «How we calculate»
 * (`out/TASK-489/FONTI-PARTE-J.md`). Where the sources say nothing, MuW
 * proposes nothing:
 *
 * - losing weight: about 600 kcal a day less than what one uses (NHS,
 *   «Calories and weight loss»), for healthy adults with a body mass index
 *   of 25 or more, and for most women not below 1,400 kcal a day, for most
 *   men 1,900 (NHS 12-week weight loss plan);
 * - gaining weight: no source read, so no number;
 * - under 18: no number at all (the NHS plan is «not suitable for
 *   children»).
 *
 * A fixed formula: the AI never produces a number here.
 */

/** Why the user is here, as they said it; null when they skipped. */
export const PURPOSES = ["track", "lose", "gain", "plan"] as const;
export type Purpose = (typeof PURPOSES)[number];

export function purposeOf(value: unknown): Purpose | null {
  return PURPOSES.includes(value as Purpose) ? (value as Purpose) : null;
}

/** NHS, «Calories and weight loss»: «around 600 calories a day». */
export const LOSE_DEFICIT_KCAL = 600;
/** NHS 12-week plan: «healthy adults with a body mass index of 25 and over». */
export const LOSE_FROM_BMI = 25;
/** NHS 12-week plan: «for most men […] 1,900kcal a day, and for most women,
 * 1,400kcal». With the sex not said, the higher of the two. */
export const LOSE_NOT_BELOW: Readonly<Record<Sex, number>> = {
  female: 1400,
  male: 1900,
  unsaid: 1900,
};
/** Adults only. */
export const ADULT_AGE = 18;

export type Estimate =
  | { kind: "number"; kcal: number }
  /**
   * No number, and why: the body data are missing; the user is under 18;
   * the sources give no number for this person or this purpose.
   */
  | { kind: "none"; why: "data" | "under18" | "notForThis" };

/** The body mass index, kg/m²; null without weight or height. */
export function bmiOf(body: BodyProfile): number | null {
  if (body.weightKg === null || body.heightCm === null || body.heightCm <= 0) {
    return null;
  }
  const metres = body.heightCm / 100;
  return body.weightKg / (metres * metres);
}

/** A number of kilocalories as «about»: to the nearest ten. */
export function about(kcal: number): number {
  return Math.round(kcal / 10) * 10;
}

/**
 * The estimate for `purpose`, from what the body uses in a day
 * (`usedPerDay`, itself an estimate: the rest and the activities) and the
 * body data. `year` is the year now, for the age.
 */
export function targetEstimate(
  purpose: Purpose | null,
  usedPerDay: number | null,
  body: BodyProfile,
  year: number,
): Estimate {
  const age = ageIn(body, year);
  // Not knowing the age is not knowing that the user is an adult.
  if (
    usedPerDay === null ||
    usedPerDay <= 0 ||
    age === null ||
    body.sex === null ||
    body.weightKg === null ||
    body.heightCm === null
  ) {
    return { kind: "none", why: "data" };
  }
  if (age < ADULT_AGE) {
    return { kind: "none", why: "under18" };
  }
  if (purpose === "gain" || purpose === "plan") {
    return { kind: "none", why: "notForThis" };
  }
  if (purpose === "lose") {
    const bmi = bmiOf(body);
    const kcal = about(usedPerDay - LOSE_DEFICIT_KCAL);
    if (bmi === null || bmi < LOSE_FROM_BMI || kcal < LOSE_NOT_BELOW[body.sex]) {
      return { kind: "none", why: "notForThis" };
    }
    return { kind: "number", kcal };
  }
  // Keeping track, or no answer: what the body uses.
  return { kind: "number", kcal: about(usedPerDay) };
}

/** What a body uses in a usual day: the mean of the days given, each the
 * rest and the activities of that day; null with none. */
export function usualUse(usedOn: readonly (number | null)[]): number | null {
  const known = usedOn.filter((kcal): kcal is number => kcal !== null && kcal > 0);
  if (known.length === 0) {
    return null;
  }
  return known.reduce((sum, kcal) => sum + kcal, 0) / known.length;
}
