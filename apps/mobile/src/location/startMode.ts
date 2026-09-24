import type { LatLon } from "@shaperoute/shared-types";

import type { PositionState } from "./useCurrentPosition";

/** Where the user wants to start from (TASK-054): the GPS, or another place. */
export type StartMode = "gps" | "place";

/** Where the route will start: the GPS position, or a place searched for. */
export type Start =
  { point: LatLon; source: "gps" } | { point: LatLon; source: "search"; label: string };

/** A place found by the search, as the start needs it. */
export type ChosenPlace = { point: LatLon; label: string };

/**
 * The start for the mode chosen. With "place" only the place counts, even when
 * the GPS answers; with "gps" the GPS wins as soon as it answers, and a place
 * searched while it could not answer stands in for it.
 */
export function chooseStart(
  mode: StartMode,
  position: PositionState,
  place: ChosenPlace | null,
): Start | null {
  if (mode === "gps" && position.status === "ok") {
    return { point: position.point, source: "gps" };
  }
  if (place) {
    return { point: place.point, source: "search", label: place.label };
  }
  return null;
}

/** The search shows when another place is asked for, or the GPS cannot help. */
export function showsSearch(mode: StartMode, position: PositionState): boolean {
  return (
    mode === "place" ||
    position.status === "denied" ||
    position.status === "unavailable"
  );
}
