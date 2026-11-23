import type {
  GymPlan,
  GymPlanItem,
  GymSessionRequest,
  GymSet,
} from "@shaperoute/shared-types";

import { cycleWeekOf, sessionsOfWeek } from "./program";
import { neededOf } from "./setKinds";

/**
 * A workout at the gym written by hand afterwards (TASK-484 part B,
 * ADR-0395): its day, the time it began and how long it lasted, and its
 * exercises as the rows of a plan («4 × 10 · 60 kg»). Each row becomes as
 * many sets as it says, all alike and none of them live, spread evenly
 * through the workout, since the API wants every set inside it. Sent with
 * `source: "manual"` and nothing of a timer: no pauses, rests or plan.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The first day «‹» reaches: no run is older than 2020 on the API. */
export const EARLIEST_DAY = new Date(2020, 0, 1);

/** A minute at least, a day at most, as a recorded workout. */
export const MIN_DURATION_S = 60;
export const MAX_DURATION_S = 24 * 60 * 60;

/** The day, the start and the length of a workout written by hand. */
export type ByHandTime = {
  /** Midnight of its day, on the phone's clock. */
  day: Date;
  /** Minutes after midnight it began, 0–1439. */
  startMin: number;
  durationS: number;
};

/** Midnight of the day of `date`, on the phone's clock. */
export function midnightOf(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The day `by` days from `day` (on the calendar, not 24 hours, so a
 * change of the clock moves nothing); null after today or before 2020. */
export function shiftDay(day: Date, by: number, now: Date): Date | null {
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + by);
  if (next.getTime() > midnightOf(now).getTime()) {
    return null;
  }
  if (next.getTime() < EARLIEST_DAY.getTime()) {
    return null;
  }
  return next;
}

/** «Today», «Yesterday», or null for another day (its date then). */
export function nearDay(day: Date, now: Date): "today" | "yesterday" | null {
  const today = midnightOf(now).getTime();
  const time = midnightOf(day).getTime();
  if (time === today) {
    return "today";
  }
  // Within a day and an hour: the night the clock changes is 23 or 25.
  if (time < today && today - time <= DAY_MS + 3_600_000) {
    return "yesterday";
  }
  return null;
}

/** When it began and when it ended, in milliseconds. */
export function startEndMs(time: ByHandTime): { startMs: number; endMs: number } {
  const day = time.day;
  const start = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(time.startMin / 60),
    time.startMin % 60,
  );
  const startMs = start.getTime();
  return { startMs, endMs: startMs + time.durationS * 1000 };
}

/** Whether it ended by now: otherwise «Pick a time before now.». */
export function endsByNow(time: ByHandTime, nowMs: number): boolean {
  return startEndMs(time).endMs <= nowMs;
}

/** The time the form opens with: today, begun an hour and five minutes
 * ago (on the five minutes), an hour long; yesterday at 18:00 when that
 * would be before midnight. */
export function firstTime(now: Date): ByHandTime {
  const minutes = now.getHours() * 60 + now.getMinutes() - 65;
  if (minutes < 0) {
    return {
      day: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      startMin: 18 * 60,
      durationS: 3600,
    };
  }
  return {
    day: midnightOf(now),
    startMin: Math.floor(minutes / 5) * 5,
    durationS: 3600,
  };
}

