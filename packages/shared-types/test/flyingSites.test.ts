import assert from "node:assert/strict";
import { test } from "node:test";

import history from "../fixtures/flying-site-history.json" with { type: "json" };
import detail from "../fixtures/flying-site.json" with { type: "json" };
import box from "../fixtures/flying-sites.json" with { type: "json" };
import {
  COMPASS_POINTS,
  FLYING_HISTORY_MIN_PILOTS,
  FLYING_SITE_KINDS,
  FLYING_SITES_MAX,
  FLYING_SITES_NEAR_M,
  type FlyingHistory,
  type FlyingSite,
  type FlyingSiteDetail,
  type FlyingSites,
} from "../src/flyingSites.ts";

// The answers of flying_sites.py and flying_history.py (TASK-493), as the
// app reads them.
const sites = box as FlyingSites;
const one = detail as FlyingSiteDetail;
const flights = history as FlyingHistory;
const ATTRIBUTION = "© OpenStreetMap contributors";

function checkSite(site: FlyingSite): void {
  assert.ok(Number.isInteger(site.id) && site.id > 0);
  assert.ok((FLYING_SITE_KINDS as readonly string[]).includes(site.kind));
  assert.ok(site.lat >= -90 && site.lat <= 90);
  assert.ok(site.lon >= -180 && site.lon <= 180);
  assert.match(site.osm_url, /^https:\/\/www\.openstreetmap\.org\/(node|way)\/\d+$/);
  for (const point of site.orientation) {
    assert.ok((COMPASS_POINTS as readonly string[]).includes(point));
  }
  // Compass order, each once.
  const order = site.orientation.map((p) => COMPASS_POINTS.indexOf(p));
  assert.deepEqual(
    order,
    [...new Set(order)].sort((a, b) => a - b),
  );
}

test("a box gives its sites with the attribution", () => {
  assert.equal(sites.attribution, ATTRIBUTION);
  assert.equal(sites.more, false);
  assert.ok(sites.sites.length <= FLYING_SITES_MAX);
  for (const site of sites.sites) {
    checkSite(site);
    assert.equal(site.away_m, null);
  }
});

test("a site may come without name, altitude, orientation or official", () => {
  const bare = sites.sites[2];
  assert.equal(bare.name, null);
  assert.equal(bare.ele_m, null);
  assert.deepEqual(bare.orientation, []);
});

test("a takeoff's page names its landings, the nearest first", () => {
  assert.equal(one.attribution, ATTRIBUTION);
  checkSite(one.site);
  assert.equal(one.site.away_m, null);
  let last = 0;
  for (const site of one.near) {
    checkSite(site);
    assert.notEqual(site.kind, one.site.kind);
    assert.ok(site.away_m !== null && site.away_m >= last);
    assert.ok(site.away_m <= FLYING_SITES_NEAR_M);
    last = site.away_m;
  }
});

test("a takeoff's history: twelve months, the oldest first, and the records", () => {
  assert.equal(flights.few, false);
  assert.ok(flights.pilots !== null && flights.pilots >= FLYING_HISTORY_MIN_PILOTS);
  assert.ok(flights.months !== null && flights.months.length === 12);
  const months = flights.months.map((m) => m.month);
  assert.deepEqual(months, [...months].sort());
  for (const month of flights.months) {
    assert.match(month.month, /^\d{4}-\d{2}$/);
    assert.ok(month.pilots <= month.flights);
  }
  assert.ok(flights.in_air_now.shares.length <= flights.in_air_now.count);
  const record = flights.records.longest_s;
  assert.ok(record !== null && record.value > 0 && record.username.length > 0);
  assert.equal(flights.records.farthest_m, null);
});

test("under three pilots the numbers are null", () => {
  const few: FlyingHistory = {
    ...flights,
    few: true,
    flights: null,
    pilots: null,
    today: null,
    months: null,
  };
  assert.equal(few.months, null);
  assert.equal(FLYING_HISTORY_MIN_PILOTS, 3);
});
