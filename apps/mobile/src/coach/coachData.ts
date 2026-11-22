import type {
  GymCalendar,
  GymCalendarWorkout,
  GymPlan,
  GymPlanItem,
  GymPlans,
  GymSession,
} from "@shaperoute/shared-types";

import type { AccountOutcome } from "../api/accounts";
import type { Activity, ActivitiesPage } from "../api/activities";
import { fetchActivities } from "../api/activities";
import { fetchGymSession } from "../api/gym";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { fetchGymPlans } from "../api/gymPlans";
import { sessionOn } from "../gym/program";
import {
  type CoachExercise,
  type CoachInput,
  type CoachPlanItem,
  type CoachToday,
  type CoachWorkout,
  weekdayOf,
} from "./rules";

/**
 * What the Coach reads (TASK-491 part A, ADR-0399): the account's own
 * workouts with the addresses the app already has, no new one. The months
 * of the gym calendar for 8 weeks of load, the sets of the workouts of the
 * last 4 weeks one at a time, the plans, the runs of «My activities».
 * `buildCoachInput` is pure; `fetchCoachRaw` asks the API.
 */

const DAY_MS = 86_400_000;
/** Load is counted over 8 weeks; sets are read for the last 4. */
export const LOAD_DAYS = 56;
export const SETS_DAYS = 28;
/** At most this many workouts are read whole: about five a week. */
export const MAX_SESSIONS = 20;
/** At most this many pages of «My activities». */
export const MAX_ACTIVITY_PAGES = 5;

export type CoachRaw = {
  now: Date;
  calendar: GymCalendarWorkout[];
  sessions: GymSession[];
  plans: GymPlan[];
  activities: Activity[];
  sleepScore?: number | null;
};

function ageMs(now: Date, moment: string): number {
  return now.getTime() - new Date(moment).getTime();
}

/** What a plan aimed at for `exercise` on `date`, in that week. */
export function targetOf(
  plan: GymPlan | undefined,
  exercise: string,
  date: Date,
): GymPlanItem | undefined {
  if (plan === undefined) {
    return undefined;
  }
  if (plan.program != null) {
    return sessionOn(plan.program, date)?.session.items.find(
      (item) => item.exercise === exercise,
    );
  }
  return plan.items.find((item) => item.exercise === exercise);
}

function exercisesOf(session: GymSession, plan: GymPlan | undefined): CoachExercise[] {
  const date = new Date(session.started_at);
  const byKey = new Map<string, CoachExercise>();
  for (const set of session.sets) {
    if (
      set.exercise === undefined ||
      (set.kind !== "load" && set.kind !== "bodyweight")
    ) {
      continue;
    }
    const one = byKey.get(set.exercise) ?? {
      exercise: set.exercise,
      sets: [],
      ...targetFields(targetOf(plan, set.exercise, date)),
    };
    one.sets.push({
      kind: set.kind,
      ...(set.reps === undefined ? {} : { reps: set.reps }),
      ...(set.load_kg === undefined ? {} : { load_kg: set.load_kg }),
    });
    byKey.set(set.exercise, one);
  }
  return [...byKey.values()];
}

function targetFields(item: GymPlanItem | undefined): Partial<CoachExercise> {
  if (item === undefined) {
    return {};
  }
  return {
    ...(item.reps === undefined ? {} : { targetReps: item.reps }),
    ...(item.load_kg === undefined ? {} : { targetKg: item.load_kg }),
  };
}

/** Every exercise of the plans with the day of the week it is on. */
export function planItemsOf(plans: readonly GymPlan[]): CoachPlanItem[] {
  return plans.flatMap((plan) =>
    plan.program != null
      ? plan.program.sessions.flatMap((session) =>
          session.items.map((item) => ({ plan: plan.key, day: session.day, item })),
        )
      : plan.days.flatMap((day) =>
          plan.items.map((item) => ({ plan: plan.key, day, item })),
        ),
  );
}

/** The first workout of a plan due on `now`, with exercises. */
export function todayOf(plans: readonly GymPlan[], now: Date): CoachToday | undefined {
  for (const plan of plans) {
    if (plan.program != null) {
      const found = sessionOn(plan.program, now);
      if (found !== null && found.session.items.length > 0) {
        return { plan: plan.key, day: found.session.day, items: found.session.items };
      }
    } else if (plan.days.includes(weekdayOf(now)) && plan.items.length > 0) {
      return { plan: plan.key, day: weekdayOf(now), items: plan.items };
    }
  }
  return undefined;
}

