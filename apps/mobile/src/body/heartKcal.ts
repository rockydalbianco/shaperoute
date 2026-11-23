import { ageIn, type BodyProfile } from "./bodyProfile";
import { restKcalPerMin } from "./energy";

/**
 * The active energy of an activity from its heart rate (TASK-385 part G,
 * ADR-0327 point 7): Keytel et al. 2005, «Prediction of energy expenditure
 * from heart rate monitoring during submaximal exercise», the gross energy
 * a minute from the average heart rate, the weight and the age, one
 * equation for men and one for women. As every other sport (ADR-0318),
 * what the body spent above rest: its rest in the same time
 * (restKcalPerMin) is taken out.
 *
 * Only with all three: a sex the user said (not «Prefer not to say»), a
 * weight and a year of birth; otherwise null, and the activity keeps its
 * estimate without the heart rate.
 */

/** kJ in a kilocalorie: Keytel's equations give kJ a minute. */
const KJ_PER_KCAL = 4.184;

/** Keytel 2005, kJ a minute: constant, heart rate, weight (kg), age. */
const KEYTEL = {
  male: { base: -55.0969, bpm: 0.6309, kg: 0.1988, age: 0.2017 },
  female: { base: -20.4022, bpm: 0.4472, kg: -0.1263, age: 0.074 },
} as const;

/**
 * The active energy of `durationS` at an average of `avgBpm`, for `body`
 * in `year`: whole kilocalories, never below zero; null without a sex, a
 * weight or a year of birth.
 */
export function heartKcal(
  avgBpm: number,
  durationS: number,
  body: BodyProfile,
  year: number,
): number | null {
  const age = ageIn(body, year);
  if (
    (body.sex !== "male" && body.sex !== "female") ||
    body.weightKg === null ||
    age === null
  ) {
    return null;
  }
  const k = KEYTEL[body.sex];
  const kjMin = k.base + k.bpm * avgBpm + k.kg * body.weightKg + k.age * age;
  const minutes = Math.max(0, durationS) / 60;
  const gross = (Math.max(0, kjMin) / KJ_PER_KCAL) * minutes;
  return Math.max(0, Math.round(gross - restKcalPerMin(body, year) * minutes));
}
