import type {
  GymPlanGoal,
  GymPlanItem,
  GymPlanMode,
  GymPlanRun,
  GymPlanSession,
  GymPlanWeek,
  GymProgram,
  GymRunKind,
} from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { Language } from "../i18n/languages";
import { type GymGroup, gymExercise } from "./catalog";
import { groupName } from "./groups";
import { DEFAULT_STEP_KG } from "./program";

/**
 * The plan the guide proposes (docs/sports/gym.md «Le schede guidate», the
 * user's choices of 2026-11-10): from the goal and the days of the week, a
 * workout for each day with exercises of the catalog and the sets and reps
 * of the goal, ready to start and to retouch. The loads stay empty: the
 * owner writes them at the first workout.
 */

/** The goals, in the guide's order, with what each sets. */
export const GOALS: readonly {
  goal: GymPlanGoal;
  title: string;
  /** Sets × reps of the first exercises, of the others, the rest. */
  main: { sets: number; reps: number };
  other: { sets: number; reps: number };
  restS: number;
  /** Seconds of a timed exercise. */
  holdS: number;
  /** Exercises a workout. */
  count: number;
}[] = [
  {
    goal: "muscle",
    title: tLater("More muscle"),
    main: { sets: 4, reps: 10 },
    other: { sets: 3, reps: 12 },
    restS: 90,
    holdS: 45,
    count: 5,
  },
  {
    goal: "strength",
    title: tLater("More strength"),
    main: { sets: 5, reps: 5 },
    other: { sets: 3, reps: 8 },
    restS: 180,
    holdS: 45,
    count: 5,
  },
  {
    goal: "tone",
    title: tLater("Tone up and lose weight"),
    main: { sets: 3, reps: 15 },
    other: { sets: 3, reps: 15 },
    restS: 45,
    holdS: 60,
    count: 5,
  },
  {
    goal: "fit",
    title: tLater("Get back in shape"),
    main: { sets: 3, reps: 12 },
    other: { sets: 3, reps: 12 },
    restS: 60,
    holdS: 30,
    count: 4,
  },
];

export function goalOf(goal: GymPlanGoal | undefined): (typeof GOALS)[number] {
  return GOALS.find((one) => one.goal === goal) ?? GOALS[0];
}

/** A workout the guide can propose: its name (the English text, or the
 * one muscle group it works) and its exercises, the main ones first. */
type Workout = ({ name: string } | { group: GymGroup }) & {
  exercises: readonly string[];
};

/** How the guide writes the workouts' names: `t` for the English texts,
 * the language for the groups' names (groups.ts: «Back» is «Indietro» in
 * the app's texts). */
export type Naming = { t: (text: string) => string; language: Language };

