/**
 * The messages between the phone and the Apple Watch (TASK-370 part A1,
 * ADR-0314), as WatchConnectivity carries them: an object of JSON values.
 * The watch reads and writes the same ones in Swift
 * (targets/watch/Core/Sources/WatchCore/WatchMessage.swift), and both are
 * tested on targets/watch/Core/Fixtures/messages.json. Pure: no native code.
 *
 * Every message says its version `v`. A side reads the versions up to its
 * own and refuses a newer one, since the watch app is not updated by an
 * OTA; a later version only adds fields, and the ones a side does not know
 * are left out. Times are milliseconds since 1970, distances metres.
 * A message of a type a side does not know is left out too (`unknownType`):
 * so «route» and «routes» (part B3a) came without a new version.
 */

import { decodeWatchRoute, type WatchRoute } from "./watchRoute";

export const WATCH_PROTOCOL_VERSION = 1;

/** Where a workout is, in the order it goes through them: the phases of the
 * watch's state machine (targets/watch/Core/Fixtures/transitions.json). */
export const WATCH_PHASES = [
  "ready",
  "countdown",
  "running",
  "paused",
  "finished",
] as const;
export type WatchPhase = (typeof WATCH_PHASES)[number];

/** What either side asks of the workout. */
export const WATCH_COMMANDS = ["start", "pause", "resume", "end"] as const;
export type WatchCommand = (typeof WATCH_COMMANDS)[number];

export type WatchSide = "phone" | "watch";

/** The units the phone shows distances in (TASK-182): the watch writes its
 * numbers in them too (TASK-370 part A3). */
export const WATCH_UNITS = ["km", "mi"] as const;
export type WatchUnits = (typeof WATCH_UNITS)[number];

export type WatchMessage =
  /** A start says the sport: an activity of the app, which a watch older
   * than the phone may not know. */
  | { type: "command"; command: "start"; activity: string; from: WatchSide; at: number }
  | {
      type: "command";
      command: Exclude<WatchCommand, "start">;
      from: WatchSide;
      at: number;
    }
  /** Where the workout of `from` is, sent at each change and now and then. */
  | {
      type: "state";
      phase: WatchPhase;
      activity: string;
      from: WatchSide;
      at: number;
      movingMs: number;
      distanceM: number;
    }
  /** The heart rate the watch measures, beats per minute. */
  | { type: "heartRate"; bpm: number; at: number }
  /** What the runner chose on the phone, for the watch to keep (part A3):
   * sent with transferUserInfo, so it arrives also later. From part B5 the
   * heart rate zones too, when the phone has them: the six limits, from the
   * bottom of zone 1 to the max heart rate. */
  | { type: "settings"; units: WatchUnits; heartZones?: number[]; at: number }
  /** A route for the watch to follow on its own (part B3a): one sent with
   * «Send to watch», or a favorite. Sent with transferUserInfo. */
  | { type: "route"; route: WatchRoute; favorite: boolean; at: number }
  /** The keys of all the favorites: the watch keeps those, and lets go of
   * a favorite no longer among them. */
  | { type: "routes"; favorites: string[]; at: number };

/** Why a message was not read: the same codes as the watch's. */
export type WatchMessageError =
  "notAnObject" | "unsupportedVersion" | "unknownType" | "invalidField";

export type WatchRead =
  { ok: true; message: WatchMessage } | { ok: false; error: WatchMessageError };

type Fields = Record<string, unknown>;

/** Thrown inside decodeWatchMessage only, for a field that is not right. */
class InvalidField extends Error {}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function time(value: unknown): number {
  if (!isInteger(value) || value < 0) {
    throw new InvalidField();
  }
  return value;
}

function side(value: unknown): WatchSide {
  if (value !== "phone" && value !== "watch") {
    throw new InvalidField();
  }
  return value;
}

function activity(value: unknown): string {
  if (typeof value !== "string" || value === "") {
    throw new InvalidField();
  }
  return value;
}

