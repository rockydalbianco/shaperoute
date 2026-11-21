import assert from "node:assert/strict";
import { test } from "node:test";

import reads from "../fixtures/reads.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import session from "../fixtures/stretch-session.json" with { type: "json" };
import {
  RECORD_ACTIVITIES,
  RUN_ACTIVITIES,
  STRETCH_EXERCISES_MAX,
  STRETCH_MINUTES_MAX,
  STRETCH_ROUTINE_PATTERN,
  STRETCH_SESSION_MAX_S,
  type StretchSessionRequest,
  TRACKLESS_ACTIVITIES,
} from "../src/index.ts";
import { STRETCHING, TRACKLESS_SPORTS } from "../src/sports/index.ts";

// The same fixture is checked by the API's test_stretching_api.py (TASK-475,
// ADR-0386).

test("stretching is saved without a track, after the gym", () => {
  assert.deepEqual(STRETCHING, { activity: "stretching", trackless: true });
  assert.equal(TRACKLESS_SPORTS.at(-1), STRETCHING);
  assert.deepEqual([...TRACKLESS_ACTIVITIES], ["gym", "stretching"]);
  assert.equal(RUN_ACTIVITIES.at(-1), "stretching");
  assert.ok(!(RECORD_ACTIVITIES as readonly string[]).includes("stretching"));
  assert.deepEqual(runActivities.trackless_activities, ["gym", "stretching"]);
});

test("an app of today reads it, with what has no track", () => {
  const said = reads.this_app.split(",");
  assert.ok(said.includes("stretching") && said.includes("trackless"));
  assert.equal(reads.kinds.indexOf("stretching"), reads.kinds.indexOf("gym") + 1);
});

test("the example session is a request of the contract", () => {
  const request: StretchSessionRequest = session;
  const length_s =
    (Date.parse(request.ended_at) - Date.parse(request.started_at)) / 1000;
  assert.ok(length_s > 0 && length_s <= STRETCH_SESSION_MAX_S);
  assert.match(request.routine, STRETCH_ROUTINE_PATTERN);
  assert.ok(request.minutes >= 1 && request.minutes <= STRETCH_MINUTES_MAX);
  assert.ok(request.exercises >= 0 && request.exercises <= STRETCH_EXERCISES_MAX);
  for (const pause of request.pauses ?? []) {
    assert.ok(pause.from_s <= pause.to_s && pause.to_s <= length_s);
  }
});

test("the routines of the phone are keys of the contract", () => {
  for (const key of ["morning", "afterRun", "afterGym"]) {
    assert.match(key, STRETCH_ROUTINE_PATTERN);
  }
  assert.doesNotMatch("after run", STRETCH_ROUTINE_PATTERN);
});
