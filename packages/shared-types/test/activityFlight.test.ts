import assert from "node:assert/strict";
import { test } from "node:test";

import example from "../fixtures/activity-flight.json" with { type: "json" };
import type { ActivityFlight } from "../src/index.ts";

// The same fixture is checked by the API's test_activity_flight.py
// (TASK-305 part R6d, ADR-0375).

const flight = example as ActivityFlight;

test("the example flights are stretches of the track, in order", () => {
  assert.ok(flight.air.length > 0);
  for (const [i, [from, to]] of flight.air.entries()) {
    assert.ok(Number.isInteger(from) && Number.isInteger(to));
    assert.ok(to > from && from >= 0);
    if (i > 0) {
      assert.ok(from >= flight.air[i - 1][1]);
    }
  }
});

test("the example split has both kinds, with the fields of a side", () => {
  for (const side of [flight.split.foot, flight.split.air]) {
    assert.deepEqual(Object.keys(side).sort(), [
      "climb_m",
      "max_alt_m",
      "metres",
      "seconds",
    ]);
  }
});
