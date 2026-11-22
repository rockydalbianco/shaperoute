import {
  GYM_HISTORY_MEASURES,
  GYM_HISTORY_RECORDS,
  GYM_SET_KINDS,
  GYM_SOURCES,
  type GymHistory,
  type GymHistoryPoint,
  type GymHistoryRecord,
  type GymHistoryWorkout,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isGymSet } from "./gym";

/**
 * The history of one exercise at the gym (TASK-483 part B, ADR-0392,
 * docs/API.md «Gym»): only the account's own sets, one point a workout for
 * the chart, the records, the workouts a page at a time, the newest first.
 * The body is packages/shared-types/fixtures/gym-history.json. An API
 * without it answers 404: «Last time» and «History» then stay away.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isMoment(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPoint(body: unknown): body is GymHistoryPoint {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { workout, started_at, value, estimated, record } = body as Record<
    string,
    unknown
  >;
  return (
    typeof workout === "string" &&
    isMoment(started_at) &&
    isAmount(value) &&
    typeof estimated === "boolean" &&
    typeof record === "boolean"
  );
}

function isRecord(body: unknown): body is GymHistoryRecord {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { kind, value, workout, started_at, set } = body as Record<string, unknown>;
  return (
    (GYM_HISTORY_RECORDS as readonly unknown[]).includes(kind) &&
    isAmount(value) &&
    typeof workout === "string" &&
    isMoment(started_at) &&
    (set === undefined || isGymSet(set))
  );
}

function isWorkout(body: unknown): body is GymHistoryWorkout {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { id, started_at, source, value, sets } = body as Record<string, unknown>;
  return (
    typeof id === "string" &&
    isMoment(started_at) &&
    (GYM_SOURCES as readonly unknown[]).includes(source) &&
    (value === undefined || isAmount(value)) &&
    Array.isArray(sets) &&
    sets.every(isGymSet)
  );
}

export function isGymHistory(body: unknown): body is GymHistory {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const h = body as Record<string, unknown>;
  return (
    (h.exercise === undefined || typeof h.exercise === "string") &&
    (h.name === undefined || typeof h.name === "string") &&
    (h.kind === undefined || (GYM_SET_KINDS as readonly unknown[]).includes(h.kind)) &&
    (h.measure === undefined ||
      (GYM_HISTORY_MEASURES as readonly unknown[]).includes(h.measure)) &&
    typeof h.workouts_count === "number" &&
    Number.isInteger(h.workouts_count) &&
    Array.isArray(h.points) &&
    h.points.every(isPoint) &&
    Array.isArray(h.records) &&
    h.records.every(isRecord) &&
    Array.isArray(h.workouts) &&
    h.workouts.every(isWorkout) &&
    (h.next === undefined || typeof h.next === "string")
  );
}

/** What the history is asked for: an exercise of the catalog, or a name. */
export type HistoryOf = { exercise: string } | { name: string };

/** GET /me/gym-history: the first page, or the one after `before`. */
export function fetchGymHistory(
  baseUrl: string,
  token: string,
  of: HistoryOf,
  before: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<GymHistory>> {
  const query = new URLSearchParams(
    "exercise" in of ? { exercise: of.exercise } : { name: of.name },
  );
  if (before !== null) {
    query.set("before", before);
  }
  return ask(
    baseUrl,
    `/me/gym-history?${query.toString()}`,
    { method: "GET", token },
    isGymHistory,
    options,
  );
}
