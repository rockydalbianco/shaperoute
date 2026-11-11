/**
 * The calendar of all one's own activities (TASK-462 part A, ADR-0372,
 * docs/API.md «Il calendario delle attività»): a month of the calendar on
 * the phone's time zone with the days of any sport, the twelve months up to
 * it for the bars of «storico tempi», and the sports the owner has. Mirrors
 * services/api/shaperoute_api/activity_calendar.py.
 */
import type { RunActivity } from "./index.ts";

/** The months of `trend`: the one asked and the eleven before it. */
export const CALENDAR_TREND_MONTHS = 12;

/** An activity of a day, as «My activities» lists it, with its calories. */
export interface CalendarActivity {
  /** The key the app gave it, as in /me/activities. */
  id: string;
  activity: RunActivity;
  started_at: string;
  distance_m: number;
  /** Pauses left out. */
  duration_s: number;
  /** What the phone sent at the end of it; null when it sent none. */
  kcal: number | null;
  shape: string | null;
  word: string | null;
  title: string | null;
  place: string | null;
}

/** A day of the month with at least one activity, on the asked time zone. */
export interface CalendarDay {
  /** 1–31. */
  day: number;
  /** The first first. */
  activities: CalendarActivity[];
}

/** A month of `trend`: its activities, metres and time added up. */
export interface CalendarMonth {
  /** YYYY-MM on the asked time zone. */
  month: string;
  count: number;
  distance_m: number;
  duration_s: number;
}

/**
 * GET /me/activity-calendar?tz=&month=&sport=: one's own activities of a
 * month of the calendar on `tz` (YYYY-MM, this one when not asked), of
 * `sport` or of all, only the days with one; only the activities the app
 * reads (X-MuW-Reads). Only the owner.
 */
export interface ActivityCalendar {
  month: string;
  tz: string;
  /** The sport asked; null for all. */
  sport: RunActivity | null;
  count: number;
  distance_m: number;
  duration_s: number;
  days: CalendarDay[];
  /** CALENDAR_TREND_MONTHS months up to `month`, the oldest first, each one
   * even without activities; of `sport` when asked. */
  trend: CalendarMonth[];
  /** The sports the owner has activities of, of any month and whatever
   * `sport` is: the most first. */
  sports: RunActivity[];
}