function oneOf<T extends string>(names: readonly T[], value: unknown): T {
  const found = names.find((name) => name === value);
  if (found === undefined) {
    throw new InvalidField();
  }
  return found;
}

/** The zones of a settings message (part B5): as many limits as the
 * phone's, whole beats in HEART_ZONE_BPM, each over the one before. */
export const HEART_ZONE_LIMITS = 6;
export const HEART_ZONE_BPM = { min: 30, max: 300 } as const;

function heartZones(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length !== HEART_ZONE_LIMITS ||
    value.some(
      (bpm, i) =>
        !isInteger(bpm) ||
        bpm < HEART_ZONE_BPM.min ||
        bpm > HEART_ZONE_BPM.max ||
        (i > 0 && bpm <= value[i - 1]),
    )
  ) {
    throw new InvalidField();
  }
  return value as number[];
}

function read(fields: Fields): WatchMessage | "unknownType" {
  switch (fields.type) {
    case "command": {
      const from = side(fields.from);
      const at = time(fields.at);
      const command = oneOf(WATCH_COMMANDS, fields.command);
      if (command === "start") {
        return {
          type: "command",
          command,
          activity: activity(fields.activity),
          from,
          at,
        };
      }
      return { type: "command", command, from, at };
    }
    case "state": {
      const phase = oneOf(WATCH_PHASES, fields.phase);
      const { movingMs, distanceM } = fields;
      if (!isInteger(movingMs) || movingMs < 0) {
        throw new InvalidField();
      }
      if (
        typeof distanceM !== "number" ||
        !Number.isFinite(distanceM) ||
        distanceM < 0
      ) {
        throw new InvalidField();
      }
      return {
        type: "state",
        phase,
        activity: activity(fields.activity),
        from: side(fields.from),
        at: time(fields.at),
        movingMs,
        distanceM,
      };
    }
    case "heartRate": {
      const { bpm } = fields;
      if (!isInteger(bpm) || bpm <= 0 || bpm > 300) {
        throw new InvalidField();
      }
      return { type: "heartRate", bpm, at: time(fields.at) };
    }
    case "settings": {
      const units = oneOf(WATCH_UNITS, fields.units);
      const at = time(fields.at);
      if (fields.heartZones === undefined) {
        return { type: "settings", units, at };
      }
      return { type: "settings", units, heartZones: heartZones(fields.heartZones), at };
    }
    case "route": {
      const route = decodeWatchRoute(fields.route);
      if (route === null || typeof fields.favorite !== "boolean") {
        throw new InvalidField();
      }
      return { type: "route", route, favorite: fields.favorite, at: time(fields.at) };
    }
    case "routes": {
      const { favorites } = fields;
      if (
        !Array.isArray(favorites) ||
        favorites.some((key) => typeof key !== "string" || key === "")
      ) {
        throw new InvalidField();
      }
      return { type: "routes", favorites: favorites as string[], at: time(fields.at) };
    }
    default:
      if (typeof fields.type !== "string") {
        throw new InvalidField();
      }
      return "unknownType";
  }
}

/** The message in `value`, as WatchConnectivity or JSON.parse gives it. */
export function decodeWatchMessage(value: unknown): WatchRead {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "notAnObject" };
  }
  const fields = value as Fields;
  const version = fields.v;
  if (!isInteger(version) || version < 1) {
    return { ok: false, error: "invalidField" };
  }
  if (version > WATCH_PROTOCOL_VERSION) {
    return { ok: false, error: "unsupportedVersion" };
  }
  try {
    const message = read(fields);
    return message === "unknownType"
      ? { ok: false, error: message }
      : { ok: true, message };
  } catch (error) {
    if (error instanceof InvalidField) {
      return { ok: false, error: "invalidField" };
    }
    throw error;
  }
}

/** `message` as an object of JSON values, for WatchConnectivity. */
export function encodeWatchMessage(message: WatchMessage): Record<string, unknown> {
  return { v: WATCH_PROTOCOL_VERSION, ...message };
}
