import {
  type Activity,
  DISTANCE_LIMITS_M,
  MIN_DISTANCE_M,
} from "@shaperoute/shared-types";

/**
 * The longest distance the app offers for a run (ADR-0034). At Trento a new
 * 21 km zone downloads in about 105 s and the route takes 35–50 s, well
 * within the 5 minutes the app waits; a 30 km zone alone takes about 280 s
 * to download. The engine and the contract go up to MAX_DISTANCE_M.
 */
export const MAX_APP_DISTANCE_KM = 21;
export const MIN_DISTANCE_KM = MIN_DISTANCE_M / 1000;

/**
 * The distances «Draw» offers for each activity, [lowest, highest] in whole
 * km: a run from 1 to MAX_APP_DISTANCE_KM; a bike route all of its contract
 * limits, 10–30 km (TASK-190, the user's choice). Outside the bike zones
 * downloaded ahead a bike route downloads 23–26 km of map, and may take
 * longer than the 5 minutes the app waits (ADR-0153). Paddling its contract
 * limits too, 1–5 km (TASK-191): «Paddle» is not offered yet.
 */
export const APP_DISTANCE_LIMITS_KM: Readonly<
  Record<Activity, readonly [lowest: number, highest: number]>
> = {
  running: [MIN_DISTANCE_KM, MAX_APP_DISTANCE_KM],
  cycling: [DISTANCE_LIMITS_M.cycling[0] / 1000, DISTANCE_LIMITS_M.cycling[1] / 1000],
  paddling: [
    DISTANCE_LIMITS_M.paddling[0] / 1000,
    DISTANCE_LIMITS_M.paddling[1] / 1000,
  ],
};

/** Above this the panel warns that the route takes longer (ADR-0034). */
export const LONG_DISTANCE_KM = 15;

/** Whole km with at most one decimal, after a point or a comma. */
const KM = /^(\d+)(?:[.,](\d))?$/;

/**
 * The km typed in the distance field as whole metres: "7", "7,5", "7.5".
 * Null when it is not such a number, or falls outside the limits of
 * `activity` (APP_DISTANCE_LIMITS_KM): 1 to MAX_APP_DISTANCE_KM km for a run.
 */
export function toDistanceM(
  text: string,
  activity: Activity = "running",
): number | null {
  const match = KM.exec(text.trim());
  if (!match) {
    return null;
  }
  // Integer arithmetic: 1.1 * 1000 would give 1100.0000000000002.
  const [, km, tenths = "0"] = match;
  const metres = Number(km) * 1000 + Number(tenths) * 100;
  const [lowest, highest] = APP_DISTANCE_LIMITS_KM[activity];
  if (metres < lowest * 1000 || metres > highest * 1000) {
    return null;
  }
  return metres;
}

/** What − and + add to the distance. */
export const DISTANCE_STEP_KM = 1;

/**
 * The distance field after pressing − (steps < 0) or + (steps > 0): one
 * DISTANCE_STEP_KM each, held within the limits of `activity` (for a run
 * MIN_DISTANCE_KM to MAX_APP_DISTANCE_KM). A value out of range is brought
 * back into it; text that is not a number starts from the lowest. The
 * decimal keeps the separator typed.
 */
export function stepDistance(
  text: string,
  steps: number,
  activity: Activity = "running",
): string {
  const match = KM.exec(text.trim());
  const separator = text.includes(",") ? "," : ".";
  const [lowest, highest] = APP_DISTANCE_LIMITS_KM[activity];
  // In tenths of a km, to add and compare without floating point.
  const tenths = match ? Number(match[1]) * 10 + Number(match[2] ?? "0") : null;
  const next =
    tenths === null
      ? lowest * 10
      : Math.min(
          highest * 10,
          Math.max(lowest * 10, tenths + steps * DISTANCE_STEP_KM * 10),
        );
  const whole = Math.floor(next / 10);
  return next % 10 === 0 ? String(whole) : `${whole}${separator}${next % 10}`;
}

/**
 * The distance field for a sport just chosen (TASK-190): as typed when it is
 * within the limits of `activity`, brought within them otherwise, as − and +
 * do (5 km of a run are 10 by bike, 25 km by bike are 21 on foot).
 */
export function fitDistance(text: string, activity: Activity): string {
  return toDistanceM(text, activity) !== null ? text : stepDistance(text, 0, activity);
}
