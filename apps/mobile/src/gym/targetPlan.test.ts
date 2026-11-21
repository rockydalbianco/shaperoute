import type { GymPlanSession, GymProgram } from "@shaperoute/shared-types";

import { isGymProgram } from "../api/gymPlans";
import {
  type TargetPlan,
  type TargetPlanAnswers,
  type UnnamedDay,
  targetPlan,
  weeksUntil,
} from "./targetPlan";

// TASK-461 B and C (ADR-0371): the plan the guide's answers make, with the
// user's approved words of 2026-11-11 («Verso i 10 km», «Verso i 1000 m»).

const GYM: GymPlanSession = {
  day: 1,
  name: "Full body A",
  items: [{ exercise: "bodyweight_squat", kind: "bodyweight", sets: 3, reps: 10 }],
};

/** A name that says what the day is, as the guide's words will. */
function nameOf(day: UnnamedDay): string {
  const one = day.run ?? day.outing;
  return `${day.outing?.sport ?? "run"} ${one?.kind ?? "?"}`;
}

// Monday 16 November 2026.
const MONDAY = new Date(2026, 10, 16, 9);

function answers(changes: Partial<TargetPlanAnswers>): TargetPlanAnswers {
  return {
    aim: { sport: "run", distance_m: 10_000 },
    level: 6200,
    days: [3, 6],
    others: [GYM],
    base: { mode: "reps", step_kg: 0, goal: "fit", rest_s: 60 },
    startsOn: MONDAY,
    nameOf,
    ...changes,
  };
}

function programOf(plan: TargetPlan): GymProgram {
  if (plan.kind !== "plan") {
    throw new Error(`a plan, not ${plan.kind}`);
  }
  expect(isGymProgram(plan.program)).toBe(true);
  return plan.program;
}

test("toward 10 km from 6.2 km: 8 weeks, an easy run and the long one", () => {
  const program = programOf(targetPlan(answers({})));
  expect(program).toEqual({
    mode: "reps",
    step_kg: 0,
    goal: "fit",
    rest_s: 60,
    starts_on: "2026-11-16",
    weeks: 8,
    custom: [],
    target: { sport: "run", distance_m: 10_000 },
    sessions: [
      GYM,
      { day: 3, name: "run easy", items: [], run: { kind: "easy", distance_m: 3000 } },
      { day: 6, name: "run long", items: [], run: { kind: "long", distance_m: 6000 } },
    ],
  });
});

test("three days: easy, intervals, long; a half marathon's intervals are longer", () => {
  const ten = programOf(targetPlan(answers({ days: [2, 4, 7] })));
  expect(ten.sessions.map((one) => one.run)).toEqual([
    undefined,
    { kind: "easy", distance_m: 3000 },
    { kind: "intervals", reps: 6, rep_m: 400 },
    { kind: "long", distance_m: 6000 },
  ]);
  const half = targetPlan(
    answers({
      aim: { sport: "run", distance_m: 21_097 },
      level: 12_000,
      days: [2, 4, 7],
    }),
  );
  expect(programOf(half).sessions[2].run).toEqual({
    kind: "intervals",
    reps: 5,
    rep_m: 1000,
  });
});

test("from zero: walk-run on the other days, a long run of 2 km", () => {
  const program = programOf(targetPlan(answers({ level: null, days: [2, 4, 7] })));
  expect(program.sessions.map((one) => one.run)).toEqual([
    undefined,
    { kind: "intervals", reps: 8, rep_s: 60 },
    { kind: "intervals", reps: 8, rep_s: 60 },
    { kind: "long", distance_m: 2000 },
  ]);
  // A tenth a week from 2 km to 10 km.
  expect(program.weeks).toBe(23);
});

test("a date too near: the weeks needed, those there are, and where they lead", () => {
  // Sunday 13 December: the 4th week from the start.
  expect(
    targetPlan(
      answers({ aim: { sport: "run", distance_m: 10_000, on: "2026-12-13" } }),
    ),
  ).toEqual({ kind: "short", needed: 8, have: 4, reachable: 7500 });
});

test("a date: the plan runs to its week, the long one on its day", () => {
  // Saturday 16 January 2027: the 9th week.
  const program = programOf(
    targetPlan(
      answers({
        aim: { sport: "run", distance_m: 10_000, on: "2027-01-16" },
        days: [3, 6],
      }),
    ),
  );
  expect(program.weeks).toBe(9);
  expect(program.target).toEqual({
    sport: "run",
    distance_m: 10_000,
    on: "2027-01-16",
  });
  expect(program.sessions[2]).toMatchObject({ day: 6, run: { kind: "long" } });
  // A race on a Wednesday: the long one goes there.
  const wednesday = programOf(
    targetPlan(
      answers({
        aim: { sport: "run", distance_m: 10_000, on: "2027-01-13" },
        days: [3, 6],
      }),
    ),
  );
  expect(wednesday.sessions.map((one) => one.run?.kind)).toEqual([
    undefined,
    "long",
    "easy",
  ]);
});

