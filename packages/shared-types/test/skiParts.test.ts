import assert from "node:assert/strict";
import { test } from "node:test";

import drawing from "../fixtures/drawing-ski.json" with { type: "json" };
import request from "../fixtures/ski-parts-request.json" with { type: "json" };
import { type Drawing, SKI_PARTS_MAX, type SkiPartRequest } from "../src/index.ts";

// The same fixtures are checked by the API's test_ski_parts.py (TASK-424
// part C2b, with TASK-429).

test("the example parts are a day in its order, each within its span", () => {
  const parts = request.ski_parts as SkiPartRequest[];
  assert.ok(parts.length > 0 && parts.length <= SKI_PARTS_MAX);
  parts.forEach((part, i) => {
    assert.ok(["lift", "descent"].includes(part.kind));
    assert.ok(part.end_ms >= part.start_ms);
    assert.ok(part.moving_s <= (part.end_ms - part.start_ms) / 1000);
    if (part.kind === "lift") {
      assert.equal(part.top_mps, null);
    }
    if (i > 0) {
      assert.ok(part.start_ms >= parts[i - 1].start_ms);
    }
  });
});

test("a listed day of skiing has its descents' sum: the example's descents", () => {
  const body = drawing as Drawing;
  const descents = (request.ski_parts as SkiPartRequest[]).filter(
    (part) => part.kind === "descent",
  );
  assert.deepEqual(body.ski_descents, {
    metres: descents.reduce((sum, part) => sum + part.metres, 0),
    moving_s: descents.reduce((sum, part) => sum + part.moving_s, 0),
  });
  assert.equal(body.activity, "skiing");
});
