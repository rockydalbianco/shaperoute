import type { Activity } from "@shaperoute/shared-types";

import { isOnWater } from "../swim/water";

/**
 * True for a route on the snow (TASK-413, ADR-0342): snowshoes. The server
 * places a shape of the catalogue freely on the open snow, as on the water;
 * it follows no road and has no directions; «Start» goes through the
 * avalanche notice (snow/safetyNotice.ts). Not activities/snow.ts's
 * isOnSnow, which says a day recorded on the snow without a shape.
 */
export function isSnowshoeRoute(activity: Activity | undefined): boolean {
  return activity === "snowshoeing";
}

/**
 * True for a route the server places freely, on the water or on the snow:
 * no network, no directions, a shape in pieces kept apart, no start dot to
 * move. Where the snow does as the water, the app asks this; where only the
 * water is meant (its sample drawings, its spots, its notices), isOnWater.
 * For paddling and swimming it says what isOnWater says.
 */
export function isPlacedFree(activity: Activity | undefined): boolean {
  return isOnWater(activity) || isSnowshoeRoute(activity);
}
