import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymPlanItem, GymProgram } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import {
  comingTitle,
  itemValues,
  nextWorkout,
  NextWorkout,
  workedBy,
} from "./NextWorkout";

// The next workout in a plan's card of «My plans» (TASK-506 C).

const [, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];
const PROGRAM = MUSCLE.program as GymProgram;
const LIFT = LIFT_AND_RUN.program as GymProgram;
const day = (date: number) => new Date(2026, 10, date, 12);

test("today's workout, or the next day with one", () => {
  // Monday 2 November, not done yet: today's «A».
  const monday = nextWorkout(PROGRAM, day(2), false)!;
  expect(monday.ahead).toBe(0);
  expect(comingTitle(PROGRAM, monday, day(2))).toBe("Today · A");
  // Done already: Wednesday's «B».
  const done = nextWorkout(PROGRAM, day(2), true)!;
  expect(comingTitle(PROGRAM, done, day(2))).toBe("Wed · B");
  // On Tuesday: tomorrow.
  expect(comingTitle(PROGRAM, nextWorkout(PROGRAM, day(3), false)!, day(3))).toBe(
    "Tomorrow · B",
  );
  // On Saturday: Monday of the next week, with that week's values.
  const next = nextWorkout(PROGRAM, day(7), false)!;
  expect(comingTitle(PROGRAM, next, day(7))).toBe("Mon · A");
  expect(itemValues(next.session.items[0])).toBe("4 × 10 · 62.5 kg");
});

test("before the plan starts, its first day", () => {
  const coming = nextWorkout(PROGRAM, new Date(2026, 9, 30, 12), false)!;
  expect(coming.ahead).toBe(3);
  expect(coming.session.day).toBe(1);
});

test("the values: kg when it has them", () => {
  const raise: GymPlanItem = {
    exercise: "lateral_raise",
    kind: "load",
    sets: 3,
    reps: 12,
  };
  expect(itemValues(raise)).toBe("3 × 12");
});

test("what a workout works: the main muscles first, the others helping", () => {
  const worked = workedBy(PROGRAM.sessions[0].items)!;
  expect(worked.primary).toEqual(["chest", "shoulders"]);
  expect(worked.secondary).not.toContain("chest");
  expect(workedBy([{ name: "My move", kind: "load", sets: 3 }])).toBeNull();
});

test("the card: when, which, three exercises and how many more", async () => {
  const items: GymPlanItem[] = [
    "bench_press",
    "incline_bench_press",
    "overhead_press",
    "lateral_raise",
    "triceps_pushdown",
  ].map((exercise) => ({ exercise, kind: "load", sets: 3, reps: 12 }));
  const program: GymProgram = {
    ...PROGRAM,
    custom: [],
    sessions: [{ ...PROGRAM.sessions[0], items }],
  };
  const coming = nextWorkout(program, day(2), false)!;
  await render(
    <NextWorkout program={program} coming={coming} now={day(2)} language="en" />,
  );
  expect(screen.getByTestId("gym-plan-next-title")).toHaveTextContent("Today · A");
  expect(screen.getByText("Chest, shoulders, triceps")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-plan-next-item-0")).toHaveTextContent(
    /Bench press.*3 × 12/,
  );
  expect(screen.queryByTestId("gym-plan-next-item-3")).toBeNull();
  expect(screen.getByText("+ 2 more")).toBeOnTheScreen();
  expect(screen.getByRole("image")).toBeOnTheScreen();
});

test("a run day in one line, without a body", async () => {
  const coming = nextWorkout(LIFT, day(3), false)!;
  expect(coming.session.run).toBeDefined();
  await render(
    <NextWorkout program={LIFT} coming={coming} now={day(3)} language="en" />,
  );
  expect(screen.getByTestId("gym-plan-next-title")).toHaveTextContent("Today · Run");
  expect(screen.getByText("Easy run · 5 km")).toBeOnTheScreen();
  expect(screen.queryByRole("image")).toBeNull();
});
