import type { GymPlanItem, GymSetKind } from "@shaperoute/shared-types";

import { type Muscle, musclesOf } from "../gym/muscles";

/**
 * The Coach's rules (TASK-491 part A, ADR-0399): the workouts of the last
 * weeks in, at most three tips out. A pure function: the same workouts give
 * the same tips, no network, no AI model. Each threshold says the study it
 * comes from; docs/tasks/TASK-491.md has the table.
 *
 * A tip carries a `change` only when «Apply» can make it on a plan
 * (applyTip.ts); without one the page shows «OK».
 */

// ── Thresholds, each with its study ─────────────────────────────────────

/** Double progression: all reps done this many workouts in a row (ACSM
 * Position Stand, Progression models in resistance training, 2009). */
export const PROGRESS_STREAK = 2;
/** kg added for the upper body and for the legs (ACSM 2009: 2–10% steps,
 * the smallest plates in a gym). */
export const UPPER_STEP_KG = 2.5;
export const LOWER_STEP_KG = 5;
/** Below the reps twice in a row: this share less weight (ACSM 2009, a
 * load that fits the reps aimed at). */
export const MISSED_DROP = 0.1;
/** Stalled: the estimated max (Epley 1985: kg × (1 + reps / 30)) grew less
 * than this over this many workouts. */
export const STALL_WORKOUTS = 3;
export const STALL_GAIN = 0.01;
/** Weekly sets per muscle (Schoenfeld, Ogborn, Krieger, J Sports Sci 2017):
 * at least 10 builds more; above 20 adds fatigue more than muscle. A muscle
 * that helps counts half a set. */
export const WEEKLY_SETS_LOW = 10;
export const WEEKLY_SETS_HIGH = 20;
export const SECONDARY_SHARE = 0.5;
/** Sets added at most by one tip. */
export const MAX_ADDED_SETS = 4;
/** Twice a week beats once (Schoenfeld, Ogborn, Krieger, Sports Med 2016):
 * a muscle with this many sets on its only day is worth splitting. */
export const ONE_DAY_SETS = 6;
/** Recovery of a muscle trained hard (ACSM 2009: 48–72 h). */
export const RECOVERY_H = 48;
export const HARD_SETS = 4;
/** Weekly distance up more than this on the 4 weeks before (Nielsen et
 * al., JOSPT 2014); the 10% rule alone protects no one (Buist et al., Am J
 * Sports Med 2008). Only from this many km a week. */
export const RUN_JUMP = 0.3;
export const RUN_JUMP_FROM_KM = 5;
/** Easy share of the running time (Seiler & Kjerland 2006; Seiler, IJSPP
 * 2010): about 80%; below this, the next run easy. A run is easy when its
 * pace is this much slower than the 10 km pace. */
export const EASY_SHARE = 0.75;
export const EASY_PACE_FACTOR = 1.15;
export const EASY_MIN_RUNS = 3;
/** Acute:chronic workload ratio (Gabbett, BJSM 2016), soft: criticised by
 * Impellizzeri et al. 2020, so it never changes a plan. */
export const ACWR_HIGH = 1.5;
export const ACWR_FROM_MIN = 60;
/** Weeks of steady work before an easier one (Bosquet et al., Med Sci
 * Sports Exerc 2007: 41–60% less volume, same intensity); a week counts
 * when it has this share of the usual load. Monotony (Foster, Med Sci
 * Sports Exerc 1998): mean over standard deviation of the daily load. */
export const DELOAD_WEEKS = 6;
export const STEADY_SHARE = 0.6;
export const MONOTONY_HIGH = 2;
export const MONOTONY_MIN_DAYS = 4;
/** A short night (Fullagar et al., Sports Med 2015), soft. */
export const SLEEP_LOW = 60;
/** Away this many days: start again at 85% (Mujika & Padilla, Sports Med
 * 2000). */
export const AWAY_DAYS = 14;
export const COMEBACK_SHARE = 0.85;
/** Strength days a week (WHO guidelines on physical activity, 2020). */
export const STRENGTH_DAYS = 2;
/** The page shows this many tips at most. */
export const MAX_TIPS = 3;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** The muscles that move the legs: they take the bigger step. */
const LEGS: ReadonlySet<Muscle> = new Set<Muscle>([
  "quads",
  "glutes",
  "hamstrings",
  "adductors",
  "abductors",
  "calves",
]);

