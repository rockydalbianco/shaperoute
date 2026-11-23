import { gymExercise } from "./catalog";
import { programDays } from "./program";
import {
  GOALS,
  proposeProgram,
  gymIndex,
  proposedDays,
  proposedItem,
  proposedRunDays,
  sessionLetter,
  withCycle,
  withDays,
} from "./proposal";

// The plan the guide proposes: a workout a day, exercises of the catalog,
// the sets and reps of the goal, the weeks of the mode chosen.

const same = { t: (text: string) => text, language: "en" as const };

test("every workout proposed is of exercises of the catalog, of their kind", () => {
  for (const { goal } of GOALS) {
    for (let count = 1; count <= 7; count += 1) {
      for (const mode of ["load", "alternate"] as const) {
        const program = proposeProgram({
          goal,
          days: proposedDays(count),
          mode,
          weeks: 4,
          startsOn: "2026-11-16",
          naming: same,
        });
        const sessions = [
          ...program.sessions,
          ...program.custom.flatMap((week) => week.sessions),
        ];
        for (const session of sessions) {
          expect(session.items.length).toBeGreaterThanOrEqual(4);
          for (const item of session.items) {
            expect(gymExercise(item.exercise!)?.kind).toBe(item.kind);
            expect(item.load_kg).toBeUndefined();
          }
        }
        expect(programDays(program)).toEqual(proposedDays(count));
      }
    }
  }
});

test("three days for more muscle: push, pull, legs, 4 × 10 then 3 × 12", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [5, 1, 3],
    mode: "load",
    weeks: 4,
    startsOn: "2026-11-16",
    naming: same,
  });
  expect(program).toMatchObject({ weeks: 4, mode: "load", step_kg: 2.5, rest_s: 90 });
  expect(program.sessions.map((one) => [one.day, one.name])).toEqual([
    [1, "Chest, shoulders, triceps"],
    [3, "Back, biceps"],
    [5, "Legs, core"],
  ]);
  expect(program.sessions[0].items.slice(0, 3)).toEqual([
    { exercise: "bench_press", kind: "load", sets: 4, reps: 10 },
    { exercise: "incline_bench_press", kind: "load", sets: 4, reps: 10 },
    { exercise: "overhead_press", kind: "load", sets: 3, reps: 12 },
  ]);
  expect(program.custom).toEqual([]);
});

test("the goal sets the values; a timed exercise is held", () => {
  expect(proposedItem("back_squat", "strength", true)).toEqual({
    exercise: "back_squat",
    kind: "load",
    sets: 5,
    reps: 5,
  });
  expect(proposedItem("plank", "tone", false)).toEqual({
    exercise: "plank",
    kind: "timed",
    sets: 3,
    duration_s: 60,
  });
  // To get back in shape, four exercises a workout.
  const fit = proposeProgram({
    goal: "fit",
    days: [2, 4],
    mode: "same",
    weeks: 4,
    startsOn: "2026-11-17",
    naming: same,
  });
  expect(fit.sessions.map((one) => one.items.length)).toEqual([4, 4]);
  expect(fit).toMatchObject({ weeks: 1, step_kg: 0 });
});

test("two weeks in turn: the second written with other exercises", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 3, 5],
    mode: "alternate",
    weeks: 4,
    startsOn: "2026-11-16",
    naming: same,
  });
  expect(program.weeks).toBe(2);
  expect(program.custom).toHaveLength(1);
  expect(program.custom[0].week).toBe(2);
  expect(program.custom[0].sessions[0].name).toBe("Upper body B");
});

test("another mode keeps the first week and the weeks that still fit", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 3, 5],
    mode: "load",
    weeks: 8,
    startsOn: "2026-11-16",
    naming: same,
  });
  const written = {
    ...program,
    custom: [
      { week: 3, sessions: [program.sessions[0]] },
      { week: 7, sessions: [program.sessions[1]] },
    ],
  };
  const shorter = withCycle(written, "load", 4, same);
  expect(shorter.weeks).toBe(4);
  expect(shorter.custom.map((week) => week.week)).toEqual([3]);
  expect(shorter.sessions).toBe(program.sessions);
  const turns = withCycle(written, "alternate", 4, same);
  expect(turns.weeks).toBe(2);
  expect(turns.custom.map((week) => week.week)).toEqual([2]);
  expect(withCycle(written, "same", 4, same)).toMatchObject({ weeks: 1, step_kg: 0 });
  expect([0, 1, 2].map(sessionLetter)).toEqual(["A", "B", "C"]);
});

test("other days move the workouts in order; a day more gets one proposed", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 3, 5],
    mode: "load",
    weeks: 4,
    startsOn: "2026-11-16",
    naming: same,
  });
  const written = { ...program, custom: [{ week: 2, sessions: program.sessions }] };
  const four = withDays(written, [2, 4, 6, 7], same);
  expect(four.sessions.map((one) => [one.day, one.name])).toEqual([
    [2, "Chest, shoulders, triceps"],
    [4, "Back, biceps"],
    [6, "Legs, core"],
    [7, "Lower body B"],
  ]);
  expect(four.custom[0].sessions.map((one) => one.day)).toEqual([2, 4, 6]);
  const two = withDays(written, [1, 4], same);
  expect(two.sessions.map((one) => one.name)).toEqual([
    "Chest, shoulders, triceps",
    "Back, biceps",
  ]);
  expect(two.custom[0].sessions.map((one) => one.day)).toEqual([1, 4]);
});

test("five days: a muscle group a day, named in the app's language", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 2, 3, 4, 5],
    mode: "load",
    weeks: 4,
    startsOn: "2026-11-16",
    naming: { t: (text) => text, language: "it" },
  });
  expect(program.sessions.map((one) => one.name)).toEqual([
    "Petto",
    "Schiena",
    "Gambe",
    "Spalle",
    "Arms, core",
  ]);
});

test("run days: on days without the gym, easy, long, intervals (TASK-433 C)", () => {
  expect(proposedRunDays(2, [1, 3, 5])).toEqual([2, 6]);
  expect(proposedRunDays(3, [1, 3, 5])).toEqual([2, 4, 6]);
  expect(proposedRunDays(0, [1, 3, 5])).toEqual([]);
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 3, 5],
    runDays: [2, 6],
    mode: "alternate",
    weeks: 4,
    startsOn: "2026-11-16",
    naming: same,
  });
  expect(program.sessions.map((one) => [one.day, one.name, one.run?.kind])).toEqual([
    [1, "Chest, shoulders, triceps", undefined],
    [2, "Easy run", "easy"],
    [3, "Back, biceps", undefined],
    [5, "Legs, core", undefined],
    [6, "Long run", "long"],
  ]);
  expect(program.sessions[1]).toMatchObject({ items: [], run: { distance_m: 5000 } });
  // Week B turns the gym's workouts only.
  expect(program.custom[0].sessions.map((one) => one.name)).toEqual([
    "Upper body B",
    "Easy run",
    "Lower body B",
    "Arms, core",
    "Long run",
  ]);
  // The letters count the gym's days only.
  expect([1, 3, 5].map((day) => gymIndex(program.sessions, day))).toEqual([0, 1, 2]);
  // A run day moves with the runs, the gym's with the gym.
  const moved = withDays(program, [1, 3, 5], same, [4]);
  expect(moved.sessions.map((one) => [one.day, one.name])).toEqual([
    [1, "Chest, shoulders, triceps"],
    [3, "Back, biceps"],
    [4, "Easy run"],
    [5, "Legs, core"],
  ]);
  expect(moved.custom[0].sessions.map((one) => one.day)).toEqual([1, 3, 4, 5]);
});
