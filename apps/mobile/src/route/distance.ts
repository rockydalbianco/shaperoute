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
