import type { GymPlanSession, GymProgram } from "@shaperoute/shared-types";

import {
  isLightWeek,
  ladderOf,
  ladderValue,
  reachable,
  roundDistance,
  targetDayInWeek,
  weeksNeeded,
} from "./targetWeeks";

// TASK-461 B and C (ADR-0371): «Il lungo cresce di un decimo, ogni 4ª più
// leggera, l'ultimo giorno è la gara».

test("every 4th week is lighter, never the target's", () => {
  expect([1, 2, 3, 4, 5, 8, 12].map((week) => isLightWeek(week, 13))).toEqual([
    false,
    false,
    false,
    true,
    false,
    true,
    true,
  ]);
  expect(isLightWeek(8, 8)).toBe(false);
  expect(isLightWeek(4, 4)).toBe(false);
});

test("the weeks it takes: from 6 km to 10 km, 8; already there, 4; too far, none", () => {
  expect(weeksNeeded(6000, 10_000)).toBe(8);
  expect(weeksNeeded(10_000, 10_000)).toBe(4);
  expect(weeksNeeded(12_000, 10_000)).toBe(4);
  // A marathon from a single kilometre is more than 24 weeks.
  expect(weeksNeeded(1000, 42_195)).toBeNull();
  // A hike from 450 m of climb to 1000 m.
  expect(weeksNeeded(450, 1000)).toBe(12);
});

test("the ladder ends on the target, a tenth less each step before it", () => {
  const ladder = { start: 6000, goal: 10_000, weeks: 8 };
  const values = [1, 2, 3, 4, 5, 6, 7, 8].map((week) =>
    Math.round(ladderValue(ladder, week)),
  );
  expect(values).toEqual([6000, 6209, 6830, 5464, 7513, 8264, 9091, 10_000]);
});

test("more weeks than needed: the first ones stay where one is", () => {
  const ladder = { start: 6000, goal: 10_000, weeks: 12 };
  expect(ladderValue(ladder, 1)).toBe(6000);
  expect(ladderValue(ladder, 2)).toBe(6000);
  expect(Math.round(ladderValue(ladder, 11))).toBe(9091);
  expect(ladderValue(ladder, 12)).toBe(10_000);
});

test("where the weeks there are lead, when they are short", () => {
  // 5 weeks: weeks 2, 3 and 5 are steps.
  expect(Math.round(reachable(6000, 5))).toBe(7986);
  expect(reachable(6000, 1)).toBe(6000);
});

test("a day's metres in the steps of its sport", () => {
  expect(roundDistance(4545, "run")).toBe(4500);
  expect(roundDistance(45_400, "bike")).toBe(45_000);
  expect(roundDistance(830, "swim")).toBe(800);
  expect(roundDistance(20, "walk")).toBe(500);
  expect(roundDistance(250_000, "hike")).toBe(100_000);
});

const GYM: GymPlanSession = {
  day: 1,
  name: "Full body A",
  items: [{ exercise: "bodyweight_squat", kind: "bodyweight", sets: 3, reps: 10 }],
};

function runProgram(): GymProgram {
  return {
    starts_on: "2026-11-16",
    weeks: 8,
    mode: "reps",
    step_kg: 0,
    custom: [],
    target: { sport: "run", distance_m: 10_000 },
    sessions: [
      GYM,
      { day: 3, name: "Easy", items: [], run: { kind: "easy", distance_m: 3000 } },
      {
        day: 5,
        name: "Intervals",
        items: [],
        run: { kind: "intervals", reps: 6, rep_m: 400 },
      },
      { day: 7, name: "Long", items: [], run: { kind: "long", distance_m: 6000 } },
    ],
  };
}

test("a run plan's days on the ladder, the gym's as they are", () => {
  const program = runProgram();
  expect(ladderOf(program)).toEqual({ start: 6000, goal: 10_000, weeks: 8 });
  const week = (number: number) =>
    program.sessions.map((one) => targetDayInWeek(one, program, number));
  const long = (number: number) => week(number)[3].run?.distance_m;
  const easy = (number: number) => week(number)[1].run?.distance_m;
  const reps = (number: number) => week(number)[2].run?.reps;
  expect([1, 2, 3, 4, 5, 6, 7, 8].map(long)).toEqual([
    6000, 6000, 7000, 5500, 7500, 8500, 9000, 10_000,
  ]);
  // The easy run grows with the long one; on the race's week it is lighter.
  expect([1, 7, 8].map(easy)).toEqual([3000, 4500, 3500]);
  // One more repetition every two steps; as many as at first on a lighter
  // week and on the race's.
  expect([1, 2, 3, 4, 5, 7, 8].map(reps)).toEqual([6, 6, 7, 6, 7, 8, 6]);
  expect(week(5)[0]).toBe(GYM);
});

test("a hike to a climb: the climb day climbs to the target, the brisk walk with it", () => {
  const program: GymProgram = {
    starts_on: "2026-11-16",
    weeks: 12,
    mode: "reps",
    step_kg: 0,
    custom: [],
    target: { sport: "hike", climb_m: 1000 },
    sessions: [
      GYM,
      {
        day: 4,
        name: "Brisk walk uphill",
        items: [],
        outing: { sport: "walk", kind: "brisk", duration_s: 2700, climb_m: 150 },
      },
      {
        day: 6,
        name: "Hike",
        items: [],
        outing: { sport: "hike", kind: "climb", climb_m: 450, distance_m: 9000 },
      },
    ],
  };
  expect(ladderOf(program)).toEqual({ start: 450, goal: 1000, weeks: 12 });
  const last = program.sessions.map((one) => targetDayInWeek(one, program, 12));
  expect(last[2].outing).toEqual({
    sport: "hike",
    kind: "climb",
    climb_m: 1000,
    distance_m: 20_000,
  });
  // The brisk walk on the gita's week: lighter than the week before.
  const eleven = targetDayInWeek(program.sessions[1], program, 11).outing;
  const twelve = last[1].outing;
  expect(eleven?.climb_m).toBe(300);
  expect(twelve?.climb_m).toBe(250);
  expect(twelve?.duration_s).toBeLessThan(eleven?.duration_s ?? 0);
});

test("a ride's days of another sport stay as they are", () => {
  const program: GymProgram = {
    ...runProgram(),
    target: { sport: "bike", distance_m: 60_000 },
    sessions: [
      { day: 2, name: "Easy run", items: [], run: { kind: "easy", distance_m: 5000 } },
      {
        day: 7,
        name: "Long ride",
        items: [],
        outing: { sport: "bike", kind: "long", distance_m: 30_000 },
      },
    ],
    weeks: 10,
  };
  const run = program.sessions[0];
  expect(targetDayInWeek(run, program, 6)).toBe(run);
  expect(targetDayInWeek(program.sessions[1], program, 10).outing?.distance_m).toBe(
    60_000,
  );
});

test("without a target a day is as it is", () => {
  const { target: _target, ...program } = runProgram();
  const long = program.sessions[3];
  expect(targetDayInWeek(long, program, 5)).toBe(long);
  expect(ladderOf(program)).toBeNull();
});
