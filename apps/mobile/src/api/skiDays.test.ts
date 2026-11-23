import resortSnow from "@shaperoute/shared-types/fixtures/resort-snow.json";
import skiDayRequest from "@shaperoute/shared-types/fixtures/ski-day-request.json";
import skiDay from "@shaperoute/shared-types/fixtures/ski-day.json";
import type { SkiDayRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  fetchResortSnow,
  fetchSkiDay,
  isResortSnow,
  isSkiDay,
  keepSkiDay,
  sentOf,
  UNKNOWN_DAY,
} from "./skiDays";

// A day of skiing's resort, gear and snow (TASK-406 part D2): the same JSON
// as the API's test_ski_days_api.py.

const API = "http://api";
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);
const REQUEST = skiDayRequest as SkiDayRequest;

test("the examples are the bodies", () => {
  expect(isSkiDay(skiDay)).toBe(true);
  expect(isSkiDay({ resort: null, gear: null, snow: null })).toBe(true);
  expect(isSkiDay({ ...skiDay, snow: "slush" })).toBe(false);
  expect(isSkiDay({ ...skiDay, resort: { id: "a" } })).toBe(false);
  expect(isResortSnow(resortSnow)).toBe(true);
  expect(isResortSnow({ ...resortSnow, snow: [{ snow: "powder", days: 0 }] })).toBe(
    false,
  );
});

test("the day's choices go to the run's key, with the token", async () => {
  const fetchFn = replies({ status: 200, body: skiDay });
  const outcome = await keepSkiDay(API, "tok", "a1b2c3d4e5f60718", REQUEST, {
    fetchFn,
  });
  expect(outcome).toEqual({ kind: "ok", value: skiDay });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/activities/a1b2c3d4e5f60718/ski`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual(REQUEST);
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
});

test("the post's day and the resort's snow are read with the token", async () => {
  const fetchFn = replies(
    { status: 200, body: skiDay },
    { status: 200, body: resortSnow },
  );
  expect((await fetchSkiDay(API, "tok", "d 1", { fetchFn })).kind).toBe("ok");
  expect((await fetchResortSnow(API, "tok", "aaa1", { fetchFn })).kind).toBe("ok");
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/drawings/d%201/ski-day`);
  expect(fetchFn.mock.calls[1][0]).toBe(`${API}/ski-resorts/aaa1/snow`);
});

test("a day not on the API yet is tried later; a refused one never again", async () => {
  const ask = (status: number, body: unknown) =>
    keepSkiDay(API, "tok", "a1b2c3d4e5f60718", REQUEST, {
      fetchFn: replies({ status, body }),
    });
  expect(sentOf(await ask(200, skiDay))).toBe("sent");
  expect(sentOf(await ask(404, apiError("http_error", UNKNOWN_DAY)))).toBe("later");
  expect(sentOf(await ask(422, apiError("http_error", "Only a day of skiing…")))).toBe(
    "refused",
  );
  expect(sentOf(await ask(422, apiError("invalid_request")))).toBe("refused");
  expect(sentOf(await ask(503, apiError("unavailable")))).toBe("later");
  const offline = await keepSkiDay(API, "tok", "k", REQUEST, {
    fetchFn: replies(new Error("offline")),
  });
  expect(sentOf(offline)).toBe("later");
});