const FULL_A: Workout = {
  name: tLater("Full body A"),
  exercises: ["back_squat", "bench_press", "lat_pulldown", "overhead_press", "plank"],
};
const FULL_B: Workout = {
  name: tLater("Full body B"),
  exercises: [
    "leg_press",
    "dumbbell_bench_press",
    "seated_cable_row",
    "lateral_raise",
    "crunch",
  ],
};
const PUSH: Workout = {
  name: tLater("Chest, shoulders, triceps"),
  exercises: [
    "bench_press",
    "incline_bench_press",
    "overhead_press",
    "lateral_raise",
    "triceps_pushdown",
  ],
};
const PULL: Workout = {
  name: tLater("Back, biceps"),
  exercises: [
    "lat_pulldown",
    "seated_cable_row",
    "dumbbell_row",
    "face_pull",
    "barbell_curl",
  ],
};
const LEGS: Workout = {
  name: tLater("Legs, core"),
  exercises: ["back_squat", "leg_press", "leg_curl", "standing_calf_raise", "plank"],
};
const UPPER_A: Workout = {
  name: tLater("Upper body A"),
  exercises: [
    "bench_press",
    "barbell_row",
    "overhead_press",
    "barbell_curl",
    "triceps_pushdown",
  ],
};
const UPPER_B: Workout = {
  name: tLater("Upper body B"),
  exercises: [
    "dumbbell_bench_press",
    "lat_pulldown",
    "dumbbell_shoulder_press",
    "hammer_curl",
    "skull_crusher",
  ],
};
const LOWER_A: Workout = {
  name: tLater("Lower body A"),
  exercises: [
    "back_squat",
    "romanian_deadlift",
    "leg_extension",
    "standing_calf_raise",
    "plank",
  ],
};
const LOWER_B: Workout = {
  name: tLater("Lower body B"),
  exercises: [
    "leg_press",
    "hip_thrust",
    "leg_curl",
    "seated_calf_raise",
    "hanging_leg_raise",
  ],
};
const CHEST: Workout = {
  group: "chest",
  exercises: [
    "bench_press",
    "incline_bench_press",
    "dumbbell_fly",
    "chest_press_machine",
    "dips",
  ],
};
const BACK: Workout = {
  group: "back",
  exercises: [
    "lat_pulldown",
    "barbell_row",
    "seated_cable_row",
    "straight_arm_pulldown",
    "back_extension",
  ],
};
const LEGS_ONLY: Workout = {
  group: "legs",
  exercises: [
    "back_squat",
    "leg_press",
    "romanian_deadlift",
    "leg_extension",
    "leg_curl",
  ],
};
const SHOULDERS: Workout = {
  group: "shoulders",
  exercises: ["overhead_press", "lateral_raise", "rear_delt_fly", "face_pull", "shrug"],
};
const ARMS: Workout = {
  name: tLater("Arms, core"),
  exercises: [
    "barbell_curl",
    "triceps_pushdown",
    "hammer_curl",
    "overhead_triceps_extension",
    "crunch",
  ],
};

/** The workouts of a week of `count` days, in their order. */
const SPLITS: Readonly<Record<number, readonly Workout[]>> = {
  1: [FULL_A],
  2: [FULL_A, FULL_B],
  3: [PUSH, PULL, LEGS],
  4: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
  5: [CHEST, BACK, LEGS_ONLY, SHOULDERS, ARMS],
  6: [PUSH, PULL, LEGS, UPPER_B, LOWER_B, ARMS],
  7: [PUSH, PULL, LEGS, UPPER_B, LOWER_B, ARMS, FULL_B],
};

/** The second week of «two weeks in turn»: other exercises of the same
 * muscles, by the split of the first. */
const TURNS: Readonly<Record<number, readonly Workout[]>> = {
  1: [FULL_B],
  2: [FULL_B, FULL_A],
  3: [UPPER_B, LOWER_B, ARMS],
  4: [UPPER_B, LOWER_B, UPPER_A, LOWER_A],
  5: [PUSH, PULL, LOWER_B, UPPER_B, ARMS],
  6: [UPPER_A, LOWER_A, FULL_A, PUSH, PULL, LEGS],
  7: [UPPER_A, LOWER_A, FULL_A, PUSH, PULL, LEGS, ARMS],
};

/** The days the guide picks for `count` workouts a week: a day of rest in
 * between where it can. */
export function proposedDays(count: number): number[] {
  switch (count) {
    case 1:
      return [1];
    case 2:
      return [1, 4];
    case 3:
      return [1, 3, 5];
    case 4:
      return [1, 2, 4, 5];
    case 5:
      return [1, 2, 3, 4, 5];
    case 6:
      return [1, 2, 3, 4, 5, 6];
    default:
      return [1, 2, 3, 4, 5, 6, 7];
  }
}

/** An exercise of the catalog with the values of `goal`. */
export function proposedItem(
  key: string,
  goal: GymPlanGoal,
  main: boolean,
): GymPlanItem {
  const kind = gymExercise(key)?.kind ?? "load";
  const values = goalOf(goal);
  const { sets, reps } = main ? values.main : values.other;
  if (kind === "timed") {
    return { exercise: key, kind, sets: values.other.sets, duration_s: values.holdS };
  }
  if (kind === "cardio") {
    return { exercise: key, kind, sets: 1, duration_s: 600 };
  }
  return { exercise: key, kind, sets, reps };
}

