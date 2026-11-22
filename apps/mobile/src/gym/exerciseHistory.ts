import {
  type GymHistory,
  type GymHistoryMeasure,
  type GymHistoryPoint,
  type GymHistoryRecord,
  type GymHistoryRecordKind,
  type GymHistoryWorkout,
  type GymSessionRequest,
  type GymSet,
  type GymSetKind,
  MAX_ESTIMATED_REPS,
} from "@shaperoute/shared-types";

import type { HistoryOf } from "../api/gymHistory";
import { weightKgOf, weightLabel } from "../body/bodyUnits";
import { clockLabel } from "../navigation/freeRun";
import { distanceLabel } from "../units/format";
import type { Units } from "../units/units";
import { CARDIO_FIELDS, type Entry, type SetValues } from "./setKinds";

/**
 * The history of one exercise, read on the phone (TASK-483 part B,
 * ADR-0392): what the API gives (api/gymHistory.ts) with the workouts still
 * waiting on the phone (gymOutbox.ts) added in, «Last time» and the
 * suggestion to grow (the user's «Sì, questa regola», 2026-11-22), the
 * change from one workout to the one before, the chart's ranges. The sums
 * are the API's own (gym_history.py), so a workout reads the same before
 * and after it is sent.
 */

// --- The exercise ---

/** A name as the history reads it: no spaces at the ends, one space for
 * many, lower case (the user's «Sì, uniscili»; gym_history.same_name). */
export function sameName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** What the API is asked for. */
export function historyOf(entry: Entry): HistoryOf {
  return "exercise" in entry ? { exercise: entry.exercise } : { name: entry.name };
}

/** One key for an exercise's history, the same for every way its name is
 * written. */
export function historyKey(entry: Entry): string {
  return "exercise" in entry ? entry.exercise : `name:${sameName(entry.name)}`;
}

function isOf(set: GymSet, entry: Entry): boolean {
  return "exercise" in entry
    ? set.exercise === entry.exercise
    : set.name !== undefined && sameName(set.name) === sameName(entry.name);
}

// --- The API's sums ---

/** The one-rep max a set suggests (Epley); a single rep is its own kg. */
export function estimated1rm(loadKg: number, reps: number): number {
  return reps === 1 ? loadKg : loadKg * (1 + reps / 30);
}

/** What a workout's point reads, by the kind of the exercise. */
export function measureOf(
  kind: GymSetKind,
  entry: Entry,
  sets: readonly GymSet[],
): GymHistoryMeasure {
  switch (kind) {
    case "load":
      return "estimated_1rm_kg";
    case "bodyweight":
      return "reps";
    case "timed":
      return "duration_s";
    case "cardio": {
      const fields = "exercise" in entry ? CARDIO_FIELDS[entry.exercise] : undefined;
      const metres =
        fields !== undefined
          ? fields.includes("distance_m")
          : sets.some((set) => set.distance_m !== undefined);
      return metres ? "distance_m" : "duration_s";
    }
  }
}

/** A workout's value and whether it is estimated; null when no set says
 * it. */
export function bestOf(
  sets: readonly GymSet[],
  measure: GymHistoryMeasure,
): { value: number; estimated: boolean } | null {
  if (measure === "estimated_1rm_kg") {
    const loads = sets.filter((set) => set.load_kg && set.reps);
    const few = loads.filter((set) => (set.reps ?? 0) <= MAX_ESTIMATED_REPS);
    if (few.length > 0) {
      return {
        value: Math.max(
          ...few.map((set) => estimated1rm(set.load_kg ?? 0, set.reps ?? 1)),
        ),
        estimated: true,
      };
    }
    return loads.length > 0
      ? { value: Math.max(...loads.map((set) => set.load_kg ?? 0)), estimated: false }
      : null;
  }
  const known = sets.map((set) => set[measure] ?? 0).filter((value) => value > 0);
  return known.length > 0 ? { value: Math.max(...known), estimated: true } : null;
}

