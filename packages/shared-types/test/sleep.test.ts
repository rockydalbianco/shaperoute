import assert from "node:assert/strict";
import { test } from "node:test";

import listed from "../fixtures/drawing-sleep.json" with { type: "json" };
import activityRequest from "../fixtures/sleep-activity-request.json" with { type: "json" };
import activity from "../fixtures/sleep-activity.json" with { type: "json" };
import nightRequest from "../fixtures/sleep-night-request.json" with { type: "json" };
import night from "../fixtures/sleep-night.json" with { type: "json" };
import noStages from "../fixtures/sleep-summary-no-stages.json" with { type: "json" };
import summary from "../fixtures/sleep-summary.json" with { type: "json" };
import {
  type ActivitySleep,
  type ActivitySleepRequest,
  type Drawing,
  SLEEP_NIGHT_MAX_MIN,
  SLEEP_SCORE_MAX,
  SLEEP_SHARED_DEFAULT,
  SLEEP_SHOWN_DEFAULT,
  type SleepFigures,
  type SleepNight,
  type SleepNightRequest,
  type SleepSummary,
} from "../src/index.ts";

// The same JSON is validated by the API's test_sleep.py (TASK-467 part B1,
// ADR-0380).
const sent: SleepNightRequest = nightRequest;
const kept: SleepNight = night;
const sentWithActivity: ActivitySleepRequest = activityRequest;
const keptWithActivity: ActivitySleep = activity;
const seen: SleepSummary = summary;
const seenWithoutStages: SleepSummary = noStages;

function inTheLimits(figures: SleepFigures): void {
  assert.ok(Number.isInteger(figures.score));
  assert.ok(figures.score >= 0 && figures.score <= SLEEP_SCORE_MAX);
  assert.ok(Number.isInteger(figures.asleep_min));
  assert.ok(figures.asleep_min >= 1 && figures.asleep_min <= SLEEP_NIGHT_MAX_MIN);
  assert.ok(Number.isInteger(figures.awake_min));
  assert.ok(figures.awake_min >= 0 && figures.awake_min <= SLEEP_NIGHT_MAX_MIN);
  const stages = figures.stages;
  if (stages !== undefined) {
    assert.deepEqual(Object.keys(stages).sort(), ["deep_min", "light_min", "rem_min"]);
    const told = stages.rem_min + stages.light_min + stages.deep_min;
    // Sleep of no told stage is in `asleep_min` only.
    assert.ok(told <= figures.asleep_min);
  }
}

test("every example night is in the limits of the contract", () => {
  for (const figures of [sent, kept, sentWithActivity, keptWithActivity, seen]) {
    inTheLimits(figures);
    assert.ok(figures.stages !== undefined);
  }
  inTheLimits(seenWithoutStages);
  // A phone without a watch tells no stage: the field is left out.
  assert.ok(!("stages" in seenWithoutStages));
});

test("a night is a day, never an hour of going to bed or of waking", () => {
  for (const one of [
    kept,
    sentWithActivity,
    keptWithActivity,
    seen,
    seenWithoutStages,
  ]) {
    assert.match(one.night, /^\d{4}-\d{2}-\d{2}$/);
  }
  for (const one of [sent, kept, sentWithActivity, keptWithActivity, seen]) {
    for (const key of Object.keys(one)) {
      assert.ok(!/(_at|_ms|bed|wake|from|to)$/.test(key), key);
    }
  }
});

test("what others read has neither switch", () => {
  assert.deepEqual(Object.keys(seen).sort(), [
    "asleep_min",
    "awake_min",
    "night",
    "score",
    "stages",
  ]);
  // The owner's views are the same night, with the switch of each way.
  const { shared, ...ofProfile } = kept;
  const { shown, ...ofPost } = keptWithActivity;
  assert.deepEqual(ofProfile, seen);
  assert.deepEqual(ofPost, seen);
  assert.equal(typeof shared, "boolean");
  assert.equal(typeof shown, "boolean");
});

test("off on the profile until turned on, on in a post unless turned off", () => {
  assert.equal(SLEEP_SHARED_DEFAULT, false);
  assert.equal(SLEEP_SHOWN_DEFAULT, true);
});

test("a post in a list carries the night its owner shows, as others read it", () => {
  // TASK-467 part B1b: GET /feed and every other list of posts.
  const post = listed as Drawing;
  assert.deepEqual(post.sleep, seen);
  // A post without a night, or with one its owner hides, says null.
  const without: Drawing = { ...post, sleep: null };
  assert.equal(without.sleep, null);
});
