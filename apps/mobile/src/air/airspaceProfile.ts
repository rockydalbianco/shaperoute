import type { LatLon } from "@shaperoute/shared-types";

import type { Track } from "../navigation/trackRecorder";
import { boxOf, inBox } from "./airspaceLog";
import { DANGER_CLASSES, heightOf, withinOutline } from "./airspaceNear";
import { CHART_BARS, CHART_SPAN_MS } from "./instrument";
import type { Airspace } from "./openair";

/**
 * The airspace under the altitude chart (TASK-479 part E3, ADR-0388): for
 * each bar of the last ten minutes, the volumes of the pilot's file whose
 * outline held the pilot then, from floor to ceiling. The chart draws them
 * as bands behind the bars, so the pilot sees having flown under, through
 * or over them.
 *
 * The ground is the one under the pilot now (part A1): over ten minutes a
 * limit above the ground is only near right. A limit not known (above the
 * ground, the ground unknown) leaves the band open on that side.
 */

export type ProfileBand = {
  /** Metres above the sea; -Infinity from the ground. */
  floorM: number;
  /** Metres above the sea; Infinity when unlimited. */
  ceilingM: number;
  /** Prohibited, restricted or danger: drawn in the error colour. */
  danger: boolean;
};

/** The place of the pilot at the end of each bar's slice, oldest first:
 * the last fix in it, null before the first fix. As `altitudeSeries`. */
export function placeSeries(
  track: Track,
  nowMs: number,
  spanMs: number = CHART_SPAN_MS,
  bars: number = CHART_BARS,
): (LatLon | null)[] {
  const out: (LatLon | null)[] = [];
  const from = nowMs - spanMs;
  const slice = spanMs / bars;
  const fixes = track.fixes;
  let i = 0;
  let known: LatLon | null = null;
  for (let bar = 0; bar < bars; bar += 1) {
    const end = from + slice * (bar + 1);
    while (i < fixes.length && fixes[i].timeMs <= end) {
      known = fixes[i].point;
      i += 1;
    }
    out.push(known);
  }
  return out;
}

/** The bands for each place: the volumes whose outline holds it. Only
 * the volumes whose bounds meet the places' are looked at: a country's
 * file is hundreds of volumes, and this runs once a second. */
export function profileBands(
  places: readonly (LatLon | null)[],
  airspaces: readonly Airspace[],
  groundM: number | null,
): ProfileBand[][] {
  const known = places.filter((place): place is LatLon => place !== null);
  if (known.length === 0) {
    return places.map(() => []);
  }
  const span = boxOf(known);
  const near = airspaces
    .map((airspace) => ({ airspace, box: boxOf(airspace.points) }))
    .filter(
      ({ box }) =>
        box.south <= span.north &&
        box.north >= span.south &&
        box.west <= span.east &&
        box.east >= span.west,
    );
  return places.map((place) => {
    if (place === null) {
      return [];
    }
    const bands: ProfileBand[] = [];
    for (const { airspace, box } of near) {
      if (!inBox(box, place) || !withinOutline(place, airspace.points)) {
        continue;
      }
      bands.push({
        floorM: heightOf(airspace.floor, groundM).metres ?? Number.NEGATIVE_INFINITY,
        ceilingM:
          heightOf(airspace.ceiling, groundM).metres ?? Number.POSITIVE_INFINITY,
        danger: DANGER_CLASSES.includes(airspace.class),
      });
    }
    return bands;
  });
}

/** Whether any bar has a band. */
export function hasBands(bands: readonly ProfileBand[][]): boolean {
  return bands.some((bar) => bar.length > 0);
}
