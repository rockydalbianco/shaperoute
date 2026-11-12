import type {
  GymPlanGoal,
  GymPlanItem,
  GymPlanSession,
  GymProgram,
} from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import { gymExercise } from "./catalog";

/**
 * The bodyweight days the guide proposes (TASK-461 A2, ADR-0371; the
 * user's approved words of 2026-11-11): «Senza pesi si cresce con le
 * ripetizioni e i secondi», what one has («Niente · Una sbarra · Sbarra e
 * parallele»: «Con la sbarra aggiungiamo trazioni, con le parallele i
 * dip»), and the whole body in turn, A and B («Tutto il corpo, tre volte a
 * settimana»). No kg: the weeks grow by reps and seconds (program.ts).
 */

/** What one has to train with. */
export const EQUIPMENT = ["none", "bar", "bars"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_OPTIONS: readonly { equipment: Equipment; title: string }[] = [
  { equipment: "none", title: tLater("Nothing") },
  { equipment: "bar", title: tLater("A pull-up bar") },
  { equipment: "bars", title: tLater("Bar and dip bars") },
];

/** The goals as a bodyweight workout does them (the approved values). */
export const BODYWEIGHT_GOALS: Readonly<
  Record<
    GymPlanGoal,
    { sets: number; reps: number; restS: number; holdS: number; count: number }
  >
> = {
  // «Più muscoli · 4 × 12 · recupero 60 s».
  muscle: { sets: 4, reps: 12, restS: 60, holdS: 45, count: 5 },
  // «Più forza · 5 × 6 con gli esercizi più duri · recupero 2 min».
  strength: { sets: 5, reps: 6, restS: 120, holdS: 45, count: 5 },
  // «Tonificare e dimagrire · 3 × 15 · recupero 30 s».
  tone: { sets: 3, reps: 15, restS: 30, holdS: 40, count: 5 },
  // «Rimettermi in forma · 3 × 10 · recupero 60 s · per iniziare».
  fit: { sets: 3, reps: 10, restS: 60, holdS: 30, count: 4 },
};

/** A place of a workout: an exercise, or one by what one has (null: left
 * out without it). */
type Slot = string | Readonly<Record<Equipment, string | null>>;

const PULL: Slot = { none: null, bar: "pull_up", bars: "pull_up" };
const CHIN_OR_BACK: Slot = { none: "superman", bar: "chin_up", bars: "chin_up" };
const PUSH_OR_DIP: Slot = { none: "push_up", bar: "push_up", bars: "dips" };
const LEGS_RAISED: Slot = {
  none: "mountain_climber",
  bar: "hanging_leg_raise",
  bars: "hanging_leg_raise",
};

/** Whole body A and B, the main ones first; the first `count` are kept. */
const WORKOUTS: Readonly<Record<"easy" | "hard", readonly (readonly Slot[])[]>> = {
  easy: [
    ["bodyweight_squat", "push_up", PULL, "lunge", "glute_bridge", "plank"],
    ["lunge", PUSH_OR_DIP, CHIN_OR_BACK, "mountain_climber", "side_plank"],
  ],
  // «Più forza»: pull-ups and dips with a bar and dip bars, else Bulgarian
  // split squats and push-ups.
  hard: [
    ["bulgarian_split_squat", PUSH_OR_DIP, PULL, "superman", "plank"],
    ["bulgarian_split_squat", "push_up", CHIN_OR_BACK, LEGS_RAISED, "side_plank"],
  ],
};

/** The names of the workouts, A and B. */
export const BODYWEIGHT_NAMES = [
  tLater("Bodyweight · A"),
  tLater("Bodyweight · B"),
] as const;

/** Exercises done on one leg at a time: three reps fewer. */
const PER_LEG = new Set(["lunge", "bulgarian_split_squat"]);

/** Every exercise a bodyweight workout may have: a workout made only of
 * these is a bodyweight one. */
export const BODYWEIGHT_KEYS: ReadonlySet<string> = new Set(
  Object.values(WORKOUTS)
    .flat(2)
    .flatMap((slot) =>
      typeof slot === "string"
        ? [slot]
        : Object.values(slot).filter((key) => key !== null),
    ) as string[],
);

/** An exercise as a bodyweight workout of `goal` has it. */
export function bodyweightItem(key: string, goal: GymPlanGoal): GymPlanItem {
  const values = BODYWEIGHT_GOALS[goal];
  const kind = gymExercise(key)?.kind ?? "bodyweight";
  if (kind === "timed") {
    return {
      exercise: key,
      kind,
      sets: Math.min(values.sets, 3),
      duration_s: values.holdS,
    };
  }
  const reps = PER_LEG.has(key) ? Math.max(5, values.reps - 3) : values.reps;
  return { exercise: key, kind, sets: values.sets, reps };
}

/** The `index`-th bodyweight workout of the week (A, B, A…) of `goal`
 * with what one has, on `day`, named by `name`. */
export function bodyweightSession(
  index: number,
  day: number,
  goal: GymPlanGoal,
  equipment: Equipment,
  name: (text: string) => string,
): GymPlanSession {
  const turn = index % 2;
  const slots = WORKOUTS[goal === "strength" ? "hard" : "easy"][turn];
  const keys = slots
    .map((slot) => (typeof slot === "string" ? slot : slot[equipment]))
    .filter((key): key is string => key !== null)
    .slice(0, BODYWEIGHT_GOALS[goal].count);
  return {
    day,
    name: name(BODYWEIGHT_NAMES[turn]),
    items: keys.map((key) => bodyweightItem(key, goal)),
  };
}

/** Whether a workout is a bodyweight one: exercises, all of them without
 * equipment of the gym. */
export function isBodyweightDay(session: GymPlanSession): boolean {
  return (
    session.run === undefined &&
    session.outing === undefined &&
    session.items.length > 0 &&
    session.items.every(
      (item) => item.exercise !== undefined && BODYWEIGHT_KEYS.has(item.exercise),
    )
  );
}

/** What a plan's bodyweight days say one has: dips need dip bars, pull-ups
 * a bar. */
export function equipmentOf(program: Pick<GymProgram, "sessions">): Equipment {
  const keys = new Set(
    program.sessions
      .filter(isBodyweightDay)
      .flatMap((one) => one.items.map((item) => item.exercise)),
  );
  if (keys.has("dips")) {
    return "bars";
  }
  return ["pull_up", "chin_up", "hanging_leg_raise"].some((key) => keys.has(key))
    ? "bar"
    : "none";
}
