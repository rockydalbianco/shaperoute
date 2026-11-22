import {
  GROUP_RUN_EARLIEST_MINUTES,
  GROUP_RUN_LATEST_DAYS,
} from "@shaperoute/shared-types";

/**
 * The day and the time of a group run (TASK-309 part B), picked with steps
 * as «Plan a live» does, in JavaScript (no native picker, no new
 * dependency): from GROUP_RUN_EARLIEST_MINUTES to GROUP_RUN_LATEST_DAYS from
 * now, as the API takes them, on the phone's clock. The API checks again on
 * its own clock.
 */

/** A step of the time, in minutes. */
export const TIME_STEP_MIN = 15;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** The first moment a group run may start: 30 minutes from now, up to the
 * next step. */
export function earliestStart(now: Date): Date {
  const at = new Date(now.getTime() + GROUP_RUN_EARLIEST_MINUTES * MINUTE_MS);
  at.setSeconds(0, 0);
  const over = at.getMinutes() % TIME_STEP_MIN;
  if (over !== 0) {
    at.setMinutes(at.getMinutes() + TIME_STEP_MIN - over);
  }
  return at;
}

/** The last moment a group run may start: 60 days from now. */
export function latestStart(now: Date): Date {
  return new Date(now.getTime() + GROUP_RUN_LATEST_DAYS * DAY_MS);
}

/** Whether `at` is a start the API takes, by the phone's clock. */
export function startAllowed(at: Date, now: Date): boolean {
  return (
    at.getTime() >= now.getTime() + GROUP_RUN_EARLIEST_MINUTES * MINUTE_MS &&
    at.getTime() <= latestStart(now).getTime()
  );
}

/** Tomorrow at 8:00 on the phone's clock: a run's morning. */
export function firstStart(now: Date): Date {
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(8, 0, 0, 0);
  return startAllowed(at, now) ? at : earliestStart(now);
}

/** A day more or less, the time kept; the earliest start when the day kept
 * would be too soon; never past the last day. */
export function movedDay(at: Date, days: number, now: Date): Date {
  const next = new Date(at);
  next.setDate(next.getDate() + days);
  if (next.getTime() > latestStart(now).getTime()) {
    return at;
  }
  if (!startAllowed(next, now)) {
    const earliest = earliestStart(now);
    return days < 0 && at.getTime() > earliest.getTime() ? earliest : at;
  }
  return next;
}

/** TIME_STEP_MIN more or less, on the same day; never before the earliest
 * start nor past the latest. */
export function movedTime(at: Date, steps: number, now: Date): Date {
  const next = new Date(at.getTime() + steps * TIME_STEP_MIN * MINUTE_MS);
  return next.getDate() !== at.getDate() || !startAllowed(next, now) ? at : next;
}

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * `at` as ISO 8601 with the phone's offset, as the API wants it:
 * "2026-11-22T08:00:00+01:00". The moment is the same as toISOString's.
 */
export function withOffset(at: Date): string {
  const offset = -at.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = two(Math.floor(Math.abs(offset) / 60));
  const minutes = two(Math.abs(offset) % 60);
  return (
    `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}` +
    `T${two(at.getHours())}:${two(at.getMinutes())}:00${sign}${hours}:${minutes}`
  );
}
