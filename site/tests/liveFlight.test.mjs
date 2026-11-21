/**
 * A flight on the live page (TASK-305 R3, ADR-0375): after the distance and
 * the time, the speed of the moment, the altitude, the vario and the highest
 * altitude, then climb, calories and heart rate as for any activity.
 * `cd site && npm test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { LANGUAGES, TEXTS } from "../live/texts.js";
import { applyView, emptyState, kindOf, measureOf, numbersOf } from "../live/view.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(SITE, "..");
const read = (...parts) => readFileSync(join(...parts), "utf8");
const FIXTURE = JSON.parse(read(REPO, "packages", "shared-types", "fixtures", "live-view.json"));
const UPDATED = Date.parse(FIXTURE.updated_at);
const EN = { lang: "en", units: "km" };

const values = (rows) => Object.fromEntries(rows.map((row) => [row.key, `${row.value} ${row.unit}`.trim()]));

/** Twenty minutes in the air, 1.2 m/s up at 1840 m, 1912 m at most. */
const FLIGHT = {
  distance_m: 8400,
  duration_s: 1200,
  climb_m: 640,
  kcal: 95,
  heart_bpm: 104,
  lengths: null,
  exercise: null,
  alt_m: 1840,
  max_alt_m: 1912,
  vario_mps: 1.24,
  speed_mps: 9.5,
};

const flying = (stats, activity = "paragliding") =>
  applyView(emptyState(), { ...FIXTURE, activity, stats }, UPDATED);

test("a flight shows the numbers of the air, in this order", () => {
  const state = flying(FLIGHT);
  assert.equal(kindOf(state), "map");
  const rows = numbersOf(state, UPDATED, EN);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["distance", "time", "speed", "altitude", "vario", "maxAltitude", "climb", "calories", "heart"],
  );
  assert.deepEqual(values(rows), {
    distance: "8.40 km",
    time: "20:00",
    speed: "34.2 km/h",
    altitude: "1,840 m",
    vario: "+1.2 m/s",
    maxAltitude: "1,912 m",
    climb: "640 m",
    calories: "95 kcal",
    heart: "104 bpm",
  });
});

test("the vario says climbing or sinking with its sign, zero without", () => {
  const vario = (vario_mps, options = EN) => values(numbersOf(flying({ ...FLIGHT, vario_mps }), UPDATED, options)).vario;
  assert.equal(vario(-2.36), "-2.4 m/s");
  assert.equal(vario(0), "0.0 m/s");
  assert.equal(vario(0.04), "0.0 m/s");
  assert.equal(vario(1.24, { lang: "it", units: "km" }), "+1,2 m/s");
});

test("in miles: mph, feet and feet per minute", () => {
  assert.deepEqual(values(numbersOf(flying(FLIGHT), UPDATED, { lang: "en", units: "mi" })), {
    distance: "5.22 mi",
    time: "20:00",
    speed: "21.3 mph",
    altitude: "6,037 ft",
    vario: "+244 ft/min",
    maxAltitude: "6,273 ft",
    climb: "2,100 ft",
    calories: "95 kcal",
    heart: "104 bpm",
  });
});

test("from an app of before, a flight has the average speed and no numbers of the air", () => {
  const before = { distance_m: 8400, duration_s: 1200, climb_m: null, kcal: null, heart_bpm: null };
  assert.equal(measureOf("paragliding"), "speed");
  assert.deepEqual(values(numbersOf(flying(before), UPDATED, EN)), {
    distance: "8.40 km",
    time: "20:00",
    speed: "25.2 km/h",
  });
  // The fixture's flight numbers are null: nothing of the air shows.
  const nulls = numbersOf(flying(FIXTURE.stats), UPDATED, EN).map((row) => row.key);
  assert.ok(!nulls.includes("altitude") && !nulls.includes("vario") && !nulls.includes("maxAltitude"));
});

test("a run keeps its numbers, even if the stats carried the air's", () => {
  assert.deepEqual(
    numbersOf(flying(FLIGHT, "running"), UPDATED, EN).map((row) => row.key),
    ["distance", "time", "pace", "climb", "calories", "heart"],
  );
});

test("the words of a flight are the approved ones (TASK-305 «Testi di R3»)", () => {
  const task = read(REPO, "docs", "tasks", "TASK-305.md");
  for (const language of LANGUAGES) {
    const words = TEXTS[language];
    const row = `| ${language} | ${words.altitude} | ${words.vario} | ${words.maxAltitude} |`;
    assert.ok(task.includes(row), `${language}: ${row} is not in the task file`);
  }
});
