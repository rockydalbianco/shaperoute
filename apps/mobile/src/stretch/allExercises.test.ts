import { ALL_EXERCISES, exerciseByKey, isMove } from "./allExercises";
import { EXERCISES, MORE_EXERCISES } from "./exercises";

/**
 * The keys in use before TASK-520. A saved or published routine names its
 * exercises by key (TASK-466 part E): none of these may change or go.
 */
const KEYS_IN_USE = [
  "quad",
  "hamstring",
  "calf",
  "hipFlexor",
  "glute",
  "neck",
  "overheadReach",
  "shoulder",
  "chest",
  "triceps",
  "upperBack",
  "forwardFold",
  "cat",
  "child",
  "kneeHug",
];

describe("every stretching exercise in one list", () => {
  it("holds the five after a run and the ten of the routines, in their order", () => {
    expect(ALL_EXERCISES.slice(0, EXERCISES.length)).toEqual(EXERCISES);
    for (const exercise of MORE_EXERCISES) {
      expect(ALL_EXERCISES).toContain(exercise);
    }
  });

  it("keeps every key that a saved routine may name", () => {
    const keys = ALL_EXERCISES.map((exercise) => exercise.key);
    for (const key of KEYS_IN_USE) {
      expect(keys).toContain(key);
    }
  });

  it("never gives one key to two exercises", () => {
    const keys = ALL_EXERCISES.map((exercise) => exercise.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("finds an exercise by its key, and nothing for a key it does not know", () => {
    expect(exerciseByKey("quad")).toBe(EXERCISES[0]);
    expect(exerciseByKey("fromANewerVersion")).toBeUndefined();
  });

  it("gives every exercise a name, a line on how, seconds and a pose", () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.howTo.length).toBeGreaterThan(0);
      expect(exercise.seconds).toBeGreaterThan(0);
      expect(exercise.pose).toBeDefined();
    }
  });

  it("holds the exercises of before TASK-520: none is a movement or seen from the front", () => {
    for (const key of KEYS_IN_USE) {
      const exercise = exerciseByKey(key);
      expect(exercise).toBeDefined();
      if (exercise !== undefined) {
        expect(isMove(exercise)).toBe(false);
        expect(exercise.front).toBeUndefined();
      }
    }
    expect(isMove({ ...EXERCISES[0], kind: "move" })).toBe(true);
  });
});
