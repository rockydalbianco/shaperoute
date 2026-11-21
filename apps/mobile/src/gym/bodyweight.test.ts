import { isGymProgram } from "../api/gymPlans";
import { bodyweightSession, equipmentOf, isBodyweightDay } from "./bodyweight";
import { gymExercise } from "./catalog";
import { type Naming, proposeProgram, withCycle, withDays } from "./proposal";

// TASK-461 A2 (ADR-0371): the bodyweight days the guide proposes, with the
// user's approved values of 2026-11-11.

const naming: Naming = { t: (text) => text, language: "en" };

function keys(session: { items: { exercise?: string }[] }): (string | undefined)[] {
  return session.items.map((item) => item.exercise);
}

test("«Tonificare e dimagrire» with nothing: the whole body, as the mockup", () => {
  const a = bodyweightSession(0, 1, "tone", "none", naming.t);
  expect(a.name).toBe("Bodyweight · A");
  expect(a.items).toEqual([
    { exercise: "bodyweight_squat", kind: "bodyweight", sets: 3, reps: 15 },
    { exercise: "push_up", kind: "bodyweight", sets: 3, reps: 15 },
    { exercise: "lunge", kind: "load", sets: 3, reps: 12 },
    { exercise: "glute_bridge", kind: "bodyweight", sets: 3, reps: 15 },
    { exercise: "plank", kind: "timed", sets: 3, duration_s: 40 },
  ]);
  expect(bodyweightSession(1, 3, "tone", "none", naming.t).name).toBe("Bodyweight · B");
});

test("on the bar half the reps: 3 × 15 push-ups, 3 × 8 pull-ups", () => {
  const items = bodyweightSession(0, 1, "tone", "bar", naming.t).items;
  expect(items.find((item) => item.exercise === "pull_up")).toMatchObject({
    sets: 3,
    reps: 8,
  });
  expect(items.find((item) => item.exercise === "push_up")?.reps).toBe(15);
  const strength = bodyweightSession(0, 1, "strength", "bars", naming.t).items;
  expect(strength.find((item) => item.exercise === "dips")?.reps).toBe(5);
});

test("a bar adds pull-ups, dip bars the dips", () => {
  expect(keys(bodyweightSession(0, 1, "muscle", "bar", naming.t))).toEqual([
    "bodyweight_squat",
    "push_up",
    "pull_up",
    "lunge",
    "glute_bridge",
  ]);
  expect(keys(bodyweightSession(1, 3, "muscle", "bars", naming.t))).toEqual([
    "lunge",
    "dips",
    "chin_up",
    "mountain_climber",
    "side_plank",
  ]);
});

test("«Più forza»: 5 × 6 of the harder ones; without a bar, split squats and push-ups", () => {
  const none = bodyweightSession(0, 1, "strength", "none", naming.t);
  expect(keys(none)).toEqual(["bulgarian_split_squat", "push_up", "superman", "plank"]);
  expect(none.items[1]).toMatchObject({ sets: 5, reps: 6 });
  expect(keys(bodyweightSession(0, 1, "strength", "bars", naming.t))).toEqual([
    "bulgarian_split_squat",
    "dips",
    "pull_up",
    "superman",
    "plank",
  ]);
});

test("«Rimettermi in forma»: four exercises of 3 × 10", () => {
  const fit = bodyweightSession(0, 1, "fit", "none", naming.t);
  expect(fit.items).toHaveLength(4);
  expect(fit.items[0]).toMatchObject({ sets: 3, reps: 10 });
});

test("every exercise of a bodyweight day is in the catalog, of its kind", () => {
  for (const goal of ["muscle", "strength", "tone", "fit"] as const) {
    for (const equipment of ["none", "bar", "bars"] as const) {
      for (const index of [0, 1]) {
        for (const item of bodyweightSession(index, 1, goal, equipment, naming.t)
          .items) {
          expect(gymExercise(item.exercise ?? "")?.kind).toBe(item.kind);
          expect(item.load_kg).toBeUndefined();
        }
      }
    }
  }
});

test("bodyweight A, B, A three days a week, with running and the rest", () => {
  const program = proposeProgram({
    goal: "tone",
    days: [],
    bodyDays: [1, 3, 5],
    runDays: [2, 6],
    mode: "reps",
    weeks: 4,
    startsOn: "2026-11-16",
    naming,
  });
  expect(isGymProgram(program)).toBe(true);
  expect(program.sessions.map((one) => [one.day, one.name])).toEqual([
    [1, "Bodyweight · A"],
    [2, "Easy run"],
    [3, "Bodyweight · B"],
    [5, "Bodyweight · A"],
    [6, "Long run"],
  ]);
  expect(program.rest_s).toBe(30);
  expect(program.sessions.filter(isBodyweightDay)).toHaveLength(3);
});

test("the gym and bodyweight in one plan: each day of its own", () => {
  const program = proposeProgram({
    goal: "muscle",
    days: [1, 4],
    bodyDays: [6],
    equipment: "bar",
    mode: "load",
    weeks: 4,
    startsOn: "2026-11-16",
    naming,
  });
  expect(program.sessions.map((one) => [one.day, isBodyweightDay(one)])).toEqual([
    [1, false],
    [4, false],
    [6, true],
  ]);
  expect(program.rest_s).toBe(90);
  expect(equipmentOf(program)).toBe("bar");
  // Moving the days keeps each sport's own: a new bodyweight day is one.
  const moved = withDays(program, [2, 4], naming, [], [6, 7]);
  expect(moved.sessions.map((one) => [one.day, isBodyweightDay(one)])).toEqual([
    [2, false],
    [4, false],
    [6, true],
    [7, true],
  ]);
  expect(moved.sessions[3].name).toBe("Bodyweight · B");
  expect(keys(moved.sessions[3])).toContain("chin_up");
});

test("weeks A / B in turn: B where A was on a bodyweight day", () => {
  const program = proposeProgram({
    goal: "tone",
    days: [],
    bodyDays: [1, 4],
    runDays: [6],
    mode: "reps",
    weeks: 4,
    startsOn: "2026-11-16",
    naming,
  });
  const turned = withCycle(program, "alternate", 4, naming);
  expect(turned.custom[0].sessions.map((one) => [one.day, one.name])).toEqual([
    [1, "Bodyweight · B"],
    [4, "Bodyweight · A"],
    [6, "Easy run"],
  ]);
});
