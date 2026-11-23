import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import snowRequest from "../fixtures/route-request-snowshoeing.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RECORD_ACTIVITIES,
  RUN_ACTIVITIES,
  SHAPES,
} from "../src/index.ts";
import { SNOWSHOEING } from "../src/sports/index.ts";

// Snowshoeing (TASK-413 part A2, ADR-0342): a shape of the catalogue placed
// freely on the snow by the route engine, 0.5–3 km, after the skate and
// before the walk in the order of the contract. The API reads the same
// request (services/api/tests/test_snowshoeing_api.py).

test("snowshoeing is an activity of the API, 0.5 to 3 km", () => {
  assert.equal(SNOWSHOEING.activity, "snowshoeing");
  assert.deepEqual([...DISTANCE_LIMITS_M.snowshoeing], [500, 3_000]);
  assert.ok((API_ACTIVITIES as readonly string[]).includes("snowshoeing"));
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes("snowshoeing"));
  assert.ok(runActivities.run_activities.includes("snowshoeing"));
  // Planned with a shape, not recorded without one.
  assert.ok(!(RECORD_ACTIVITIES as readonly string[]).includes("snowshoeing"));
  assert.equal(
    ACTIVITIES.indexOf("snowshoeing"),
    ACTIVITIES.indexOf("inline_skating") + 1,
  );
  assert.ok(ACTIVITIES.indexOf("snowshoeing") < ACTIVITIES.indexOf("walking"));
  assert.deepEqual(contract.distance_limits_m.snowshoeing, [500, 3_000]);
});

test("the request of a snowshoe route has the fields of a run's, a shape", () => {
  assert.deepEqual(Object.keys(snowRequest).sort(), Object.keys(request).sort());
  assert.equal(snowRequest.activity, "snowshoeing");
  assert.equal(snowRequest.word, null);
  const [lowest, highest] = DISTANCE_LIMITS_M.snowshoeing;
  assert.ok(lowest <= snowRequest.distance_m && snowRequest.distance_m <= highest);
  assert.ok((SHAPES as readonly string[]).includes(snowRequest.shape));
});
