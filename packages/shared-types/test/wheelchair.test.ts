import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import wheelRequest from "../fixtures/route-request-wheelchair.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RECORD_ACTIVITIES,
  RUN_ACTIVITIES,
  SHAPES,
} from "../src/index.ts";
import { WHEELCHAIR } from "../src/sports/index.ts";

// A wheelchair or a stroller (TASK-414 part A, ADR-0343): a circle, a heart,
// a star or a moon of 1–5 km on the wheel network of the route engine, after
// snowshoeing and before the walk in the order of the contract. The API
// reads the same request (services/api/tests/test_wheelchair_api.py).

test("wheelchair is an activity of the API, 1 to 5 km", () => {
  assert.equal(WHEELCHAIR.activity, "wheelchair");
  assert.deepEqual([...DISTANCE_LIMITS_M.wheelchair], [1_000, 5_000]);
  assert.ok((API_ACTIVITIES as readonly string[]).includes("wheelchair"));
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes("wheelchair"));
  assert.ok(runActivities.run_activities.includes("wheelchair"));
  // Planned with a shape, not recorded without one.
  assert.ok(!(RECORD_ACTIVITIES as readonly string[]).includes("wheelchair"));
  assert.equal(ACTIVITIES.indexOf("wheelchair"), ACTIVITIES.indexOf("snowshoeing") + 1);
  assert.ok(ACTIVITIES.indexOf("wheelchair") < ACTIVITIES.indexOf("walking"));
  assert.deepEqual(contract.distance_limits_m.wheelchair, [1_000, 5_000]);
});

test("the request of a wheelchair route has the fields of a run's, a simple shape", () => {
  assert.deepEqual(Object.keys(wheelRequest).sort(), Object.keys(request).sort());
  assert.equal(wheelRequest.activity, "wheelchair");
  assert.equal(wheelRequest.word, null);
  const [lowest, highest] = DISTANCE_LIMITS_M.wheelchair;
  assert.ok(lowest <= wheelRequest.distance_m && wheelRequest.distance_m <= highest);
  assert.ok((SHAPES as readonly string[]).includes(wheelRequest.shape));
  assert.ok(["circle", "heart", "star", "moon"].includes(wheelRequest.shape));
});
