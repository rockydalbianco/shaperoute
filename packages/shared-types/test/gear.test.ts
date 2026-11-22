import assert from "node:assert/strict";
import { test } from "node:test";

import one from "../fixtures/gear.json" with { type: "json" };
import list from "../fixtures/gear-list.json" with { type: "json" };
import asked from "../fixtures/gear-request.json" with { type: "json" };
import {
  GEAR_KINDS,
  GEAR_MAX_BRAND,
  GEAR_MAX_LIMIT_M,
  GEAR_MIN_LIMIT_M,
  type Gear,
  type GearList,
  type GearRequest,
  RUN_ACTIVITIES,
} from "../src/index.ts";

// The same JSON is validated by the API's test_gear.py (TASK-486).
const item = one as Gear;
const items = (list as GearList).gear;
const request = asked as GearRequest;

test("an item of its owner says everything, totals included", () => {
  assert.ok((GEAR_KINDS as readonly string[]).includes(item.kind));
  assert.ok(item.brand.length >= 1 && item.brand.length <= GEAR_MAX_BRAND);
  assert.deepEqual(Object.keys(item.totals).sort(), [
    "activities",
    "distance_m",
    "duration_s",
  ]);
  assert.equal(typeof item.off_profile, "boolean");
  assert.ok(item.photo_url?.startsWith(`/gear/${item.id}/photo?v=`));
});

test("an item seen by another member says nothing only its owner reads", () => {
  for (const seen of items) {
    for (const own of ["off_profile", "limit_m", "defaults", "hidden"]) {
      assert.ok(!(own in seen), own);
    }
  }
  assert.ok(items.some((seen) => seen.retired));
});

test("the request names a kind, sports the app knows and a limit in range", () => {
  assert.ok((GEAR_KINDS as readonly string[]).includes(request.kind));
  for (const sport of request.defaults ?? []) {
    assert.ok((RUN_ACTIVITIES as readonly string[]).includes(sport), sport);
  }
  const limit = request.limit_m ?? GEAR_MIN_LIMIT_M;
  assert.ok(limit >= GEAR_MIN_LIMIT_M && limit <= GEAR_MAX_LIMIT_M);
});

test("the kinds end with other and say each once", () => {
  assert.equal(GEAR_KINDS.at(-1), "other");
  assert.equal(new Set(GEAR_KINDS).size, GEAR_KINDS.length);
});