/** «18:30» or «8.30» as minutes after midnight; null for no time. */
export function clockMinutes(text: string): number | null {
  const found = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  if (found === null) {
    return null;
  }
  const hours = Number(found[1]);
  const minutes = Number(found[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** «1:05» (hours and minutes) or «45» (minutes) as seconds; null out of a
 * minute to a day. */
export function durationSeconds(text: string): number | null {
  const both = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  const alone = /^\s*(\d{1,4})\s*$/.exec(text);
  let seconds: number;
  if (both !== null) {
    if (Number(both[2]) >= 60) {
      return null;
    }
    seconds = (Number(both[1]) * 60 + Number(both[2])) * 60;
  } else if (alone !== null) {
    seconds = Number(alone[1]) * 60;
  } else {
    return null;
  }
  return seconds >= MIN_DURATION_S && seconds <= MAX_DURATION_S ? seconds : null;
}

/** «18:30». */
export function clockText(startMin: number): string {
  const hours = String(Math.floor(startMin / 60)).padStart(2, "0");
  const minutes = String(startMin % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** «1:05». */
export function durationText(durationS: number): string {
  const minutes = Math.round(durationS / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Whether a row has every value its kind needs («4 ×» of a load without
 * its kg and reps is not a set yet). */
export function rowComplete(item: GymPlanItem): boolean {
  return neededOf(item.kind).every((field) => item[field] !== undefined);
}

/** Whether «Save» can go: a row at least, each complete. */
export function rowsReady(items: readonly GymPlanItem[]): boolean {
  return items.length > 0 && items.every(rowComplete);
}

const SET_FIELDS = [
  "reps",
  "load_kg",
  "duration_s",
  "distance_m",
  "speed_kmh",
  "incline_pct",
  "level",
  "floors",
] as const;

/** The sets of the rows, in order, none live, their `at_s` spread evenly
 * inside `durationS` (never at its very start or end); null when a row is
 * not complete. */
export function setsOfRows(
  items: readonly GymPlanItem[],
  durationS: number,
): GymSet[] | null {
  if (!items.every(rowComplete)) {
    return null;
  }
  const count = items.reduce((sum, item) => sum + item.sets, 0);
  const sets: GymSet[] = [];
  for (const item of items) {
    const values: Partial<GymSet> = {};
    for (const field of SET_FIELDS) {
      if (item[field] !== undefined) {
        values[field] = item[field];
      }
    }
    for (let i = 0; i < item.sets; i += 1) {
      const place = sets.length + 1;
      sets.push({
        ...(item.exercise !== undefined
          ? { exercise: item.exercise }
          : { name: item.name ?? "" }),
        kind: item.kind,
        ...values,
        at_s: Math.floor((durationS * place) / (count + 1)),
        live: false,
      });
    }
  }
  return sets;
}

/** PUT /me/gym-sessions/{key} for a workout written by hand; null while
 * it has no rows, a row is not complete, or it ends after now. */
export function byHandRequest(
  time: ByHandTime,
  items: readonly GymPlanItem[],
  show: boolean,
  nowMs: number,
): GymSessionRequest | null {
  if (!rowsReady(items) || !endsByNow(time, nowMs)) {
    return null;
  }
  const sets = setsOfRows(items, time.durationS);
  if (sets === null) {
    return null;
  }
  const { startMs, endMs } = startEndMs(time);
  return {
    started_at: new Date(startMs).toISOString(),
    ended_at: new Date(endMs).toISOString(),
    show_exercises: show,
    sets,
    source: "manual",
  };
}

/** A workout of a plan «From a plan» offers: its plan, its name, its
 * rows. */
export type PlanWorkout = {
  /** The plan's key. */
  key: string;
  plan: string;
  /** The day of the week of a plan with days, 1 Monday to 7 Sunday; null
   * for a plan of one workout. */
  day: number | null;
  name: string;
  items: GymPlanItem[];
};

/**
 * The workouts of the plans that «From a plan» lists, in the plans'
 * order: a plan of one workout is one; a plan with days gives each of its
 * days with exercises (no run day, no day out), with the values of the
 * week `day` falls in (the first week before the plan starts).
 */
export function planWorkouts(plans: readonly GymPlan[], day: Date): PlanWorkout[] {
  return plans.flatMap((plan): PlanWorkout[] => {
    if (plan.program == null) {
      return plan.items.length === 0
        ? []
        : [
            {
              key: plan.key,
              plan: plan.name,
              day: null,
              name: plan.name,
              items: plan.items,
            },
          ];
    }
    const where = cycleWeekOf(plan.program, day);
    const sessions =
      where === null
        ? sessionsOfWeek(plan.program, 1, 0)
        : sessionsOfWeek(plan.program, where.week, where.cycle);
    return [...sessions]
      .sort((a, b) => a.day - b.day)
      .filter(
        (session) =>
          session.items.length > 0 &&
          session.run === undefined &&
          session.outing === undefined,
      )
      .map((session) => ({
        key: plan.key,
        plan: plan.name,
        day: session.day,
        name: session.name,
        items: session.items,
      }));
  });
}
