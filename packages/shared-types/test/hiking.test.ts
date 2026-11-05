import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import hikingRequest from "../fixtures/route-request-hiking.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RUN_ACTIVITIES,
  SHAPES,
} from "../src/index.ts";
import { HIKING } from "../src/sports/index.ts";

// A hike (TASK-377 part A, ADR-0321): drawn by the route engine on its own
// network, 1–30 km, before the walk in the order of the contract. The API
// reads the same request (services/api/tests/test_hiking_api.py).

test("a hike is an activity of the API, 1 to 30 km", () => {
  assert.equal(HIKING.activity, "hiking");
  assert.deepEqual([...DISTANCE_LIMITS_M.hiking], [1_000, 30_000]);
  assert.ok((API_ACTIVITIES as readonly string[]).includes("hiking"));
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes("hiking"));
  assert.equal(ACTIVITIES.indexOf("hiking"), ACTIVITIES.indexOf("walking") - 1);
  assert.deepEqual(contract.distance_limits_m.hiking, [1_000, 30_000]);
});

test("the request of a hike has the fields of a run's", () => {
  assert.deepEqual(Object.keys(hikingRequest).sort(), Object.keys(request).sort());
  assert.equal(hikingRequest.activity, "hiking");
  const [lowest, highest] = DISTANCE_LIMITS_M.hiking;
  assert.ok(lowest <= hikingRequest.distance_m && hikingRequest.distance_m <= highest);
  assert.ok((SHAPES as readonly string[]).includes(hikingRequest.shape));
});
