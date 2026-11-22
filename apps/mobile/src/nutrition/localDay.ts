/**
 * The days of the diary (TASK-489, ADR-0397): a day of the phone's own
 * calendar, written «2026-11-23». A meal belongs to the day the phone shows
 * when it is eaten, an activity to the day it starts on; no time zone is
 * kept, the phone's is the user's.
 */
export type LocalDay = string;

/** The days of the week of a plan, Monday first. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

function two(value: number): string {
  return String(value).padStart(2, "0");
}

/** The day the phone's calendar shows at `date`. */
export function localDayOf(date: Date): LocalDay {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** Midnight at the start of `day`, in the phone's time; null when `day` is
 * not a day of the calendar («2026-02-30»). */
export function startOf(day: LocalDay): Date | null {
  const match = SHAPE.exec(day);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = Number(match[3]);
  const start = new Date(year, month, date);
  return start.getFullYear() === year &&
    start.getMonth() === month &&
    start.getDate() === date
    ? start
    : null;
}

export function isLocalDay(value: unknown): value is LocalDay {
  return typeof value === "string" && startOf(value) !== null;
}

/** The day `count` days after `day` (before it, with a negative count);
 * `day` itself when it is not a day. */
export function addDays(day: LocalDay, count: number): LocalDay {
  const start = startOf(day);
  if (start === null) {
    return day;
  }
  // By the calendar, not by 24 hours: a day of 23 or 25 hours is one day.
  return localDayOf(
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + count),
  );
}

/** The day of the week of `day`; Monday when it is not a day. */
export function weekdayOf(day: LocalDay): Weekday {
  const start = startOf(day);
  return start === null ? "mon" : WEEKDAYS[(start.getDay() + 6) % 7];
}

/** The seven days of the week `day` is in, Monday to Sunday. */
export function weekOf(day: LocalDay): readonly LocalDay[] {
  const monday = addDays(day, -WEEKDAYS.indexOf(weekdayOf(day)));
  return WEEKDAYS.map((_, index) => addDays(monday, index));
}

/** The month of `day`, «2026-11»: the diary is kept a month to a file. */
export function monthOf(day: LocalDay): string {
  return day.slice(0, 7);
}

/**
 * How much of `day` has gone by at `now`, from 0 (not begun) to 1 (over):
 * what the body spends at rest counts up to now on the day still running.
 */
export function dayFraction(day: LocalDay, now: Date): number {
  const start = startOf(day);
  const end = startOf(addDays(day, 1));
  if (start === null || end === null) {
    return 0;
  }
  const gone = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.min(1, Math.max(0, gone));
}
