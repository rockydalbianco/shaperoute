import type { LatLon } from "@shaperoute/shared-types";

import { bearingBetween } from "./airGeometry";
import { type Glide, heightForM } from "./glide";
import { distanceM } from "./taskRoute";
import type { Waypoint } from "./waypoints";

/**
 * The nearest landing (TASK-479 part D3, ADR-0388): among the landings of
 * the pilot's waypoint file (part D1), the nearest to them, how far, which
 * way, and the height they would have over it with their glide: a number,
 * + or −, never a «yes». The landings of OpenStreetMap come with part D6.
 */

export type NearLanding = {
  landing: Waypoint;
  distM: number;
  bearingDeg: number;
  /** Over the landing at the end of the glide, metres; null where the
   * landing's height or the pilot's is not known, or the wind holds. */
  overM: number | null;
};

export function nearestLanding(
  waypoints: readonly Waypoint[],
  here: LatLon,
  altM: number | null,
  glide: Glide,
): NearLanding | null {
  let best: { landing: Waypoint; distM: number } | null = null;
  for (const one of waypoints) {
    if (!one.landing) {
      continue;
    }
    // The landings' file has no earth of its own: WGS84.
    const distM = distanceM(here, one.point, "wgs84");
    if (best === null || distM < best.distM) {
      best = { landing: one, distM };
    }
  }
  if (best === null) {
    return null;
  }
  const bearingDeg = bearingBetween(here, best.landing.point);
  const need = heightForM([{ distM: best.distM, courseDeg: bearingDeg }], glide);
  return {
    ...best,
    bearingDeg,
    overM:
      altM === null || need === null || best.landing.altM === null
        ? null
        : altM - need - best.landing.altM,
  };
}
