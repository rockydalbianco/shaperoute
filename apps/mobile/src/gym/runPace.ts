import type {
  GymPlanRun,
  GymPlanRunner,
  GymPlanSession,
  GymProgram,
} from "@shaperoute/shared-types";

import { File, Paths } from "expo-file-system";

import { tLater } from "../i18n";
import { cycleWeekOf } from "./program";

/**
 * The run days made for their runner (the user's choices of 2026-11-11, the
 * mockup D1–D3): the guide asks the pace over 10 km and the long run of
 * today; the paces of each kind come from the pace, the long run starts
 * from theirs and grows a kilometre a week, the easy run is about half of
 * it. At the end of a cycle the runs saved say whether the runner got
 * faster: the app proposes new paces, and changes them only on a yes.
 */

/** «I don't know»: the pace over 10 km of each level, in seconds a km. */
export const LEVELS: readonly { title: string; pace10kS: number; longM: number }[] = [
  { title: tLater("Beginner"), pace10kS: 420, longM: 6000 },
  { title: tLater("Intermediate@@runner"), pace10kS: 345, longM: 10000 },
  { title: tLater("Expert@@runner"), pace10kS: 285, longM: 16000 },
];

/** What the guide shows first: 5:30/km and a long run of 12 km. */
export const DEFAULT_RUNNER: GymPlanRunner = { pace_10k_s: 330, long_m: 12000 };

/** The limits of the boxes (gym_plans.py). */
export const PACE_RANGE_S = [180, 900] as const;
export const LONG_RANGE_M = [1000, 60000] as const;
export const LONG_RANGE_S = [600, 6 * 3600] as const;

/** Seconds a km added to the pace over 10 km, by kind; intervals by the
 * length of a rep (the user's «Sì, così»). */
const EASY_S = 65;
const LONG_S = 75;
const REP_S: Readonly<Record<number, number>> = {
  200: -30,
  400: -25,
  800: -15,
  1000: -10,
};
const REP_TIMED_S = -20;

/** The pace of `run` for `runner`, in seconds a km. */
export function paceOf(run: GymPlanRun, runner: GymPlanRunner): number {
  const base = runner.pace_10k_s;
  switch (run.kind) {
    case "easy":
      return base + EASY_S;
    case "long":
      return base + LONG_S;
    case "intervals":
      return (
        base +
        (run.rep_m !== undefined ? (REP_S[run.rep_m] ?? REP_S[400]) : REP_TIMED_S)
      );
  }
}

