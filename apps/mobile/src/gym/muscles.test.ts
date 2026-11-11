/**
 * Which muscles each exercise works (TASK-465, ADR-0376): every exercise
 * of the catalog has its main muscle, among those the body can show, and
 * the names are in every language of the app.
 */
import catalog from "@shaperoute/shared-types/fixtures/gym-exercises.json";

import { LANGUAGES } from "../i18n/languages";
import { GYM_EXERCISES, type GymGroup } from "./catalog";
import {
  type Muscle,
  MUSCLE_SIDE,
  muscleName,
  muscleNames,
  MUSCLES,
  MUSCLES_OF,
  musclesLabel,
  musclesOf,
  muscleWord,
  sideOf,
} from "./muscles";

test("every exercise of the catalog works at least one main muscle", () => {
  const without = GYM_EXERCISES.filter(
    (exercise) => (musclesOf(exercise)?.primary.length ?? 0) === 0,
  ).map((exercise) => exercise.key);
  expect(without).toEqual([]);
});

test("no muscle the body cannot show, and none twice for an exercise", () => {
  const known = new Set<string>(MUSCLES);
  for (const [key, worked] of Object.entries(MUSCLES_OF)) {
    const all = [...worked.primary, ...worked.secondary];
    expect([key, all.filter((muscle) => !known.has(muscle))]).toEqual([key, []]);
    expect([key, new Set(all).size]).toEqual([key, all.length]);
  }
});

test("the table names no exercise the shared catalog does not have", () => {
  const shared = new Set(catalog.exercises.map((exercise) => exercise.key));
  expect(Object.keys(MUSCLES_OF).filter((key) => !shared.has(key))).toEqual([]);
});

test("every muscle is the main one of some exercise, and has its side", () => {
  const main = new Set(Object.values(MUSCLES_OF).flatMap((worked) => worked.primary));
  expect(MUSCLES.filter((muscle) => !main.has(muscle))).toEqual([]);
  expect(Object.keys(MUSCLE_SIDE).sort()).toEqual([...MUSCLES].sort());
});

test("the first main muscle of an exercise belongs to its group", () => {
  const OF_GROUP: Partial<Record<GymGroup, readonly Muscle[]>> = {
    chest: ["chest"],
    back: ["lats", "lower_back", "traps"],
    legs: ["quads", "glutes", "hamstrings", "calves", "adductors", "abductors"],
    shoulders: ["shoulders", "rear_delts", "traps"],
    arms: ["biceps", "triceps", "forearms"],
    core: ["abs", "obliques"],
  };
  // Held with the legs, though the catalog lists it with the core.
  const APART = new Set(["wall_sit"]);
  const off = GYM_EXERCISES.filter((exercise) => {
    const muscles = OF_GROUP[exercise.group];
    const first = musclesOf(exercise)?.primary[0];
    return (
      muscles !== undefined &&
      !APART.has(exercise.key) &&
      (first === undefined || !muscles.includes(first))
    );
  }).map((exercise) => exercise.key);
  expect(off).toEqual([]);
});

test("every muscle and every word has a name in every language", () => {
  for (const { id } of LANGUAGES) {
    for (const muscle of MUSCLES) {
      expect(muscleName(muscle, id).trim()).not.toBe("");
    }
    for (const word of ["main", "also", "front", "back"] as const) {
      expect(muscleWord(word, id).trim()).not.toBe("");
    }
  }
  expect(muscleName("quads", "it")).toBe("Quadricipiti");
  expect(muscleName("lats", "it")).toBe("Dorsali");
  expect(muscleName("glutes", "de")).toBe("Gesäß");
});

test("the names in a line, and what the screen reader says", () => {
  const bench = MUSCLES_OF.bench_press;
  expect(muscleNames(bench.primary, "en")).toBe("Chest");
  expect(muscleNames(bench.secondary, "it")).toBe("Spalle, tricipiti");
  expect(muscleNames(bench.secondary, "it", { capital: false })).toBe(
    "spalle, tricipiti",
  );
  // German keeps the capitals of its nouns.
  expect(muscleNames(bench.secondary, "de", { capital: false })).toBe(
    "Schultern, Trizeps",
  );
  expect(musclesLabel(bench, "en")).toBe(
    "Main muscles: chest. Also: shoulders, triceps.",
  );
  expect(musclesLabel(bench, "it", { secondary: false })).toBe(
    "Muscoli principali: petto.",
  );
  expect(musclesLabel(MUSCLES_OF.leg_extension, "fr")).toBe(
    "Muscles principaux: quadriceps.",
  );
});

test("the small body shows the side of the first main muscle", () => {
  expect(sideOf(MUSCLES_OF.back_squat)).toBe("front");
  expect(sideOf(MUSCLES_OF.pull_up)).toBe("back");
  expect(sideOf(MUSCLES_OF.deadlift)).toBe("back");
  // An exercise the user named has no body.
  expect(musclesOf("tyre_flip")).toBeNull();
  expect(musclesOf({ key: "plank" })?.primary).toEqual(["abs"]);
});
