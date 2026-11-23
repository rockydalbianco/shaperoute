import {
  MAX_GYM_PLAN_WEEKS,
  type GymPlanOuting,
  type GymPlanRun,
  type GymPlanSession,
  type GymPlanTarget,
  type GymProgram,
} from "@shaperoute/shared-types";

/**
 * The weeks of a plan that leads to a target (TASK-461 B and C, ADR-0371;
 * the user's approved words: «Il lungo cresce di un decimo, ogni 4ª più
 * leggera, l'ultimo giorno è la gara», and for the mountain «La salita
 * cresce di un decimo»). The plan keeps its first week; the phone works
 * out each week from it and from the program's `target`.
 *
 * The long day (or the climb day of a hike to a climb) climbs a ladder:
 * the last week's is the target, each week before it a tenth less, every
 * 4th week lighter and no step. Where there are more weeks than needed,
 * the first ones stay at where one is today. The other days of the
 * target's sport grow with it.
 */

/** A tenth more a week. */
export const TARGET_STEP = 1.1;
/** A lighter week: this much of the week before. */
export const TARGET_LIGHTER = 0.8;
/** Every 4th week is lighter. */
export const LIGHT_EVERY = 4;
/** A plan to a target has at least this many weeks. */
export const MIN_TARGET_WEEKS = 4;
export const MAX_TARGET_WEEKS = MAX_GYM_PLAN_WEEKS;
/** Within this much of today's level is close enough to start from. */
const SLACK = 1.02;

/** The sport of a target: a run, or a day out of another sport. */
export type TargetSport = GymPlanTarget["sport"];

/** Whether `week` (1-based) of a plan of `weeks` is a lighter one: every
 * 4th, never the last, which is the target's. */
export function isLightWeek(week: number, weeks: number): boolean {
  return week % LIGHT_EVERY === 0 && week !== weeks;
}

/** The steps of the ladder after `week` up to the last week, the last
 * included: the weeks between that are not lighter. */
export function stepsAfter(week: number, weeks: number): number {
  let steps = 0;
  for (let one = week + 1; one <= weeks; one += 1) {
    if (!isLightWeek(one, weeks)) {
      steps += 1;
    }
  }
  return steps;
}

/** The ladder of a plan: where it starts, where it leads, in how many
 * weeks. In metres: of distance, or of climb. */
export type Ladder = { start: number; goal: number; weeks: number };

/**
 * The long day's metres in `week`: the goal on the last week, a tenth less
 * each step before, never under the start; a lighter week is 4/5 of the
 * week before.
 */
export function ladderValue(ladder: Ladder, week: number): number {
  const { start, goal, weeks } = ladder;
  if (isLightWeek(week, weeks)) {
    return ladderValue(ladder, week - 1) * TARGET_LIGHTER;
  }
  if (week >= weeks) {
    return goal;
  }
  return Math.max(start, goal / Math.pow(TARGET_STEP, stepsAfter(week, weeks)));
}

/**
 * How many weeks it takes from `start` to `goal`: the fewest, at least 4,
 * whose ladder starts within reach of today's level; null when even 24
 * weeks are not enough.
 */
export function weeksNeeded(start: number, goal: number): number | null {
  for (let weeks = MIN_TARGET_WEEKS; weeks <= MAX_TARGET_WEEKS; weeks += 1) {
    if (goal / Math.pow(TARGET_STEP, stepsAfter(1, weeks)) <= start * SLACK) {
      return weeks;
    }
  }
  return null;
}

/** Where `weeks` of the ladder lead from `start`: the metres of the last
 * day when the time is short («Arriva a 8 km»). Not rounded. */
export function reachable(start: number, weeks: number): number {
  return start * Math.pow(TARGET_STEP, stepsAfter(1, Math.max(1, weeks)));
}

/** The sports a target's days are of: on foot, a walk and a hike lead
 * to each other (the brisk walk uphill of a hike to a climb). */
