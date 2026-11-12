import catalog from "@shaperoute/shared-types/fixtures/gym-exercises.json";
import type { GymSetKind } from "@shaperoute/shared-types";

import { LANGUAGES } from "../i18n/languages";
import { exerciseName, GYM_EXERCISES, gymExercise } from "./catalog";
import { hasLeaderboard } from "./Leaderboard";
import { catalogEntry, entryOf, setOf } from "./setKinds";

// TASK-385 (ADR-0327): the app's catalog is the one the API checks sets
// against (fixtures/gym-exercises.json, gym_catalog.py), with the names of
// docs/sports/gym.md in every language of the app.

test("the catalog is the API's, in its order", () => {
  expect(GYM_EXERCISES.map(({ key, group, kind }) => ({ key, group, kind }))).toEqual(
    catalog.exercises.map(({ key, group, kind }) => ({ key, group, kind })),
  );
  expect(GYM_EXERCISES).toHaveLength(95);
});

test("the four exercises without equipment are in the app, with their names", () => {
  // TASK-461 (ADR-0371): on the server first (A1), then in the app (A2).
  expect(
    ["superman", "bodyweight_squat", "glute_bridge", "mountain_climber"].map((key) => [
      gymExercise(key)?.kind,
      gymExercise(key)?.names.it,
    ]),
  ).toEqual([
    ["bodyweight", "Superman"],
    ["bodyweight", "Squat a corpo libero"],
    ["bodyweight", "Ponte glutei"],
    ["timed", "Mountain climber"],
  ]);
});

test("a set of an exercise newer than the app is logged as any other", () => {
  // A plan or a workout written on an updated phone, read on one that is
  // not: the name in words, the kind the item carries, no guide, no
  // leaderboard.
  expect(exerciseName({ exercise: "sled_pull" }, "it")).toBe("Sled pull");
  expect(catalogEntry("sled_pull")).toBeNull();
  expect(hasLeaderboard("sled_pull")).toBe(false);
  const entry = entryOf({ exercise: "sled_pull", kind: "bodyweight" as GymSetKind });
  expect(setOf(entry, { reps: 15 }, 0, false)).toMatchObject({
    exercise: "sled_pull",
    kind: "bodyweight",
  });
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
