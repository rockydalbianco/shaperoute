import type {
  CalendarActivity,
  CalendarMonth,
  RunActivity,
} from "@shaperoute/shared-types";

import { favoriteTitle } from "../favorites/favoriteRoute";
import { t, tLater, tPlural } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { findProfile } from "../sports";
import { runDistanceLabel } from "../units/format";
import { runFacts } from "./activityText";

/**
 * The calendar of all one's activities in words (TASK-462, the user's
 * choices of 2026-11-11): the icons of a day, the line of an activity, the
 * month's totals, the week of the profile and the bars of the twelve months.
 * Moments are read on the phone's clock.
 */

/** The week from Monday, as a calendar of Europe reads it. */
export const WEEKDAYS = [
  tLater("Mon"),
  tLater("Tue"),
  tLater("Wed"),
  tLater("Thu"),
  tLater("Fri"),
  tLater("Sat"),
  tLater("Sun"),
];

/** The icons a day cell shows at most; more are «+». */
export const DAY_ICONS = 2;

/** The emoji of a sport, as «Settings» shows it; a dot for one the app does
 * not know yet (an API newer than the app). */
export function sportEmoji(activity: string): string {
  return findProfile(activity)?.emoji ?? "•";
}

/** The sport's name in the app's language; «Activity» for one it does not
 * know. */
export function sportName(activity: string): string {
  const profile = findProfile(activity);
  return profile === undefined ? t("Activity") : t(profile.name);
}

/** The sports of a day, each once, in the order they were done. */
export function daySports(activities: readonly CalendarActivity[]): RunActivity[] {
  const seen: RunActivity[] = [];
  for (const one of activities) {
    if (!seen.includes(one.activity)) {
      seen.push(one.activity);
    }
  }
  return seen;
}

/** «🏃‍♂️🏋️», «🏃‍♂️🚴+»: the icons of a day's sports, at most DAY_ICONS. */
export function dayIcons(activities: readonly CalendarActivity[]): string {
  const sports = daySports(activities);
  const shown = sports.slice(0, DAY_ICONS).map(sportEmoji).join("");
  return sports.length > DAY_ICONS ? `${shown}+` : shown;
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

/** «07:12»: when an activity began, on the phone's clock. */
export function timeOfDay(startedAt: string): string {
  const when = new Date(startedAt);
  return Number.isNaN(when.getTime())
    ? ""
    : `${two(when.getHours())}:${two(when.getMinutes())}`;
}

/** «Trento · Star», «Trento», «Star», or the sport's name: where it began
 * and what it drew. */
export function activityTitle(activity: CalendarActivity): string {
  const drew =
    activity.shape !== null || activity.word !== null || activity.title !== null;
  const parts = [activity.place, drew ? favoriteTitle(activity) : null].filter(
    (part): part is string => part !== null && part !== "",
  );
  return parts.length > 0 ? parts.join(" · ") : sportName(activity.activity);
}

/** «07:12 · 5.20 km · 27:41 · 5:19 /km · 389 kcal»: when, how far, how
 * long, the pace of its sport and the calories when the phone sent them; a
 * workout without metres has its time only. */
export function activityLine(activity: CalendarActivity): string {
  const facts =
    activity.distance_m > 0
      ? runFacts(activity)
      : clockLabel(activity.duration_s * 1000);
  return [
    timeOfDay(activity.started_at),
    facts,
    activity.kcal !== null && activity.kcal > 0 ? `${activity.kcal} kcal` : null,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");
}

/** «4 activities · 19.10 km · 6:17:41»: a month's or a week's totals; no
 * distance when there is none (the gym alone). */
export function totalsLine(
  count: number,
  distanceM: number,
  durationS: number,
): string {
  return [
    tPlural(count, "{count} activity", "{count} activities"),
    distanceM > 0 ? runDistanceLabel(distanceM) : null,
    clockLabel(durationS * 1000),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/** The days of the week of `today`, Monday first, at noon on the phone's
 * clock. */
export function weekOf(today: Date): Date[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

/** YYYY-MM of a day on the phone's clock. */
export function monthOf(day: Date): string {
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}`;
}

/** The height of each bar, from 0 to 1: its time over the longest. */
export function barHeights(trend: readonly CalendarMonth[]): number[] {
  const longest = Math.max(0, ...trend.map((month) => month.duration_s));
  return trend.map((month) => (longest > 0 ? month.duration_s / longest : 0));
}

/** The initial of a month («N» for November) under its bar. */
export function monthInitial(month: string, months: readonly string[]): string {
  const number = Number(month.split("-")[1]);
  return t(months[number - 1])
    .charAt(0)
    .toUpperCase();
}
