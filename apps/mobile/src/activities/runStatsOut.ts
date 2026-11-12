import type { RunActivity, SkiPartRequest } from "@shaperoute/shared-types";

import { flightNow, isFlight, topSpeedMps } from "../air/flight";
import { type FlightPart, flightParts, flightSplit } from "../air/flightParts";
import { airTopSpeedMps, flightKcal } from "../air/flightSplit";
import { phaseMarksOf } from "../air/phaseMarks";
import type { AccountOutcome } from "../api/accounts";
import type { ActivityPause, ActivityRequest } from "../api/activities";
import {
  type ElevationPoint,
  type FlightPartSent,
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
/** The bounds of a flight's figures, as the API takes them (TASK-305 part
 * R5a, run_stats.py). */
export const MIN_FLIGHT_ALT_M = -1_000;
export const MAX_FLIGHT_ALT_M = 10_000;
export const MAX_FLIGHT_MPS = 100;

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
  // A race on foot and in the air (TASK-305 part R6b): its parts, and its
  // calories counted part by part.
  const raced = isFlight(counted.activity) ? racedParts(request, counted.metres) : null;
  const kcal =
    raced === null
      ? runKcal(request, counted, body, year)
      : flightKcal(raced, body, year);
  // A day of skiing's lifts and descents (TASK-429 part B2, ADR-0357): what
  // the post of a saved day and the season are made of on the server.
  const parts =
    counted.activity === "skiing" ? skiPartsOf(request, counted.metres) : [];
  // A flight's highest point and top speed (TASK-305 part R5a): what its
  // bests are made of on the server.
  const flight = isFlight(counted.activity)
    ? flightFiguresOf(request, counted.metres)
    : {};
  const flown = Object.keys(flight).length > 0;
  if (elevation === null && kcal === null && parts.length === 0 && !flown) {
    return null;
  }
  return {
    elevation,
    cadence_spm: null,
    kcal,
    ...(parts.length > 0 ? { ski_parts: parts } : {}),
    ...flight,
    ...(raced === null ? {} : { flight_parts: raced.map(sentPart) }),
  };
}

/**
 * A flight's parts on foot and in the air, with the pilot's touches; null
 * for a flight alone, or one only on foot: then it is sent as before.
 */
export function racedParts(
  request: ActivityRequest,
  metres: number,
): FlightPart[] | null {
  const first = request.track[0]?.time_ms;
  if (first === undefined) {
    return null;
  }
  const parts = flightParts(trackOf(request, metres), phaseMarksOf(first));
  return flightSplit(parts) === null ? null : parts;
}

/** A part as the API takes it (TASK-305 part R6a): its times in whole
 * milliseconds, as the API wants them; the phone's fixes have fractions. */
function sentPart(part: FlightPart): FlightPartSent {
  const start = Math.round(part.startMs);
  const end = Math.max(start, Math.round(part.endMs));
  const lasts = (end - start) / 1000;
  return {
    kind: part.kind,
    start_ms: start,
    end_ms: end,
    moving_s: Math.min(tenth(part.movingMs / 1000), lasts),
    metres: tenth(part.metres),
    climb_m: Math.round(part.climbM ?? 0),
    max_alt_m:
      part.maxAltM === null
        ? null
        : Math.round(
            Math.min(MAX_FLIGHT_ALT_M, Math.max(MIN_FLIGHT_ALT_M, part.maxAltM)),
          ),
  };
}

/**
 * A flight's highest point (to the metre) and top speed over the ground (to
 * the hundredth), read from the fixes sent as at the end of the flight,
 * within the API's bounds; each left out when the fixes do not give it.
 */
export function flightFiguresOf(
  request: ActivityRequest,
  metres: number,
): Pick<RunStatsRequest, "max_alt_m" | "top_speed_mps"> {
  const track = trackOf(request, metres);
  const last = track.fixes[track.fixes.length - 1];
  if (last === undefined) {
    return {};
  }
  const highest = flightNow(track, last.timeMs).maxAltM;
  // A race's top speed is its parts in the air alone (TASK-305 part R6b).
  const raced = racedParts(request, metres);
  const top = raced === null ? topSpeedMps(track) : airTopSpeedMps(track, raced);
  return {
    ...(highest === null
      ? {}
      : {
          max_alt_m: Math.round(
            Math.min(MAX_FLIGHT_ALT_M, Math.max(MIN_FLIGHT_ALT_M, highest)),
          ),
        }),
    ...(top === null || top <= 0
      ? {}
      : { top_speed_mps: Math.round(Math.min(MAX_FLIGHT_MPS, top) * 100) / 100 }),
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
 * calories must not be lost with them. The same for a flight's figures
 * (TASK-305 part R5b) and an API before part R5a.
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
  const newer =
    request.ski_parts !== undefined ||
    request.max_alt_m !== undefined ||
    request.top_speed_mps !== undefined ||
    request.flight_parts !== undefined;
  if (outcome.kind === "api_error" && outcome.code === "invalid_request" && newer) {
    const {
      ski_parts: _parts,
      max_alt_m: _highest,
      top_speed_mps: _top,
      flight_parts: _raced,
      ...without
    } = request;
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
