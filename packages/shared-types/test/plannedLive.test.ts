import assert from "node:assert/strict";
import { test } from "node:test";

import page from "../fixtures/lives-page.json" with { type: "json" };
import item from "../fixtures/planned-live.json" with { type: "json" };
import request from "../fixtures/planned-live-request.json" with { type: "json" };
import {
  type LiveItem,
  type LivesPage,
  PLANNED_LIVE_TITLE_MAX,
  type PlannedLiveRequest,
  RUN_ACTIVITIES,
} from "../src/index.ts";

// The same fixtures are checked by the API's test_planned_lives.py
// (TASK-468 part A2a, ADR-0381).

test("the example request is of an activity the API knows, within limits", () => {
  const body = request as PlannedLiveRequest;
  assert.ok((RUN_ACTIVITIES as readonly string[]).includes(body.activity));
  assert.ok(body.title.length >= 1 && body.title.length <= PLANNED_LIVE_TITLE_MAX);
  assert.ok(!Number.isNaN(Date.parse(body.starts_at)));
  assert.match(body.starts_at, /([+-]\d\d:\d\d|Z)$/);
});

test("the example item is a planned live not started", () => {
  const body = item as LiveItem;
  assert.equal(body.state, "planned");
  assert.equal(body.share_id, null);
  assert.equal(body.id, body.planned_live_id);
});

test("the example row puts the lives going on first", () => {
  const body = page as LivesPage;
  const going = body.lives.map((l) => ["live", "paused", "finished"].includes(l.state));
  assert.deepEqual(
    going,
    [...going].sort((a, b) => Number(b) - Number(a)),
  );
  for (const l of body.lives) {
    assert.equal(l.share_id !== null, ["live", "paused", "finished"].includes(l.state));
  }
});
