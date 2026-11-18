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
import { RECORDED_SPORTS, SKI_TOURING } from "../src/sports/index.ts";

// Ski touring (TASK-415 part A, ADR-0344): recorded without a shape, as a
// day of alpine skiing (TASK-375, ADR-0319), after the days on the snow of
// before. The API reads the same names
// (services/api/tests/test_ski_touring_api.py).

test("ski touring is recorded without a shape, never planned", () => {
  assert.equal(SKI_TOURING.activity, "ski_touring");
  assert.equal(SKI_TOURING.recordOnly, true);
  assert.ok((RECORD_ACTIVITIES as readonly string[]).includes("ski_touring"));
  assert.ok(!(ACTIVITIES as readonly string[]).includes("ski_touring"));
  assert.ok(!(API_ACTIVITIES as readonly string[]).includes("ski_touring"));
  assert.ok(!("ski_touring" in DISTANCE_LIMITS_M));
  // The contract of the routes keeps only what is drawn.
  assert.ok(!contract.activities.includes("ski_touring"));
  assert.ok(!("ski_touring" in contract.distance_limits_m));
});

test("ski touring comes after cross-country skiing, before paragliding", () => {
  // A paragliding flight (TASK-305 parts R) comes after it, then a day of
  // mountaineering (TASK-463), then the gym.
  assert.deepEqual(RECORDED_SPORTS.at(-3), SKI_TOURING);
  assert.equal(
    RUN_ACTIVITIES.indexOf("ski_touring"),
    RUN_ACTIVITIES.indexOf("xc_skiing") + 1,
  );
  assert.equal(
    RUN_ACTIVITIES.indexOf("paragliding"),
    RUN_ACTIVITIES.indexOf("ski_touring") + 1,
  );
  assert.deepEqual(runActivities.run_activities, [...RUN_ACTIVITIES]);
  assert.deepEqual(runActivities.record_activities, [...RECORD_ACTIVITIES]);
});

test("an app of today reads ski touring, one of before does not", () => {
  assert.ok(reads.kinds.includes("ski_touring"));
  assert.ok(reads.this_app.split(",").includes("ski_touring"));
  assert.ok(!reads.old_app_activities.includes("ski_touring"));
  assert.equal(
    reads.kinds.indexOf("ski_touring"),
    reads.kinds.indexOf("xc_skiing") + 1,
  );
});
