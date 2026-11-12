import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import reads from "../fixtures/reads.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import update from "../fixtures/live-share-update.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  type LiveStats,
  RECORD_ACTIVITIES,
  RUN_ACTIVITIES,
} from "../src/index.ts";
import { PARAGLIDING, RECORDED_SPORTS } from "../src/sports/index.ts";

// Paragliding (TASK-305 parts R, ADR-0375): a flight recorded without a
// shape, as a day of alpine skiing (TASK-375, ADR-0319), after ski touring.
// The API reads the same names (services/api/tests/test_paragliding_api.py).

test("a flight is recorded without a shape, never planned", () => {
  assert.equal(PARAGLIDING.activity, "paragliding");
  assert.equal(PARAGLIDING.recordOnly, true);
  assert.ok((RECORD_ACTIVITIES as readonly string[]).includes("paragliding"));
  assert.ok(!(ACTIVITIES as readonly string[]).includes("paragliding"));
  assert.ok(!(API_ACTIVITIES as readonly string[]).includes("paragliding"));
  assert.ok(!("paragliding" in DISTANCE_LIMITS_M));
  assert.ok(!contract.activities.includes("paragliding"));
  assert.ok(!("paragliding" in contract.distance_limits_m));
});

test("a flight comes after ski touring, before the gym", () => {
  assert.deepEqual(RECORDED_SPORTS.at(-1), PARAGLIDING);
  assert.equal(
    RUN_ACTIVITIES.indexOf("paragliding"),
    RUN_ACTIVITIES.indexOf("ski_touring") + 1,
  );
  assert.equal(
    RUN_ACTIVITIES.indexOf("gym"),
    RUN_ACTIVITIES.indexOf("paragliding") + 1,
  );
  assert.deepEqual(runActivities.run_activities, [...RUN_ACTIVITIES]);
  assert.deepEqual(runActivities.record_activities, [...RECORD_ACTIVITIES]);
});

test("an app of today reads a flight, one of before does not", () => {
  assert.ok(reads.kinds.includes("paragliding"));
  assert.ok(reads.this_app.split(",").includes("paragliding"));
  assert.ok(!reads.old_app_activities.includes("paragliding"));
  assert.equal(
    reads.kinds.indexOf("paragliding"),
    reads.kinds.indexOf("ski_touring") + 1,
  );
});

test("the numbers of a flight are optional in a live update", () => {
  // The update of an app of today has none of them, and stays valid.
  const today: LiveStats = update.stats;
  assert.equal(today.alt_m, undefined);
  const flight: LiveStats = {
    ...update.stats,
    alt_m: 1820,
    max_alt_m: 2140,
    vario_mps: -1.4,
    speed_mps: 9.7,
  };
  assert.equal(flight.max_alt_m, 2140);
});
