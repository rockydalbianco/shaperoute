import type { GymCalendar, GymSet } from "@shaperoute/shared-types";

import { type Muscle, MUSCLES, musclesOf } from "../gym/muscles";

/**
 * The body of the week (TASK-490 part B, ADR-0398): how many sets each
 * muscle had since Monday, and how much of the body that is. The Coach
 * (proposal of 2026-11-22) shows the same body and reads these numbers.
 *
 * A set counts 1 for each muscle it is done for and ½ for each that helps
 * (the «fractional sets» of the studies on weekly volume); an exercise the
 * user named has no muscles and counts for none.
 */

/** Sets in a week that make a muscle «trained» (Schoenfeld et al. 2017:
 * ten or more weekly sets per muscle). */
export const FULL_SETS = 10;

/** Sets of each muscle; every muscle is there, 0 when untouched. */
export type MuscleSets = Readonly<Record<Muscle, number>>;

/** The four looks of a muscle: untouched, 1–4 sets, 5–9, 10 or more. */
export type Level = 0 | 1 | 2 | 3;

export function noSets(): Record<Muscle, number> {
  return Object.fromEntries(MUSCLES.map((muscle) => [muscle, 0])) as Record<
    Muscle,
    number
  >;
}

/** The sets of each muscle in `sets`. */
export function setsByMuscle(sets: readonly Pick<GymSet, "exercise">[]): MuscleSets {
  const count = noSets();
  for (const set of sets) {
    const worked = set.exercise === undefined ? null : musclesOf(set.exercise);
    if (worked === null) {
      continue;
    }
    for (const muscle of worked.primary) {
      count[muscle] += 1;
    }
    for (const muscle of worked.secondary) {
      count[muscle] += 0.5;
    }
  }
  return count;
}

/** Two counts added up. */
export function plus(a: MuscleSets, b: MuscleSets): MuscleSets {
  const sum = noSets();
  for (const muscle of MUSCLES) {
    sum[muscle] = a[muscle] + b[muscle];
  }
  return sum;
}

export function levelOf(sets: number): Level {
  if (sets <= 0) {
    return 0;
  }
  if (sets < 5) {
    return 1;
  }
  return sets < FULL_SETS ? 2 : 3;
}

/** How much of the body the week trained, 0–1: the mean over the muscles
 * of min(sets / 10, 1). */
export function bodyShare(count: MuscleSets): number {
  const total = MUSCLES.reduce(
    (sum, muscle) => sum + Math.min(count[muscle] / FULL_SETS, 1),
    0,
  );
  return total / MUSCLES.length;
}

/** The share as a whole percentage, 0–100. */
export function percentOf(share: number): number {
  return Math.round(share * 100);
}

/** The muscles at `level`, in the order of MUSCLES. */
export function musclesAt(count: MuscleSets, level: Level): Muscle[] {
  return MUSCLES.filter((muscle) => levelOf(count[muscle]) === level);
}

/** Monday at midnight of the week of `now`, on the phone's clock. */
export function weekStart(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay: 0 Sunday … 6 Saturday; the week starts on Monday.
  const back = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - back);
  return start;
}

/** Whether `startedAt` is in the week of `now`, up to now. */
export function inWeek(startedAt: string, now: Date): boolean {
  const at = Date.parse(startedAt);
  return at >= weekStart(now).getTime() && at <= now.getTime();
}

function monthOf(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
}

/** The months («YYYY-MM») the week of `now` is in: one, or two when it
 * began in the month before. */
export function monthsOfWeek(now: Date): string[] {
  const first = monthOf(weekStart(now));
  const last = monthOf(now);
  return first === last ? [last] : [first, last];
}

/** The keys of the workouts of the week in `calendars`, each once. */
export function weekWorkouts(calendars: readonly GymCalendar[], now: Date): string[] {
  const keys = new Set<string>();
  for (const calendar of calendars) {
    for (const day of calendar.days) {
      for (const workout of day.workouts) {
        if (inWeek(workout.started_at, now)) {
          keys.add(workout.id);
        }
      }
    }
  }
  return [...keys];
}