export function targetFamily(sport: TargetSport): readonly TargetSport[] {
  return sport === "walk" || sport === "hike" ? ["walk", "hike"] : [sport];
}

/** Whether `session` is a day of the target's sport. */
export function isTargetDay(session: GymPlanSession, target: GymPlanTarget): boolean {
  const family = targetFamily(target.sport);
  if (session.run !== undefined) {
    return family.includes("run");
  }
  return session.outing !== undefined && family.includes(session.outing.sport);
}

/** The metres a day measures on the ladder: its climb for a target of
 * climb, its distance otherwise; null when it says neither. */
function measureOf(
  day: GymPlanRun | GymPlanOuting,
  target: GymPlanTarget,
): number | null {
  if (target.climb_m !== undefined) {
    return "climb_m" in day ? (day.climb_m ?? null) : null;
  }
  return day.distance_m ?? null;
}

/** Whether a day is the long one: a long run or ride, or a hike's climb
 * for a target of climb. */
function isLongDay(session: GymPlanSession, target: GymPlanTarget): boolean {
  const day = session.run ?? session.outing;
  if (day === undefined || !isTargetDay(session, target)) {
    return false;
  }
  return target.climb_m !== undefined ? day.kind === "climb" : day.kind === "long";
}

/** The long day of a program's first week: the last, by day, of the
 * target's sport. */
export function longDayOf(program: GymProgram): GymPlanSession | null {
  const target = program.target;
  if (target === undefined) {
    return null;
  }
  const longs = program.sessions
    .filter((one) => isLongDay(one, target))
    .sort((a, b) => a.day - b.day);
  return longs.at(-1) ?? null;
}

/** The ladder of a program with a target; null without a target or a
 * long day that measures it. */
export function ladderOf(program: GymProgram): Ladder | null {
  const target = program.target;
  const long = longDayOf(program);
  if (target === undefined || long === null) {
    return null;
  }
  const day = long.run ?? long.outing;
  const start = day === undefined ? null : measureOf(day, target);
  const goal = target.climb_m ?? target.distance_m;
  if (start === null || goal === undefined) {
    return null;
  }
  return { start, goal, weeks: program.weeks };
}

/** Whole steps of a measure, never under the lowest. */
function roundTo(value: number, step: number, lowest: number): number {
  return Math.max(lowest, Math.round(value / step) * step);
}

/** The distance step of a sport: whole kilometres on a bike, 100 m in
 * the water, half kilometres otherwise. */
export function distanceStep(sport: TargetSport): number {
  switch (sport) {
    case "bike":
    case "gravel":
    case "mtb":
      return 1000;
    case "swim":
      return 100;
    default:
      return 500;
  }
}

/** The most a day of each sport may be (mirrors gym_plans.py OUTING_MAX_M
 * and the run's 100 km). */
export const DAY_MAX_M: Readonly<Record<TargetSport, number>> = {
  run: 100_000,
  walk: 100_000,
  hike: 100_000,
  bike: 300_000,
  gravel: 300_000,
  mtb: 300_000,
  swim: 10_000,
  paddle: 100_000,
};
const MAX_CLIMB_M = 5000;
const MAX_OUTING_S = 12 * 3600;
const MAX_RUN_S = 6 * 3600;
const MAX_REPS = 50;

/** `metres` of `sport` as a day says them: in its steps, within its
 * bounds. */
export function roundDistance(metres: number, sport: TargetSport): number {
  const step = distanceStep(sport);
  return Math.min(DAY_MAX_M[sport], roundTo(metres, step, Math.max(100, step)));
}

/** Metres of climb in whole 50 m, 50–5000. */
export function roundClimb(metres: number): number {
  return Math.min(MAX_CLIMB_M, roundTo(metres, 50, 50));
}

/** How much a day of `week` is of its first week's: the ladder's share,
 * and on the last week (the target's) the others are lighter. */