/** The Coach's input from what the API gave. */
export function buildCoachInput(raw: CoachRaw): CoachInput {
  const { now } = raw;
  const sessions = new Map(raw.sessions.map((one) => [one.id, one]));
  const plans = new Map(raw.plans.map((one) => [one.key, one]));
  const workouts: CoachWorkout[] = raw.calendar
    .filter(
      (one) =>
        ageMs(now, one.started_at) >= 0 &&
        ageMs(now, one.started_at) < LOAD_DAYS * DAY_MS,
    )
    .map((one) => {
      const session = sessions.get(one.id);
      return {
        id: one.id,
        startedAt: new Date(one.started_at),
        durationS: one.duration_s,
        ...(session?.plan === undefined ? {} : { plan: session.plan }),
        exercises:
          session === undefined
            ? []
            : exercisesOf(
                session,
                session.plan === undefined ? undefined : plans.get(session.plan),
              ),
      };
    });
  const runs = raw.activities
    .filter(
      (one) =>
        (one.activity === undefined || one.activity === "running") &&
        ageMs(now, one.started_at) >= 0 &&
        ageMs(now, one.started_at) < LOAD_DAYS * DAY_MS,
    )
    .map((one) => ({
      startedAt: new Date(one.started_at),
      distanceM: one.distance_m,
      durationS: one.duration_s,
    }));
  const pace = raw.plans.find((one) => one.program?.runner !== undefined)?.program
    ?.runner?.pace_10k_s;
  const today = todayOf(raw.plans, now);
  return {
    now,
    workouts,
    runs,
    planItems: planItemsOf(raw.plans),
    ...(today === undefined ? {} : { today }),
    ...(pace === undefined ? {} : { pace10kS: pace }),
    ...(raw.sleepScore === undefined ? {} : { sleepScore: raw.sleepScore }),
  };
}

// ── Asking the API ──────────────────────────────────────────────────────

export type CoachFetchers = {
  calendar: (month: string) => Promise<AccountOutcome<GymCalendar>>;
  session: (key: string) => Promise<AccountOutcome<GymSession>>;
  plans: () => Promise<AccountOutcome<GymPlans>>;
  activities: (cursor: string | null) => Promise<AccountOutcome<ActivitiesPage>>;
};

/** The fetchers on the real API, for the signed-in account. */
export function apiFetchers(baseUrl: string, token: string): CoachFetchers {
  const tz = phoneTimeZone();
  return {
    calendar: (month) => fetchGymCalendar(baseUrl, token, tz, month),
    session: (key) => fetchGymSession(baseUrl, token, key),
    plans: () => fetchGymPlans(baseUrl, token),
    activities: (cursor) => fetchActivities(baseUrl, token, cursor),
  };
}

/** YYYY-MM of `now` and of the months before it that 8 weeks reach. */
export function monthsBack(now: Date): string[] {
  const months: string[] = [];
  const first = new Date(now.getTime() - LOAD_DAYS * DAY_MS);
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  while (cursor <= now) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export type CoachRawOutcome = { kind: "ok"; raw: CoachRaw } | { kind: "unreachable" };

/**
 * Everything the Coach reads. A month, a workout or a page that fails is
 * left out; only when nothing at all came back is it «unreachable».
 */
export async function fetchCoachRaw(
  fetchers: CoachFetchers,
  now: Date,
  sleepScore: number | null = null,
): Promise<CoachRawOutcome> {
  let answered = false;
  const calendar: GymCalendarWorkout[] = [];
  for (const month of monthsBack(now)) {
    const outcome = await fetchers.calendar(month);
    if (outcome.kind === "ok") {
      answered = true;
      calendar.push(...outcome.value.days.flatMap((day) => day.workouts));
    }
  }
  const recent = calendar
    .filter(
      (one) =>
        ageMs(now, one.started_at) >= 0 &&
        ageMs(now, one.started_at) < SETS_DAYS * DAY_MS,
    )
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, MAX_SESSIONS);
  const sessions: GymSession[] = [];
  for (const one of recent) {
    const outcome = await fetchers.session(one.id);
    if (outcome.kind === "ok") {
      sessions.push(outcome.value);
    }
  }
  const planned = await fetchers.plans();
  const plans = planned.kind === "ok" ? planned.value.plans : [];
  answered = answered || planned.kind === "ok";
  const activities: Activity[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_ACTIVITY_PAGES; page += 1) {
    const outcome = await fetchers.activities(cursor);
    if (outcome.kind !== "ok") {
      break;
    }
    answered = true;
    activities.push(...outcome.value.activities);
    const oldest = outcome.value.activities[outcome.value.activities.length - 1];
    cursor = outcome.value.next;
    if (
      cursor === null ||
      oldest === undefined ||
      ageMs(now, oldest.started_at) >= LOAD_DAYS * DAY_MS
    ) {
      break;
    }
  }
  if (!answered) {
    return { kind: "unreachable" };
  }
  return {
    kind: "ok",
    raw: { now, calendar, sessions, plans, activities, sleepScore },
  };
}
