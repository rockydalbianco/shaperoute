import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ACTIVITIES,
  type Activity,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  RECORD_ACTIVITIES,
  type RecordActivity,
  RUN_ACTIVITIES,
} from "../src/index.ts";
import { PLANNED_SPORTS, RECORDED_SPORTS } from "../src/sports/index.ts";

// The sports of the contract (TASK-376, ADR-0320) give the tables index.ts
// wrote by hand before them, value for value and in the same order. The API
// checks its own against the same names (test_sport_registry_api.py).

const BEFORE_ACTIVITIES = ["running", "cycling", "paddling", "swimming", "walking"];
const BEFORE_RECORD_ACTIVITIES = ["skiing", "xc_skiing"];
const BEFORE_LIMITS = {
  running: [1_000, 50_000],
  cycling: [10_000, 30_000],
  paddling: [1_000, 5_000],
  swimming: [500, 3_000],
  walking: [1_000, 30_000],
};
// Added since, each by a line of sports/index.ts: a hike (TASK-377), an MTB
// ride (TASK-378), a skate (TASK-380), snowshoeing (TASK-413) and a
// wheelchair or a stroller (TASK-414), planned before the walk, in the order
// of the route engine; a gravel ride
// (TASK-378) after it, drawn as a ride as the walk is drawn as a run.
const SINCE_LIMITS: Readonly<Record<string, readonly [number, number]>> = {
  hiking: [1_000, 30_000],
  mountain_biking: [10_000, 30_000],
  inline_skating: [5_000, 30_000],
  snowshoeing: [500, 3_000],
  wheelchair: [1_000, 5_000],
  gravel_biking: [10_000, 30_000],
};
const SINCE = Object.keys(SINCE_LIMITS);
// And a day of ski touring (TASK-415), recorded without a shape after the
// days on the snow of before.
const NOW_RECORD_ACTIVITIES = [...BEFORE_RECORD_ACTIVITIES, "ski_touring"];
const NOW_ACTIVITIES = [
  ...BEFORE_ACTIVITIES.slice(0, 4),
  "hiking",
  "mountain_biking",
  "inline_skating",
  "snowshoeing",
  "wheelchair",
  "walking",
  "gravel_biking",
];

test("the activities are those of before, in their order", () => {
  assert.deepEqual([...ACTIVITIES], NOW_ACTIVITIES);
  assert.deepEqual([...API_ACTIVITIES], NOW_ACTIVITIES);
  assert.deepEqual([...RECORD_ACTIVITIES], NOW_RECORD_ACTIVITIES);
  assert.deepEqual(
    NOW_RECORD_ACTIVITIES.filter((a) => a !== "ski_touring"),
    BEFORE_RECORD_ACTIVITIES,
  );
  // Then a workout at the gym, saved without a track (TASK-385 B0).
  assert.deepEqual(
    [...RUN_ACTIVITIES],
    [...NOW_ACTIVITIES, ...NOW_RECORD_ACTIVITIES, "gym"],
  );
  assert.deepEqual(
    NOW_ACTIVITIES.filter((a) => !SINCE.includes(a)),
    BEFORE_ACTIVITIES,
  );
});

test("the distances are those of before, in their order", () => {
  const limits = Object.entries(DISTANCE_LIMITS_M).map(([a, l]) => [a, [...l]]);
  assert.deepEqual(
    limits.filter(([a]) => !SINCE.includes(a as string)),
    Object.entries(BEFORE_LIMITS),
  );
  for (const [activity, since] of Object.entries(SINCE_LIMITS)) {
    assert.deepEqual(DISTANCE_LIMITS_M[activity as Activity], since);
  }
  assert.deepEqual(
    limits.map(([a]) => a),
    NOW_ACTIVITIES,
  );
  assert.deepEqual([MIN_DISTANCE_M, MAX_DISTANCE_M], [1_000, 50_000]);
});

test("every sport is named once, each planned one with its distances", () => {
  const names = [...PLANNED_SPORTS, ...RECORDED_SPORTS].map((s) => s.activity);
  assert.equal(new Set(names).size, names.length);
  for (const sport of PLANNED_SPORTS) {
    const [lowest, highest] = sport.distanceM;
    assert.ok(0 < lowest && lowest < highest, sport.activity);
  }
});

test("the types are the literals of before", () => {
  // Each name keeps its literal type: a typo would not compile.
  const run: Activity = ACTIVITIES[0];
  const ski: RecordActivity = RECORD_ACTIVITIES[1];
  assert.equal(run, "running");
  assert.equal(ski, "xc_skiing");
  const exact: Activity extends
    | "running"
    | "cycling"
    | "paddling"
    | "swimming"
    | "hiking"
    | "mountain_biking"
    | "inline_skating"
    | "snowshoeing"
    | "wheelchair"
    | "walking"
    | "gravel_biking"
    ? true
    : false = true;
  assert.ok(exact);
});
