import type { LatLon } from "@shaperoute/shared-types";

import { bearingBetween } from "./airGeometry";
import type { FlightTask } from "./flightTask";
import type { TaskProgress } from "./taskProgress";
import { destination, type Route } from "./taskRoute";

/**
 * The pilot's task on the flight map (TASK-479 part D2): each cylinder as
 * a ring on the ground (the next one marked), a goal line as a line, and
 * the shortest way left from the pilot, as GeoJSON for the map's page.
 */

/** A ring has this many corners: smooth at any zoom of a flight map. */
export const RING_CORNERS = 72;

type Position = [number, number];

export type TaskFeature =
  | {
      type: "Feature";
      properties: { part: "cylinder"; next: boolean; taken: boolean };
      geometry: { type: "Polygon"; coordinates: Position[][] };
    }
  | {
      type: "Feature";
      properties: { part: "goalLine" | "route"; next: boolean; taken: boolean };
      geometry: { type: "LineString"; coordinates: Position[] };
    };

export type TaskFeatures = { type: "FeatureCollection"; features: TaskFeature[] };

const lonLat = ([lat, lon]: LatLon): Position => [lon, lat];

export function ringOf(centre: LatLon, radiusM: number): Position[] {
  const ring: Position[] = [];
  for (let i = 0; i < RING_CORNERS; i += 1) {
    ring.push(lonLat(destination(centre, (i * 360) / RING_CORNERS, radiusM)));
  }
  ring.push(ring[0]);
  return ring;
}

/** The task as the map draws it; `route` from the pilot, null once the
 * goal is taken or before the first fix. */
export function taskFeatures(
  task: FlightTask,
  progress: TaskProgress,
  here: LatLon | null,
  route: Route | null,
): TaskFeatures {
  const last = task.turnpoints.length - 1;
  const features: TaskFeature[] = task.turnpoints.map((turnpoint, index) => {
    const properties = {
      next: index === progress.next,
      taken: index < progress.next,
    };
    const centre = turnpoint.waypoint.point;
    if (index === last && task.goal.type === "line" && index > 0) {
      // Across the last leg, through the goal's centre.
      const legDeg = bearingBetween(task.turnpoints[index - 1].waypoint.point, centre);
      return {
        type: "Feature",
        properties: { part: "goalLine", ...properties },
        geometry: {
          type: "LineString",
          coordinates: [
            lonLat(destination(centre, legDeg - 90, turnpoint.radiusM)),
            lonLat(destination(centre, legDeg + 90, turnpoint.radiusM)),
          ],
        },
      };
    }
    return {
      type: "Feature",
      properties: { part: "cylinder", ...properties },
      geometry: { type: "Polygon", coordinates: [ringOf(centre, turnpoint.radiusM)] },
    };
  });
  if (here !== null && route !== null) {
    features.push({
      type: "Feature",
      properties: { part: "route", next: false, taken: false },
      geometry: {
        type: "LineString",
        coordinates: [lonLat(here), ...route.points.map(lonLat)],
      },
    });
  }
  return { type: "FeatureCollection", features };
}
