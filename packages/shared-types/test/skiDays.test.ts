import assert from "node:assert/strict";
import { test } from "node:test";

import resortSnow from "../fixtures/resort-snow.json" with { type: "json" };
import skiDayRequest from "../fixtures/ski-day-request.json" with { type: "json" };
import skiDay from "../fixtures/ski-day.json" with { type: "json" };
import {
  SKI_GEAR_MAX,
  SNOW_TYPES,
  type ResortSnow,
  type SkiDay,
  type SkiDayRequest,
  type SnowType,
} from "../src/index.ts";

// The same JSON is validated by the API's test_ski_days_api.py (TASK-406
// part D1).
const isSnow = (value: string): value is SnowType =>
  (SNOW_TYPES as readonly string[]).includes(value);

test("the five snow types, in the order of the choice", () => {
  assert.deepEqual([...SNOW_TYPES], ["powder", "groomed", "icy", "spring", "heavy"]);
});

test("the request is the type", () => {
  assert.ok(isSnow(skiDayRequest.snow));
  const request: SkiDayRequest = { ...skiDayRequest, snow: skiDayRequest.snow };
  assert.ok(request.gear !== null && request.gear.length <= SKI_GEAR_MAX);
});

test("the day is the type, with the resort's name", () => {
  assert.ok(isSnow(skiDay.snow));
  const day: SkiDay = { ...skiDay, snow: skiDay.snow };
  assert.equal(day.resort?.id, skiDayRequest.resort_id);
  assert.ok((day.resort?.name ?? "").length > 0);
});

test("the resort's snow: numbers only, the most marked first", () => {
  const snow: ResortSnow = {
    ...resortSnow,
    snow: resortSnow.snow.map(({ snow, days }) => {
      assert.ok(isSnow(snow));
      return { snow, days };
    }),
  };
  assert.ok(!Number.isNaN(Date.parse(snow.since)));
  const days = snow.snow.map((count) => count.days);
  assert.deepEqual(
    days,
    [...days].sort((a, b) => b - a),
  );
  for (const count of snow.snow) {
    assert.deepEqual(Object.keys(count).sort(), ["days", "snow"]);
    assert.ok(Number.isInteger(count.days) && count.days >= 1);
  }
});
