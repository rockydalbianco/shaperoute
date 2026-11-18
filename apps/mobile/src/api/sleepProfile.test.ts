import request from "@shaperoute/shared-types/fixtures/sleep-night-request.json";
import kept from "@shaperoute/shared-types/fixtures/sleep-night.json";
import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

import { answers, apiError } from "../account/testing";
import {
  fetchProfileSleep,
  isSleepNight,
  shareSleepNight,
  stopSharingSleep,
} from "./sleepProfile";

// The night on the profile, on the API (TASK-467 part B3): the same JSON
// as the API's test_sleep.py.

const API = "http://api";
const replies = (...list: Parameters<typeof answers>) =>
  answers(...list) as unknown as typeof fetch & jest.Mock;

function sent(fetchFn: jest.Mock): { url: string; method: string; body: unknown } {
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  return {
    url,
    method: String(init.method),
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  };
}

test("the examples are the bodies", () => {
  expect(isSleepNight(kept)).toBe(true);
  // What others read does not say whether it is shared.
  expect(isSleepNight(summary)).toBe(false);
  expect(isSleepNight({ ...kept, shared: "yes" })).toBe(false);
  expect(isSleepNight({ ...kept, score: 101 })).toBe(false);
});

test("«Share» sends the figures of the night with `shared` on, and nothing else", async () => {
  const fetchFn = replies({ status: 200, body: kept });
  const outcome = await shareSleepNight(API, "t", summary, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: kept });
  expect(sent(fetchFn)).toEqual({
    url: `${API}/me/sleep/2026-09-21`,
    method: "PUT",
    body: request,
  });
  expect(Object.keys(sent(fetchFn).body as object).sort()).toEqual([
    "asleep_min",
    "awake_min",
    "score",
    "shared",
    "stages",
  ]);
});

test("a night no watch told the stages of is shared without them", async () => {
  const fetchFn = replies({ status: 200, body: { ...noStages, shared: true } });
  await shareSleepNight(API, "t", noStages, { fetchFn, key: null });
  expect(sent(fetchFn).body).toEqual({
    score: noStages.score,
    asleep_min: noStages.asleep_min,
    awake_min: noStages.awake_min,
    shared: true,
  });
});

test("an answer that is not the night is no yes", async () => {
  // 204 is «not kept»: never the answer to a night shared.
  const fetchFn = replies({ status: 204 });
  expect(await shareSleepNight(API, "t", summary, { fetchFn, key: null })).toEqual({
    kind: "bad_answer",
    status: 204,
  });
});

test("«Stop sharing» asks for no night of the account on its profile", async () => {
  const fetchFn = replies({ status: 204 });
  expect(await stopSharingSleep(API, "t", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
  expect(sent(fetchFn)).toEqual({
    url: `${API}/me/sleep/shared`,
    method: "DELETE",
    body: undefined,
  });
});

test("the latest night a profile shares, or none", async () => {
  const fetchFn = replies(
    { status: 200, body: summary },
    { status: 404, body: apiError("http_error") },
  );
  expect(await fetchProfileSleep(API, "t", "a b", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: summary,
  });
  expect(sent(fetchFn).url).toBe(`${API}/users/a%20b/sleep`);
  const none = await fetchProfileSleep(API, "t", "p", { fetchFn, key: null });
  expect(none.kind).toBe("api_error");
});