/** The muscles a missing-volume tip looks at: the big ones. */
export const BIG_MUSCLES: readonly Muscle[] = [
  "chest",
  "lats",
  "shoulders",
  "quads",
  "hamstrings",
  "glutes",
];

// ── Input ───────────────────────────────────────────────────────────────

/** A set as the Coach reads it. */
export type CoachSet = { kind: GymSetKind; reps?: number; load_kg?: number };

/** One exercise of a workout, with what its plan aimed at that day. */
export type CoachExercise = {
  exercise: string;
  sets: CoachSet[];
  targetReps?: number;
  targetKg?: number;
};

/** A workout at the gym. */
export type CoachWorkout = {
  id: string;
  startedAt: Date;
  durationS: number;
  /** The key of the plan it followed. */
  plan?: string;
  exercises: CoachExercise[];
};

/** A run. */
export type CoachRun = { startedAt: Date; distanceM: number; durationS: number };

/** An exercise of a plan, with the day of the week it is on. */
export type CoachPlanItem = { plan: string; day: number; item: GymPlanItem };

/** The workout of a plan due today. */
export type CoachToday = { plan: string; day: number; items: GymPlanItem[] };

export type CoachInput = {
  now: Date;
  /** The workouts at the gym of the last 8 weeks, sets of the last 4. */
  workouts: CoachWorkout[];
  /** The runs of the last 8 weeks. */
  runs: CoachRun[];
  /** Every exercise of the account's plans. */
  planItems: CoachPlanItem[];
  today?: CoachToday;
  /** Seconds a km over 10 km, from a plan's runner. */
  pace10kS?: number;
  /** Last night's sleep score, 0–100. */
  sleepScore?: number | null;
};

// ── Output ──────────────────────────────────────────────────────────────

export type RuleId =
  | "P1"
  | "P1bw"
  | "P2"
  | "P3"
  | "P4"
  | "P4hi"
  | "P5"
  | "P6"
  | "C1"
  | "C2"
  | "C3"
  | "T1"
  | "T3"
  | "T4"
  | "T5";

/** What «Apply» changes: amounts added to an exercise of a plan, in every
 * week of it. */
export type TipChange = {
  plan: string;
  exercise: string;
  deltaKg?: number;
  deltaReps?: number;
  deltaSets?: number;
};

export type Tip = {
  rule: RuleId;
  /** 1 safety, 2 progression, 3 balance. */
  group: 1 | 2 | 3;
  exercise?: string;
  muscle?: Muscle;
  /** The numbers the texts show. */
  values: Readonly<Record<string, number>>;
  change?: TipChange;
};

const ORDER: readonly RuleId[] = [
  "C1",
  "P6",
  "T3",
  "T4",
  "C3",
  "P1",
  "P1bw",
  "P2",
  "P3",
  "T1",
  "P4",
  "P4hi",
  "P5",
  "C2",
  "T5",
];

const GROUP: Readonly<Record<RuleId, 1 | 2 | 3>> = {
  C1: 1,
  P6: 1,
  T3: 1,
  T4: 1,
  C3: 1,
  P1: 2,
  P1bw: 2,
  P2: 2,
  P3: 2,
  T1: 2,
  P4: 3,
  P4hi: 3,
  P5: 3,
  C2: 3,
  T5: 3,
};

// ── Helpers ─────────────────────────────────────────────────────────────

