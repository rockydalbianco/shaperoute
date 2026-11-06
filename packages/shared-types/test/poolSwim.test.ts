import assert from "node:assert/strict";
import { test } from "node:test";

import swim from "../fixtures/pool-swim.json" with { type: "json" };
import {
  POOL_LENGTH_MAX_M,
  POOL_LENGTH_MIN_M,
  POOL_LENGTHS_MAX,
  POOL_MAX_SPEED_M_S,
  type PoolSwimRequest,
  RUN_ACTIVITIES,
} from "../src/index.ts";

// The same fixture is checked by the API's test_pool_swims.py (TASK-400,
// ADR-0334).

test("the example swim is a request of the contract", () => {
  const request: PoolSwimRequest = swim;
  const length_s =
    (Date.parse(request.ended_at) - Date.parse(request.started_at)) / 1000;
  assert.ok(length_s > 0);
  assert.ok(request.pool_length_m >= POOL_LENGTH_MIN_M);
  assert.ok(request.pool_length_m <= POOL_LENGTH_MAX_M);
  assert.ok(request.lengths >= 1 && request.lengths <= POOL_LENGTHS_MAX);
  for (const pause of request.pauses ?? []) {
    assert.ok(pause.from_s <= pause.to_s && pause.to_s <= length_s);
  }
  // 1500 m in 40 minutes: a swimmer's pace, under the API's limit.
  assert.ok(request.lengths * request.pool_length_m < POOL_MAX_SPEED_M_S * length_s);
});

test("a swim in a pool is a run of swimming, no activity of its own", () => {
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes("swimming"));
  assert.ok(!(RUN_ACTIVITIES as readonly string[]).includes("pool"));
});
