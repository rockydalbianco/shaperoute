import assert from "node:assert/strict";
import { test } from "node:test";

import skiDay from "../fixtures/ski-day.json" with { type: "json" };
import skiDayParts from "../fixtures/ski-day-parts.json" with { type: "json" };
import skiSeason from "../fixtures/ski-season.json" with { type: "json" };
import {
  SKI_SEASON_MAX_DAYS,
  SNOW_TYPES,
  type SkiDay,
  type SkiDayPart,
  type SkiDayWithParts,
  type SkiSeason,
  type SnowType,
} from "../src/index.ts";

// The same JSON is validated by the API's test_ski_day_parts.py and
// test_ski_season.py (TASK-429 part C1).
const isSnow = (value: string): value is SnowType =>
  (SNOW_TYPES as readonly string[]).includes(value);

test("a day with parts is a day, with the parts in the order of the day", () => {
  assert.ok(isSnow(skiDayParts.snow));
  const parts: SkiDayPart[] = skiDayParts.parts.map((part) => {
    assert.ok(part.kind === "lift" || part.kind === "descent");
    return { ...part, kind: part.kind };
  });
  const day: SkiDayWithParts = { ...skiDayParts, snow: skiDayParts.snow, parts };
  // What an app before the parts reads of it is the day as ever.
  const old: SkiDay = { resort: day.resort, gear: day.gear, snow: day.snow };
  assert.deepEqual(Object.keys(old), Object.keys(skiDay));
  const lifts = parts.filter((part) => part.kind === "lift");
  assert.ok(lifts.every((part) => part.top_mps === null));
  for (const part of parts) {
    assert.equal(part.from_fix === null, part.to_fix === null);
    if (part.from_fix !== null && part.to_fix !== null) {
      assert.ok(part.from_fix < part.to_fix);
    }
  }
});

test("the season is the type, with the days counted and the sums", () => {
  const season: SkiSeason = skiSeason;
  assert.ok(season.days_with_parts <= season.days);
  assert.ok(season.vertical_m <= season.skied_m);
  const from = Date.parse(season.from);
  const to = Date.parse(season.to);
  assert.ok(to >= from);
  assert.ok((to - from) / 86_400_000 + 1 <= SKI_SEASON_MAX_DAYS);
});
