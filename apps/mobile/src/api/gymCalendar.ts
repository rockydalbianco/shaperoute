import type {
  GymCalendar,
  GymCalendarDay,
  GymCalendarWorkout,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The calendar of one's own workouts at the gym (TASK-411 B, ADR-0341 point
 * 2, docs/API.md «Gym»): a month on the phone's time zone, its days with a
 * workout, and the last workout of all. The body is packages/shared-types/
 * fixtures/gym-calendar.json. An API without it answers 404: whoever asks
 * shows what it can without it.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isGymCalendarWorkout(body: unknown): body is GymCalendarWorkout {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { id, started_at, duration_s, drawing_id } = body as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof started_at === "string" &&
    !Number.isNaN(new Date(started_at).getTime()) &&
    typeof duration_s === "number" &&
    Number.isFinite(duration_s) &&
    duration_s >= 0 &&
    (drawing_id === null || typeof drawing_id === "string")
  );
}

function isGymCalendarDay(body: unknown): body is GymCalendarDay {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { day, workouts } = body as Record<string, unknown>;
  return (
    typeof day === "number" &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 31 &&
    Array.isArray(workouts) &&
    workouts.every(isGymCalendarWorkout)
  );
}

export function isGymCalendar(body: unknown): body is GymCalendar {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { month, tz, count, duration_s, days, last } = body as Record<string, unknown>;
  return (
    typeof month === "string" &&
    MONTH.test(month) &&
    typeof tz === "string" &&
    typeof count === "number" &&
    typeof duration_s === "number" &&
    Array.isArray(days) &&
    days.every(isGymCalendarDay) &&
    (last === null || isGymCalendarWorkout(last))
  );
}

/** The phone's time zone, as the API reads it («Europe/Rome»); UTC when the
 * phone cannot say. */
export function phoneTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone !== "" ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

/** This month on the phone's clock, YYYY-MM. */
export function phoneMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** GET /me/gym-calendar: `month` YYYY-MM, this one on `tz` when null. */
export function fetchGymCalendar(
  baseUrl: string,
  token: string,
  tz: string,
  month: string | null,
  options: Options = {},
): Promise<AccountOutcome<GymCalendar>> {
  const query = new URLSearchParams({ tz });
  if (month !== null) {
    query.set("month", month);
  }
  return ask(
    baseUrl,
    `/me/gym-calendar?${query.toString()}`,
    { method: "GET", token },
    isGymCalendar,
    options,
  );
}
