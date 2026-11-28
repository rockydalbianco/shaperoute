import assert from "node:assert/strict";
import { test } from "node:test";

import request from "../fixtures/group-outing-request.json" with { type: "json" };
import detail from "../fixtures/group-outing.json" with { type: "json" };
import outings from "../fixtures/group-outings.json" with { type: "json" };
import {
  GROUP_OUTING_DESTINATION_MAX,
  GROUP_RUN_TITLE_MAX,
  type GroupOuting,
  type GroupOutingDetail,
  type GroupOutingRequest,
  type GroupOutings,
  type GroupOutingVisibility,
  type GroupRunPushData,
  type GroupRunVisibility,
  type LatLon,
} from "../src/index.ts";

// The outings of a group (TASK-495 part C, ADR-0402): the examples the
// app's tests read, shaped as group_runs.py answers; test_group_outings.py
// validates the same.
const point = ([lat, lon]: number[]): LatLon => [lat, lon];

function visibility(value: string): GroupRunVisibility | GroupOutingVisibility {
  return value === "group" || value === "followers" ? value : "everyone";
}

function card(json: (typeof outings.upcoming)[number]): GroupOuting {
  return {
    ...json,
    visibility: visibility(json.visibility),
    status: json.status === "over" ? "over" : "upcoming",
    start: point(json.start),
    preview: json.preview.map(point),
  };
}

const asked: GroupOutingRequest = {
  ...request,
  meeting_point: point(request.meeting_point),
  visibility: request.visibility === "everyone" ? "everyone" : "group",
};
const whole: GroupOutingDetail = {
  ...detail,
  ...card({ ...detail, preview: [] }),
  points: [],
  walks: [],
  on_foot: [],
};
const page: GroupOutings = {
  upcoming: outings.upcoming.map(card),
  past: outings.past.map(card),
};
const told: GroupRunPushData = { kind: "group_outing_new", group_run_id: whole.id };

test("an outing without a route is asked for with a meeting point and a destination", () => {
  assert.equal(asked.meeting_point.length, 2);
  assert.ok(asked.destination.length <= GROUP_OUTING_DESTINATION_MAX);
  assert.ok(asked.title.length <= GROUP_RUN_TITLE_MAX);
  assert.match(asked.starts_at, /[+-]\d\d:\d\d$|Z$/);
  assert.equal(asked.visibility, "group");
});

test("an outing without a route has no line and nothing measured", () => {
  assert.deepEqual(whole.points, []);
  assert.deepEqual(whole.preview, []);
  assert.equal(whole.distance_m, null);
  assert.equal(whole.route_m, null);
  assert.equal(whole.similarity, null);
  assert.deepEqual(whole.start, point(request.meeting_point));
  assert.equal(whole.destination, request.destination);
  assert.equal(whole.group_id, request.group_id);
  assert.deepEqual(whole.people[0], whole.organiser);
});

test("a group's page has its outings with and without a route", () => {
  const [withRoute, withoutRoute] = page.upcoming;
  assert.ok(withRoute.preview.length >= 2 && withRoute.distance_m !== null);
  assert.equal(withRoute.destination, null);
  assert.deepEqual(withoutRoute.preview, []);
  assert.ok(page.upcoming.every((one) => one.group_id === whole.group_id));
  assert.deepEqual(page.past, []);
});

test("the notification of a new outing opens it", () => {
  assert.equal(told.kind, "group_outing_new");
  assert.equal(told.group_run_id, whole.id);
});
