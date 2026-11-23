import assert from "node:assert/strict";
import { test } from "node:test";

import bests from "../fixtures/flight-bests.json" with { type: "json" };
import request from "../fixtures/flight-stats-request.json" with { type: "json" };
import {
  type FlightBests,
  type FlightStatsRequest,
  MAX_FLIGHT_ALT_M,
  MAX_FLIGHT_MPS,
  MIN_FLIGHT_ALT_M,
} from "../src/index.ts";

// The same fixtures are checked by the API's test_flight_bests.py
// (TASK-305 part R5a, ADR-0375).

test("the example flight's figures are within their bounds", () => {
  const sent = request as FlightStatsRequest;
  assert.ok(typeof sent.max_alt_m === "number");
  assert.ok(sent.max_alt_m >= MIN_FLIGHT_ALT_M && sent.max_alt_m <= MAX_FLIGHT_ALT_M);
  assert.ok(typeof sent.top_speed_mps === "number");
  assert.ok(sent.top_speed_mps >= 0 && sent.top_speed_mps <= MAX_FLIGHT_MPS);
});

test("the example bests have the four of them, each a flight or none", () => {
  const example = bests as FlightBests;
  assert.deepEqual(Object.keys(example).sort(), [
    "farthest",
    "fastest",
    "highest",
    "longest",
  ]);
  for (const best of Object.values(example)) {
    if (best === null) {
      continue;
    }
    assert.match(best.id, /^[0-9a-f]{16}$/);
    assert.ok(!Number.isNaN(Date.parse(best.started_at)));
    assert.ok(best.value > 0);
  }
});