/** The records an exercise of `kind` has, in the API's order. */
export function recordsOf(
  kind: GymSetKind,
  measure: GymHistoryMeasure,
): readonly GymHistoryRecordKind[] {
  switch (kind) {
    case "load":
      return ["best_estimate_kg", "heaviest_kg", "most_reps", "best_volume_kg"];
    case "bodyweight":
      return ["most_reps", "heaviest_kg"];
    case "timed":
      return ["longest_s"];
    case "cardio":
      return measure === "distance_m" ? ["farthest_m", "longest_s"] : ["longest_s"];
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** What `set` gives to the record `kind`; 0 for nothing. */
function recordValue(kind: GymHistoryRecordKind, set: GymSet): number {
  switch (kind) {
    case "best_estimate_kg":
      return set.load_kg && set.reps && set.reps <= MAX_ESTIMATED_REPS
        ? estimated1rm(set.load_kg, set.reps)
        : 0;
    case "heaviest_kg":
      return set.load_kg ?? 0;
    case "most_reps":
      return set.reps ?? 0;
    case "longest_s":
      return set.duration_s ?? 0;
    case "farthest_m":
      return set.distance_m ?? 0;
    case "best_volume_kg":
      return 0;
  }
}

/** `records` with `workouts` (oldest first) offered to each: the first to
 * reach a value keeps it. */
function recordsWith(
  records: readonly GymHistoryRecord[],
  wanted: readonly GymHistoryRecordKind[],
  workouts: readonly GymHistoryWorkout[],
): GymHistoryRecord[] {
  return wanted.flatMap((kind) => {
    let best = records.find((record) => record.kind === kind);
    const offer = (value: number, workout: GymHistoryWorkout, set?: GymSet) => {
      if (value > 0 && (best === undefined || value > best.value)) {
        best = {
          kind,
          value: round2(value),
          workout: workout.id,
          started_at: workout.started_at,
          ...(set === undefined ? {} : { set }),
        };
      }
    };
    for (const workout of workouts) {
      if (kind === "best_volume_kg") {
        offer(
          workout.sets.reduce(
            (sum, set) => sum + (set.load_kg ?? 0) * (set.reps ?? 0),
            0,
          ),
          workout,
        );
      } else {
        for (const set of workout.sets) {
          offer(recordValue(kind, set), workout, set);
        }
      }
    }
    return best === undefined ? [] : [best];
  });
}

// --- The workouts still on the phone ---

/** A workout saved and not on the API yet (gymOutbox.GymWaiting). */
export type WaitingWorkout = { key: string; request: GymSessionRequest };

/**
 * `history` with the workouts of `waiting` that have the exercise and that
 * the API has not yet: their points, their records, first in the list. The
 * page the API gave and its `next` stay as they were.
 */
export function withWaiting(
  history: GymHistory,
  waiting: readonly WaitingWorkout[],
  entry: Entry,
): GymHistory {
  const known = new Set([
    ...history.points.map((point) => point.workout),
    ...history.workouts.map((workout) => workout.id),
  ]);
  const kind = history.kind ?? entry.kind;
  const own = waiting
    .filter((item) => !known.has(item.key))
    .map((item) => ({
      id: item.key,
      started_at: item.request.started_at,
      source: item.request.source ?? "muw",
      sets: (item.request.sets ?? []).filter(
        (set) => isOf(set, entry) && set.kind === kind,
      ),
    }))
    .filter((workout) => workout.sets.length > 0)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  if (own.length === 0) {
    return history;
  }
  const measure =
    history.measure ??
    measureOf(
      kind,
      entry,
      own.flatMap((w) => w.sets),
    );
  const added: GymHistoryWorkout[] = own.map((workout) => {
    const best = bestOf(workout.sets, measure);
    return best === null ? workout : { ...workout, value: round2(best.value) };
  });
  const points: GymHistoryPoint[] = [
    ...history.points,
    ...added.flatMap((workout) => {
      const best = bestOf(workout.sets, measure);
      return best === null
        ? []
        : [
            {
              workout: workout.id,
              started_at: workout.started_at,
              value: round2(best.value),
              estimated: best.estimated,
              record: false,
            },
          ];
    }),
  ].sort((a, b) => a.started_at.localeCompare(b.started_at));
  let top = -Infinity;
  const marked = points.map((point) => {
    const record = point.value > top;
    top = Math.max(top, point.value);
    return { ...point, record };
  });
  return {
    ...history,
    kind,
    measure,
    workouts_count: history.workouts_count + added.length,
    points: marked,
    records: recordsWith(history.records, recordsOf(kind, measure), added),
    workouts: [...added, ...history.workouts].sort((a, b) =>
      b.started_at.localeCompare(a.started_at),
    ),
  };
}

// --- «Last time» and the suggestion ---

/** The newest workout with sets of the exercise's kind, only those sets;
 * null for an exercise never done. */
export function lastTime(history: GymHistory): GymHistoryWorkout | null {
  const kind = history.kind;
  for (const workout of history.workouts) {
    const sets = workout.sets.filter((set) => set.kind === kind);
    if (sets.length > 0) {
      return { ...workout, sets };
    }
  }
  return null;
}

/** What the boxes of the first set hold: last time's first set. */
export function lastValues(last: GymHistoryWorkout): SetValues {
  const {
    exercise: _e,
    name: _n,
    kind: _k,
    at_s: _a,
    live: _l,
    ...values
  } = last.sets[0];
  return values;
}

/** How much a weight grows: 2.5 kg, or 5 lb for whoever weighs in lb. */
export function weightStepKg(units: Units): number {
  return units === "mi" ? weightKgOf(5, units) : 2.5;
}

/** Seconds a timed set grows by. */
export const TIMED_STEP_S = 5;

/** «Try 82.5 kg × 8» or «Try 80 kg × 8 again». */
export type Suggestion = { values: SetValues; again: boolean };

/**
 * The suggestion of the user's rule: every set of last time reached the
 * reps → a little more (+2.5 kg, +1 rep on the body, +5 s for a timed
 * set), otherwise the same again. The reps to reach are the plan's
 * (`target`), otherwise last time's first set's. A cardio block has none.
 */
export function suggestion(
  last: GymHistoryWorkout,
  kind: GymSetKind,
  target: SetValues | null,
  units: Units,
): Suggestion | null {
  const first = last.sets[0];
  if (first === undefined) {
    return null;
  }
  switch (kind) {
    case "load": {
      const reps = target?.reps ?? first.reps;
      const kg = first.load_kg;
      if (reps === undefined || kg === undefined) {
        return null;
      }
      const reached = last.sets.every((set) => (set.reps ?? 0) >= reps);
      return {
        values: { reps, load_kg: reached ? round2(kg + weightStepKg(units)) : kg },
        again: !reached,
      };
    }
    case "bodyweight": {
      const reps = target?.reps ?? first.reps;
      if (reps === undefined) {
        return null;
      }
      const reached = last.sets.every((set) => (set.reps ?? 0) >= reps);
      return {
        values: {
          reps: reached ? reps + 1 : reps,
          ...(first.load_kg === undefined ? {} : { load_kg: first.load_kg }),
        },
        again: !reached,
      };
    }
    case "timed": {
      const seconds = target?.duration_s ?? first.duration_s;
      if (seconds === undefined) {
        return null;
      }
      const reached = last.sets.every((set) => (set.duration_s ?? 0) >= seconds);
      return {
        values: { duration_s: reached ? seconds + TIMED_STEP_S : seconds },
        again: !reached,
      };
    }
    case "cardio":
      return null;
  }
}

// --- The chart and the list ---

/** How far back the chart looks. */
export const HISTORY_RANGES = ["1M", "3M", "1Y", "all"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<Exclude<HistoryRange, "all">, number> = {
  "1M": 31,
  "3M": 92,
  "1Y": 366,
};

/** The points of `range` back from `nowMs`. */
export function pointsIn(
  points: readonly GymHistoryPoint[],
  range: HistoryRange,
  nowMs: number,
): GymHistoryPoint[] {
  if (range === "all") {
    return [...points];
  }
  const from = nowMs - RANGE_DAYS[range] * DAY_MS;
  return points.filter((point) => new Date(point.started_at).getTime() >= from);
}

/** How much a workout's value moved from the workout before it; null for
 * the first, one with no value, and between an estimated max and a heaviest
 * kg (a workout of only long sets), which do not compare. */
export function changeOf(
  points: readonly GymHistoryPoint[],
  workout: string,
): number | null {
  const at = points.findIndex((point) => point.workout === workout);
  if (at <= 0 || points[at].estimated !== points[at - 1].estimated) {
    return null;
  }
  return round2(points[at].value - points[at - 1].value);
}

/** Whether a workout's point is a record. */
export function isRecordWorkout(
  points: readonly GymHistoryPoint[],
  workout: string,
): boolean {
  return points.some((point) => point.workout === workout && point.record);
}

/** A value of `measure` as it is read: «96.3 kg», «15», «1:30», «2.4 km». */
export function measureLabel(
  measure: GymHistoryMeasure,
  value: number,
  units: Units,
): string {
  switch (measure) {
    case "estimated_1rm_kg":
      return weightLabel(value, units);
    case "reps":
      return String(Math.round(value));
    case "duration_s":
      return clockLabel(value * 1000);
    case "distance_m":
      return distanceLabel(value, units);
  }
}

/** A change of `measure`: «+2.5 kg», «−1», «=». */
export function changeLabel(
  measure: GymHistoryMeasure,
  change: number,
  units: Units,
): string {
  if (change === 0) {
    return "=";
  }
  const sign = change > 0 ? "+" : "−";
  return `${sign}${measureLabel(measure, Math.abs(change), units)}`;
}