function shareOf(ladder: Ladder, week: number, long: boolean): number {
  const first = ladderValue(ladder, 1);
  if (!long && week >= ladder.weeks && week > 1) {
    return (ladderValue(ladder, week - 1) / first) * TARGET_LIGHTER;
  }
  return ladderValue(ladder, week) / first;
}

/** The repetitions of `week`: one more every two steps, as many as the
 * first week on a lighter week and on the target's. */
function repsOf(reps: number, ladder: Ladder, week: number): number {
  if (isLightWeek(week, ladder.weeks) || week >= ladder.weeks) {
    return reps;
  }
  const done = week - 1 - Math.floor((week - 1) / LIGHT_EVERY);
  return Math.min(MAX_REPS, reps + Math.floor(done / 2));
}

/** A day out of the target's sport as it is in `week`. */
export function outingInWeek(
  outing: GymPlanOuting,
  long: boolean,
  ladder: Ladder,
  week: number,
): GymPlanOuting {
  if (outing.kind === "intervals") {
    return { ...outing, reps: repsOf(outing.reps ?? 1, ladder, week) };
  }
  if (long && week >= ladder.weeks) {
    // The target's day: the target itself.
    return outing.climb_m !== undefined && outing.kind === "climb"
      ? {
          ...outing,
          climb_m: roundClimb(ladder.goal),
          ...(outing.distance_m === undefined
            ? {}
            : {
                distance_m: roundDistance(
                  (outing.distance_m * ladder.goal) / ladder.start,
                  outing.sport,
                ),
              }),
        }
      : { ...outing, distance_m: roundDistance(ladder.goal, outing.sport) };
  }
  const share = shareOf(ladder, week, long);
  return {
    ...outing,
    ...(outing.distance_m === undefined
      ? {}
      : { distance_m: roundDistance(outing.distance_m * share, outing.sport) }),
    ...(outing.duration_s === undefined
      ? {}
      : {
          duration_s: Math.min(
            MAX_OUTING_S,
            roundTo(outing.duration_s * share, 60, 60),
          ),
        }),
    ...(outing.climb_m === undefined
      ? {}
      : { climb_m: roundClimb(outing.climb_m * share) }),
  };
}

/** A run day toward a run target as it is in `week`. */
export function runInTargetWeek(
  run: GymPlanRun,
  long: boolean,
  ladder: Ladder,
  week: number,
): GymPlanRun {
  if (run.kind === "intervals") {
    return { ...run, reps: repsOf(run.reps ?? 1, ladder, week) };
  }
  if (long && week >= ladder.weeks) {
    return { ...run, distance_m: roundDistance(ladder.goal, "run") };
  }
  const share = shareOf(ladder, week, long);
  return {
    ...run,
    ...(run.distance_m === undefined
      ? {}
      : { distance_m: roundDistance(run.distance_m * share, "run") }),
    ...(run.duration_s === undefined
      ? {}
      : { duration_s: Math.min(MAX_RUN_S, roundTo(run.duration_s * share, 60, 60)) }),
  };
}

/**
 * A workout of the first week of `program` as it is in `week`: a day of
 * the target's sport on the ladder, any other as it is (the gym's weeks
 * are worked out by program.ts). The same session without a target.
 */
export function targetDayInWeek(
  session: GymPlanSession,
  program: GymProgram,
  week: number,
): GymPlanSession {
  const target = program.target;
  const ladder = ladderOf(program);
  if (target === undefined || ladder === null || !isTargetDay(session, target)) {
    return session;
  }
  const long = isLongDay(session, target) && session.day === longDayOf(program)?.day;
  if (session.run !== undefined) {
    return { ...session, run: runInTargetWeek(session.run, long, ladder, week) };
  }
  if (session.outing !== undefined) {
    return { ...session, outing: outingInWeek(session.outing, long, ladder, week) };
  }
  return session;
}

/** The sport of a day out, or "run" for a run day. */
export function sportOfDay(session: GymPlanSession): TargetSport | null {
  if (session.run !== undefined) {
    return "run";
  }
  return session.outing?.sport ?? null;
}
