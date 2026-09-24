import { MIN_DISTANCE_M } from "@shaperoute/shared-types";

/**
 * The longest distance the app offers (ADR-0034). At Trento a new 21 km zone
 * downloads in about 105 s and the route takes 35–50 s, well within the 5
 * minutes the app waits; a 30 km zone alone takes about 280 s to download.
 * The engine and the contract go up to MAX_DISTANCE_M.
 */
export const MAX_APP_DISTANCE_KM = 21;
export const MIN_DISTANCE_KM = MIN_DISTANCE_M / 1000;

/** Above this the panel warns that the route takes longer (ADR-0034). */
export const LONG_DISTANCE_KM = 15;

/** Whole km with at most one decimal, after a point or a comma. */
const KM = /^(\d+)(?:[.,](\d))?$/;

/**
 * The km typed in the distance field as whole metres: "7", "7,5", "7.5".
 * Null when it is not such a number, or falls outside 1 to
 * MAX_APP_DISTANCE_KM km.
 */
export function toDistanceM(text: string): number | null {
  const match = KM.exec(text.trim());
  if (!match) {
    return null;
  }
  // Integer arithmetic: 1.1 * 1000 would give 1100.0000000000002.
  const [, km, tenths = "0"] = match;
  const metres = Number(km) * 1000 + Number(tenths) * 100;
  if (metres < MIN_DISTANCE_M || metres > MAX_APP_DISTANCE_KM * 1000) {
    return null;
  }
  return metres;
}

/** What − and + add to the distance. */
export const DISTANCE_STEP_KM = 1;

/**
 * The distance field after pressing − (steps < 0) or + (steps > 0): one
 * DISTANCE_STEP_KM each, held between MIN_DISTANCE_KM and MAX_APP_DISTANCE_KM.
 * A value out of range is brought back into it; text that is not a number
 * starts from the minimum. The decimal keeps the separator typed.
 */
export function stepDistance(text: string, steps: number): string {
  const match = KM.exec(text.trim());
  const separator = text.includes(",") ? "," : ".";
  // In tenths of a km, to add and compare without floating point.
  const tenths = match ? Number(match[1]) * 10 + Number(match[2] ?? "0") : null;
  const next =
    tenths === null
      ? MIN_DISTANCE_KM * 10
      : Math.min(
          MAX_APP_DISTANCE_KM * 10,
          Math.max(MIN_DISTANCE_KM * 10, tenths + steps * DISTANCE_STEP_KM * 10),
        );
  const whole = Math.floor(next / 10);
  return next % 10 === 0 ? String(whole) : `${whole}${separator}${next % 10}`;
}
