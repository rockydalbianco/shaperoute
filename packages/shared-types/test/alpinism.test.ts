import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import reads from "../fixtures/reads.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RECORD_ACTIVITIES,
  RUN_ACTIVITIES,
} from "../src/index.ts";
import { ALPINISM, RECORDED_SPORTS } from "../src/sports/index.ts";

// Mountaineering (TASK-463, ADR-0373): a day in the mountains recorded
// without a shape, as ski touring and a paragliding flight, after the flight.
// The API had it first (part A); it reads the same names
// (services/api/tests/test_alpinism_api.py).

test("a day of mountaineering is recorded without a shape, never planned", () => {
  assert.equal(ALPINISM.activity, "alpinism");
  assert.equal(ALPINISM.recordOnly, true);
  assert.ok((RECORD_ACTIVITIES as readonly string[]).includes("alpinism"));
  assert.ok(!(ACTIVITIES as readonly string[]).includes("alpinism"));
  assert.ok(!(API_ACTIVITIES as readonly string[]).includes("alpinism"));
  assert.ok(!("alpinism" in DISTANCE_LIMITS_M));
  assert.ok(!contract.activities.includes("alpinism"));
  assert.ok(!("alpinism" in contract.distance_limits_m));
});

test("a day of mountaineering comes after a flight, before the gym", () => {
  assert.deepEqual(RECORDED_SPORTS.at(-1), ALPINISM);
  assert.equal(
    RUN_ACTIVITIES.indexOf("alpinism"),
    RUN_ACTIVITIES.indexOf("paragliding") + 1,
  );
  assert.equal(RUN_ACTIVITIES.indexOf("gym"), RUN_ACTIVITIES.indexOf("alpinism") + 1);
  assert.deepEqual(runActivities.run_activities, [...RUN_ACTIVITIES]);
  assert.deepEqual(runActivities.record_activities, [...RECORD_ACTIVITIES]);
});

test("an app of today reads a day of mountaineering, one of before does not", () => {
  assert.ok(reads.kinds.includes("alpinism"));
  assert.ok(reads.this_app.split(",").includes("alpinism"));
  assert.ok(!reads.old_app_activities.includes("alpinism"));
  assert.equal(reads.kinds.indexOf("alpinism"), reads.kinds.indexOf("paragliding") + 1);
});
