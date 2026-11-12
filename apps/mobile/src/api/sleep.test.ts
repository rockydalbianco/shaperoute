import activityRequest from "@shaperoute/shared-types/fixtures/sleep-activity-request.json";
import activity from "@shaperoute/shared-types/fixtures/sleep-activity.json";
import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

import { answers, apiError } from "../account/testing";
import {
  fetchActivitySleep,
  fetchDrawingSleep,
  isActivitySleep,
  isSleepSummary,
  removeActivitySleep,
  saveActivitySleep,
  showActivitySleep,
  sleepSummaryOf,
} from "./sleep";

// The night of an activity on the API (TASK-467 part B2): the same JSON as
// the API's test_sleep.py.

const API = "http://api";
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

function sent(fetchFn: jest.Mock): { url: string; method: string; body: unknown } {
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  return {
    url,
    method: String(init.method),
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  };
}

test("the examples are the bodies", () => {
  expect(isSleepSummary(summary)).toBe(true);
  expect(isSleepSummary(noStages)).toBe(true);
  expect(isActivitySleep(activity)).toBe(true);
  // What others read has no switch.
  expect(isActivitySleep(summary)).toBe(false);
});

test.each([
  { score: 101 },
  { score: 82.5 },
  { score: "82" },
  { asleep_min: 0 },
  { asleep_min: 1441 },
  { awake_min: -1 },
  { night: "21/09/2026" },
  { night: "2026-09-21T06:40:00Z" },
  { stages: { rem_min: 96, light_min: 268 } },
  { stages: null },
])("a night out of the contract is not one: %j", (changes) => {
  expect(isSleepSummary({ ...summary, ...changes })).toBe(false);
});

test("the night a list of posts carries, or none", () => {
  expect(sleepSummaryOf(summary)).toEqual(summary);
  expect(sleepSummaryOf(noStages)).toEqual(noStages);
  // Null for a post without a night or with one hidden; missing from an
  // API before part B1b.
  expect(sleepSummaryOf(null)).toBeNull();
  expect(sleepSummaryOf(undefined)).toBeNull();
  // An untold `stages` said with a null reads as left out.
  expect(sleepSummaryOf({ ...noStages, stages: null })).toEqual(noStages);
  // Not a night: nothing is shown.
  expect(sleepSummaryOf({ ...summary, score: 140 })).toBeNull();
  expect(sleepSummaryOf("82")).toBeNull();
});

test("the night goes to its activity, by the run's key", async () => {
  const fetchFn = replies({ status: 200, body: activity });
  const outcome = await saveActivitySleep(API, "token", "a b", activityRequest, {
    fetchFn,
  });
  expect(outcome).toEqual({ kind: "ok", value: activity });
  expect(sent(fetchFn)).toEqual({
    url: "http://api/me/activities/a%20b/sleep",
    method: "PUT",
    body: activityRequest,
  });
});

test("not the night before the activity: the API's no", async () => {
  const fetchFn = replies({ status: 422, body: apiError("invalid_request") });
  const outcome = await saveActivitySleep(API, "token", "k", activityRequest, {
    fetchFn,
  });
  expect(outcome.kind).toBe("api_error");
});

test("the switch alone, without the figures", async () => {
  const fetchFn = replies({ status: 200, body: { ...activity, shown: false } });
  const outcome = await showActivitySleep(API, "token", "k", false, { fetchFn });
  expect(outcome).toEqual({ kind: "ok", value: { ...activity, shown: false } });
  expect(sent(fetchFn)).toEqual({
    url: "http://api/me/activities/k/sleep",
    method: "PATCH",
    body: { shown: false },
  });
});

test("one's own night is read with its switch; none is a 404", async () => {
  const found = await fetchActivitySleep(API, "token", "k", {
    fetchFn: replies({ status: 200, body: activity }),
  });
  expect(found).toEqual({ kind: "ok", value: activity });
  const none = await fetchActivitySleep(API, "token", "k", {
    fetchFn: replies({ status: 404, body: apiError("not_found") }),
  });
  expect(none.kind).toBe("api_error");
  // A night without its switch is not the owner's answer.
  const wrong = await fetchActivitySleep(API, "token", "k", {
    fetchFn: replies({ status: 200, body: summary }),
  });
  expect(wrong).toEqual({ kind: "bad_answer", status: 200 });
});

test("the night is taken off the activity", async () => {
  const fetchFn = replies({ status: 204 });
  const outcome = await removeActivitySleep(API, "token", "k", { fetchFn });
  expect(outcome).toEqual({ kind: "ok", value: null });
  expect(sent(fetchFn).method).toBe("DELETE");
});

test("the night of a post, for whoever sees it", async () => {
  const fetchFn = replies({ status: 200, body: summary });
  const outcome = await fetchDrawingSleep(API, "token", "d/1", { fetchFn });
  expect(outcome).toEqual({ kind: "ok", value: summary });
  expect(sent(fetchFn).url).toBe("http://api/drawings/d%2F1/sleep");
});
