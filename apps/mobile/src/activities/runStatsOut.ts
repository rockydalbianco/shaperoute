import {
  ACTIVITIES,
  type Activity as Sport,
  type RunActivity,
} from "@shaperoute/shared-types";

import type { ActivityPause, ActivityRequest } from "../api/activities";
import {
  type ElevationPoint,
  MAX_ELEVATION_POINTS,
  type RunStatsRequest,
} from "../api/runStats";
import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { metresBetween } from "../map/coordinates";

/**
 * What the phone sends at the end of an activity for the page of its post
 * (TASK-410 part C, ADR-0340): the elevation profile from the heights of
 * its fixes, reduced to MAX_ELEVATION_POINTS; the calories counted with the
 * body of its owner, which never leaves the phone (only the number goes);
 * no cadence yet, since no recording gives one. Null when there is nothing
 * to send.
 */
export function runStatsRequest(
  request: ActivityRequest,
  counted: { activity: RunActivity | null; metres: number; seconds: number },
  body: BodyProfile,
  year: number,
): RunStatsRequest | null {
  const elevation = elevationProfile(request);
  const kcal = runKcal(counted, body, year);
  if (elevation === null && kcal === null) {
    return null;
  }
  return { elevation, cadence_spm: null, kcal };
}

/** A pause the runner asked for between two fixes: the step across it is
 * no part of the run, as the API counts its metres (activities.py). */
function stoppedBetween(
  pauses: ActivityPause[],
  fromMs: number,
  toMs: number,
): boolean {
  return pauses.some((p) => !p.auto && fromMs <= p.from_ms && p.from_ms < toMs);
}

/**
 * The heights of the fixes along the run, each at the metres run to it; at
 * most MAX_ELEVATION_POINTS, at even steps of distance, each height the one
 * of the line between the two fixes around it. Null with fewer than two
 * heights, or a run that went nowhere.
 */
export function elevationProfile(request: ActivityRequest): ElevationPoint[] | null {
  const found: ElevationPoint[] = [];
  let metres = 0;
  request.track.forEach((fix, i) => {
    if (i > 0) {
      const before = request.track[i - 1];
      if (!stoppedBetween(request.pauses, before.time_ms, fix.time_ms)) {
        metres += metresBetween(before.point, fix.point);
      }
    }
    const height = fix.altitude_m;
    if (height !== undefined && Number.isFinite(height)) {
      found.push({ distance_m: metres, altitude_m: height });
    }
  });
  if (found.length < 2 || !(found[found.length - 1].distance_m > found[0].distance_m)) {
    return null;
  }
  const kept =
    found.length <= MAX_ELEVATION_POINTS ? found : evenly(found, MAX_ELEVATION_POINTS);
  return kept.map((p) => ({
    distance_m: Math.round(p.distance_m),
    altitude_m: Math.round(p.altitude_m * 10) / 10,
  }));
}

/** `count` points of `line` at even steps from its first to its last. */
function evenly(line: ElevationPoint[], count: number): ElevationPoint[] {
  const first = line[0].distance_m;
  const length = line[line.length - 1].distance_m - first;
  const points: ElevationPoint[] = [];
  let j = 0;
  for (let i = 0; i < count; i += 1) {
    const at = first + (length * i) / (count - 1);
    while (j < line.length - 2 && line[j + 1].distance_m < at) {
      j += 1;
    }
    const a = line[j];
    const b = line[j + 1];
    const span = b.distance_m - a.distance_m;
    const share = span > 0 ? Math.min(1, Math.max(0, (at - a.distance_m) / span)) : 0;
    points.push({
      distance_m: at,
      altitude_m: a.altitude_m + share * (b.altitude_m - a.altitude_m),
    });
  }
  return points;
}

/** The calories as the post of one's own shows them (feed/postEnergy.ts):
 * none on the snow, at the gym, or for a sport without a formula. */
function runKcal(
  counted: { activity: RunActivity | null; metres: number; seconds: number },
  body: BodyProfile,
  year: number,
): number | null {
  const activity = counted.activity ?? "running";
  if (!(ACTIVITIES as readonly string[]).includes(activity) || counted.metres <= 0) {
    return null;
  }
  const energy = activeKcal(
    {
      activity: activity as Sport,
      metres: counted.metres,
      seconds: counted.seconds > 0 ? counted.seconds : null,
      climbM: null,
    },
    body,
    year,
  );
  return energy > 0 ? Math.round(energy) : null;
}
