import personal from "@shaperoute/shared-types/fixtures/game-personal.json";

import { answers, apiError } from "../account/testing";
import { noGame } from "./gameApi";
import { fetchGamePersonal, isGamePersonal, offsetNow } from "./personalApi";

/** GET /game/personal (TASK-423 part C), as the app asks and reads it. */

const URL = "http://api";

test("the API's example is what the app reads", () => {
  expect(isGamePersonal(personal)).toBe(true);
});

test("a challenge without its three steps, or a period that is not a day, is a bad answer", () => {
  const week = personal.week;
  const [first, ...rest] = week.challenges;
  expect(
    isGamePersonal({
      ...personal,
      week: { ...week, challenges: [{ ...first, tiers: [2, 3] }, ...rest] },
    }),
  ).toBe(false);
  expect(
    isGamePersonal({
      ...personal,
      week: { ...week, challenges: [{ ...first, unit: "laps" }, ...rest] },
    }),
  ).toBe(false);
  expect(
    isGamePersonal({ ...personal, month: { ...personal.month, end: "soon" } }),
  ).toBe(false);
  expect(isGamePersonal({ ...personal, streaks: [{ runs: 1 }] })).toBe(false);
  expect(
    isGamePersonal({
      ...personal,
      finished: [{ ...personal.finished[0], period: "year" }],
    }),
  ).toBe(false);
  // A pace without a run of the distance: null.
  expect(
    isGamePersonal({
      ...personal,
      week: { ...week, challenges: [{ ...first, value: null }, ...rest] },
    }),
  ).toBe(true);
});

test("asked with the token and the phone's offset from UTC", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: personal });
  const outcome = await fetchGamePersonal(URL, "the-token", 60, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: personal });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/game/personal?utc_offset_min=60");
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: "Bearer the-token" },
  });
  // Whole minutes, west of UTC too.
  const west: jest.Mock = answers({ status: 200, body: personal });
  await fetchGamePersonal(URL, "the-token", -210.4, { fetchFn: west, key: null });
  expect(west.mock.calls[0][0]).toBe("http://api/game/personal?utc_offset_min=-210");
});

test("an API before TASK-423 part C says it has none", async () => {
  const fetchFn: jest.Mock = answers({
    status: 404,
    body: apiError("http_error", "Not Found"),
  });
  const outcome = await fetchGamePersonal(URL, "the-token", 0, { fetchFn, key: null });
  expect(noGame(outcome)).toBe(true);
});

test("the offset now is the phone's", () => {
  const now = Date.parse("2026-11-10T09:00:00Z");
  expect(offsetNow(now)).toBe(0 - new Date(now).getTimezoneOffset());
});
