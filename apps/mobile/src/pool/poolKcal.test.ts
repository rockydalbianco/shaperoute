import { NO_BODY } from "../body/bodyProfile";
import { poolKcal, poolKcalLabel, poolMet } from "./poolKcal";

// TASK-409 part A, ADR-0318 «il nuoto in piscina»: the crawl's MET of the
// Compendium 2024 by the pace /100 m, less one MET at rest without the
// whole body: 1.225 kcal a minute at rest for 70 kg.

const MIN = 60;

test("the MET goes by the pace: 2:18, 1:45 and 1:13 /100 m are the edges", () => {
  expect(poolMet(160)).toBe(5.8);
  expect(poolMet(138.01)).toBe(5.8);
  expect(poolMet(138)).toBe(8.0);
  expect(poolMet(120)).toBe(8.0);
  expect(poolMet(105.01)).toBe(8.0);
  expect(poolMet(105)).toBe(10.5);
  expect(poolMet(90)).toBe(10.5);
  expect(poolMet(73)).toBe(14.5);
  expect(poolMet(60)).toBe(14.5);
});

test("each band, worked out by hand for 70 kg with no body", () => {
  // 1500 m in 35 min, 2:20: 5.8 × 3.5 × 35 × 5 × 70 / 1000 = 248.675,
  // less 1.225 × 35 = 42.875 at rest.
  expect(poolKcal(1500, 35 * MIN, NO_BODY, 2026)).toBe(206);
  // 2000 m in 40 min, 2:00: 8.0 → 392 less 49.
  expect(poolKcal(2000, 40 * MIN, NO_BODY, 2026)).toBe(343);
  // 2000 m in 30 min, 1:30: 10.5 → 385.875 less 36.75.
  expect(poolKcal(2000, 30 * MIN, NO_BODY, 2026)).toBe(349);
  // 1000 m in 11 min, 1:06: 14.5 → 195.3875 less 13.475.
  expect(poolKcal(1000, 11 * MIN, NO_BODY, 2026)).toBe(182);
});

test("the weight of «Body» counts in proportion, and the whole body at rest", () => {
  // 80 kg: 5.8 × 3.5 × 40 × 5 × 80 / 1000 = 324.8, less 1.4 × 40 = 56.
  expect(poolKcal(1500, 40 * MIN, { ...NO_BODY, weightKg: 80 }, 2026)).toBe(269);
  expect(poolKcal(1500, 40 * MIN, NO_BODY, 2026)).toBe(235);
  // Mifflin-St Jeor, a man of 40, 180 cm: 1730 kcal a day, 48.06 in 40 min.
  expect(
    poolKcal(
      1500,
      40 * MIN,
      { sex: "male", weightKg: 80, heightCm: 180, birthYear: 1986 },
      2026,
    ),
  ).toBe(277);
});

test("none without metres or without time", () => {
  expect(poolKcal(0, 40 * MIN, NO_BODY, 2026)).toBe(0);
  expect(poolKcal(1500, 0, NO_BODY, 2026)).toBe(0);
  expect(poolKcalLabel(0)).toBeNull();
  expect(poolKcalLabel(206)).toBe("206 kcal");
});