/** kg to the nearest 2.5, as plates allow. */
export function plates(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/** Epley's estimated max of one set (Epley 1985). */
export function epley(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

function within(input: CoachInput, from: number, to: number) {
  const now = input.now.getTime();
  return (moment: Date) => {
    const ago = now - moment.getTime();
    return ago >= from && ago < to;
  };
}

function tip(
  rule: RuleId,
  values: Record<string, number>,
  more: Partial<Pick<Tip, "exercise" | "muscle" | "change">> = {},
): Tip {
  return { rule, group: GROUP[rule], values, ...more };
}

/** The workouts with `exercise`, the latest first. */
function historyOf(workouts: readonly CoachWorkout[], exercise: string) {
  return workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((one) => one.exercise === exercise && one.sets.length > 0)
        .map((one) => ({ workout, one })),
    )
    .sort((a, b) => b.workout.startedAt.getTime() - a.workout.startedAt.getTime());
}

function isLegs(exercise: string): boolean {
  const worked = musclesOf(exercise);
  return worked !== null && worked.primary.some((muscle) => LEGS.has(muscle));
}

/** 1 Monday to 7 Sunday, on the phone's clock. */
export function weekdayOf(moment: Date): number {
  return ((moment.getDay() + 6) % 7) + 1;
}

/** The sets of a workout whose exercise has `muscle` as a main one. */
function primarySets(workout: CoachWorkout, muscle: Muscle): number {
  return workout.exercises
    .filter((one) => musclesOf(one.exercise)?.primary.includes(muscle) === true)
    .reduce((sum, one) => sum + one.sets.length, 0);
}

function topKg(sets: readonly CoachSet[]): number {
  return Math.max(0, ...sets.map((set) => set.load_kg ?? 0));
}

function hasPlanItem(input: CoachInput, plan: string | undefined, exercise: string) {
  return (
    plan !== undefined &&
    input.planItems.some((one) => one.plan === plan && one.item.exercise === exercise)
  );
}

/** Sets of each muscle in a span: a main muscle a set, a helper half. */
export function setsByMuscle(workouts: readonly CoachWorkout[]): Map<Muscle, number> {
  const sets = new Map<Muscle, number>();
  const add = (muscle: Muscle, amount: number) =>
    sets.set(muscle, (sets.get(muscle) ?? 0) + amount);
  for (const workout of workouts) {
    for (const one of workout.exercises) {
      const worked = musclesOf(one.exercise);
      if (worked === null) {
        continue;
      }
      worked.primary.forEach((muscle) => add(muscle, one.sets.length));
      worked.secondary.forEach((muscle) =>
        add(muscle, one.sets.length * SECONDARY_SHARE),
      );
    }
  }
  return sets;
}

function loadMinutes(input: CoachInput, from: number, to: number): number {
  const inside = within(input, from, to);
  const gym = input.workouts.filter((one) => inside(one.startedAt));
  const runs = input.runs.filter((one) => inside(one.startedAt));
  return [...gym, ...runs].reduce((sum, one) => sum + one.durationS, 0) / 60;
}

// ── Gym ─────────────────────────────────────────────────────────────────

function progression(input: CoachInput): Tip[] {
  const exercises = new Set(
    input.workouts.flatMap((workout) => workout.exercises.map((one) => one.exercise)),
  );
  const tips: Tip[] = [];
  for (const exercise of exercises) {
    const history = historyOf(input.workouts, exercise);
    const found =
      progressOf(input, exercise, history) ?? stallOf(input, exercise, history);
    if (found !== null) {
      tips.push(found);
    }
  }
  return tips;
}

function progressOf(
  input: CoachInput,
  exercise: string,
  history: ReturnType<typeof historyOf>,
): Tip | null {
  const last = history.slice(0, PROGRESS_STREAK);
  if (last.length < PROGRESS_STREAK) {
    return null;
  }
  const target = last[0].one.targetReps;
  if (target === undefined || last.some(({ one }) => one.targetReps !== target)) {
    return null;
  }
  const plan = last[0].workout.plan;
  const canApply = hasPlanItem(input, plan, exercise);
  const kind = last[0].one.sets[0].kind;
  const allDone = last.every(({ one }) =>
    one.sets.every((set) => (set.reps ?? 0) >= target),
  );
  const mostMissed = last.every(
    ({ one }) =>
      one.sets.filter((set) => (set.reps ?? 0) < target).length > one.sets.length / 2,
  );
  if (kind === "load") {
    const kg = topKg(last[0].one.sets);
    if (kg <= 0 || last.some(({ one }) => topKg(one.sets) !== kg)) {
      return null;
    }
    if (allDone) {
      const step = isLegs(exercise) ? LOWER_STEP_KG : UPPER_STEP_KG;
      return tip(
        "P1",
        { kg: kg + step, old: kg, min: target },
        {
          exercise,
          ...(canApply && plan !== undefined
            ? { change: { plan, exercise, deltaKg: step } }
            : {}),
        },
      );
    }
    if (mostMissed) {
      const drop = Math.max(2.5, plates(kg * MISSED_DROP));
      return tip(
        "P2",
        { kg: kg - drop, old: kg, min: target },
        {
          exercise,
          ...(canApply && plan !== undefined
            ? { change: { plan, exercise, deltaKg: -drop } }
            : {}),
        },
      );
    }
    return null;
  }
  if (kind === "bodyweight" && allDone) {
    return tip(
      "P1bw",
      { reps: target + 1 },
      {
        exercise,
        ...(canApply && plan !== undefined
          ? { change: { plan, exercise, deltaReps: 1 } }
          : {}),
      },
    );
  }
  return null;
}

function stallOf(
  input: CoachInput,
  exercise: string,
  history: ReturnType<typeof historyOf>,
): Tip | null {
  const last = history.slice(0, STALL_WORKOUTS);
  if (last.length < STALL_WORKOUTS || last[0].one.sets[0].kind !== "load") {
    return null;
  }
  const best = (sets: readonly CoachSet[]) =>
    Math.max(0, ...sets.map((set) => epley(set.load_kg ?? 0, set.reps ?? 0)));
  const newest = best(last[0].one.sets);
  const oldest = best(last[last.length - 1].one.sets);
  if (oldest <= 0 || newest > oldest * (1 + STALL_GAIN)) {
    return null;
  }
  const reps = last[0].one.targetReps ?? last[0].one.sets[0].reps ?? 0;
  if (reps <= 0) {
    return null;
  }
  const nextReps = reps >= 8 ? 5 : 10;
  const nextKg = plates(newest / (1 + nextReps / 30));
  const plan = last[0].workout.plan;
  const kg = last[0].one.targetKg ?? topKg(last[0].one.sets);
  return tip(
    "P3",
    { min2: nextReps, max2: nextReps + 2, kg: nextKg },
    {
      exercise,
      ...(hasPlanItem(input, plan, exercise) && plan !== undefined
        ? {
            change: {
              plan,
              exercise,
              deltaReps: nextReps - reps,
              deltaKg: nextKg - kg,
            },
          }
        : {}),
    },
  );
}

function volume(input: CoachInput): Tip[] {
  const week = input.workouts.filter((one) =>
    within(input, 0, 7 * DAY_MS)(one.startedAt),
  );
  if (week.length === 0) {
    return [];
  }
  const sets = setsByMuscle(week);
  const tips: Tip[] = [];
  const low = BIG_MUSCLES.map((muscle) => ({ muscle, sets: sets.get(muscle) ?? 0 }))
    .filter((one) => one.sets < WEEKLY_SETS_LOW)
    .sort((a, b) => a.sets - b.sets)[0];
  if (low !== undefined) {
    const n = Math.min(MAX_ADDED_SETS, Math.ceil(WEEKLY_SETS_LOW - low.sets));
    const where = input.planItems.find(
      (one) =>
        one.item.exercise !== undefined &&
        musclesOf(one.item.exercise)?.primary.includes(low.muscle) === true,
    );
    tips.push(
      tip(
        "P4",
        { n, sets: Math.round(low.sets), ...(where ? { day: where.day } : {}) },
        {
          muscle: low.muscle,
          ...(where?.item.exercise !== undefined
            ? {
                exercise: where.item.exercise,
                change: {
                  plan: where.plan,
                  exercise: where.item.exercise,
                  deltaSets: n,
                },
              }
            : {}),
        },
      ),
    );
  }
  const high = [...sets.entries()]
    .filter(([, count]) => count > WEEKLY_SETS_HIGH)
    .sort((a, b) => b[1] - a[1])[0];
  if (high !== undefined) {
    tips.push(tip("P4hi", { sets: Math.round(high[1]) }, { muscle: high[0] }));
  }
  for (const muscle of BIG_MUSCLES) {
    const days = new Map<string, { sets: number; weekday: number }>();
    for (const workout of week) {
      const primary = primarySets(workout, muscle);
      if (primary > 0) {
        const key = workout.startedAt.toDateString();
        const sets = (days.get(key)?.sets ?? 0) + primary;
        days.set(key, { sets, weekday: weekdayOf(workout.startedAt) });
      }
    }
    const [only] = [...days.values()];
    if (days.size === 1 && only.sets >= ONE_DAY_SETS) {
      tips.push(tip("P5", { sets: only.sets, day: only.weekday }, { muscle }));
      break;
    }
  }
  return tips;
}

function recovery(input: CoachInput): Tip[] {
  if (input.today === undefined) {
    return [];
  }
  const recent = input.workouts.filter((one) =>
    within(input, 0, RECOVERY_H * HOUR_MS)(one.startedAt),
  );
  const startOfToday = new Date(input.now);
  startOfToday.setHours(0, 0, 0, 0);
  if (recent.some((one) => one.startedAt >= startOfToday)) {
    return [];
  }
  const planned = new Set(
    input.today.items.flatMap((item) =>
      item.exercise === undefined ? [] : (musclesOf(item.exercise)?.primary ?? []),
    ),
  );
  for (const muscle of planned) {
    const hard = recent
      .map((workout) => ({ workout, sets: primarySets(workout, muscle) }))
      .filter((one) => one.sets >= HARD_SETS)
      .sort((a, b) => b.workout.startedAt.getTime() - a.workout.startedAt.getTime())[0];
    if (hard !== undefined) {
      const hours = Math.round(
        (input.now.getTime() - hard.workout.startedAt.getTime()) / HOUR_MS,
      );
      return [tip("P6", { hours }, { muscle })];
    }
  }
  return [];
}

// ── Running ─────────────────────────────────────────────────────────────

function km(input: CoachInput, from: number, to: number): number {
  const inside = within(input, from, to);
  return (
    input.runs
      .filter((one) => inside(one.startedAt))
      .reduce((sum, one) => sum + one.distanceM, 0) / 1000
  );
}

function runJump(input: CoachInput): Tip[] {
  const last = km(input, 0, 7 * DAY_MS);
  const before =
    [1, 2, 3, 4].reduce(
      (sum, w) => sum + km(input, w * 7 * DAY_MS, (w + 1) * 7 * DAY_MS),
      0,
    ) / 4;
  if (before < RUN_JUMP_FROM_KM || last <= before * (1 + RUN_JUMP)) {
    return [];
  }
  return [
    tip("C1", {
      km: Math.round(last),
      pct: Math.round((last / before - 1) * 100),
    }),
  ];
}

function easyShare(input: CoachInput): Tip[] {
  const runs = input.runs.filter(
    (one) => within(input, 0, 14 * DAY_MS)(one.startedAt) && one.distanceM > 0,
  );
  if (runs.length < EASY_MIN_RUNS) {
    return [];
  }
  const paceOf = (one: CoachRun) => one.durationS / (one.distanceM / 1000);
  const reference =
    input.pace10kS ??
    Math.min(
      ...input.runs
        .filter(
          (one) =>
            one.distanceM >= 3000 && within(input, 0, 28 * DAY_MS)(one.startedAt),
        )
        .map(paceOf),
    );
  if (!Number.isFinite(reference)) {
    return [];
  }
  const total = runs.reduce((sum, one) => sum + one.durationS, 0);
  const easy = runs
    .filter((one) => paceOf(one) >= reference * EASY_PACE_FACTOR)
    .reduce((sum, one) => sum + one.durationS, 0);
  const share = total > 0 ? easy / total : 1;
  return share < EASY_SHARE ? [tip("C2", { pct: Math.round(share * 100) })] : [];
}

function workload(input: CoachInput): Tip[] {
  const acute = loadMinutes(input, 0, 7 * DAY_MS);
  const chronic =
    [0, 1, 2, 3].reduce(
      (sum, w) => sum + loadMinutes(input, w * 7 * DAY_MS, (w + 1) * 7 * DAY_MS),
      0,
    ) / 4;
  if (chronic < ACWR_FROM_MIN || acute / chronic <= ACWR_HIGH) {
    return [];
  }
  return [tip("C3", { ratio: Math.round((acute / chronic) * 10) / 10 })];
}

// ── Every sport ─────────────────────────────────────────────────────────

/** Weeks of steady work in a row, the last first, of the last 8. */
export function steadyWeeks(input: CoachInput): number {
  const weeks = Array.from({ length: 8 }, (_, w) =>
    loadMinutes(input, w * 7 * DAY_MS, (w + 1) * 7 * DAY_MS),
  );
  const worked = weeks.filter((one) => one > 0);
  if (worked.length === 0) {
    return 0;
  }
  const usual = worked.reduce((sum, one) => sum + one, 0) / worked.length;
  let streak = 0;
  for (const one of weeks) {
    if (one <= 0 || one < usual * STEADY_SHARE) {
      break;
    }
    streak += 1;
  }
  return streak;
}

/** Foster's monotony of the last 7 days; null on too few training days. */
export function monotony(input: CoachInput): number | null {
  const days = Array.from({ length: 7 }, (_, d) =>
    loadMinutes(input, d * DAY_MS, (d + 1) * DAY_MS),
  );
  if (days.filter((one) => one > 0).length < MONOTONY_MIN_DAYS) {
    return null;
  }
  const mean = days.reduce((sum, one) => sum + one, 0) / days.length;
  const sd = Math.sqrt(
    days.reduce((sum, one) => sum + (one - mean) ** 2, 0) / days.length,
  );
  return sd > 0 ? mean / sd : null;
}

function deload(input: CoachInput): Tip[] {
  const weeks = steadyWeeks(input);
  const flat = monotony(input);
  if (weeks >= DELOAD_WEEKS || (flat !== null && flat > MONOTONY_HIGH)) {
    return [tip("T1", { weeks })];
  }
  return [];
}

function sleep(input: CoachInput): Tip[] {
  const score = input.sleepScore;
  if (input.today === undefined || score === undefined || score === null) {
    return [];
  }
  return score < SLEEP_LOW ? [tip("T3", { score })] : [];
}

function away(input: CoachInput): Tip[] {
  const moments = [...input.workouts, ...input.runs].map((one) =>
    one.startedAt.getTime(),
  );
  if (moments.length === 0) {
    return [];
  }
  const days = Math.floor((input.now.getTime() - Math.max(...moments)) / DAY_MS);
  return days > AWAY_DAYS ? [tip("T4", { days, pct: COMEBACK_SHARE * 100 })] : [];
}

function strengthDays(input: CoachInput): Tip[] {
  const lately = within(input, 0, 28 * DAY_MS);
  if (![...input.workouts, ...input.runs].some((one) => lately(one.startedAt))) {
    return [];
  }
  const days = new Set(
    input.workouts
      .filter((one) => within(input, 0, 7 * DAY_MS)(one.startedAt))
      .map((one) => one.startedAt.toDateString()),
  );
  return days.size < STRENGTH_DAYS ? [tip("T5", { n: days.size })] : [];
}

// ── All together ────────────────────────────────────────────────────────

/** Every tip the rules find, in the order the page shows them. */
export function allTips(input: CoachInput): Tip[] {
  const found = [
    ...runJump(input),
    ...recovery(input),
    ...sleep(input),
    ...away(input),
    ...workload(input),
    ...progression(input),
    ...deload(input),
    ...volume(input),
    ...easyShare(input),
    ...strengthDays(input),
  ];
  return found
    .map((one, index) => ({ one, index }))
    .sort(
      (a, b) =>
        ORDER.indexOf(a.one.rule) - ORDER.indexOf(b.one.rule) || a.index - b.index,
    )
    .map(({ one }) => one);
}

/** The tips the page shows: at most three, one an exercise, without the
 * ones put off with «Not now». Away more than 14 days, only the welcome
 * back: the weeks before say nothing of today. */
export function coachTips(
  input: CoachInput,
  snoozed: ReadonlySet<string> = new Set(),
): Tip[] {
  const all = allTips(input).filter((one) => !snoozed.has(tipKey(one)));
  const welcome = all.find((one) => one.rule === "T4");
  if (welcome !== undefined) {
    return [welcome];
  }
  const shown: Tip[] = [];
  const exercises = new Set<string>();
  for (const one of all) {
    if (one.exercise !== undefined) {
      if (exercises.has(one.exercise)) {
        continue;
      }
      exercises.add(one.exercise);
    }
    shown.push(one);
    if (shown.length === MAX_TIPS) {
      break;
    }
  }
  return shown;
}

/** What «Not now» remembers a tip by: its rule and what it is about. */
export function tipKey(one: Pick<Tip, "rule" | "exercise" | "muscle">): string {
  return [one.rule, one.exercise ?? "", one.muscle ?? ""].join(":");
}
