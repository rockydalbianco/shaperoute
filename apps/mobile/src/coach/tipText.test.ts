import type { RuleId, Tip } from "./rules";
import { tipText } from "./tipText";

function tip(rule: RuleId, more: Partial<Tip> = {}): Tip {
  return { rule, group: 1, values: {}, ...more };
}

const EVERY: RuleId[] = [
  "P1",
  "P1bw",
  "P2",
  "P3",
  "P4",
  "P4hi",
  "P5",
  "P6",
  "C1",
  "C2",
  "C3",
  "T1",
  "T3",
  "T4",
  "T5",
];

test.each(EVERY)("%s says something, with its study, and no mark left over", (rule) => {
  const text = tipText(
    tip(rule, {
      exercise: "bench_press",
      muscle: "chest",
      values: {
        kg: 62.5,
        old: 60,
        min: 8,
        min2: 5,
        max2: 7,
        n: 3,
        sets: 7,
        day: 1,
        hours: 30,
        km: 20,
        pct: 40,
        weeks: 6,
        score: 52,
        days: 21,
      },
    }),
    "en",
  );
  for (const line of [text.title, text.body, text.why]) {
    expect(line.length).toBeGreaterThan(0);
    expect(line).not.toMatch(/[{}]/);
  }
  expect(text.why).toMatch(/^Why: .+ (19|20)\d\d$/);
});

test("adding weight: the new load, the old one, where the reps start again", () => {
  const text = tipText(
    tip("P1", {
      exercise: "bench_press",
      values: { kg: 62.5, old: 60, min: 8 },
      change: { plan: "p", exercise: "bench_press", deltaKg: 2.5 },
    }),
    "en",
  );
  expect(text.title).toBe("Bench press: 62.5 kg");
  expect(text.body).toBe(
    "You did all your reps at 60 kg twice in a row. Add weight and start again from 8 reps.",
  );
  expect(text.why).toBe("Why: Double progression · ACSM 2009");
  expect(text.apply).toBe("Apply to plan");
});

test("sets for a muscle: a capital at the start, small letters after; the day on the button", () => {
  const text = tipText(
    tip("P4", {
      muscle: "chest",
      exercise: "bench_press",
      values: { n: 3, sets: 7, day: 3 },
      change: { plan: "p", exercise: "bench_press", deltaSets: 3 },
    }),
    "en",
  );
  expect(text.title).toBe("Add 3 sets for chest");
  expect(text.body).toBe(
    "Chest got 7 sets this week. Around 10 a week builds muscle better.",
  );
  expect(text.apply).toBe("Add to Wed");
});

test("a tip that does not change the plan has no «Apply»", () => {
  expect(tipText(tip("C2", { values: { pct: 60 } }), "en").apply).toBeNull();
  // P4 without an exercise of the plans to add the sets to.
  expect(
    tipText(tip("P4", { muscle: "lats", values: { n: 4, sets: 6 } }), "en").apply,
  ).toBeNull();
});

test("strength days: one and more", () => {
  expect(tipText(tip("T5", { values: { n: 1 } }), "en").body).toBe(
    "1 strength day this week. Two a week keep muscles and bones strong.",
  );
  expect(tipText(tip("T5", { values: { n: 0 } }), "en").body).toBe(
    "0 strength days this week. Two a week keep muscles and bones strong.",
  );
});
