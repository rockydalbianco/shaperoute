import type { LatLon } from "@shaperoute/shared-types";

import type { XcScore } from "./xcScore";

/**
 * The XC score drawn over the flight (TASK-479 part F2, ADR-0388 addition
 * F), as GeoJSON for a map page: the legs as lines, a triangle's gap from
 * its finish back to its start as a dashed line, and the turnpoints as
 * points numbered 1–3 (a triangle's corners, or free distance's
 * turnpoints), with the start and the finish. The page decides the look.
 */

type Position = [number, number];

export type XcFeature =
  | {
      type: "Feature";
      properties: { part: "leg" | "gap" };
      geometry: { type: "LineString"; coordinates: Position[] };
    }
  | {
      type: "Feature";
      properties: { part: "turnpoint"; label: string } | { part: "start" | "finish" };
      geometry: { type: "Point"; coordinates: Position };
    };

export type XcFeatures = { type: "FeatureCollection"; features: XcFeature[] };

const lonLat = ([lat, lon]: LatLon): Position => [lon, lat];

export function xcFeatures(score: XcScore): XcFeatures {
  const tps = score.turnpoints.map(lonLat);
  const start = lonLat(score.start);
  const finish = lonLat(score.finish);
  // Free distance: start, turnpoints, finish. A triangle: its three sides;
  // the way from the start to the first corner and from the last back to
  // the finish is not scored, so not drawn.
  const legs =
    score.kind === "free"
      ? [start, ...tps, finish]
      : tps.length === 3
        ? [...tps, tps[0]]
        : [];
  const features: XcFeature[] = [];
  if (legs.length >= 2) {
    features.push({
      type: "Feature",
      properties: { part: "leg" },
      geometry: { type: "LineString", coordinates: legs },
    });
  }
  if (score.kind !== "free") {
    features.push({
      type: "Feature",
      properties: { part: "gap" },
      geometry: { type: "LineString", coordinates: [finish, start] },
    });
  }
  tps.forEach((point, index) =>
    features.push({
      type: "Feature",
      properties: { part: "turnpoint", label: String(index + 1) },
      geometry: { type: "Point", coordinates: point },
    }),
  );
  features.push(
    {
      type: "Feature",
      properties: { part: "start" },
      geometry: { type: "Point", coordinates: start },
    },
    {
      type: "Feature",
      properties: { part: "finish" },
      geometry: { type: "Point", coordinates: finish },
    },
  );
  return { type: "FeatureCollection", features };
}
