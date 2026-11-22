import type { GymHistory, GymHistoryWorkout, GymSet } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";

import {
  bestOf,
  changeLabel,
  changeOf,
  estimated1rm,
  historyKey,
  historyOf,
  isRecordWorkout,
  lastTime,
  lastValues,
  measureLabel,
  measureOf,
  pointsIn,
  sameName,
  suggestion,
  type WaitingWorkout,
  weightStepKg,
  withWaiting,
} from "./exerciseHistory";

// TASK-483 B (ADR-0392): the history of an exercise read on the phone, with
// the sums of the API (gym_history.py) and the user's rule for «Try …».

const history = example as GymHistory;
const BENCH = { exercise: "bench_press", kind: "load" } as const;

function load(reps: number, kg: number, more: Partial<GymSet> = {}): GymSet {
  return {
    exercise: "bench_press",
    kind: "load",
    reps,
    load_kg: kg,
    at_s: 600,
    live: true,
    ...more,
  };
}

function waiting(key: string, day: number, sets: GymSet[]): WaitingWorkout {
  const started = new Date(Date.UTC(2026, 10, day, 17));
  return {
    key,
    request: {
      started_at: started.toISOString(),
      ended_at: new Date(started.getTime() + 3_600_000).toISOString(),
      sets,
    },
  };
}

function workout(sets: GymSet[]): GymHistoryWorkout {
  return { id: "w", started_at: "2026-11-10T17:00:00Z", source: "muw", sets };
}

test("a name without case or extra spaces, as the API reads it", () => {
  expect(sameName("  Smith   INCLINE ")).toBe("smith incline");
  expect(sameName("smith\tincline")).toBe("smith incline");
  expect(historyKey({ name: " Ring  Dips", kind: "bodyweight" })).toBe(
    historyKey({ name: "ring dips", kind: "bodyweight" }),
  );
  expect(historyOf(BENCH)).toEqual({ exercise: "bench_press" });
  expect(historyOf({ name: "Ring dips", kind: "bodyweight" })).toEqual({
    name: "Ring dips",
  });
});

test("a workout's value is the API's", () => {
  expect(estimated1rm(100, 1)).toBe(100);
  expect(estimated1rm(90, 6)).toBeCloseTo(108);
  for (const one of history.workouts) {
    const point = history.points.find((p) => p.workout === one.id);
    const best = bestOf(one.sets, "estimated_1rm_kg");
    expect(best?.value).toBeCloseTo(point?.value ?? -1, 1);
    expect(best?.estimated).toBe(point?.estimated);
  }
  expect(measureOf("cardio", { exercise: "treadmill", kind: "cardio" }, [])).toBe(
    "distance_m",
  );
  expect(measureOf("cardio", { exercise: "stepper", kind: "cardio" }, [])).toBe(
    "duration_s",
  );
  expect(
    measureOf("cardio", { name: "Sled", kind: "cardio" }, [
      { name: "Sled", kind: "cardio", distance_m: 50, at_s: 0, live: true },
    ]),
  ).toBe("distance_m");
});

test("a workout still on the phone counts: its point, its records, first in the list", () => {
  const merged = withWaiting(
    history,
    [
      waiting("hw1", 15, [load(5, 85), { ...load(20, 50), exercise: "back_squat" }]),
      // Already on the API: not twice.
      waiting("hb00000000000003", 10, [load(15, 60)]),
    ],
    BENCH,
  );
  expect(merged.workouts_count).toBe(4);
  expect(merged.workouts.map((one) => one.id)).toEqual([
    "hw1",
    "hb00000000000003",
    "hb00000000000002",
  ]);
  expect(merged.workouts[0].sets).toEqual([load(5, 85)]);
  expect(merged.points.at(-1)).toEqual({
    workout: "hw1",
    started_at: "2026-11-15T17:00:00.000Z",
    value: 99.17,
    estimated: true,
    record: true,
  });
  const records = Object.fromEntries(merged.records.map((r) => [r.kind, r]));
  expect(records.best_estimate_kg.workout).toBe("hw1");
  expect(records.heaviest_kg.value).toBe(85);
  expect(records.most_reps.value).toBe(15);
  expect(records.best_volume_kg.value).toBe(1740);
  expect(merged.next).toBe(history.next);
  // Nothing waiting with it: the history as it was.
  expect(withWaiting(history, [waiting("hw2", 15, [])], BENCH)).toBe(history);
});

