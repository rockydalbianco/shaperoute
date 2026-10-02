import activities from "@shaperoute/shared-types/fixtures/activities.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import { answers, apiError } from "../account/testing";
import {
  type ActivityRequest,
  fetchActivities,
  fetchActivity,
  isActivitiesPage,
  isActivity,
  isActivityDetail,
  removeActivity,
  saveActivity,
} from "./activities";

const URL = "http://api";
const TOKEN = "the-token";
const ID = activity.id;
const AUTH = { Authorization: `Bearer ${TOKEN}` };

test("the examples of the API are what the app reads", () => {
  expect(isActivitiesPage(activities)).toBe(true);
  expect(activities.activities.every(isActivity)).toBe(true);
  expect(isActivityDetail(activity)).toBe(true);
  // The request has the fields of the type, no more and no fewer.
  const typed: ActivityRequest = request as ActivityRequest;
  expect(Object.keys(typed).sort()).toEqual(
    [
      "pauses",
      "points",
      "shape",
      "similarity",
      "style",
      "title",
      "track",
      "word",
    ].sort(),
  );
  expect(Object.keys(typed.pauses[0]).sort()).toEqual(["auto", "from_ms", "to_ms"]);
});

test("the first page is asked with the token, the next with its cursor", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { ...activities, next: "1790000000000000-7" } },
    { status: 200, body: activities },
  );
  const first = await fetchActivities(URL, TOKEN, null, { fetchFn, key: null });
  expect(first).toEqual({
    kind: "ok",
    value: { ...activities, next: "1790000000000000-7" },
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/activities");
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
  await fetchActivities(URL, TOKEN, "1790000000000000-7", { fetchFn, key: null });
  expect(fetchFn.mock.calls[1][0]).toBe(
    "http://api/me/activities?cursor=1790000000000000-7",
  );
});

test("one run comes whole", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: activity });
  const outcome = await fetchActivity(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: activity });
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/me/activities/${ID}`);
});

test("saving sends the run under its key; new or already saved is the same", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers(
    { status: 201, body: saved },
    { status: 200, body: saved },
  );
  const body = request as ActivityRequest;
  for (let i = 0; i < 2; i += 1) {
    const outcome = await saveActivity(URL, TOKEN, ID, body, { fetchFn, key: null });
    expect(outcome).toEqual({ kind: "ok", value: saved });
  }
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${ID}`);
  expect(init).toMatchObject({
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
  });
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("deleting answers with nothing", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  const outcome = await removeActivity(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${ID}`);
  expect(init).toMatchObject({ method: "DELETE", headers: AUTH });
});

test("what the API refuses comes with its code", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 401, body: apiError("session_expired") },
    { status: 404, body: apiError("http_error", "No activity with this key.") },
    new Error("no network"),
  );
  expect(await fetchActivities(URL, TOKEN, null, { fetchFn, key: null })).toMatchObject(
    { kind: "api_error", code: "session_expired" },
  );
  expect(await fetchActivity(URL, TOKEN, ID, { fetchFn, key: null })).toMatchObject({
    kind: "api_error",
    code: "http_error",
  });
  expect(await removeActivity(URL, TOKEN, ID, { fetchFn, key: null })).toEqual({
    kind: "unreachable",
    url: URL,
  });
});

test("an answer that is not a run is a bad answer", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { activities: [{ ...saved, distance_m: "4 km" }] } },
    { status: 200, body: { ...activity, track: [[46.0671, 11.1214]] } },
    { status: 200, body: { ...saved, track_preview: null } },
  );
  expect(await fetchActivities(URL, TOKEN, null, { fetchFn, key: null })).toEqual({
    kind: "bad_answer",
    status: 200,
  });
  expect(await fetchActivity(URL, TOKEN, ID, { fetchFn, key: null })).toEqual({
    kind: "bad_answer",
    status: 200,
  });
  const body = request as ActivityRequest;
  expect(await saveActivity(URL, TOKEN, ID, body, { fetchFn, key: null })).toEqual({
    kind: "bad_answer",
    status: 200,
  });
});
