/**
 * A gym plan and its copy in a post (TASK-485, ADR-0394, the user's «Anche
 * i kg» of 2026-11-21): the post carries the plan with its kg, never its
 * owner's first day, paces or target day; «Use this plan» makes a new plan
 * of it, kg included, from the first day the guide offers.
 */
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { isGymPlanPosted } from "../api/planPosts";
import { firstDay, planFromPosted, postedPlan } from "./planCopy";

const [PUSH, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];

test("the post leaves out what is its owner's, and keeps the kg", () => {
  const withTarget: GymPlan = {
    ...LIFT_AND_RUN,
    program: {
      ...LIFT_AND_RUN.program!,
      runner: { pace_10k_s: 3300 },
      target: { sport: "run", distance_m: 10_000, on: "2027-04-11" },
    },
  };
  const posted = postedPlan(withTarget);
  expect(isGymPlanPosted(posted)).toBe(true);
  expect(posted.program).not.toHaveProperty("starts_on");
  expect(posted.program).not.toHaveProperty("runner");
  expect(posted.program?.target).toEqual({ sport: "run", distance_m: 10_000 });
  // The plan itself is not touched.
  expect(withTarget.program?.target?.on).toBe("2027-04-11");
  const kg = (plan: GymPlan) =>
    plan.program!.sessions.flatMap((one) => one.items.map((item) => item.load_kg));
  expect(
    posted.program!.sessions.flatMap((one) => one.items.map((i) => i.load_kg)),
  ).toEqual(kg(withTarget));
  expect(posted).not.toHaveProperty("key");
  expect(posted).not.toHaveProperty("position");
  expect(posted).not.toHaveProperty("updated_at");
});

test("a plan without weeks is posted as it is", () => {
  const posted = postedPlan(PUSH);
  expect(posted).toEqual({ name: PUSH.name, days: PUSH.days, items: PUSH.items });
  expect(isGymPlanPosted(posted)).toBe(true);
});

test("the guide's first day is today on a Monday, the next Monday otherwise", () => {
  expect(firstDay(new Date(2026, 10, 23, 9))).toBe("2026-11-23");
  expect(firstDay(new Date(2026, 10, 22, 9))).toBe("2026-11-23");
  expect(firstDay(new Date(2026, 10, 24, 9))).toBe("2026-11-30");
});

test("«Use this plan» makes a new plan with the kg, no paces, no target day", () => {
  const posted = postedPlan({
    ...MUSCLE,
    program: {
      ...MUSCLE.program!,
      target: { sport: "run", distance_m: 5000, on: "2027-01-01" },
    },
  });
  const copy = planFromPosted(posted, new Date(2026, 10, 25, 9));
  expect(copy.key).toBe("");
  expect(copy.name).toBe(MUSCLE.name);
  expect(copy.program?.starts_on).toBe("2026-11-30");
  expect(copy.program?.runner).toBeUndefined();
  expect(copy.program?.target).toEqual({ sport: "run", distance_m: 5000 });
  expect(copy.program?.sessions).toEqual(MUSCLE.program!.sessions);
  // The copy and the post share nothing.
  copy.program!.sessions[0].items[0].load_kg = 999;
  expect(posted.program!.sessions[0].items[0].load_kg).not.toBe(999);
  expect(planFromPosted(postedPlan(PUSH)).program).toBeNull();
});