/** «6:35»: seconds as minutes and seconds. */
export function clock(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** «≈ 1 h 28», «≈ 37 min»: how long a run at `paceS` takes; null for
 * intervals and runs given by time. */
export function timeOf(run: GymPlanRun, paceS: number): string | null {
  if (run.kind === "intervals" || run.distance_m === undefined) {
    return null;
  }
  const minutes = Math.round((run.distance_m / 1000) * (paceS / 60));
  return minutes >= 60
    ? `≈ ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`
    : `≈ ${minutes} min`;
}

function roundTo(value: number, step: number, lowest: number): number {
  return Math.max(lowest, Math.round(value / step) * step);
}

/** The run of a run day made for `runner`: the long run theirs, the easy
 * run about half of it; intervals as they are. */
export function runFor(run: GymPlanRun, runner: GymPlanRunner): GymPlanRun {
  if (run.kind === "intervals") {
    return run;
  }
  const half = run.kind === "easy";
  if (runner.long_m !== undefined) {
    return {
      kind: run.kind,
      distance_m: half ? roundTo(runner.long_m / 2, 500, 3000) : runner.long_m,
    };
  }
  const seconds = runner.long_s ?? 3600;
  return {
    kind: run.kind,
    duration_s: half ? roundTo(seconds / 2, 300, 1200) : seconds,
  };
}

/** The program made for `runner`: its run days of the first week fitted
 * to them; the weeks written by hand stay as written. */
export function withRunner(program: GymProgram, runner: GymPlanRunner): GymProgram {
  return {
    ...program,
    runner,
    sessions: program.sessions.map((session): GymPlanSession =>
      session.run === undefined
        ? session
        : { ...session, run: runFor(session.run, runner) },
    ),
  };
}

/** A saved run, as the list of «My activities» has it. */
export type SavedRun = {
  started_at: string;
  distance_m: number;
  duration_s: number;
  activity?: string;
};

/** Runs this short or shorter say nothing of a pace over 10 km. */
const SHORTEST_M = 3000;
const DAYS = 28;

/**
 * The runner the saved runs of the last four weeks say: the pace over 10 km
 * of the best of them by Riegel's formula (t₂ = t₁ · (d₂ / d₁)^1.06), the
 * long run the longest of them; null without a run of 3 km or more.
 */
export function runnerFromRuns(
  runs: readonly SavedRun[],
  now: Date,
): GymPlanRunner | null {
  const since = now.getTime() - DAYS * 24 * 60 * 60 * 1000;
  const counted = runs.filter(
    (run) =>
      (run.activity === undefined || run.activity === "running") &&
      run.distance_m >= SHORTEST_M &&
      run.duration_s > 0 &&
      new Date(run.started_at).getTime() >= since &&
      new Date(run.started_at).getTime() <= now.getTime(),
  );
  if (counted.length === 0) {
    return null;
  }
  const paces = counted.map(
    (run) => (run.duration_s * Math.pow(10000 / run.distance_m, 1.06)) / 10,
  );
  const pace = Math.round(Math.min(...paces));
  const longest = Math.max(...counted.map((run) => run.distance_m));
  return {
    pace_10k_s: Math.min(PACE_RANGE_S[1], Math.max(PACE_RANGE_S[0], pace)),
    long_m: Math.min(LONG_RANGE_M[1], roundTo(longest, 500, LONG_RANGE_M[0])),
  };
}

/** A pace this much faster is worth proposing. */
const BETTER_BY_S = 5;

/**
 * At the end of a cycle (its last week), the runner the saved runs say,
 * when it is faster than the plan's by 5 s/km or more; null otherwise, and
 * for a plan without a runner.
 */
export function fasterRunner(
  program: GymProgram,
  runs: readonly SavedRun[],
  now: Date,
): { runner: GymPlanRunner; cycle: number } | null {
  if (program.runner === undefined) {
    return null;
  }
  const where = cycleWeekOf(program, now);
  if (where === null || where.week !== program.weeks) {
    return null;
  }
  const said = runnerFromRuns(runs, now);
  if (said === null || said.pace_10k_s > program.runner.pace_10k_s - BETTER_BY_S) {
    return null;
  }
  // The long run in the plan's own unit: a time stays a time.
  const runner: GymPlanRunner =
    program.runner.long_s !== undefined
      ? { pace_10k_s: said.pace_10k_s, long_s: program.runner.long_s }
      : {
          pace_10k_s: said.pace_10k_s,
          long_m: Math.max(program.runner.long_m ?? 0, said.long_m ?? 0),
        };
  return { runner, cycle: where.cycle };
}

/** The proposals answered, by plan and cycle: asked once a cycle. */
export const ASKED_FILE = "gym-pace-asked.json";

let askedCache: Record<string, number> | null = null;

function askedAll(): Record<string, number> {
  if (askedCache === null) {
    try {
      const file = new File(Paths.document, ASKED_FILE);
      const data: unknown = file.exists ? JSON.parse(file.textSync()) : {};
      askedCache =
        typeof data === "object" && data !== null
          ? (data as Record<string, number>)
          : {};
    } catch {
      askedCache = {};
    }
  }
  return askedCache;
}

/** Whether the proposal of `cycle` of the plan `key` was answered. */
export function paceAsked(key: string, cycle: number): boolean {
  return askedAll()[key] === cycle;
}

/** The proposal answered, yes or no: not asked again this cycle. */
export function keepPaceAsked(key: string, cycle: number): void {
  askedCache = { ...askedAll(), [key]: cycle };
  try {
    const file = new File(Paths.document, ASKED_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(askedCache));
  } catch {
    // Answered while the app is open: at worst it is asked once more.
  }
}

/** For the tests: the file read again. */
export function forgetPaceAsked(): void {
  askedCache = null;
}
