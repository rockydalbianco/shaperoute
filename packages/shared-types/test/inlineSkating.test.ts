import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import reads from "../fixtures/reads.json" with { type: "json" };
import skateRequest from "../fixtures/route-request-inline_skating.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RUN_ACTIVITIES,
  SHAPES,
} from "../src/index.ts";
import { INLINE_SKATING } from "../src/sports/index.ts";

// Inline skating (TASK-380 part A, ADR-0324), 5–30 km, drawn by the route
// engine on its own network, after the MTB ride. The API reads the same
// request (services/api/tests/test_inline_skating_api.py).

test("inline skating is an activity of the API, 5 to 30 km", () => {
  assert.equal(INLINE_SKATING.activity, "inline_skating");
  assert.deepEqual([...DISTANCE_LIMITS_M.inline_skating], [5_000, 30_000]);
  assert.deepEqual(contract.distance_limits_m.inline_skating, [5_000, 30_000]);
  assert.ok((API_ACTIVITIES as readonly string[]).includes("inline_skating"));
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes("inline_skating"));
  assert.ok(runActivities.run_activities.includes("inline_skating"));
});

test("inline skating comes after the MTB ride, before the walk", () => {
  assert.equal(
    ACTIVITIES.indexOf("inline_skating"),
    ACTIVITIES.indexOf("mountain_biking") + 1,
  );
  assert.ok(ACTIVITIES.indexOf("inline_skating") < ACTIVITIES.indexOf("walking"));
  assert.deepEqual(contract.activities, [...ACTIVITIES]);
});

test("an app of today reads inline skating, one of before does not", () => {
  assert.ok(reads.kinds.includes("inline_skating"));
  assert.ok(reads.this_app.split(",").includes("inline_skating"));
  assert.ok(!reads.old_app_activities.includes("inline_skating"));
});

test("the request of a skate has the fields of a run's", () => {
  assert.deepEqual(Object.keys(skateRequest).sort(), Object.keys(request).sort());
  assert.equal(skateRequest.activity, INLINE_SKATING.activity);
  const [lowest, highest] = INLINE_SKATING.distanceM;
  assert.ok(lowest <= skateRequest.distance_m && skateRequest.distance_m <= highest);
  assert.ok((SHAPES as readonly string[]).includes(skateRequest.shape));
});
