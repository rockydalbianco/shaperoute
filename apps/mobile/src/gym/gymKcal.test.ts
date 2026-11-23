import { NO_BODY } from "../body/bodyProfile";
import { blockMlKg, gymKcal, gymKcalLabel, rowerWatts, WEIGHTS_MET } from "./gymKcal";

// TASK-385 part C, ADR-0327: the energy of a workout at the gym. With no
// body, 70 kg and one standard MET at rest: 1.225 kcal a minute, and each
// ml of oxygen for each kilogram is 0.35 kcal.

const YEAR = 2026;
const KCAL_PER_ML_KG = (5 * 70) / 1000;
const REST_PER_MIN = 1.225;

function kcalOf(mlKg: number, minutes: number): number {
  return Math.round(mlKg * KCAL_PER_ML_KG - REST_PER_MIN * minutes);
}

function cardio(exercise: string, values: Record<string, number>) {
  return { exercise, kind: "cardio" as const, ...values };
}

test("a workout with no cardio is resistance training for all of its time", () => {
  expect(WEIGHTS_MET).toBe(3.5);
  // 3.5 MET × 3.5 ml × 60 min = 735 ml/kg: 257.25 kcal, 73.5 at rest.
  expect(gymKcal([], 3600, NO_BODY, YEAR)).toBe(184);
  expect(
    gymKcal([{ exercise: "bench_press", kind: "load" }], 3600, NO_BODY, YEAR),
  ).toBe(184);
  expect(gymKcal([], 0, NO_BODY, YEAR)).toBe(0);
});

test("a heavier body spends more in the same time", () => {
  const heavy = { ...NO_BODY, weightKg: 90 };
  expect(gymKcal([], 3600, heavy, YEAR)).toBeGreaterThan(
    gymKcal([], 3600, NO_BODY, YEAR),
  );
});

test("a treadmill is a run from 7 km/h, with its speed", () => {
  const run = cardio("treadmill", { duration_s: 1800, speed_kmh: 10 });
  // 5000 m in 30 min: 3.5 × 30 + 0.2 × 5000.
  expect(blockMlKg(run)).toBeCloseTo(1105);
  // Its 30 minutes, then 30 of weights (367.5 ml/kg).
  expect(gymKcal([run], 3600, NO_BODY, YEAR)).toBe(kcalOf(1105 + 367.5, 60));
});

test("below 7 km/h a walk, with its incline; with no speed its metres", () => {
  const walk = cardio("treadmill", { duration_s: 1800, speed_kmh: 5, incline_pct: 2 });
  // 2500 m, 50 m up: 3.5 × 30 + 0.1 × 2500 + 1.8 × 50.
  expect(blockMlKg(walk)).toBeCloseTo(445);
  const metres = cardio("curved_treadmill", { duration_s: 1800, distance_m: 2500 });
  expect(blockMlKg(metres)).toBeCloseTo(105 + 250);
  // Going down counts as flat.
  const down = cardio("treadmill", { duration_s: 1800, speed_kmh: 5, incline_pct: -5 });
  expect(blockMlKg(down)).toBeCloseTo(355);
});

test("a treadmill with neither speed nor metres is left to the weights", () => {
  const unknown = cardio("treadmill", { duration_s: 1800 });
  expect(blockMlKg(unknown)).toBeNull();
  expect(gymKcal([unknown], 3600, NO_BODY, YEAR)).toBe(
    gymKcal([], 3600, NO_BODY, YEAR),
  );
});

test("a bike by the band of its level, general with none", () => {
  const bike = (level?: number) =>
    blockMlKg(
      cardio(
        "exercise_bike",
        level === undefined ? { duration_s: 600 } : { duration_s: 600, level },
      ),
    );
  // MET × 3.5 ml × 10 min.
  expect(bike(5)).toBeCloseTo(4.0 * 35);
  expect(bike(10)).toBeCloseTo(6.8 * 35);
  expect(bike(18)).toBeCloseTo(10.3 * 35);
  expect(bike()).toBeCloseTo(6.8 * 35);
  expect(blockMlKg(cardio("spin_bike", { duration_s: 600 }))).toBeCloseTo(9.0 * 35);
  expect(blockMlKg(cardio("elliptical", { duration_s: 600, level: 16 }))).toBeCloseTo(
    9.0 * 35,
  );
  expect(blockMlKg(cardio("jump_rope", { duration_s: 600 }))).toBeCloseTo(11.0 * 35);
});

test("a rower by the watts of its pace", () => {
  // 2:00 /500 m is about 203 W; 2:30 /500 m about 104 W.
  expect(rowerWatts(2000, 480)).toBeCloseTo(202.5, 0);
  expect(
    blockMlKg(cardio("rowing_machine", { duration_s: 480, distance_m: 2000 })),
  ).toBeCloseTo(14.0 * 3.5 * 8);
  expect(
    blockMlKg(cardio("rowing_machine", { duration_s: 600, distance_m: 2000 })),
  ).toBeCloseTo(7.5 * 3.5 * 10);
  expect(blockMlKg(cardio("rowing_machine", { duration_s: 600 }))).toBeCloseTo(
    7.3 * 35,
  );
});

test("a machine the runner named is left to the weights", () => {
  const named = { name: "Sled push", kind: "cardio" as const, duration_s: 600 };
  expect(blockMlKg(named)).toBeNull();
});

test("blocks logged as longer than the workout keep their own time", () => {
  const long = cardio("jump_rope", { duration_s: 1200 });
  expect(gymKcal([long], 600, NO_BODY, YEAR)).toBe(kcalOf(11.0 * 3.5 * 20, 20));
});

test("the label says kcal, none for nothing", () => {
  expect(gymKcalLabel(184)).toBe("184 kcal");
  expect(gymKcalLabel(0)).toBeNull();
});
