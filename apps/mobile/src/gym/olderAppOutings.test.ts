import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { todayPlan } from "./plans";
import { sessionsOfWeek } from "./program";
import { withDays } from "./proposal";

// TASK-461 B and C (ADR-0371): an app older than the days out reads a plan
// with them (a ride, a pool swim, a brisk walk, a climb) without showing
// anything false. Its «Today» skips a day out, which has no run and no
// exercises, so a ride is never called a run; the plan's list shows the
// day's name, which says the sport and the amount; and its edits keep the
// `outing` and the program's `target`, so a plan saved again from an older
// phone loses neither.

const all = plans.plans as GymPlan[];
const bike = all.find((plan) => plan.key === "pl00000000000005") as GymPlan;
const mountain = all.find((plan) => plan.key === "pl00000000000006") as GymPlan;
const naming = { t: (text: string) => text, language: "en" as const };

test("the days out of the example say their sport and amount in their name", () => {
  const names = [bike, mountain].flatMap((plan) =>
    (plan.program?.sessions ?? []).filter((one) => one.outing !== undefined),
  );
  expect(names.map((one) => one.name)).toEqual([
    "Bike intervals · 5 × 3:00",
    "Pool · 8 × 100 m",
    "Long ride · 30 km",
    "Brisk walk uphill · 45 min",
    "Hike · 450 m climb",
  ]);
});

test("an older «Today» shows the gym day and no day out", () => {
  // The bike plan from Monday 2 November 2026: Monday the gym, Wednesday
  // the bike intervals, Friday the pool, Sunday the long ride.
  const monday = todayPlan([bike], new Date(2026, 10, 2, 9));
  expect(monday?.name).toBe("Full body A");
  expect(monday?.run).toBeUndefined();
  for (const day of [4, 6, 8]) {
    expect(todayPlan([bike], new Date(2026, 10, day, 9))).toBeNull();
  }
  // The mountain plan: Saturday's climb is no «Today» either.
  expect(todayPlan([mountain], new Date(2026, 10, 7, 9))).toBeNull();
});

test("an older app keeps the days out and the target when it works out or edits a plan", () => {
  const program = bike.program;
  if (program == null) {
    throw new Error("the bike plan has its weeks");
  }
  const week = sessionsOfWeek(program, 3);
  expect(
    week.filter((one) => one.outing !== undefined).map((one) => one.outing),
  ).toEqual(
    program.sessions.flatMap((one) => (one.outing === undefined ? [] : [one.outing])),
  );
  const edited = withDays(program, bike.days, naming);
  expect(edited.target).toEqual(program.target);
  expect(edited.sessions).toEqual(program.sessions);
});
