import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymCalendar, GymPlan, GymProgram } from "@shaperoute/shared-types";

import { doneOfWeek, weekDoneOf } from "./weekDone";

// «This week: 1 of 3 done» in «My plans» (TASK-506 C), from the gym
// calendar of the week.

/** At `hour` of `date` November 2026 on the phone's clock. */
const at = (date: number, hour = 18) => new Date(2026, 10, date, hour).toISOString();
const workout = (startedAt: string) => ({
  id: startedAt,
  started_at: startedAt,
  duration_s: 3600,
  drawing_id: null,
});
// Monday 2, Thursday 5 and Saturday 7; Wednesday 4 of «Legs» skipped.
const CALENDAR: GymCalendar = {
  month: "2026-11",
  tz: "Europe/Rome",
  count: 3,
  duration_s: 10800,
  days: [2, 5, 7].map((day) => ({ day, workouts: [workout(at(day))] })),
  last: null,
  skipped: [{ day: 4, plan: "Legs" }],
};
const [, , MUSCLE] = plans.plans as GymPlan[];
const PROGRAM = MUSCLE.program as GymProgram;
// Friday 6 November 2026, at noon: the first week of the plan.
const FRIDAY = new Date(2026, 10, 6, 12);

test("the days with a workout this week, and those skipped", () => {
  const done = weekDoneOf([CALENDAR], [], FRIDAY);
  // Monday and Thursday; Saturday's is after now.
  expect([...done.worked].sort()).toEqual([1, 4]);
  expect(done.skipped).toEqual([{ day: 3, plan: "Legs" }]);
});

test("a workout still waiting on the phone counts", () => {
  const done = weekDoneOf([CALENDAR], [at(6, 9)], FRIDAY);
  expect(done.worked.has(5)).toBe(true);
});

test("a day gone by is done unless skipped; today's with a workout today", () => {
  const skippedWednesday = {
    worked: new Set([1]),
    skipped: [{ day: 3, plan: MUSCLE.name }],
  };
  expect(doneOfWeek(PROGRAM, MUSCLE.name, skippedWednesday, FRIDAY)).toEqual({
    done: 1,
    total: 3,
  });
  // Another plan skipped that day: not this one.
  expect(
    doneOfWeek(
      PROGRAM,
      MUSCLE.name,
      { worked: new Set(), skipped: [{ day: 3, plan: "Legs" }] },
      FRIDAY,
    ),
  ).toEqual({ done: 2, total: 3 });
  // Friday's workout done today.
  expect(
    doneOfWeek(
      PROGRAM,
      MUSCLE.name,
      { ...skippedWednesday, worked: new Set([1, 5]) },
      FRIDAY,
    ),
  ).toEqual({ done: 2, total: 3 });
  // On Tuesday, Wednesday and Friday are still to come.
  expect(
    doneOfWeek(PROGRAM, MUSCLE.name, skippedWednesday, new Date(2026, 10, 3, 12)),
  ).toEqual({ done: 1, total: 3 });
});

test("a plan that starts in the middle of the week counts from its day", () => {
  const fromWednesday = { ...PROGRAM, starts_on: "2026-11-04" };
  const none = { worked: new Set<number>(), skipped: [] };
  expect(doneOfWeek(fromWednesday, MUSCLE.name, none, FRIDAY)).toEqual({
    done: 1,
    total: 2,
  });
  // Before it starts: nothing to count.
  expect(
    doneOfWeek(fromWednesday, MUSCLE.name, none, new Date(2026, 10, 3, 12)),
  ).toBeNull();
});
