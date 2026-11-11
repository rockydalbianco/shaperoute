import type {
  GymPlan,
  GymPlanItem,
  GymPlanMode,
  GymPlanRun,
  GymPlanSession,
  GymProgram,
} from "@shaperoute/shared-types";

/**
 * The weeks of a plan made with the guide (docs/sports/gym.md «Le schede
 * guidate»): the first week is written, the others are worked out from it
 * by the mode its owner chose, and a week written by hand takes the place
 * of the one worked out. After the last week the cycle starts again, a step
 * heavier. The API keeps the program as it is and only knows which days are
 * planned (gym_plans.py); the values of a week are the phone's.
 *
 * - «load»: `step_kg` more each week; the last week of a cycle of 3 or more
 *   is lighter: the first week's load and one set less.
 * - «reps»: one rep more each week, three steps, then `step_kg` more and
 *   back to the first reps (10, 11, 12, then heavier and 10).
 * - «alternate»: two weeks in turn, the second written by hand.
 * - «same»: the same week again and again.
 *
 * A run day (TASK-433 C, the user's choice of 2026-11-10) grows by about a
 * tenth a week, intervals by one rep, the last week of a cycle of 3 or more
 * shorter to recover; «same» keeps it as written.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The guide's choices for the cycle (the user's, 2026-11-10). */
export const CYCLE_WEEKS = [4, 6, 8] as const;
export const DEFAULT_STEP_KG = 2.5;

/** Midnight of `date` as a day number, on the phone's calendar. */
function dayNumber(date: Date): number {
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

/** «2026-11-16» as a day number. */
function isoDayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** «2026-11-16», the day of `date` on the phone's calendar. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The ISO day of the week of a day number: 1 Monday to 7 Sunday. */
function weekdayOf(number: number): number {
  // Day 0 (1 January 1970) was a Thursday.
  return ((((number + 3) % 7) + 7) % 7) + 1;
}

/** Where `date` falls in the program: the week of the cycle (1 to
 * `weeks`) and how many cycles have gone by; null before it starts. */
export function cycleWeekOf(
  program: Pick<GymProgram, "starts_on" | "weeks">,
  date: Date,
): { week: number; cycle: number } | null {
  const start = isoDayNumber(program.starts_on);
  const today = dayNumber(date);
  if (today < start) {
    return null;
  }
  const monday = start - (weekdayOf(start) - 1);
  const index = Math.floor((today - monday) / 7);
  return {
    week: (index % program.weeks) + 1,
    cycle: Math.floor(index / program.weeks),
  };
}

function round(kg: number): number {
  return Math.round(kg * 100) / 100;
}

/** An exercise of the first week, as it is in `week` (1-based) of the
 * `cycle`-th cycle. */
export function itemInWeek(
  item: GymPlanItem,
  mode: GymPlanMode,
  weeks: number,
  stepKg: number,
  week: number,
  cycle: number,
): GymPlanItem {
  const w = week - 1;
  const heavier = (steps: number): Partial<GymPlanItem> =>
    item.load_kg === undefined ? {} : { load_kg: round(item.load_kg + steps * stepKg) };
  switch (mode) {
    case "load":
      if (weeks >= 3 && week === weeks) {
        return { ...item, sets: Math.max(1, item.sets - 1), ...heavier(cycle) };
      }
      return { ...item, ...heavier(cycle + w) };
    case "reps": {
      const step = cycle * weeks + w;
      return {
        ...item,
        ...(item.reps === undefined ? {} : { reps: item.reps + (step % 3) }),
        ...heavier(Math.floor(step / 3)),
      };
    }
    case "alternate":
      return { ...item, ...heavier(cycle) };
    case "same":
      return item;
  }
}

/** A run grows a tenth a week: whole half kilometres, whole minutes. */
const RUN_STEP = 0.1;
/** The lighter last week: this much of the cycle's first. */
const RUN_LIGHTER = 0.8;

function roundTo(value: number, step: number, lowest: number): number {
  return Math.max(lowest, Math.round(value / step) * step);
}

/** The run of a run day of the first week, as it is in `week` (1-based)
 * of the `cycle`-th cycle. */
export function runInWeek(
  run: GymPlanRun,
  mode: GymPlanMode,
  weeks: number,
  week: number,
  cycle: number,
): GymPlanRun {
  if (mode === "same") {
    return run;
  }
  const lighter = weeks >= 3 && week === weeks;
  const steps = lighter ? cycle : cycle + week - 1;
  const factor = (1 + RUN_STEP * steps) * (lighter ? RUN_LIGHTER : 1);
  if (run.kind === "intervals") {
    const reps = run.reps ?? 1;
    return {
      ...run,
      reps: Math.min(50, Math.max(1, lighter ? reps + cycle - 2 : reps + steps)),
    };
  }
  return {
    ...run,
    ...(run.distance_m === undefined
      ? {}
      : { distance_m: roundTo(run.distance_m * factor, 500, 500) }),
    ...(run.duration_s === undefined
      ? {}
      : { duration_s: roundTo(run.duration_s * factor, 60, 60) }),
  };
}

/** The workouts of `week` of the `cycle`-th cycle, with their values. */
export function sessionsOfWeek(
  program: GymProgram,
  week: number,
  cycle: number = 0,
): GymPlanSession[] {
  const written = program.custom.find((one) => one.week === week);
  if (written !== undefined) {
    // Written by hand: as written, a step heavier each new cycle (none for
    // «same»).
    const steps = program.mode === "same" ? 0 : cycle;
    return written.sessions.map((session) => ({
      ...session,
      items: session.items.map((item) =>
        item.load_kg === undefined
          ? item
          : { ...item, load_kg: round(item.load_kg + steps * program.step_kg) },
      ),
    }));
  }
  return program.sessions.map((session) => ({
    ...session,
    items: session.items.map((item) =>
      itemInWeek(item, program.mode, program.weeks, program.step_kg, week, cycle),
    ),
    ...(session.run === undefined
      ? {}
      : { run: runInWeek(session.run, program.mode, program.weeks, week, cycle) }),
  }));
}

/** The workout of `date`, with the week it is in; null on a day without. */
export function sessionOn(
  program: GymProgram,
  date: Date,
): { session: GymPlanSession; week: number; cycle: number } | null {
  const where = cycleWeekOf(program, date);
  if (where === null) {
    return null;
  }
  const day = weekdayOf(dayNumber(date));
  const session = sessionsOfWeek(program, where.week, where.cycle).find(
    (one) => one.day === day,
  );
  return session === undefined ? null : { session, ...where };
}

/** The days of the week a program has a workout on, in any of its weeks:
 * the plan's `days`, as the API keeps them. */
export function programDays(program: GymProgram): number[] {
  const days = [
    ...program.sessions,
    ...program.custom.flatMap((week) => week.sessions),
  ].map((one) => one.day);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** A plan of one workout on its days, as a program of one week that
 * repeats: how the guide's editor opens a plan made before it. */
export function programOfPlan(
  plan: Pick<GymPlan, "name" | "days" | "items" | "program">,
  today: Date = new Date(),
): GymProgram {
  if (plan.program != null) {
    return plan.program;
  }
  return {
    starts_on: isoDate(today),
    weeks: 1,
    mode: "same",
    step_kg: 0,
    sessions: plan.days.map((day) => ({ day, name: plan.name, items: plan.items })),
    custom: [],
  };
}

/** How many exercises a program has in all (at most 300, gym_plans.py). */
export function programItemCount(program: GymProgram): number {
  return [
    ...program.sessions,
    ...program.custom.flatMap((week) => week.sessions),
  ].reduce((count, session) => count + session.items.length, 0);
}
