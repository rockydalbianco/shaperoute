import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { dayGoal, goalProgress } from "./planToGo";

// TASK-461 B2c (ADR-0371): «Registra libero e vedi quanto manca ai 45 km»,
// «Mancano 230 m di salita».

const all = plans.plans as GymPlan[];
const bike = all.find((plan) => plan.key === "pl00000000000005") as GymPlan;
const mountain = all.find((plan) => plan.key === "pl00000000000006") as GymPlan;

test("today's day of the sport recorded: its distance, or a hike's climb", () => {
  // The bike plan: Sunday 8 November 2026 is the long ride, of this week.
  const sunday = dayGoal([bike], "bike", new Date(2026, 10, 8, 9));
  expect(sunday?.climb).toBe(false);
  expect(sunday?.metres).toBeGreaterThan(0);
  // Wednesday is intervals by the clock: nothing to count down.
  expect(dayGoal([bike], "bike", new Date(2026, 10, 4, 9))).toBeNull();
  // Another sport than the day's: nothing.
  expect(dayGoal([bike], "run", new Date(2026, 10, 8, 9))).toBeNull();
  // The mountain plan: Saturday's climb.
  expect(dayGoal([mountain], "hike", new Date(2026, 10, 7, 9))).toEqual({
    metres: 450,
    climb: true,
  });
});

test("what is left, as a route's, until the goal is reached", () => {
  expect(goalProgress({ metres: 45_000, climb: false }, 32_600)).toEqual({
    remainingM: 12_400,
    done: 32_600 / 45_000,
  });
  expect(goalProgress({ metres: 600, climb: true }, 370)).toEqual({
    remainingM: 230,
    done: 370 / 600,
    climb: true,
  });
  expect(goalProgress({ metres: 600, climb: true }, 600)).toBeNull();
  expect(goalProgress(null, 100)).toBeNull();
});