test("a named exercise never sent has a history from the phone alone", () => {
  const empty: GymHistory = {
    workouts_count: 0,
    points: [],
    records: [],
    workouts: [],
  };
  const dips = (reps: number): GymSet => ({
    name: "  ring   DIPS",
    kind: "bodyweight",
    reps,
    at_s: 300,
    live: true,
  });
  const merged = withWaiting(empty, [waiting("hw1", 3, [dips(8), dips(10)])], {
    name: "Ring dips",
    kind: "bodyweight",
  });
  expect(merged.kind).toBe("bodyweight");
  expect(merged.measure).toBe("reps");
  expect(merged.points.map((p) => p.value)).toEqual([10]);
  expect(merged.records.map((r) => [r.kind, r.value])).toEqual([["most_reps", 10]]);
});

test("last time: the newest workout, and its first set for the boxes", () => {
  const last = lastTime(history);
  expect(last?.id).toBe("hb00000000000003");
  expect(last && lastValues(last)).toEqual({ reps: 15, load_kg: 60 });
  expect(
    lastTime({ workouts_count: 0, points: [], records: [], workouts: [] }),
  ).toBeNull();
});

test("the suggestion follows the user's rule", () => {
  const reached = workout([load(8, 80), load(8, 80), load(10, 75)]);
  expect(suggestion(reached, "load", null, "km")).toEqual({
    values: { reps: 8, load_kg: 82.5 },
    again: false,
  });
  const missed = workout([load(8, 80), load(7, 80)]);
  expect(suggestion(missed, "load", null, "km")).toEqual({
    values: { reps: 8, load_kg: 80 },
    again: true,
  });
  // The plan's reps first.
  expect(suggestion(reached, "load", { reps: 10 }, "km")).toEqual({
    values: { reps: 10, load_kg: 80 },
    again: true,
  });
  // 5 lb for whoever weighs in lb.
  expect(weightStepKg("mi")).toBeCloseTo(2.268, 2);
  const body = (reps: number, kg?: number): GymSet => ({
    exercise: "pull_up",
    kind: "bodyweight",
    reps,
    ...(kg === undefined ? {} : { load_kg: kg }),
    at_s: 0,
    live: true,
  });
  expect(suggestion(workout([body(12), body(12)]), "bodyweight", null, "km")).toEqual({
    values: { reps: 13 },
    again: false,
  });
  expect(
    suggestion(workout([body(12, 10), body(10, 10)]), "bodyweight", null, "km"),
  ).toEqual({ values: { reps: 12, load_kg: 10 }, again: true });
  const timed = (s: number): GymSet => ({
    exercise: "plank",
    kind: "timed",
    duration_s: s,
    at_s: 0,
    live: true,
  });
  expect(suggestion(workout([timed(60), timed(60)]), "timed", null, "km")).toEqual({
    values: { duration_s: 65 },
    again: false,
  });
  const cardio: GymSet = {
    exercise: "treadmill",
    kind: "cardio",
    duration_s: 900,
    at_s: 0,
    live: true,
  };
  expect(suggestion(workout([cardio]), "cardio", null, "km")).toBeNull();
});

test("the chart's ranges, the change and the records of the list", () => {
  const now = Date.UTC(2026, 10, 20, 12);
  const old = {
    workout: "old",
    started_at: "2026-01-05T17:00:00Z",
    value: 80,
    estimated: true,
    record: true,
  };
  const points = [old, ...history.points];
  expect(pointsIn(points, "1M", now)).toHaveLength(3);
  expect(pointsIn(points, "1Y", now)).toHaveLength(4);
  expect(pointsIn(points, "all", now)).toHaveLength(4);
  expect(changeOf(history.points, "hb00000000000002")).toBeCloseTo(2.92);
  expect(changeOf(history.points, "hb00000000000001")).toBeNull();
  // 60 × 15 estimates nothing: its heaviest kg is no drop of the max.
  expect(changeOf(history.points, "hb00000000000003")).toBeNull();
  expect(isRecordWorkout(history.points, "hb00000000000002")).toBe(true);
  expect(isRecordWorkout(history.points, "hb00000000000003")).toBe(false);
});

test("values and changes as they are read", () => {
  expect(measureLabel("estimated_1rm_kg", 96.25, "km")).toBe("96.3 kg");
  expect(measureLabel("reps", 15, "km")).toBe("15");
  expect(measureLabel("duration_s", 90, "km")).toBe("1:30");
  expect(changeLabel("estimated_1rm_kg", -2.5, "km")).toBe("−2.5 kg");
  expect(changeLabel("reps", 2, "km")).toBe("+2");
  expect(changeLabel("reps", 0, "km")).toBe("=");
});
