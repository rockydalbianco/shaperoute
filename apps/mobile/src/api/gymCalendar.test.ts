import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";

import { answers, apiError } from "../account/testing";
import {
  fetchGymCalendar,
  isGymCalendar,
  phoneMonth,
  phoneTimeZone,
} from "./gymCalendar";

// TASK-411 B: the calendar of one's own workouts at the gym, as the API
// gives it.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the example of the API is what the app reads", () => {
  expect(isGymCalendar(calendar)).toBe(true);
  expect(isGymCalendar({ ...calendar, days: [], last: null, count: 0 })).toBe(true);
  expect(isGymCalendar({ ...calendar, month: "2026-13" })).toBe(false);
  expect(isGymCalendar({ ...calendar, days: [{ day: 32, workouts: [] }] })).toBe(false);
  expect(
    isGymCalendar({ ...calendar, last: { ...calendar.last, started_at: "soon" } }),
  ).toBe(false);
});

test("it asks for the phone's time zone and, when given, a month", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  const outcome = await fetchGymCalendar(
    URL,
    TOKEN,
    "Europe/Rome",
    "2026-10",
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: calendar });
  expect(String(fetchFn.mock.calls[0][0])).toBe(
    "http://api/me/gym-calendar?tz=Europe%2FRome&month=2026-10",
  );
  await fetchGymCalendar(URL, TOKEN, "UTC", null, options(fetchFn));
  expect(String(fetchFn.mock.calls[1][0])).toBe("http://api/me/gym-calendar?tz=UTC");
});

test("an API without the calendar is an error, not a calendar", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  const outcome = await fetchGymCalendar(URL, TOKEN, "UTC", null, options(fetchFn));
  expect(outcome.kind).not.toBe("ok");
});

test("the phone's month and time zone", () => {
  expect(phoneMonth(new Date(2026, 0, 31))).toBe("2026-01");
  expect(phoneMonth(new Date(2026, 10, 1))).toBe("2026-11");
  expect(phoneTimeZone()).toMatch(/^[A-Za-z0-9_+\-/]+$/);
});
