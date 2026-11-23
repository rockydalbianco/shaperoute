import assert from "node:assert/strict";
import { test } from "node:test";

import request from "../fixtures/flight-parts-request.json" with { type: "json" };
import split from "../fixtures/flight-split.json" with { type: "json" };
import {
  FLIGHT_PARTS_MAX,
  type FlightPartRequest,
  type FlightSide,
  type FlightSplit,
} from "../src/index.ts";

// The same fixtures are checked by the API's test_flight_parts.py
// (TASK-305 part R6a, ADR-0375).

const parts = request.flight_parts as FlightPartRequest[];

test("the example parts go in the flight's order, each within its span", () => {
  assert.ok(parts.length <= FLIGHT_PARTS_MAX);
  for (const [i, part] of parts.entries()) {
    assert.ok(part.kind === "foot" || part.kind === "air");
    assert.ok(part.end_ms >= part.start_ms);
    assert.ok(part.moving_s <= (part.end_ms - part.start_ms) / 1000);
    assert.ok(part.metres >= 0 && part.climb_m >= 0);
    if (i > 0) {
      assert.ok(part.start_ms >= parts[i - 1].start_ms);
    }
  }
});

test("the example split is the example parts added up, kind by kind", () => {
  const sideOf = (kind: "foot" | "air"): FlightSide => {
    const mine = parts.filter((part) => part.kind === kind);
    const highs = mine.flatMap((part) =>
      part.max_alt_m === null ? [] : [part.max_alt_m],
    );
    return {
      seconds: mine.reduce((sum, part) => sum + part.moving_s, 0),
      metres: mine.reduce((sum, part) => sum + part.metres, 0),
      climb_m: mine.reduce((sum, part) => sum + part.climb_m, 0),
      max_alt_m: highs.length > 0 ? Math.max(...highs) : null,
    };
  };
  const expected: FlightSplit = { foot: sideOf("foot"), air: sideOf("air") };
  assert.deepEqual(split, expected);
});
