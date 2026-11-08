import assert from "node:assert/strict";
import { test } from "node:test";

import request from "../fixtures/live-share-request.json" with { type: "json" };
import update from "../fixtures/live-share-update.json" with { type: "json" };
import view from "../fixtures/live-view.json" with { type: "json" };
import {
  LIVE_AFTER_FINISH_S,
  LIVE_LINK_LIFE_S,
  LIVE_PAGE,
  LIVE_POINT_EVERY_S,
  LIVE_POINTS_PER_UPDATE_MAX,
  type LiveShareRequest,
  type LiveUpdate,
  type LiveView,
  RUN_ACTIVITIES,
} from "../src/index.ts";

// The same fixtures are checked by the API's test_live_shares.py (TASK-424,
// ADR-0352).

test("the example request is of an activity the API knows", () => {
  const body = request as LiveShareRequest;
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes(body.activity));
});

test("the example update is within the limits", () => {
  const body = update as LiveUpdate;
  assert.ok(body.points.length <= LIVE_POINTS_PER_UPDATE_MAX);
  const times = body.points.map((p) => Date.parse(p.at));
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] - times[i - 1] >= LIVE_POINT_EVERY_S * 1000);
  }
  assert.ok(["live", "paused", "finished"].includes(body.state));
});

test("the example view lists the points of the update, in seconds", () => {
  const body = view as LiveView;
  assert.equal(body.points.length, update.points.length);
  body.points.forEach(([lat, lon, t], i) => {
    assert.equal(lat, update.points[i].lat);
    assert.equal(lon, update.points[i].lon);
    assert.equal(t * 1000, Date.parse(update.points[i].at));
  });
  assert.equal(
    Date.parse(body.expires_at ?? "") - Date.parse(body.started_at ?? ""),
    LIVE_LINK_LIFE_S * 1000,
  );
});

test("the link's page is the site's, the token after the #", () => {
  assert.ok(LIVE_PAGE.startsWith("https://getmuw.app/"));
  assert.ok(LIVE_PAGE.endsWith("#"));
  assert.ok(LIVE_AFTER_FINISH_S < LIVE_LINK_LIFE_S);
});
