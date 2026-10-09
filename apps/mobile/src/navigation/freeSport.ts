import type { Activity } from "@shaperoute/shared-types";

/**
 * What a run without a route is, from the sport «Settings» has when it
 * starts: a ride's numbers are speeds, as along a route by bike (TASK-251
 * part C, ADR-0215), and an outing on the water's a paddler's (TASK-251).
 * A run has none, and its file is as before.
 */
export function freeRunActivity(sport: Activity): Activity | undefined {
  return sport === "running" ? undefined : sport;
}
