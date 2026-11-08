import assert from "node:assert/strict";
import { test } from "node:test";

import weather from "../fixtures/ski-resort-weather.json" with { type: "json" };
import found from "../fixtures/ski-resorts.json" with { type: "json" };
import {
  type AltitudeWeather,
  PISTE_DIFFICULTIES,
  SKI_RESORTS_MAX,
  type SkiResorts,
  type SkiResortWeather,
} from "../src/index.ts";

// The answers of ski_resorts_api.py (TASK-406), as the app reads them.
const resorts = found as SkiResorts;
const forecast = weather as SkiResortWeather;

test("a search by place gives each resort with how far it is", () => {
  assert.ok(resorts.resorts.length >= 1 && resorts.resorts.length <= SKI_RESORTS_MAX);
  for (const resort of resorts.resorts) {
    assert.equal(typeof resort.away_m, "number");
    assert.equal(resort.bbox.length, 4);
    assert.ok(Number.isInteger(resort.lifts) && resort.lifts >= 0);
  }
});

test("the km by difficulty add up to the pistes' km", () => {
  for (const resort of resorts.resorts) {
    const sum = Object.values(resort.piste_km_by_difficulty).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - resort.piste_km) < 0.05);
    for (const key of Object.keys(resort.piste_km_by_difficulty)) {
      assert.ok((PISTE_DIFFICULTIES as readonly string[]).includes(key));
    }
  }
});

test("a resort may come without region, altitudes or website", () => {
  const bare = resorts.resorts[1];
  assert.equal(bare.region, null);
  assert.equal(bare.min_elevation_m, null);
  assert.equal(bare.website, null);
});

function checkAltitude(side: AltitudeWeather) {
  assert.equal(side.hours.length, 24);
  assert.equal(side.snow_estimate, true);
  const times = side.hours.map((hour) => Date.parse(hour.time));
  times.forEach((time, i) => {
    assert.ok(Number.isFinite(time));
    if (i > 0) {
      assert.equal(time - times[i - 1], 3_600_000);
    }
  });
  // The estimate of ADR-0338: what falls at 0.5 °C or less, 1 mm = 1 cm.
  const snow = side.hours
    .filter((hour) => (hour.temperature_c ?? Infinity) <= 0.5)
    .reduce((cm, hour) => cm + (hour.precipitation_mm ?? 0), 0);
  assert.ok(Math.abs(snow - side.fresh_snow_cm) < 0.05);
}

test("the weather has 24 hours at the base and at the top, snow estimated", () => {
  assert.equal(forecast.resort_id, resorts.resorts[0].id);
  assert.equal(forecast.attribution, "MET Norway");
  assert.equal(forecast.base.altitude_m, resorts.resorts[0].min_elevation_m);
  assert.ok(forecast.top !== null);
  assert.equal(forecast.top.altitude_m, resorts.resorts[0].max_elevation_m);
  checkAltitude(forecast.base);
  checkAltitude(forecast.top);
});