test("a date over 24 weeks away, or before the start, is far", () => {
  expect(
    targetPlan(
      answers({ aim: { sport: "run", distance_m: 10_000, on: "2027-08-01" } }),
    ),
  ).toMatchObject({ kind: "far" });
  expect(
    targetPlan(
      answers({ aim: { sport: "run", distance_m: 10_000, on: "2026-11-01" } }),
    ),
  ).toEqual({ kind: "far", have: 0 });
});

test("more than 24 weeks without a date: short, with where 24 weeks lead", () => {
  expect(
    targetPlan(answers({ aim: { sport: "run", distance_m: 42_195 }, level: 3000 })),
  ).toEqual({ kind: "short", needed: null, have: 24, reachable: 16_500 });
});

test("toward 60 km by bike: easy, intervals by the clock, the long ride", () => {
  const program = programOf(
    targetPlan(
      answers({
        aim: { sport: "bike", distance_m: 60_000 },
        level: 30_400,
        days: [3, 5, 7],
      }),
    ),
  );
  expect(program.sessions.map((one) => one.outing)).toEqual([
    undefined,
    { sport: "bike", kind: "easy", distance_m: 15_000 },
    { sport: "bike", kind: "intervals", reps: 5, rep_s: 180 },
    { sport: "bike", kind: "long", distance_m: 30_000 },
  ]);
  expect(program.weeks).toBe(11);
});

test("a swim says its water on every day; its sets are 8 × 100 m", () => {
  const open = programOf(
    targetPlan(
      answers({
        aim: { sport: "swim", distance_m: 2000 },
        level: 1000,
        pool: false,
        days: [2, 4, 6],
      }),
    ),
  );
  expect(open.sessions.slice(1).map((one) => one.outing)).toEqual([
    { sport: "swim", kind: "easy", distance_m: 500, pool: false },
    { sport: "swim", kind: "intervals", reps: 8, rep_m: 100, pool: false },
    { sport: "swim", kind: "long", distance_m: 1000, pool: false },
  ]);
  const pool = programOf(
    targetPlan(answers({ aim: { sport: "swim", distance_m: 2000 }, level: 1000 })),
  );
  expect(pool.sessions[2].outing?.pool).toBe(true);
});

test("on foot: walks and a brisk walk, the long one a hike to a hike's distance", () => {
  const program = programOf(
    targetPlan(
      answers({
        aim: { sport: "hike", distance_m: 20_000 },
        level: 12_000,
        days: [2, 4, 7],
      }),
    ),
  );
  expect(program.sessions.map((one) => one.outing)).toEqual([
    undefined,
    { sport: "walk", kind: "easy", distance_m: 6000 },
    { sport: "walk", kind: "brisk", duration_s: 2700 },
    { sport: "hike", kind: "long", distance_m: 12_000 },
  ]);
});

test("toward 1000 m of climb from 452 m: the brisk walk uphill and the climb, 12 weeks", () => {
  const program = programOf(
    targetPlan(
      answers({
        aim: { sport: "hike", climb_m: 1000 },
        level: 452,
        days: [4, 6],
        others: [{ ...GYM, day: 2 }],
      }),
    ),
  );
  expect(program.weeks).toBe(12);
  expect(program.sessions.map((one) => one.outing)).toEqual([
    undefined,
    { sport: "walk", kind: "brisk", duration_s: 2700, climb_m: 150 },
    { sport: "hike", kind: "climb", climb_m: 450, distance_m: 9000 },
  ]);
  // «Comincio da zero»: «Si parte da 200 m, su sentieri facili».
  const zero = programOf(
    targetPlan(
      answers({ aim: { sport: "hike", climb_m: 1000 }, level: null, days: [6] }),
    ),
  );
  expect(zero.sessions[1].outing).toEqual({
    sport: "hike",
    kind: "climb",
    climb_m: 200,
    distance_m: 4000,
  });
});

test("«Solo tenermi in forma»: a cycle of 4 weeks with no target", () => {
  const program = programOf(
    targetPlan(answers({ aim: { sport: "bike", keepFit: true }, level: 20_000 })),
  );
  expect(program.weeks).toBe(4);
  expect(program.target).toBeUndefined();
  expect(program.sessions[2].outing).toEqual({
    sport: "bike",
    kind: "long",
    distance_m: 20_000,
  });
});

test("the days: 1 to 5 of the target's sport, another sport's, each once", () => {
  expect(() => targetPlan(answers({ days: [] }))).toThrow("1 to 5");
  expect(() => targetPlan(answers({ days: [2, 3, 4, 5, 6, 7] }))).toThrow("1 to 5");
  expect(() => targetPlan(answers({ others: [] }))).toThrow("two sports");
  expect(() => targetPlan(answers({ days: [1, 6] }))).toThrow("once");
});

test("the weeks to a date count the start's week and the date's", () => {
  expect(weeksUntil(MONDAY, "2026-11-22")).toBe(1);
  expect(weeksUntil(MONDAY, "2026-11-23")).toBe(2);
  expect(weeksUntil(new Date(2026, 10, 18), "2026-11-16")).toBe(1);
  expect(weeksUntil(MONDAY, "2026-11-15")).toBe(0);
});
