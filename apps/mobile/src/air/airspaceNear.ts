import type { LatLon } from "@shaperoute/shared-types";

import { lengthOf, planeAt } from "./airGeometry";
import { type Airspace, type Limit, METRES_PER_FOOT } from "./openair";

/**
 * Where the pilot is from the airspaces of their file (TASK-479 part E2,
 * ADR-0388): for each volume near enough, inside its outline or not, how
 * far from its edge, how far over or under its floor and ceiling.
 *
 * Heights are GPS heights: a flight level is read as if it were a height
 * above the sea (≈, the phone has no barometer); a limit above the ground
 * needs the ground under the pilot (`groundStore`), and without it its
 * height is not known. Nothing here ever says a volume is free or that
 * flying is allowed: only distances.
 */

/** Volumes farther than this are not looked at, metres. */
export const LOOK_M = 20_000;

/** A limit as metres above the sea, where it is known. */
export type Height =
  { metres: number; approx: boolean } | { metres: null; approx: boolean };

/** The height of `limit` at the pilot's place, above the sea. */
export function heightOf(limit: Limit, groundM: number | null): Height {
  switch (limit.kind) {
    case "ground":
      return { metres: groundM ?? Number.NEGATIVE_INFINITY, approx: false };
    case "aboveGround":
      return groundM === null
        ? { metres: null, approx: false }
        : { metres: groundM + limit.metres, approx: false };
    case "aboveSea":
      return { metres: limit.metres, approx: false };
    case "flightLevel":
      return { metres: limit.level * 100 * METRES_PER_FOOT, approx: true };
    case "unlimited":
      return { metres: Number.POSITIVE_INFINITY, approx: false };
  }
}

export type Near = {
  airspace: Airspace;
  /** Inside the outline. */
  within: boolean;
  /** Metres to the outline; 0 inside. */
  horizontalM: number;
  /** Metres under the floor (+) or over the ceiling (+); 0 between them;
   * null when the altitude or a limit is not known. */
  verticalM: number | null;
  /** Inside the outline and between floor and ceiling. */
  inside: boolean;
  /** A flight level is in the reckoning. */
  approx: boolean;
};

type Box = { south: number; west: number; north: number; east: number };

const boxes = new WeakMap<Airspace, Box>();

function boxOf(airspace: Airspace): Box {
  let box = boxes.get(airspace);
  if (box === undefined) {
    box = { south: 90, west: 180, north: -90, east: -180 };
    for (const [lat, lon] of airspace.points) {
      box.south = Math.min(box.south, lat);
      box.north = Math.max(box.north, lat);
      box.west = Math.min(box.west, lon);
      box.east = Math.max(box.east, lon);
    }
    boxes.set(airspace, box);
  }
  return box;
}

/** Whether `here` may be within `metres` of the box. */
function nearBox(box: Box, here: LatLon, metres: number): boolean {
  const dLat = metres / 111_195;
  const dLon = metres / (111_195 * Math.max(0.1, Math.cos((here[0] * Math.PI) / 180)));
  return (
    here[0] >= box.south - dLat &&
    here[0] <= box.north + dLat &&
    here[1] >= box.west - dLon &&
    here[1] <= box.east + dLon
  );
}

