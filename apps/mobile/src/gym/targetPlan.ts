import type {
  GymOutingKind,
  GymPlanOuting,
  GymPlanRun,
  GymPlanSession,
  GymPlanTarget,
  GymProgram,
} from "@shaperoute/shared-types";

import { isoDate } from "./program";
import {
  MAX_TARGET_WEEKS,
  type TargetSport,
  distanceStep,
  reachable,
  roundClimb,
  roundDistance,
  weeksNeeded,
} from "./targetWeeks";

/**
 * A plan toward a distance or a climb (TASK-461 B and C, ADR-0371), made
 * from the guide's answers: the target («Dove vuoi arrivare?», «Che gita
 * vuoi fare?»), where one is today («Dove sei oggi?», or «Comincio da
 * zero»), when («Quando sono pronto» or a date), the days of the target's
 * sport and the days of the other sport («almeno due sport, sempre», the
 * user's choice of 2026-11-11), which the guide made already. The first
 * week is written here; targetWeeks.ts works out the others.
 */

/** «Solo tenermi in forma»: the days of a sport with no target, the same
 * every week of a cycle. */
export type KeepFit = { sport: TargetSport; keepFit: true };

/** What the plan leads to: a target, or none. */
export type PlanAim = GymPlanTarget | KeepFit;

export function isKeepFit(aim: PlanAim): aim is KeepFit {
  return "keepFit" in aim;
}

/** A day of the target's sport without its name yet. */
export type UnnamedDay = Omit<GymPlanSession, "name">;

export type TargetPlanAnswers = {
  aim: PlanAim;
  /** Where one is today in metres: the longest distance of the last month
   * or, toward a climb, the most climb in one outing; null: from zero. */
  level: number | null;
  /** A swim only: in a pool (the default) or in open water. */
  pool?: boolean;
  /** The days of the target's sport, 1 Monday to 7 Sunday. */
  days: readonly number[];
  /** The other sport's days, made by the guide (at least one). */
  others: readonly GymPlanSession[];
  /** The program the other sport's days were made with: its mode, step,
   * goal, rest and runner are kept. */
  base: Pick<GymProgram, "mode" | "step_kg"> &
    Partial<Pick<GymProgram, "goal" | "rest_s" | "runner">>;
  /** The Monday it starts on («Inizia lunedì»). */
  startsOn: Date;
  /** A day's name, in the phone's language: the guide's words. */
  nameOf: (day: UnnamedDay) => string;
};

export type TargetPlan =
  /** The plan, with its weeks. */
  | { kind: "plan"; program: GymProgram }
  /** The date is too near («Per 10 km servono 8 settimane, ne hai 5»), or
   * 24 weeks are not enough: `needed` null. `reachable` is where the weeks
   * there are lead («Arriva a 8 km»). */
  | { kind: "short"; needed: number | null; have: number; reachable: number }
  /** The date is more than 24 weeks away, or before the start. */
  | { kind: "far"; have: number };

/** A cycle without a target: as the gym's shortest. */
export const KEEP_FIT_WEEKS = 4;

/** Where «Comincio da zero» starts: the long day's metres (of climb for a
 * hike to a climb; «Si parte da 200 m, su sentieri facili»). */
export const FROM_ZERO_M: Readonly<Record<TargetSport, number>> = {
  run: 2000,
  walk: 3000,
  hike: 5000,
  bike: 10_000,
  gravel: 10_000,
  mtb: 8000,
  swim: 400,
  paddle: 2000,
};
export const FROM_ZERO_CLIMB_M = 200;

/** A hike's distance for its climb: 450 m of climb are some 9 km. */
export const HIKE_M_PER_CLIMB_M = 20;

/** «Cammina-corri»: a minute of running, the walk between in the day's
 * name («1′ di corsa e 2′ a piedi»). */
export const WALK_RUN: GymPlanRun = { kind: "intervals", reps: 8, rep_s: 60 };

/** A brisk walk: 45 minutes. */
const BRISK_S = 45 * 60;

/** The kinds of the days of a target's sport, in the order of the week,
 * the long one last: by how many days there are. */
const DISTANCE_KINDS: Readonly<Record<number, readonly DayKind[]>> = {
  1: ["long"],
  2: ["easy", "long"],
  3: ["easy", "quality", "long"],
  4: ["easy", "quality", "easy", "long"],
  5: ["easy", "quality", "easy", "easy", "long"],
};
const CLIMB_KINDS: Readonly<Record<number, readonly DayKind[]>> = {
  1: ["long"],
  2: ["quality", "long"],
  3: ["quality", "easy", "long"],
  4: ["easy", "quality", "easy", "long"],
  5: ["easy", "quality", "easy", "easy", "long"],
};
/** The most days a week of a target's sport. */
export const MAX_TARGET_DAYS = 5;

