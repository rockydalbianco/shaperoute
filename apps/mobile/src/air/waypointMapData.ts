import type { Waypoint } from "./waypoints";

/**
 * The pilot's waypoints on the flight map (TASK-479 part D5): those of
 * their file (D1) and those they put with a long press, as points with
 * their names for the map's page. A landing is drawn apart from a
 * turnpoint, by its shape as well as its colour.
 */

export type WaypointFeature = {
  type: "Feature";
  properties: { name: string; landing: boolean; manual: boolean };
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type WaypointFeatures = {
  type: "FeatureCollection";
  features: WaypointFeature[];
};

export function waypointFeatures(
  fromFile: readonly Waypoint[],
  manual: readonly Waypoint[],
): WaypointFeatures {
  const feature = (one: Waypoint, isManual: boolean): WaypointFeature => ({
    type: "Feature",
    properties: { name: one.name, landing: one.landing, manual: isManual },
    geometry: { type: "Point", coordinates: [one.point[1], one.point[0]] },
  });
  return {
    type: "FeatureCollection",
    features: [
      ...fromFile.map((one) => feature(one, false)),
      ...manual.map((one) => feature(one, true)),
    ],
  };
}
