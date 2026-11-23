import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymProgram } from "@shaperoute/shared-types";

import { planTable } from "./tableOfPlan";
import { sessionsOfWeek } from "./program";

// The whole plan on one page (TASK-506 A): a tab a workout, a row an
// exercise, a column a week of the cycle in progress.

const [, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];
const PROGRAM = MUSCLE.program as GymProgram;
const LIFT = LIFT_AND_RUN.program as GymProgram;
// Wednesday of the third week of both (they start on Monday 2 November).
const WEEK_3 = new Date(2026, 10, 18, 12);

test("a tab a workout, as the guide's tabs", () => {
  const table = planTable(PROGRAM, WEEK_3, "en");
  expect(table.tabs.map((tab) => tab.label)).toEqual(["A · Mon", "B · Wed", "C · Fri"]);
  expect(planTable(LIFT, WEEK_3, "en").tabs.map((tab) => tab.label)).toEqual([
    "A · Mon",
    "Run · Tue",
    "Run · Thu",
    "Run · Sat",
  ]);
});

test("a row an exercise, a column a week, with the kg each week", () => {
  const table = planTable(PROGRAM, WEEK_3, "en");
  expect(table.weeks).toBe(4);
  expect(table.now).toBe(3);
  const [bench, raise, pushUp] = table.tabs[0].rows;
  expect(bench.label).toBe("Bench press");
  expect(bench.cells).toEqual([
    { amount: "4 × 10", kg: "60" },
    { amount: "4 × 10", kg: "62.5" },
    { amount: "4 × 10", kg: "65" },
    // The fourth week is written by hand, without the bench press.
    null,
  ]);
  expect(raise.cells[0]).toEqual({ amount: "3 × 12", kg: null });
  // The exercise only the week written by hand has: its own row.
  expect(pushUp.label).toBe("Push-up");
  expect(pushUp.cells.slice(0, 3)).toEqual([null, null, null]);
  expect(pushUp.cells[3]).toEqual({ amount: "3 × 15", kg: null });
  expect(table.byHand).toEqual([false, false, false, true]);
  // Written by hand, the fourth week is not «Lighter».
  expect(table.lighter).toEqual([false, false, false, false]);
});

test("the values are those «Today» works out, the answers' steps in", () => {
  const table = planTable(LIFT, WEEK_3, "en");
  const weeks = [1, 2, 3, 4].map((week) => sessionsOfWeek(LIFT, week, 0));
  // Monday's day moved one step by its answers (TASK-488).
  expect(table.tabs[0].rows[0].cells.map((cell) => cell?.amount)).toEqual(
    weeks.map((sessions) => {
      const item = sessions.find((one) => one.day === 1)!.items[0];
      return `${item.sets} × ${item.reps}`;
    }),
  );
  // A run day is one row: how much, week after week.
  const [easy] = table.tabs[1].rows;
  expect(easy.label).toBe("Easy run");
  expect(easy.cells.every((cell) => cell !== null && cell.kg === null)).toBe(true);
  expect(easy.cells[0]?.amount).toBe("5 km");
  // More load each week, 4 weeks: the last is the lighter one.
  expect(table.lighter).toEqual([false, false, false, true]);
});

test("before the plan starts, the first cycle with no week of today", () => {
  const table = planTable(PROGRAM, new Date(2026, 9, 1, 12), "en");
  expect(table.now).toBeNull();
  expect(table.tabs[0].rows[0].cells[0]).toEqual({ amount: "4 × 10", kg: "60" });
});

test("in the second cycle, the weeks of that cycle", () => {
  // Monday 30 November: the first week of the second cycle.
  const table = planTable(PROGRAM, new Date(2026, 10, 30, 12), "en");
  expect(table.now).toBe(1);
  const first = sessionsOfWeek(PROGRAM, 1, 1)[0].items[0];
  expect(table.tabs[0].rows[0].cells[0]?.kg).toBe(String(first.load_kg));
  expect(first.load_kg).toBeGreaterThan(60);
});

test("in another language, the names of the catalog in it", () => {
  const table = planTable(PROGRAM, WEEK_3, "it");
  expect(table.tabs[0].rows[0].label).toBe("Panca piana");
});