/** Easy, the day of quality (intervals, a brisk walk), the long one. */
type DayKind = "easy" | "quality" | "long";

/** The Monday of the week of `date`, as a day number. */
function mondayNumber(date: Date): number {
  const number = Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const weekday = ((((number + 3) % 7) + 7) % 7) + 1;
  return number - (weekday - 1);
}

/** The weeks from the week of `startsOn` to the week of `on` (YYYY-MM-DD),
 * both counted; 0 when `on` comes first. */
export function weeksUntil(startsOn: Date, on: string): number {
  const [year, month, day] = on.split("-").map(Number);
  const end = mondayNumber(new Date(year, month - 1, day));
  const start = mondayNumber(startsOn);
  return end < start ? 0 : (end - start) / 7 + 1;
}

/** The ISO day of the week (1 Monday) of YYYY-MM-DD. */
function weekdayOf(on: string): number {
  const [year, month, day] = on.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 ? 7 : weekday;
}

/** Where one starts: today's level in the sport's steps, or the start
 * from zero. */
export function startOf(aim: PlanAim, level: number | null): number {
  const climb = !isKeepFit(aim) && aim.climb_m !== undefined;
  if (climb) {
    return roundClimb(level ?? FROM_ZERO_CLIMB_M);
  }
  return roundDistance(level ?? FROM_ZERO_M[aim.sport], aim.sport);
}

/** The long day's sport: a walk to a distance is a walk, a hike a hike. */
function outingDay(
  sport: Exclude<TargetSport, "run">,
  kind: GymOutingKind,
  rest: Omit<GymPlanOuting, "sport" | "kind">,
  pool: boolean | undefined,
): GymPlanOuting {
  return { sport, kind, ...rest, ...(sport === "swim" ? { pool: pool ?? true } : {}) };
}

/** A day of a target of distance, from where one starts. */
function distanceDay(
  aim: PlanAim,
  kind: DayKind,
  start: number,
  fromZero: boolean,
  pool: boolean | undefined,
): Pick<GymPlanSession, "run" | "outing"> {
  const sport = aim.sport;
  const easy = roundDistance(start / 2, sport);
  if (sport === "run") {
    if (kind === "long") {
      return { run: { kind: "long", distance_m: start } };
    }
    if (fromZero) {
      return { run: WALK_RUN };
    }
    if (kind === "easy") {
      return { run: { kind: "easy", distance_m: easy } };
    }
    const far = !isKeepFit(aim) && (aim.distance_m ?? 0) > 10_000;
    return {
      run: far
        ? { kind: "intervals", reps: 5, rep_m: 1000 }
        : { kind: "intervals", reps: 6, rep_m: 400 },
    };
  }
  if (kind === "long") {
    return { outing: outingDay(sport, "long", { distance_m: start }, pool) };
  }
  if (sport === "walk" || sport === "hike") {
    // On foot the day of quality is a brisk walk; the easy days are walks.
    return {
      outing:
        kind === "easy"
          ? outingDay("walk", "easy", { distance_m: easy }, pool)
          : outingDay("walk", "brisk", { duration_s: BRISK_S }, pool),
    };
  }
  if (kind === "easy") {
    return { outing: outingDay(sport, "easy", { distance_m: easy }, pool) };
  }
  if (sport === "swim") {
    return { outing: outingDay("swim", "intervals", { reps: 8, rep_m: 100 }, pool) };
  }
  // On a bike or a paddle, intervals by the clock: «5 × 3:00».
  return { outing: outingDay(sport, "intervals", { reps: 5, rep_s: 180 }, pool) };
}

/** A day of a hike to a climb, from the climb one starts from. */
function climbDay(kind: DayKind, start: number): Pick<GymPlanSession, "outing"> {
  const distance = roundDistance(start * HIKE_M_PER_CLIMB_M, "hike");
  switch (kind) {
    case "long":
      // «Uscita in salita · 450 m».
      return {
        outing: { sport: "hike", kind: "climb", climb_m: start, distance_m: distance },
      };
    case "quality":
      // «Camminata svelta in salita · 45′», a third of the climb.
      return {
        outing: {
          sport: "walk",
          kind: "brisk",
          duration_s: BRISK_S,
          climb_m: roundClimb(start / 3),
        },
      };
    case "easy":
      return {
        outing: {
          sport: "walk",
          kind: "easy",
          distance_m: roundDistance(distance / 2, "walk"),
        },
      };
  }
}

