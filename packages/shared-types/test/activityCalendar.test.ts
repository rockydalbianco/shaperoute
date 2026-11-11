import assert from "node:assert/strict";
import { test } from "node:test";

import calendar from "../fixtures/activity-calendar.json" with { type: "json" };
import {
  type ActivityCalendar,
  CALENDAR_TREND_MONTHS,
  RUN_ACTIVITIES,
} from "../src/index.ts";

// The same fixture is checked by the API's test_activity_calendar.py
// (TASK-462 part A, ADR-0372).

const example = calendar as ActivityCalendar;

test("the example calendar adds up its days", () => {
  const activities = example.days.flatMap((day) => day.activities);
  assert.equal(example.count, activities.length);
  assert.equal(
    example.distance_m,
    activities.reduce((sum, activity) => sum + activity.distance_m, 0),
  );
  assert.equal(
    example.duration_s,
    activities.reduce((sum, activity) => sum + activity.duration_s, 0),
  );
  for (const day of example.days) {
    assert.ok(day.day >= 1 && day.day <= 31);
  }
});

test("its activities and sports are activities of a run", () => {
  const known: readonly string[] = RUN_ACTIVITIES;
  for (const activity of example.days.flatMap((day) => day.activities)) {
    assert.ok(known.includes(activity.activity), activity.activity);
    assert.ok(activity.kcal === null || activity.kcal >= 0);
    // A workout at the gym has no track (TASK-385).
    assert.ok(activity.activity !== "gym" || !activity.tracked);
  }
  for (const sport of example.sports) {
    assert.ok(known.includes(sport), sport);
  }
});

test("the trend is twelve months, the oldest first, ending with the month", () => {
  assert.equal(example.trend.length, CALENDAR_TREND_MONTHS);
  const months = example.trend.map((month) => month.month);
  assert.deepEqual([...months].sort(), months);
  assert.equal(new Set(months).size, months.length);
  const last = example.trend[example.trend.length - 1];
  assert.equal(last.month, example.month);
  assert.equal(last.count, example.count);
  assert.equal(last.distance_m, example.distance_m);
  assert.equal(last.duration_s, example.duration_s);
});
