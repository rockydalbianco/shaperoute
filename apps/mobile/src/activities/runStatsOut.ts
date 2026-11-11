import type { RunActivity, SkiPartRequest } from "@shaperoute/shared-types";

import type { AccountOutcome } from "../api/accounts";
import type { ActivityPause, ActivityRequest } from "../api/activities";
import {
  type ElevationPoint,
  MAX_ELEVATION_POINTS,
  type RunStats,
  type RunStatsRequest,
  saveRunStats,
} from "../api/runStats";
import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { metresBetween } from "../map/coordinates";
import type { Track } from "../navigation/trackRecorder";
import { findProfile } from "../sports";
import { snowParts } from "./snowDay";
import { trackEffort } from "./trackEffort";

/** The most parts a day sends (as the API keeps them, TASK-424 part C2b). */
export const MAX_SKI_PARTS = 500;

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
  const kcal = runKcal(request, counted, body, year);
  // A day of skiing's lifts and descents (TASK-429 part B2, ADR-0357): what
  // the post of a saved day and the season are made of on the server.
  const parts =
    counted.activity === "skiing" ? skiPartsOf(request, counted.metres) : [];
  if (elevation === null && kcal === null && parts.length === 0) {
    return null;
  }
  return {
    elevation,
    cadence_spm: null,
    kcal,
    ...(parts.length > 0 ? { ski_parts: parts } : {}),
  };
}

/** Rounded to a tenth. */
const tenth = (value: number) => Math.round(value * 10) / 10;

/**
 * The lifts and descents of a day of skiing as the API takes them
 * (`ski_parts`, TASK-424 part C2b): read from the fixes sent, as at the end
 * of the day (snowParts), on the clock of their `time_ms`. None without
 * heights.
 */
export function skiPartsOf(request: ActivityRequest, metres: number): SkiPartRequest[] {
  const parts = snowParts(trackOf(request, metres)) ?? [];
  return parts.slice(0, MAX_SKI_PARTS).map((part) => {
    const lasts = Math.max(0, part.endMs - part.startMs) / 1000;
    return {
      kind: part.kind,
      n: part.n,
      start_ms: part.startMs,
      end_ms: Math.max(part.startMs, part.endMs),
      moving_s: Math.min(tenth(part.ms / 1000), lasts),
      metres: tenth(part.metres),
      height_m: tenth(part.heightM),
      top_mps: part.kind === "lift" || part.topMps === null ? null : tenth(part.topMps),
    };
  });
}

/**
 * PUT /me/activities/{key}/stats with the day's parts, and once more without
 * them when the API refuses the request (TASK-429 part B2): an API before
 * TASK-424 part C2b answers 422 to `ski_parts`, and the profile and the
 * calories must not be lost with them.
 */
export async function sendRunStats(
  baseUrl: string,
  token: string,
  key: string,
  request: RunStatsRequest,
  options: { fetchFn?: typeof fetch; key?: string | null } = {},
  save: typeof saveRunStats = saveRunStats,
): Promise<AccountOutcome<RunStats>> {
  const outcome = await save(baseUrl, token, key, request, options);
  if (
    outcome.kind === "api_error" &&
    outcome.code === "invalid_request" &&
    request.ski_parts !== undefined
  ) {
    const { ski_parts: _parts, ...without } = request;
    return save(baseUrl, token, key, without, options);
  }
  return outcome;
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

/** The track of `request` as the phone recorded it: its fixes, heights
 * and the runner's own pauses. */
function trackOf(request: ActivityRequest, metres: number): Track {
  return {
    fixes: request.track.map((fix) => ({
      point: fix.point,
      timeMs: fix.time_ms,
      accuracyM: fix.accuracy_m ?? null,
      altitudeM: fix.altitude_m ?? null,
    })),
    distanceM: metres,
    pauses: request.pauses.map((pause) => ({
      fromMs: pause.from_ms,
      toMs: pause.to_ms,
      ...(pause.auto ? { auto: true as const } : {}),
    })),
  };
}

/** The calories of the post's page, each activity its own (TASK-424 part
 * C2): a day of alpine skiing on its descents, read from the fixes sent;
 * none at the gym (its sets count them) or without metres. */
function runKcal(
  request: ActivityRequest,
  counted: { activity: RunActivity | null; metres: number; seconds: number },
  body: BodyProfile,
  year: number,
): number | null {
  const activity = counted.activity ?? "running";
  // A sport newer than the app has no formula here.
  const profile = findProfile(activity);
  if (profile?.energy === undefined || counted.metres <= 0) {
    return null;
  }
  const seconds = counted.seconds > 0 ? counted.seconds : null;
  const energy = activeKcal(
    profile.skied === true
      ? trackEffort(activity, trackOf(request, counted.metres), 0, null)
      : { activity, metres: counted.metres, seconds, climbM: null },
    body,
    year,
  );
  return energy > 0 ? Math.round(energy) : null;
}
