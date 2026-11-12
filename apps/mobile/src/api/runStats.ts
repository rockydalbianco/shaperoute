import type {
  DrawingDetail,
  SkiDescents,
  SkiPart,
  SkiPartRequest,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The figures of a run for the page of its post (TASK-410 part C, ADR-0340,
 * docs/API.md «Run stats»): the splits the API counts from the track, what
 * the phone sends at the end of the activity, and the heart rate. The API
 * gives them in GET /drawings/{id} already filtered: the heart rate and the
 * calories of another's post only when its author shows them.
 */

/** One kilometre (or mile) of the run. */
export type RunSplit = {
  /** Which one: 1, 2, … */
  n: number;
  /** Its moving time, pauses left out, to the tenth of a second. */
  seconds: number;
  /** For the part after the last whole one only: its metres. */
  partial_m?: number | null;
};

/** A point of the profile: how far along the run, how high. */
export type ElevationPoint = { distance_m: number; altitude_m: number };

/** packages/shared-types/fixtures/run-stats.json: each field null when the
 * run has none, or when the one who asks may not see it. */
export type RunStats = {
  splits_km: RunSplit[] | null;
  splits_mile: RunSplit[] | null;
  elevation: ElevationPoint[] | null;
  cadence_spm: number | null;
  kcal: number | null;
  heart: { avg_bpm: number; max_bpm: number } | null;
  /** A day of skiing's lifts and descents (TASK-424 part C2b): absent from
   * an API before it. */
  ski_parts?: SkiPart[] | null;
  /** Their descents together, what the day's calories are counted on. */
  ski_descents?: SkiDescents | null;
};

/** PUT /me/activities/{key}/stats: packages/shared-types/fixtures/
 * run-stats-request.json. The whole of it each time: a field null is none. */
export type RunStatsRequest = {
  elevation: ElevationPoint[] | null;
  cadence_spm: number | null;
  kcal: number | null;
  /**
   * A day of skiing's lifts and descents (TASK-424 part C2b, sent by
   * TASK-429's app). Only to a server with part C2b: one before it refuses
   * the whole body (422). Left out, none.
   */
  ski_parts?: SkiPartRequest[];
  /**
   * A flight's highest point from the GPS and its top speed over the ground
   * (TASK-305 part R5a): what its bests are made of. Only to a server with
   * part R5a, which keeps them for a flight alone; one before it refuses
   * the whole body (422). Left out, none.
   */
  max_alt_m?: number;
  top_speed_mps?: number;
};

/** As many points as the page draws (run_stats.py MAX_ELEVATION_POINTS). */
export const MAX_ELEVATION_POINTS = 120;

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): boolean {
  return value === null || value === undefined || isNumber(value);
}

function isListOrNull<T>(value: unknown, item: (one: unknown) => one is T): boolean {
  return (
    value === null || value === undefined || (Array.isArray(value) && value.every(item))
  );
}

function isSplit(value: unknown): value is RunSplit {
  return (
    isRecord(value) &&
    isNumber(value.n) &&
    isNumber(value.seconds) &&
    isNumberOrNull(value.partial_m)
  );
}

function isElevationPoint(value: unknown): value is ElevationPoint {
  return isRecord(value) && isNumber(value.distance_m) && isNumber(value.altitude_m);
}

function isSkiPart(value: unknown): value is SkiPart {
  return (
    isRecord(value) &&
    (value.kind === "lift" || value.kind === "descent") &&
    isNumber(value.n) &&
    isNumber(value.start_s) &&
    isNumber(value.end_s) &&
    isNumber(value.moving_s) &&
    isNumber(value.metres) &&
    isNumber(value.height_m) &&
    isNumberOrNull(value.top_mps)
  );
}

/** The descents of a day of skiing, as a post or its figures give them;
 * null or missing for none (TASK-424 part C2b). */
export function isSkiDescents(value: unknown): value is SkiDescents {
  return isRecord(value) && isNumber(value.metres) && isNumber(value.moving_s);
}

/** A body of the API's figures; a field missing counts as null, so an API
 * that adds one later is still read. */
export function isRunStats(body: unknown): body is RunStats {
  if (!isRecord(body)) {
    return false;
  }
  const heart = body.heart;
  return (
    isListOrNull(body.splits_km, isSplit) &&
    isListOrNull(body.splits_mile, isSplit) &&
    isListOrNull(body.elevation, isElevationPoint) &&
    isNumberOrNull(body.cadence_spm) &&
    isNumberOrNull(body.kcal) &&
    isListOrNull(body.ski_parts, isSkiPart) &&
    (body.ski_descents === null ||
      body.ski_descents === undefined ||
      isSkiDescents(body.ski_descents)) &&
    (heart === null ||
      heart === undefined ||
      (isRecord(heart) && isNumber(heart.avg_bpm) && isNumber(heart.max_bpm)))
  );
}

/** The figures of a post from GET /drawings/{id}, every field there; null
 * for a run without any, an API before TASK-410 C, or a body not read. */
export function statsOf(detail: DrawingDetail): RunStats | null {
  const stats: unknown = (detail as DrawingDetail & { stats?: unknown }).stats;
  if (!isRunStats(stats)) {
    return null;
  }
  return {
    splits_km: stats.splits_km ?? null,
    splits_mile: stats.splits_mile ?? null,
    elevation: stats.elevation ?? null,
    cadence_spm: stats.cadence_spm ?? null,
    kcal: stats.kcal ?? null,
    heart: stats.heart ?? null,
    ski_parts: stats.ski_parts ?? null,
    ski_descents: stats.ski_descents ?? null,
  };
}

/** PUT /me/activities/{key}/stats: what the phone knows at the end of the
 * activity; the figures back as their owner sees them. */
export function saveRunStats(
  baseUrl: string,
  token: string,
  key: string,
  request: RunStatsRequest,
  options: Options = {},
): Promise<AccountOutcome<RunStats>> {
  return ask(
    baseUrl,
    `/me/activities/${encodeURIComponent(key)}/stats`,
    { method: "PUT", body: request, token },
    isRunStats,
    options,
  );
}
