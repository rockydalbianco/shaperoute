import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymPlanItem, GymProgram } from "@shaperoute/shared-types";

import { todayPlan } from "./plans";
import {
  cycleWeekOf,
  isoDate,
  itemInWeek,
  programDays,
  programItemCount,
  programOfPlan,
  runInWeek,
  sessionOn,
  sessionsOfWeek,
} from "./program";

// The weeks of a plan made with the guide: worked out from the first,
// written by hand, again from the start after the last.

const [PUSH, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];
const PROGRAM = MUSCLE.program as GymProgram;
const BENCH: GymPlanItem = {
  exercise: "bench_press",
  kind: "load",
  sets: 4,
  reps: 10,
  load_kg: 60,
};

test("the weeks are counted from the Monday of the first day", () => {
  // It starts on Monday 2 November 2026, four weeks.
  expect(cycleWeekOf(PROGRAM, new Date(2026, 10, 1, 12))).toBeNull();
  expect(cycleWeekOf(PROGRAM, new Date(2026, 10, 2, 9))).toEqual({ week: 1, cycle: 0 });
  expect(cycleWeekOf(PROGRAM, new Date(2026, 10, 8, 23))).toEqual({
    week: 1,
    cycle: 0,
  });
  expect(cycleWeekOf(PROGRAM, new Date(2026, 10, 9, 0))).toEqual({ week: 2, cycle: 0 });
  expect(cycleWeekOf(PROGRAM, new Date(2026, 10, 30, 9))).toEqual({
    week: 1,
    cycle: 1,
  });
  // Started on a Wednesday, its Monday and Tuesday are before it.
  const midweek = { ...PROGRAM, starts_on: "2026-11-04" };
  expect(cycleWeekOf(midweek, new Date(2026, 10, 3, 9))).toBeNull();
  expect(cycleWeekOf(midweek, new Date(2026, 10, 9, 9))).toEqual({ week: 2, cycle: 0 });
});

test("more load each week, the last one lighter, the next cycle a step on", () => {
  const loads = [1, 2, 3, 4].map((week) => itemInWeek(BENCH, "load", 4, 2.5, week, 0));
  expect(loads.map((item) => item.load_kg)).toEqual([60, 62.5, 65, 60]);
  expect(loads.map((item) => item.sets)).toEqual([4, 4, 4, 3]);
  expect(itemInWeek(BENCH, "load", 4, 2.5, 1, 1).load_kg).toBe(62.5);
  expect(itemInWeek(BENCH, "load", 4, 2.5, 4, 1).load_kg).toBe(62.5);
  // A cycle of two has no lighter week; an item without load gets none.
  expect(itemInWeek(BENCH, "load", 2, 2.5, 2, 0)).toEqual({ ...BENCH, load_kg: 62.5 });
  const free = { exercise: "pull_up", kind: "bodyweight", sets: 3, reps: 8 } as const;
  expect(itemInWeek(free, "load", 4, 2.5, 3, 0)).toEqual(free);
});

test("more reps each week: 10, 11, 12, then heavier and 10 again", () => {
  const weeks = [1, 2, 3, 4].map((week) => itemInWeek(BENCH, "reps", 4, 2.5, week, 0));
  expect(weeks.map((item) => [item.reps, item.load_kg])).toEqual([
    [10, 60],
    [11, 60],
    [12, 60],
    [10, 62.5],
  ]);
  // The second cycle goes on where the first stopped.
  expect(itemInWeek(BENCH, "reps", 4, 2.5, 1, 1)).toMatchObject({
    reps: 11,
    load_kg: 62.5,
  });
});

test("two weeks in turn and the same week stay as written", () => {
  expect(itemInWeek(BENCH, "same", 1, 0, 1, 5)).toBe(BENCH);
  expect(itemInWeek(BENCH, "alternate", 2, 2.5, 2, 1).load_kg).toBe(62.5);
});

test("a week written by hand takes the place of the one worked out", () => {
  const fourth = sessionsOfWeek(PROGRAM, 4);
  expect(fourth).toHaveLength(1);
  expect(fourth[0].items[0].exercise).toBe("push_up");
  const second = sessionsOfWeek(PROGRAM, 2);
  expect(second.map((one) => one.day)).toEqual([1, 3, 5]);
  expect(second[0].items[0].load_kg).toBe(62.5);
});

