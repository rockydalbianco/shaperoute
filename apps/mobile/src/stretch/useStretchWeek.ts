import type { CalendarActivity } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { monthOf, weekOf } from "../activities/calendarText";
import { fetchActivityCalendar } from "../api/activityCalendar";
import { phoneTimeZone } from "../api/gymCalendar";
import { useFollowsDoor } from "../social/followsDoor";
import type { LastActivity } from "./today";

/**
 * The week of stretching and the last activity done (TASK-520 part D2,
 * ADR-0415), for the top of the stretching home: which of the seven days
 * from Monday had a session, how many and how long, and what «Today» needs
 * to propose the «After» of a sport just done.
 *
 * Read from the calendar of one's own activities (TASK-462, GET
 * /me/activity-calendar), as the week of the profile is: the month of today,
 * and the one before when the week began in it. Nothing until the API
 * answers, and nothing for whoever is not signed in or has an API without
 * the calendar: the home shows no week and «Today» goes by the hour.
 */

/** The activity a stretching session is saved as (TASK-475). */
export const STRETCHING = "stretching";

export type StretchWeek = {
  /** Monday first: whether that day had a stretching session. */
  days: boolean[];
  sessions: number;
  /** Their time together, pauses left out, to the minute. */
  minutes: number;
  /** The activity of any sport that ended last, up to now; none this week
   * and the one the month began with. */
  last: LastActivity | null;
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The week of `today` out of the activities read. Pure, for the tests. */
export function weekFrom(
  activities: readonly CalendarActivity[],
  today: Date,
): StretchWeek {
  const week = weekOf(today);
  const days = week.map(() => false);
  let sessions = 0;
  let seconds = 0;
  let last: LastActivity | null = null;
  for (const one of activities) {
    const began = new Date(one.started_at);
    if (Number.isNaN(began.getTime())) {
      continue;
    }
    const endedAt = began.getTime() + one.duration_s * 1000;
    if (endedAt <= today.getTime() && (last === null || endedAt > last.endedAt)) {
      last = { sport: one.activity, endedAt };
    }
    if (one.activity !== STRETCHING) {
      continue;
    }
    const day = week.findIndex((of) => sameDay(of, began));
    if (day >= 0) {
      days[day] = true;
      sessions += 1;
      seconds += one.duration_s;
    }
  }
  return { days, sessions, minutes: Math.round(seconds / 60), last };
}

/** The week of `today`, once the API has answered; `fetchFn` is for the tests. */
export function useStretchWeek(
  today: Date,
  fetchFn?: typeof fetch,
): StretchWeek | null {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [week, setWeek] = useState<StretchWeek | null>(null);
  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const zone = phoneTimeZone();
    const months = [...new Set(weekOf(today).map(monthOf))];
    void Promise.all(
      months.map((month) =>
        fetchActivityCalendar(apiUrl, token, zone, month, null, { fetchFn }),
      ),
    ).then((outcomes) => {
      if (!live) {
        return;
      }
      const activities: CalendarActivity[] = [];
      for (const outcome of outcomes) {
        if (outcome.kind !== "ok") {
          return;
        }
        activities.push(...outcome.value.days.flatMap((day) => day.activities));
      }
      setWeek(weekFrom(activities, today));
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, today, fetchFn]);
  // A week read for an account is not shown once it has signed out.
  return apiUrl === null || token === null ? null : week;
}
