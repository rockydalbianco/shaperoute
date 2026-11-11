import catalog from "@shaperoute/shared-types/fixtures/gym-exercises.json";
import type { GymSetKind } from "@shaperoute/shared-types";

import { LANGUAGES } from "../i18n/languages";
import { exerciseName, GYM_EXERCISES, gymExercise } from "./catalog";
import { hasLeaderboard } from "./Leaderboard";
import { catalogEntry, entryOf, setOf } from "./setKinds";

// TASK-385 (ADR-0327): the app's catalog is the one the API checks sets
// against (fixtures/gym-exercises.json, gym_catalog.py), with the names of
// docs/sports/gym.md in every language of the app.

// TASK-461 A1 (ADR-0371): the server knows the four bodyweight exercises
// before the app does; A2 adds them to the app's catalog and empties this.
const ON_THE_SERVER_FIRST = new Set([
  "superman",
  "bodyweight_squat",
  "glute_bridge",
  "mountain_climber",
]);

test("the catalog is the API's, in its order", () => {
  expect(GYM_EXERCISES.map(({ key, group, kind }) => ({ key, group, kind }))).toEqual(
    catalog.exercises
      .filter(({ key }) => !ON_THE_SERVER_FIRST.has(key))
      .map(({ key, group, kind }) => ({ key, group, kind })),
  );
  expect(GYM_EXERCISES).toHaveLength(91);
});

test("an app older than the server reads its new exercises without breaking", () => {
  // A plan or a workout written on an updated phone, read on one that is
  // not: the name in words, the kind the item carries, no guide, no
  // leaderboard; a set of it is logged as any other.
  const words: Record<string, string> = {
    superman: "Superman",
    bodyweight_squat: "Bodyweight squat",
    glute_bridge: "Glute bridge",
    mountain_climber: "Mountain climber",
  };
  for (const key of ON_THE_SERVER_FIRST) {
    const kind = catalog.exercises.find((exercise) => exercise.key === key)?.kind;
    expect(kind).toBeDefined();
    if (gymExercise(key) !== undefined) {
      continue;
    }
    expect(exerciseName({ exercise: key }, "it")).toBe(words[key]);
    expect(catalogEntry(key)).toBeNull();
    expect(hasLeaderboard(key)).toBe(false);
    const entry = entryOf({ exercise: key, kind: kind as GymSetKind });
    const values = kind === "timed" ? { duration_s: 40 } : { reps: 15 };
    expect(setOf(entry, values, 0, false)).toMatchObject({ exercise: key, kind });
  }
});

test("every exercise has a name in every language of the app", () => {
  for (const exercise of GYM_EXERCISES) {
    for (const { id } of LANGUAGES) {
      expect(exercise.names[id].trim()).not.toBe("");
    }
  }
  expect(gymExercise("bench_press")?.names.it).toBe("Panca piana");
  expect(gymExercise("lat_pulldown")?.names.it).toBe("Lat machine");
  expect(gymExercise("treadmill")?.names.de).toBe("Laufband");
});

test("a set is named by its exercise, or by the name its runner wrote", () => {
  expect(exerciseName({ exercise: "bench_press" }, "fr")).toBe("Développé couché");
  expect(exerciseName({ name: "Sled push" }, "it")).toBe("Sled push");
  // A key newer than the app, in words.
  expect(exerciseName({ exercise: "sled_pull" }, "en")).toBe("Sled pull");
});
