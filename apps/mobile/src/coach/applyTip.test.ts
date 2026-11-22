import type { GymPlan } from "@shaperoute/shared-types";

import { itemInWeek } from "../gym/program";
import { applyTip, MAX_SETS } from "./applyTip";

const NOW = new Date("2026-11-23T11:00:00.000Z");

const SIMPLE: GymPlan = {
  key: "p",
  name: "Push",
  days: [1, 4],
  items: [
    { exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 60 },
    { exercise: "push_up", kind: "bodyweight", sets: 3, reps: 12 },
  ],
  position: 0,
  updated_at: "2026-11-01T10:00:00.000Z",
};

const PROGRAMMED: GymPlan = {
  ...SIMPLE,
  key: "q",
  items: [],
  program: {
    starts_on: "2026-11-16",
    weeks: 4,
    mode: "load",
    step_kg: 2.5,
    sessions: [{ day: 1, name: "A", items: [SIMPLE.items[0]] }],
    custom: [
      {
        week: 4,
        sessions: [{ day: 1, name: "A", items: [{ ...SIMPLE.items[0], sets: 2 }] }],
      },
    ],
  },
};

describe("applyTip", () => {
  it("adds kg to a simple plan's exercise and stamps the change", () => {
    const saved = applyTip(
      SIMPLE,
      { plan: "p", exercise: "bench_press", deltaKg: 2.5 },
      NOW,
    );
    expect(saved?.items[0].load_kg).toBe(62.5);
    expect(saved?.items[1]).toEqual(SIMPLE.items[1]);
    expect(saved?.updated_at).toBe(NOW.toISOString());
    expect(saved).not.toHaveProperty("key");
  });

  it("adds a rep, and changes reps and kg together", () => {
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "push_up", deltaReps: 1 }, NOW)?.items[1]
        .reps,
    ).toBe(13);
    const both = applyTip(
      SIMPLE,
      { plan: "p", exercise: "bench_press", deltaReps: -5, deltaKg: 10 },
      NOW,
    );
    expect(both?.items[0]).toMatchObject({ reps: 5, load_kg: 70 });
  });

  it("keeps sets between 1 and 20, and kg at 0 or more", () => {
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "bench_press", deltaSets: 30 }, NOW)
        ?.items[0].sets,
    ).toBe(MAX_SETS);
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "bench_press", deltaSets: -9 }, NOW)
        ?.items[0].sets,
    ).toBe(1);
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "bench_press", deltaKg: -100 }, NOW)
        ?.items[0].load_kg,
    ).toBe(0);
  });

  it("does not add kg to an exercise without them", () => {
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "push_up", deltaKg: 2.5 }, NOW)?.items[1],
    ).not.toHaveProperty("load_kg");
  });

  it("moves every week of a program, the hand-written ones too", () => {
    const saved = applyTip(
      PROGRAMMED,
      { plan: "q", exercise: "bench_press", deltaKg: 2.5 },
      NOW,
    );
    const first = saved?.program?.sessions[0].items[0];
    expect(first?.load_kg).toBe(62.5);
    expect(saved?.program?.custom[0].sessions[0].items[0]).toMatchObject({
      load_kg: 62.5,
      sets: 2,
    });
    if (first !== undefined) {
      expect(itemInWeek(first, "load", 4, 2.5, 2, 0).load_kg).toBe(65);
    }
  });

  it("gives null for another plan or an exercise it no longer has", () => {
    expect(
      applyTip(SIMPLE, { plan: "q", exercise: "bench_press", deltaKg: 2.5 }, NOW),
    ).toBeNull();
    expect(
      applyTip(SIMPLE, { plan: "p", exercise: "back_squat", deltaKg: 5 }, NOW),
    ).toBeNull();
  });
});
