import type { LatLon, Walk } from "@shaperoute/shared-types";

import { walksOf } from "../route/walks";

/**
 * A workout of the Apple Watch, finished, as it comes to the phone in a
 * file (TASK-370 part B3c, ADR-0314; the user's choice «Avviso e scheda»):
 * the phone opens it as a run of its own, with «Save» and the form of
 * always. The watch writes the same fields (WatchCore/WatchTrack.swift),
 * both tested on targets/watch/Core/Fixtures/tracks.json. A fix is
 * `[lat, lon, timeMs, accuracyM, altitudeM]`. Pure: no native code.
 */

/** The version of the file: a newer one is refused, as the watch's. */
export const WATCH_TRACK_VERSION = 1;

/** At most this many fixes: the most a run's PUT takes (importFile.ts). */
export const MAX_WATCH_FIXES = 20_000;

export type WatchTrackFix = {
  point: LatLon;
  timeMs: number;
  accuracyM: number | null;
  altitudeM: number | null;
};

/** The route the workout followed, as the phone needs it to score it. */
export type WatchTrackRoute = {
  key: string;
  title: string;
  points: LatLon[];
  walks: Walk[];
  word: string | null;
  similarity: number | null;
};

export type WatchTrack = {
  activity: string;
  startedAtMs: number;
  endedAtMs: number;
  /** "arrived": the end of the route was reached; "stopped": ended. */
  status: "stopped" | "arrived";
  route: WatchTrackRoute | null;
  fixes: WatchTrackFix[];
  pauses: { fromMs: number; toMs: number }[];
  distanceM: number;
  movingMs: number;
  kcal: number | null;
  heartAvgBpm: number | null;
};

/** Why a file was not read: the watch's codes. */
export type WatchTrackError = "notAnObject" | "unsupportedVersion" | "invalidField";

export type WatchTrackRead =
  { ok: true; track: WatchTrack } | { ok: false; error: WatchTrackError };

type Fields = Record<string, unknown>;

/** Thrown inside decodeWatchTrack only, for a field that is not right. */
class InvalidField extends Error {}

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isReal(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function integer(value: unknown, least = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < least) {
    throw new InvalidField();
  }
  return value;
}

function real(value: unknown, least = -Infinity): number {
  if (!isReal(value) || value < least) {
    throw new InvalidField();
  }
  return value;
}

function optionalReal(value: unknown): number | null {
  return value === null || value === undefined ? null : real(value);
}

function pointOf(value: unknown): LatLon {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new InvalidField();
  }
  const lat = real(value[0]);
  const lon = real(value[1]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new InvalidField();
  }
  return [lat, lon];
}

function routeOf(value: unknown): WatchTrackRoute | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isFields(value)) {
    throw new InvalidField();
  }
  const { key, title, word } = value;
  if (
    typeof key !== "string" ||
    key === "" ||
    typeof title !== "string" ||
    (word !== null && word !== undefined && typeof word !== "string") ||
    !Array.isArray(value.points) ||
    !Array.isArray(value.walks)
  ) {
    throw new InvalidField();
  }
  const points = (value.points as unknown[]).map(pointOf);
  if (points.length < 2) {
    throw new InvalidField();
  }
  const walks = value.walks as Walk[];
  const fit = walksOf(points, walks);
  if (fit.length !== walks.length) {
    throw new InvalidField();
  }
  return {
    key,
    title,
    points,
    walks: [...fit],
    word: typeof word === "string" ? word : null,
    similarity: optionalReal(value.similarity),
  };
}

function fixesOf(values: unknown[]): WatchTrackFix[] {
  let last = -1;
  return values.map((value) => {
    if (!Array.isArray(value) || value.length !== 5) {
      throw new InvalidField();
    }
    const point = pointOf([value[0], value[1]]);
    const timeMs = integer(value[2]);
    if (timeMs <= last) {
      throw new InvalidField();
    }
    last = timeMs;
    return {
      point,
      timeMs,
      accuracyM: optionalReal(value[3]),
      altitudeM: optionalReal(value[4]),
    };
  });
}

function read(fields: Fields): WatchTrack {
  const { activity, status } = fields;
  if (typeof activity !== "string" || activity === "") {
    throw new InvalidField();
  }
  if (status !== "stopped" && status !== "arrived") {
    throw new InvalidField();
  }
  const startedAtMs = integer(fields.startedAtMs);
  const endedAtMs = integer(fields.endedAtMs, startedAtMs);
  if (
    !Array.isArray(fields.fixes) ||
    fields.fixes.length > MAX_WATCH_FIXES ||
    !Array.isArray(fields.pauses)
  ) {
    throw new InvalidField();
  }
  const pauses = (fields.pauses as unknown[]).map((pause) => {
    if (!isFields(pause)) {
      throw new InvalidField();
    }
    const fromMs = integer(pause.fromMs);
    return { fromMs, toMs: integer(pause.toMs, fromMs) };
  });
  const heart = fields.heartAvgBpm;
  return {
    activity,
    startedAtMs,
    endedAtMs,
    status,
    route: routeOf(fields.route),
    fixes: fixesOf(fields.fixes as unknown[]),
    pauses,
    distanceM: real(fields.distanceM, 0),
    movingMs: integer(fields.movingMs),
    kcal: optionalReal(fields.kcal),
    heartAvgBpm: heart === null || heart === undefined ? null : integer(heart),
  };
}

/** The track in `value`, as JSON.parse gives the watch's file. */
export function decodeWatchTrack(value: unknown): WatchTrackRead {
  if (!isFields(value)) {
    return { ok: false, error: "notAnObject" };
  }
  const version = value.v;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) {
    return { ok: false, error: "invalidField" };
  }
  if (version > WATCH_TRACK_VERSION) {
    return { ok: false, error: "unsupportedVersion" };
  }
  try {
    return { ok: true, track: read(value) };
  } catch (error) {
    if (error instanceof InvalidField) {
      return { ok: false, error: "invalidField" };
    }
    throw error;
  }
}
