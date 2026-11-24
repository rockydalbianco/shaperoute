import type { GymCalendar, GymProgram } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { useFollowsDoor } from "../social/followsDoor";
import { inWeek, monthsOfWeek, weekStart } from "../trainingmode/weekBody";
import { loadGymOutbox } from "./gymOutbox";
import { isoDay } from "./plans";
import { cycleWeekOf, isoDate, sessionsOfWeek } from "./program";

/** What the gym calendar says of this week (TASK-506 C): the days with a
 * workout at the gym, and the days of a plan gone by without it (a run
 * of the plan that day counts as done on the server). Days are 1 Monday
 * to 7 Sunday. */
export type WeekDone = {
  worked: ReadonlySet<number>;
  skipped: readonly { day: number; plan: string }[];
};

/** The week of `now` in `calendars` (those of its months), and the
 * workouts still waiting on the phone (their start). */
export function weekDoneOf(
  calendars: readonly GymCalendar[],
  waiting: readonly string[],
  now: Date,
): WeekDone {
  const worked = new Set<number>();
  const started = [
    ...calendars.flatMap((calendar) =>
      calendar.days.flatMap((day) => day.workouts.map((one) => one.started_at)),
    ),
    ...waiting,
  ];
  for (const at of started) {
    if (inWeek(at, now)) {
      worked.add(isoDay(new Date(at)));
    }
  }
  const monday = weekStart(now);
  const skipped = calendars.flatMap((calendar) => {
    const [year, month] = calendar.month.split("-").map(Number);
    return (calendar.skipped ?? []).flatMap((missed) => {
      const date = new Date(year, month - 1, missed.day);
      return date >= monday && date <= now
        ? [{ day: isoDay(date), plan: missed.plan }]
        : [];
    });
  });
  return { worked, skipped };
}

/**
 * «This week: 1 of 3 done» of a plan: its workouts of this week from the
 * day it starts; one gone by is done unless the calendar says it was
 * skipped, today's is done with a workout at the gym today, the days to
 * come are not. Null before the plan starts.
 */
export function doneOfWeek(
  program: GymProgram,
  plan: string,
  done: WeekDone,
  now: Date,
): { done: number; total: number } | null {
  const where = cycleWeekOf(program, now);
  if (where === null) {
    return null;
  }
  const today = isoDay(now);
  const startsThisWeek = program.starts_on >= isoDate(weekStart(now));
  const first = startsThisWeek ? isoDay(new Date(`${program.starts_on}T12:00:00`)) : 1;
  const sessions = sessionsOfWeek(program, where.week, where.cycle).filter(
    (one) => one.day >= first,
  );
  const count = sessions.filter((one) =>
    one.day < today
      ? !done.skipped.some((missed) => missed.day === one.day && missed.plan === plan)
      : one.day === today && done.worked.has(today),
  ).length;
  return { done: count, total: sessions.length };
}

/** This week of the account's gym calendar; null without an account, and
 * until the calendar has answered. */
export function useWeekDone(fetchFn?: typeof fetch): WeekDone | null {
  const { apiUrl, account } = useFollowsDoor();
  const { owner, total } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [done, setDone] = useState<WeekDone | null>(null);
  const signedIn = apiUrl !== null && token !== null && owner != null;

  useEffect(() => {
    if (apiUrl === null || token === null || owner == null) {
      return;
    }
    let live = true;
    void (async () => {
      const now = new Date();
      const outcomes = await Promise.all(
        monthsOfWeek(now).map((month) =>
          fetchGymCalendar(apiUrl, token, phoneTimeZone(), month, { fetchFn }),
        ),
      );
      const calendars = outcomes.flatMap((outcome) =>
        outcome.kind === "ok" ? [outcome.value] : [],
      );
      if (!live || calendars.length === 0) {
        return;
      }
      const waiting = loadGymOutbox()
        .filter((item) => item.owner === owner && item.refused === undefined)
        .map((item) => item.request.started_at);
      setDone(weekDoneOf(calendars, waiting, now));
    })();
    return () => {
      live = false;
    };
    // Asked again when the account's activities change (a workout saved).
  }, [apiUrl, token, owner, total, fetchFn]);

  // Signed out, what was asked before is not shown.
  return signedIn ? done : null;
}