function sessionOf(
  workout: Workout,
  day: number,
  goal: GymPlanGoal,
  naming: Naming,
): GymPlanSession {
  const count = goalOf(goal).count;
  return {
    day,
    name:
      "group" in workout
        ? groupName(workout.group, naming.language)
        : naming.t(workout.name),
    items: workout.exercises
      .slice(0, count)
      .map((key, index) => proposedItem(key, goal, index < 2)),
  };
}

/**
 * The program the guide proposes for `goal` on `days` (1 Monday to 7
 * Sunday), changing as `mode` says over `weeks`; the workouts' names are
 * written in the app's language, and the plan keeps them as written.
 */
/** The run days the guide picks for `count` runs: the days without the
 * gym, Tuesday and Saturday first (TASK-433 C). */
const RUN_DAY_ORDER = [2, 6, 4, 7, 3, 5, 1];

export function proposedRunDays(count: number, gymDays: number[]): number[] {
  return RUN_DAY_ORDER.filter((day) => !gymDays.includes(day))
    .slice(0, Math.max(0, count))
    .sort((a, b) => a - b);
}

/** The names of the run days, by kind. */
export const RUN_NAMES: Readonly<Record<GymRunKind, string>> = {
  easy: tLater("Easy run"),
  intervals: tLater("Intervals"),
  long: tLater("Long run"),
};

/** The runs the guide proposes, in order: easy, long, intervals; shorter
 * to get back in shape. */
export function proposedRun(index: number, goal: GymPlanGoal): GymPlanRun {
  const fit = goal === "fit";
  switch (index % 3) {
    case 0:
      return { kind: "easy", distance_m: fit ? 3000 : 5000 };
    case 1:
      return { kind: "long", distance_m: fit ? 5000 : 8000 };
    default:
      return fit
        ? { kind: "intervals", reps: 5, rep_m: 200 }
        : { kind: "intervals", reps: 6, rep_m: 400 };
  }
}

function runSession(
  day: number,
  index: number,
  goal: GymPlanGoal,
  naming: Naming,
): GymPlanSession {
  const run = proposedRun(index, goal);
  return { day, name: naming.t(RUN_NAMES[run.kind]), items: [], run };
}

/** A run day of a program. */
export function isRunDay(session: GymPlanSession): boolean {
  return session.run !== undefined;
}

function byDay(a: GymPlanSession, b: GymPlanSession): number {
  return a.day - b.day;
}

/** The gym's workouts of a week as a turn of `TURNS`, its run days as
 * they are. */
function turnOf(
  sessions: GymPlanSession[],
  goal: GymPlanGoal,
  naming: Naming,
): GymPlanSession[] {
  const gym = sessions.filter((one) => !isRunDay(one)).sort(byDay);
  const count = Math.min(7, Math.max(1, gym.length));
  const turned = gym.map((session, index) =>
    sessionOf(TURNS[count][index], session.day, goal, naming),
  );
  return [...turned, ...sessions.filter(isRunDay)].sort(byDay);
}

/**
 * The program the guide proposes for `goal` on `days` (1 Monday to 7
 * Sunday) at the gym and `runDays` running (TASK-433 C), changing as
 * `mode` says over `weeks`; the workouts' names are written in the app's
 * language, and the plan keeps them as written.
 */
export function proposeProgram({
  goal,
  days,
  runDays = [],
  mode,
  weeks,
  startsOn,
  naming,
}: {
  goal: GymPlanGoal;
  days: number[];
  runDays?: number[];
  mode: GymPlanMode;
  weeks: number;
  startsOn: string;
  naming: Naming;
}): GymProgram {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const runs = [...new Set(runDays)]
    .filter((day) => !sorted.includes(day))
    .sort((a, b) => a - b);
  const count = Math.min(7, Math.max(1, sorted.length));
  const split = SPLITS[count];
  const sessions = [
    ...sorted.map((day, index) => sessionOf(split[index], day, goal, naming)),
    ...runs.map((day, index) => runSession(day, index, goal, naming)),
  ].sort(byDay);
  const custom: GymPlanWeek[] =
    mode === "alternate" ? [{ week: 2, sessions: turnOf(sessions, goal, naming) }] : [];
  return {
    goal,
    starts_on: startsOn,
    weeks: cycleWeeks(mode, weeks),
    mode,
    step_kg: mode === "same" ? 0 : DEFAULT_STEP_KG,
    rest_s: goalOf(goal).restS,
    sessions,
    custom,
  };
}