/** The days of the target's sport: their kinds in the order of the week,
 * the long one on the target's day of the week when it is one of them,
 * else on the last. */
function kindsByDay(
  days: readonly number[],
  kinds: readonly DayKind[],
  on: string | undefined,
): { day: number; kind: DayKind }[] {
  const sorted = [...days].sort((a, b) => a - b);
  const longDay =
    on !== undefined && sorted.includes(weekdayOf(on)) ? weekdayOf(on) : sorted.at(-1);
  const rest = sorted.filter((day) => day !== longDay);
  const others = kinds.filter((_, index) => index < kinds.length - 1);
  return [
    ...rest.map((day, index) => ({ day, kind: others[index] })),
    { day: longDay as number, kind: "long" as const },
  ];
}

/**
 * The days of one sport toward `aim` (or to keep fit), from where one is:
 * the target's days of a plan, or those of another sport of the plan kept
 * as they are (TASK-461 A2b, the user's «Più d'uno» of 2026-11-12: the
 * first sport chosen has the target, the others keep fit).
 */
export function sportDays({
  aim,
  level,
  pool,
  days,
  nameOf,
}: Pick<
  TargetPlanAnswers,
  "aim" | "level" | "pool" | "days" | "nameOf"
>): GymPlanSession[] {
  const climb = !isKeepFit(aim) && aim.climb_m !== undefined;
  const kinds = (climb ? CLIMB_KINDS : DISTANCE_KINDS)[days.length];
  if (kinds === undefined) {
    return [];
  }
  const start = startOf(aim, level);
  const on = isKeepFit(aim) ? undefined : aim.on;
  return kindsByDay(days, kinds, on).map(({ day, kind }) => {
    const unnamed: UnnamedDay = {
      day,
      items: [],
      ...(climb
        ? climbDay(kind, start)
        : distanceDay(aim, kind, start, level === null, pool)),
    };
    return { ...unnamed, name: nameOf(unnamed) };
  });
}

/**
 * The plan the answers make: its first week (the target's days and the
 * other sport's), its weeks and its target. Toward a target the weeks are
 * those needed or those up to the date; «short» when they are not enough,
 * «far» for a date over 24 weeks away. Throws on days that are not 1–5 of
 * the target's sport, no day of another sport, or a day taken twice.
 */
export function targetPlan(answers: TargetPlanAnswers): TargetPlan {
  const { aim, level, pool, days, others, base, startsOn, nameOf } = answers;
  const kinds = (
    isKeepFit(aim) || aim.climb_m === undefined ? DISTANCE_KINDS : CLIMB_KINDS
  )[days.length];
  if (kinds === undefined) {
    throw new Error(`a target's sport has 1 to ${MAX_TARGET_DAYS} days a week`);
  }
  if (others.length === 0) {
    throw new Error("a plan mixes at least two sports");
  }
  const taken = [...days, ...others.map((one) => one.day)];
  if (new Set(taken).size !== taken.length || taken.some((day) => day < 1 || day > 7)) {
    throw new Error("each day of the week once");
  }
  const start = startOf(aim, level);
  const climb = !isKeepFit(aim) && aim.climb_m !== undefined;
  const made = sportDays({ aim, level, pool, days, nameOf });
  const sessions = [...others, ...made].sort((a, b) => a.day - b.day);
  const program = (weeks: number, target?: GymPlanTarget): GymProgram => ({
    ...base,
    starts_on: isoDate(startsOn),
    weeks,
    sessions,
    custom: [],
    ...(target === undefined ? {} : { target }),
  });
  if (isKeepFit(aim)) {
    return { kind: "plan", program: program(KEEP_FIT_WEEKS) };
  }
  const goal = aim.climb_m ?? aim.distance_m ?? start;
  const needed = weeksNeeded(start, goal);
  const reach = (weeks: number): number => {
    const metres = reachable(start, weeks);
    const step = climb ? 50 : distanceStep(aim.sport);
    return Math.max(step, Math.floor(metres / step) * step);
  };
  if (aim.on === undefined) {
    return needed === null
      ? {
          kind: "short",
          needed: null,
          have: MAX_TARGET_WEEKS,
          reachable: reach(MAX_TARGET_WEEKS),
        }
      : { kind: "plan", program: program(needed, aim) };
  }
  const have = weeksUntil(startsOn, aim.on);
  if (have < 1 || have > MAX_TARGET_WEEKS) {
    return { kind: "far", have };
  }
  if (needed === null || needed > have) {
    return { kind: "short", needed, have, reachable: reach(have) };
  }
  return { kind: "plan", program: program(have, aim) };
}