/** Whether `here` is inside `points` (the outline, closed by its first). */
export function withinOutline(here: LatLon, points: readonly LatLon[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [yi, xi] = points[i];
    const [yj, xj] = points[j];
    const crosses =
      yi > here[0] !== yj > here[0] &&
      here[1] < ((xj - xi) * (here[0] - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

/** Metres from `here` to the nearest point of the outline. */
export function distanceToOutline(here: LatLon, points: readonly LatLon[]): number {
  const plane = planeAt(here);
  const p = plane(here);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = plane(points[j]);
    const b = plane(points[i]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t =
      length2 === 0
        ? 0
        : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    best = Math.min(best, lengthOf(p, { x: a.x + t * dx, y: a.y + t * dy }));
  }
  return best;
}

/** The pilot against each volume within LOOK_M, nearest first. */
export function nearAirspaces(
  airspaces: readonly Airspace[],
  here: LatLon,
  altM: number | null,
  groundM: number | null,
): Near[] {
  const near: Near[] = [];
  for (const airspace of airspaces) {
    if (!nearBox(boxOf(airspace), here, LOOK_M)) {
      continue;
    }
    const within = withinOutline(here, airspace.points);
    const horizontalM = within ? 0 : distanceToOutline(here, airspace.points);
    if (horizontalM > LOOK_M) {
      continue;
    }
    const floor = heightOf(airspace.floor, groundM);
    const ceiling = heightOf(airspace.ceiling, groundM);
    let verticalM: number | null = null;
    if (altM !== null && floor.metres !== null && ceiling.metres !== null) {
      verticalM =
        altM < floor.metres
          ? floor.metres - altM
          : altM > ceiling.metres
            ? altM - ceiling.metres
            : 0;
    }
    near.push({
      airspace,
      within,
      horizontalM,
      verticalM,
      inside: within && verticalM === 0,
      approx: floor.approx || ceiling.approx,
    });
  }
  return near.sort(
    (a, b) =>
      a.horizontalM - b.horizontalM ||
      (a.verticalM ?? Number.POSITIVE_INFINITY) -
        (b.verticalM ?? Number.POSITIVE_INFINITY),
  );
}

export type AlertThresholds = { horizontalM: number; verticalM: number };

/**
 * The volume to warn the pilot about: the nearest within both thresholds.
 * A volume whose height is not known warns on the horizontal alone: better
 * a warning too many than one missing.
 */
export function alertOf(
  near: readonly Near[],
  thresholds: AlertThresholds,
): Near | null {
  return (
    near.find(
      (one) =>
        one.horizontalM <= thresholds.horizontalM &&
        (one.verticalM === null || one.verticalM <= thresholds.verticalM),
    ) ?? null
  );
}

/** Volumes stand at most this high on the map, metres. */
export const VOLUME_TOP_M = 8_000;

/** Classes drawn as a danger: prohibited, restricted, danger areas. */
export const DANGER_CLASSES = ["P", "R", "Q"];

/**
 * A volume's floor and top on the flight map, metres over the ground under
 * the pilot (the map lays volumes on its hills): from its limits and that
 * ground. Null when the ground is not known: the map then draws only its
 * outline. Near the pilot, where it matters, this is right; far off, where
 * the hills are higher or lower, it is only a picture.
 */
export function volumeOf(
  airspace: Airspace,
  groundM: number | null,
): { base: number; top: number } | null {
  if (groundM === null) {
    return null;
  }
  const floor = heightOf(airspace.floor, groundM).metres;
  const ceiling = heightOf(airspace.ceiling, groundM).metres;
  if (floor === null || ceiling === null) {
    return null;
  }
  const base = Math.max(0, Math.min(VOLUME_TOP_M, floor - groundM));
  const top = Math.max(base, Math.min(VOLUME_TOP_M, ceiling - groundM));
  return { base: Math.round(base), top: Math.round(top) };
}

/** The volumes near the pilot as the map draws them. */
export function airspaceFeatures(
  near: readonly Near[],
  groundM: number | null,
): {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { base: number; top: number; flat: boolean; danger: boolean };
    geometry: { type: "Polygon"; coordinates: [number, number][][] };
  }[];
} {
  return {
    type: "FeatureCollection",
    features: near.map(({ airspace }) => {
      const volume = volumeOf(airspace, groundM);
      const ring = airspace.points.map(([lat, lon]) => [lon, lat] as [number, number]);
      ring.push(ring[0]);
      return {
        type: "Feature",
        properties: {
          base: volume?.base ?? 0,
          top: volume?.top ?? 0,
          flat: volume === null,
          danger: DANGER_CLASSES.includes(airspace.class),
        },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
    }),
  };
}