/** The weeks of a cycle in `mode`: two in turn, one the same, else the
 * chosen ones. */
export function cycleWeeks(mode: GymPlanMode, weeks: number): number {
  if (mode === "alternate") {
    return 2;
  }
  return mode === "same" ? 1 : weeks;
}

/** The program with another mode or length: the first week stays, the
 * weeks written by hand that still fit stay, «alternate» gets its second
 * week. */
export function withCycle(
  program: GymProgram,
  mode: GymPlanMode,
  weeks: number,
  naming: Naming,
): GymProgram {
  const length = cycleWeeks(mode, weeks);
  let custom = program.custom.filter((week) => week.week <= length);
  if (mode === "alternate" && !custom.some((week) => week.week === 2)) {
    custom = [
      { week: 2, sessions: turnOf(program.sessions, program.goal ?? "muscle", naming) },
    ];
  }
  return {
    ...program,
    mode,
    weeks: length,
    step_kg: mode === "same" ? 0 : program.step_kg || DEFAULT_STEP_KG,
    custom,
  };
}

/** The workouts' letters: A, B, C… in the order of the days. */
export function sessionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** The program on other days of the week: its workouts of the gym, in
 * order, move to the new `days`, its run days to `runDays` (TASK-433 C); a
 * day more gets the guide's workout or run, a day less drops the last one.
 * The weeks written by hand follow their workouts' days. */
export function withDays(
  program: GymProgram,
  days: number[],
  naming: Naming,
  runDays: number[] = program.sessions.filter(isRunDay).map((one) => one.day),
): GymProgram {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const runs = [...new Set(runDays)]
    .filter((day) => !sorted.includes(day))
    .sort((a, b) => a - b);
  const goal = program.goal ?? "muscle";
  const gymBefore = program.sessions.filter((one) => !isRunDay(one)).sort(byDay);
  const runBefore = program.sessions.filter(isRunDay).sort(byDay);
  const moved = new Map<number, number>([
    ...gymBefore.flatMap((session, index): [number, number][] =>
      index < sorted.length ? [[session.day, sorted[index]]] : [],
    ),
    ...runBefore.flatMap((session, index): [number, number][] =>
      index < runs.length ? [[session.day, runs[index]]] : [],
    ),
  ]);
  const count = Math.min(7, Math.max(1, sorted.length));
  const sessions = [
    ...sorted.map((day, index) =>
      index < gymBefore.length
        ? { ...gymBefore[index], day }
        : sessionOf(SPLITS[count][index], day, goal, naming),
    ),
    ...runs.map((day, index) =>
      index < runBefore.length
        ? { ...runBefore[index], day }
        : runSession(day, index, goal, naming),
    ),
  ].sort(byDay);
  const custom = program.custom.map((week) => ({
    ...week,
    sessions: week.sessions
      .flatMap((session) => {
        const day = moved.get(session.day);
        return day === undefined ? [] : [{ ...session, day }];
      })
      .sort(byDay),
  }));
  return { ...program, sessions, custom };
}

const WORKOUT_LETTER = tLater("Workout {letter}");

/** A plan written from nothing: a workout a day, named by its letter,
 * without exercises. */
export function emptyProgram(program: GymProgram, naming: Naming): GymProgram {
  return {
    ...program,
    sessions: program.sessions.map((session) =>
      isRunDay(session)
        ? session
        : {
            ...session,
            name: naming
              .t(WORKOUT_LETTER)
              .replace(
                "{letter}",
                sessionLetter(gymIndex(program.sessions, session.day)),
              ),
            items: [],
          },
    ),
    custom: [],
  };
}

/** The letter's index of the gym's workout on `day`: A, B, C… count only
 * the gym's days, a run day is «Run». */
export function gymIndex(sessions: GymPlanSession[], day: number): number {
  return sessions
    .filter((one) => !isRunDay(one))
    .sort(byDay)
    .findIndex((one) => one.day === day);
}