test("today's workout of a program, with its week", () => {
  // Wednesday 11 November: week 2, back and biceps a step heavier.
  const wednesday = new Date(2026, 10, 11, 9);
  const found = sessionOn(PROGRAM, wednesday);
  expect(found?.week).toBe(2);
  expect(found?.session.name).toBe("Back, biceps");
  expect(found?.session.items[0].load_kg).toBe(47.5);
  // Wednesday 25 November is the fourth week, written with Monday only.
  expect(sessionOn(PROGRAM, new Date(2026, 10, 25, 9))).toBeNull();
  expect(todayPlan([MUSCLE, PUSH], wednesday)).toMatchObject({
    key: MUSCLE.key,
    plan: "Muscle · 3 days",
    name: "Back, biceps",
    week: 2,
    weeks: 4,
  });
  // Monday the 9th: the program is first in order.
  expect(todayPlan([MUSCLE, PUSH], new Date(2026, 10, 9, 9))?.name).toBe(
    "Chest, shoulders, triceps",
  );
});

test("its days, its exercises, and a plan of before as one week", () => {
  expect(programDays(PROGRAM)).toEqual([1, 3, 5]);
  expect(programItemCount(PROGRAM)).toBe(7);
  expect(programOfPlan(MUSCLE)).toBe(PROGRAM);
  const plain = programOfPlan(PUSH, new Date(2026, 10, 10, 9));
  expect(plain).toMatchObject({ starts_on: "2026-11-10", weeks: 1, mode: "same" });
  expect(plain.sessions.map((one) => [one.day, one.name])).toEqual([
    [1, "Push"],
    [4, "Push"],
  ]);
  expect(isoDate(new Date(2026, 0, 5, 23))).toBe("2026-01-05");
});

test("a run day grows a tenth a week, the last week shorter; intervals a rep", () => {
  const easy = { kind: "easy", distance_m: 5000 } as const;
  expect(
    [1, 2, 3, 4].map((week) => runInWeek(easy, "load", 4, week, 0).distance_m),
  ).toEqual([5000, 5500, 6000, 4000]);
  // The next cycle a step on; minutes in whole minutes.
  expect(runInWeek(easy, "reps", 4, 1, 1).distance_m).toBe(5500);
  const long = { kind: "long", duration_s: 3600 } as const;
  expect(runInWeek(long, "load", 4, 2, 0).duration_s).toBe(3960);
  const intervals = { kind: "intervals", reps: 6, rep_m: 400 } as const;
  expect(
    [1, 2, 3, 4].map((week) => runInWeek(intervals, "load", 4, week, 0).reps),
  ).toEqual([6, 7, 8, 4]);
  // «Always the same»: as written.
  expect(runInWeek(easy, "same", 1, 1, 3)).toBe(easy);
});

test("today on a run day: its run of this week, and no workout of the gym", () => {
  // Tuesday 10 November 2026: week 2, the easy run a tenth longer.
  const tuesday = new Date(2026, 10, 10, 9);
  expect(todayPlan([LIFT_AND_RUN], tuesday)).toMatchObject({
    name: "Easy run",
    items: [],
    run: { kind: "easy", distance_m: 5500 },
    week: 2,
  });
  // Monday is the gym's.
  expect(todayPlan([LIFT_AND_RUN], new Date(2026, 10, 9, 9))?.run).toBeUndefined();
});

test("a long run made for its runner grows a kilometre a week (TASK-452)", () => {
  const long = { kind: "long", distance_m: 12000 } as const;
  expect(
    [1, 2, 3, 4].map((week) => runInWeek(long, "load", 4, week, 0, true).distance_m),
  ).toEqual([12000, 13000, 14000, 9500]);
  expect(runInWeek(long, "load", 4, 1, 1, true).distance_m).toBe(13000);
  const timed = { kind: "long", duration_s: 4500 } as const;
  expect(runInWeek(timed, "load", 4, 2, 0, true).duration_s).toBe(4800);
  // The easy run still a tenth a week.
  expect(
    runInWeek({ kind: "easy", distance_m: 6000 }, "load", 4, 2, 0, true).distance_m,
  ).toBe(6500);
});
