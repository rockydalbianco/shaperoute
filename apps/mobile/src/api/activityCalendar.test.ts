import calendar from "@shaperoute/shared-types/fixtures/activity-calendar.json";

import { answers } from "../account/testing";
import { fetchActivityCalendar, isActivityCalendar } from "./activityCalendar";

// The calendar of every sport (TASK-462, ADR-0372): the example of the API
// is what the app reads, and it asks the month, the zone and the sport.

test("the example of the API is a calendar", () => {
  expect(isActivityCalendar(calendar)).toBe(true);
});

test("a calendar missing a field, or with a wrong one, is not", () => {
  const { trend: _trend, ...withoutTrend } = calendar;
  expect(isActivityCalendar(withoutTrend)).toBe(false);
  expect(isActivityCalendar({ ...calendar, month: "2026-13" })).toBe(false);
  const day = calendar.days[0];
  const { tracked: _tracked, ...untold } = day.activities[0];
  expect(
    isActivityCalendar({ ...calendar, days: [{ ...day, activities: [untold] }] }),
  ).toBe(false);
  expect(isActivityCalendar(null)).toBe(false);
});

test("it asks the zone, the month and the sport, with the token", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  const outcome = await fetchActivityCalendar(
    "http://api",
    "token",
    "Europe/Rome",
    "2026-11",
    "running",
    { fetchFn: fetchFn as unknown as typeof fetch, key: null },
  );
  expect(outcome.kind).toBe("ok");
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(
    "http://api/me/activity-calendar?tz=Europe%2FRome&month=2026-11&sport=running",
  );
  expect((init as RequestInit).headers).toMatchObject({
    Authorization: "Bearer token",
  });
});

test("without a month and a sport, this month and all of them", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  await fetchActivityCalendar("http://api", "token", "UTC", null, null, {
    fetchFn: fetchFn as unknown as typeof fetch,
    key: null,
  });
  expect(String(fetchFn.mock.calls[0][0])).toBe(
    "http://api/me/activity-calendar?tz=UTC",
  );
});
