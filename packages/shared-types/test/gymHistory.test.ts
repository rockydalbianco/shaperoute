import assert from "node:assert/strict";
import { test } from "node:test";

import history from "../fixtures/gym-history.json" with { type: "json" };
import {
  GYM_HISTORY_MEASURES,
  GYM_HISTORY_RECORDS,
  GYM_SET_KINDS,
  type GymHistory,
} from "../src/index.ts";

// The same fixture is checked by the API's test_gym_history.py (TASK-483 A,
// ADR-0392).

test("the history of an exercise is typed", () => {
  const body: GymHistory = history as GymHistory;
  assert.ok(body.kind !== undefined && GYM_SET_KINDS.includes(body.kind));
  assert.ok(body.measure !== undefined && GYM_HISTORY_MEASURES.includes(body.measure));
  for (const record of body.records) {
    assert.ok(GYM_HISTORY_RECORDS.includes(record.kind));
  }
});

test("the points are oldest first, the workouts newest first", () => {
  const body = history as GymHistory;
  const points = body.points.map((point) => point.started_at);
  assert.deepEqual(points, [...points].sort());
  const workouts = body.workouts.map((workout) => workout.started_at);
  assert.deepEqual(workouts, [...workouts].sort().reverse());
  assert.equal(body.points.length, body.workouts_count);
});

test("a point is a record when better than every one before it", () => {
  let top = -Infinity;
  for (const point of (history as GymHistory).points) {
    assert.equal(point.record, point.value > top);
    top = Math.max(top, point.value);
  }
});
