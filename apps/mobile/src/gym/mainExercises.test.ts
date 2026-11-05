import type { GymSet } from "@shaperoute/shared-types";

import { MAIN_EXERCISES, mainExercises } from "./mainExercises";

// TASK-385 part D: the main exercises the tile names.

const set = (exercise: string, at_s: number): GymSet => ({
  exercise,
  kind: "load",
  reps: 5,
  load_kg: 60,
  at_s,
  live: true,
});

test("the exercises with the most sets come first, at most three", () => {
  const sets = [
    set("bench_press", 0),
    set("back_squat", 60),
    set("back_squat", 120),
    set("deadlift", 180),
    set("back_squat", 240),
    set("lat_pulldown", 300),
    set("lat_pulldown", 360),
  ];
  expect(mainExercises(sets, "en")).toEqual(["Squat", "Lat pulldown", "Bench press"]);
  expect(MAIN_EXERCISES).toBe(3);
});

test("with as many sets, the one done first; the names in the app's language", () => {
  const sets = [set("deadlift", 0), set("bench_press", 60)];
  expect(mainExercises(sets, "it")).toEqual(["Stacco da terra", "Panca piana"]);
});

test("an exercise named by its lifter is named so; none, nothing", () => {
  const own: GymSet = {
    name: "Sled push",
    kind: "timed",
    duration_s: 30,
    at_s: 0,
    live: true,
  };
  expect(mainExercises([own], "en")).toEqual(["Sled push"]);
  expect(mainExercises([], "en")).toEqual([]);
});
