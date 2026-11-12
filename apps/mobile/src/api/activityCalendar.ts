import type {
  ActivityCalendar,
  CalendarActivity,
  CalendarDay,
  CalendarMonth,
  RunActivity,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The calendar of all one's own activities (TASK-462, ADR-0372, docs/API.md
 * «Il calendario delle attività»): a month on the phone's time zone with the
 * days of every sport the app reads, the twelve months up to it and the
 * sports the account has. The body is packages/shared-types/fixtures/
 * activity-calendar.json. An API without it answers 404: whoever asks shows
 * nothing of it.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isCalendarActivity(body: unknown): body is CalendarActivity {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const one = body as Record<string, unknown>;
  return (
    typeof one.id === "string" &&
    typeof one.activity === "string" &&
    typeof one.started_at === "string" &&
    !Number.isNaN(new Date(one.started_at).getTime()) &&
    isNumber(one.distance_m) &&
    isNumber(one.duration_s) &&
    (one.kcal === null || isNumber(one.kcal)) &&
    typeof one.tracked === "boolean" &&
    isText(one.shape) &&
    isText(one.word) &&
    isText(one.title) &&
    isText(one.place)
  );
}

function isCalendarDay(body: unknown): body is CalendarDay {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { day, activities } = body as Record<string, unknown>;
  return (
    typeof day === "number" &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 31 &&
    Array.isArray(activities) &&
    activities.every(isCalendarActivity)
  );
}

function isCalendarMonth(body: unknown): body is CalendarMonth {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { month, count, distance_m, duration_s } = body as Record<string, unknown>;
  return (
    typeof month === "string" &&
    MONTH.test(month) &&
    isNumber(count) &&
    isNumber(distance_m) &&
    isNumber(duration_s)
  );
}

export function isActivityCalendar(body: unknown): body is ActivityCalendar {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { month, tz, sport, count, distance_m, duration_s, days, trend, sports } =
    body as Record<string, unknown>;
  return (
    typeof month === "string" &&
    MONTH.test(month) &&
    typeof tz === "string" &&
    (sport === null || typeof sport === "string") &&
    isNumber(count) &&
    isNumber(distance_m) &&
    isNumber(duration_s) &&
    Array.isArray(days) &&
    days.every(isCalendarDay) &&
    Array.isArray(trend) &&
    trend.every(isCalendarMonth) &&
    Array.isArray(sports) &&
    sports.every((one) => typeof one === "string")
  );
}

/** GET /me/activity-calendar: `month` YYYY-MM, this one on `tz` when null;
 * `sport` one sport, all when null. */
export function fetchActivityCalendar(
  baseUrl: string,
  token: string,
  tz: string,
  month: string | null,
  sport: RunActivity | null,
  options: Options = {},
): Promise<AccountOutcome<ActivityCalendar>> {
  const query = new URLSearchParams({ tz });
  if (month !== null) {
    query.set("month", month);
  }
  if (sport !== null) {
    query.set("sport", sport);
  }
  return ask(
    baseUrl,
    `/me/activity-calendar?${query.toString()}`,
    { method: "GET", token },
    isActivityCalendar,
    options,
  );
}
