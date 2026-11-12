import { tLater } from "../i18n";
import { EXERCISES, type Exercise, MORE_EXERCISES } from "./exercises";

/**
 * The ready-made stretching routines (TASK-466 part B, ADR-0378): «Morning»,
 * «After run» and «After gym», each in 3, 5 and 10 minutes. A routine of a
 * given length is a list of exercises and one hold for all of them, chosen
 * so that the whole session (`sessionSeconds`: «Get ready», holds, «Switch
 * sides») comes close to the minutes it says. A shorter one keeps the
 * stretches that matter most, a longer one adds more and holds them longer.
 */

export type RoutineKey = "morning" | "afterRun" | "afterGym";

/** The lengths a routine comes in, in minutes. */
export const MINUTES = [3, 5, 10] as const;
export type Minutes = (typeof MINUTES)[number];

/** One length of a routine: which exercises, in order, and each side's hold. */
type Plan = { keys: readonly string[]; hold: number };

export type Routine = {
  key: RoutineKey;
  /** The name shown on the chooser. */
  name: string;
  plans: Readonly<Record<Minutes, Plan>>;
};

export const ROUTINES: readonly Routine[] = [
  {
    key: "morning",
    name: tLater("Morning"),
    plans: {
      3: {
        keys: ["overheadReach", "neck", "shoulder", "chest", "cat", "forwardFold"],
        hold: 20,
      },
      5: {
        keys: [
          "overheadReach",
          "neck",
          "shoulder",
          "chest",
          "cat",
          "forwardFold",
          "child",
        ],
        hold: 30,
      },
      10: {
        keys: [
          "overheadReach",
          "neck",
          "shoulder",
          "chest",
          "upperBack",
          "cat",
          "forwardFold",
          "hipFlexor",
          "kneeHug",
          "child",
        ],
        hold: 40,
      },
    },
  },
  {
    key: "afterRun",
    name: tLater("After run"),
    plans: {
      3: { keys: ["quad", "hamstring", "calf", "forwardFold"], hold: 20 },
      5: { keys: ["quad", "hamstring", "calf", "hipFlexor", "glute"], hold: 25 },
      10: {
        keys: [
          "quad",
          "hamstring",
          "calf",
          "hipFlexor",
          "glute",
          "kneeHug",
          "forwardFold",
          "child",
        ],
        hold: 40,
      },
    },
  },
  {
    key: "afterGym",
    name: tLater("After gym"),
    plans: {
      3: { keys: ["shoulder", "chest", "triceps", "quad"], hold: 20 },
      5: {
        keys: ["shoulder", "chest", "triceps", "upperBack", "quad", "hamstring"],
        hold: 25,
      },
      10: {
        keys: [
          "shoulder",
          "chest",
          "triceps",
          "upperBack",
          "quad",
          "hamstring",
          "glute",
          "child",
        ],
        hold: 40,
      },
    },
  },
];

/** Every stretch there is, by its key. */
const BY_KEY: ReadonlyMap<string, Exercise> = new Map(
  [...EXERCISES, ...MORE_EXERCISES].map((e) => [e.key, e]),
);

/** The routine `key`. */
export function routine(key: RoutineKey): Routine {
  const found = ROUTINES.find((r) => r.key === key);
  if (found === undefined) {
    throw new Error(`no routine ${key}`);
  }
  return found;
}

/** The exercises of routine `key` in `minutes`, each with the plan's hold. */
export function routineExercises(key: RoutineKey, minutes: Minutes): Exercise[] {
  const { keys, hold } = routine(key).plans[minutes];
  return keys.map((k) => {
    const exercise = BY_KEY.get(k);
    if (exercise === undefined) {
      throw new Error(`no stretch ${k}`);
    }
    return { ...exercise, seconds: hold };
  });
}
