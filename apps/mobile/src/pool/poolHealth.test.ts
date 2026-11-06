import { NO_BODY } from "../body/bodyProfile";
import { appleWorkout } from "../health/appleWorkout";
import { healthConnectWorkout } from "../health/healthConnectWorkout";
import type { HealthPhone } from "../health/healthPhone";
import { finishPoolSwim, newPoolSwim, pausePoolSwim, resumePoolSwim } from "./poolSwim";
import { poolWorkoutOf, savePoolToHealth } from "./poolHealth";

// TASK-400 part B, ADR-0334 point 6: a swim in a pool in Apple Health and
// Health Connect.

jest.mock("../health/healthChoice", () => ({ loadHealthOn: () => true }));

const T0 = Date.UTC(2026, 10, 6, 7);
const MIN = 60_000;

function swim() {
  let going = newPoolSwim("key12345abc", 25, T0);
  going = pausePoolSwim(going, T0 + 20 * MIN);
  going = resumePoolSwim(going, T0 + 22 * MIN);
  return finishPoolSwim(going, T0 + 42 * MIN);
}

test("the workout is a swim of lengths × pool, its pauses, no route, its energy", () => {
  // 1500 m in 40 min, 2:40 /100 m: 5.8 MET (TASK-409 part A), 70 kg,
  // 284.2 kcal less 49 at rest.
  expect(poolWorkoutOf(swim(), 60, NO_BODY)).toEqual({
    activity: "swimming",
    startMs: T0,
    endMs: T0 + 42 * MIN,
    distanceM: 1500,
    kcal: 235,
    route: [],
    pauses: [{ fromMs: T0 + 20 * MIN, toMs: T0 + 22 * MIN }],
    syncId: "key12345abc",
    pool: { lengthM: 25 },
  });
  expect(poolWorkoutOf(newPoolSwim("k", 25, T0), 10)).toBeNull();
});

test("Apple Health takes it as a swim in a pool, with the swimming distance and energy", () => {
  const apple = appleWorkout(poolWorkoutOf(swim(), 60, NO_BODY)!);
  // HKWorkoutActivityType.swimming, HKWorkoutSwimmingLocationType.pool.
  expect(apple.activityType).toBe(46);
  expect(apple.metadata.HKSwimmingLocationType).toBe(1);
  expect(apple.quantities.map((sample) => sample.quantityType)).toEqual([
    "HKQuantityTypeIdentifierDistanceSwimming",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
  ]);
  expect(apple.totals).toEqual({ distance: 1500, energyBurned: 235 });
  expect(apple.locations).toEqual([]);
});

test("Health Connect takes it as SWIMMING_POOL, with its pause and energy", () => {
  const records = healthConnectWorkout(poolWorkoutOf(swim(), 60, NO_BODY)!);
  // ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL.
  expect(records.session.exerciseType).toBe(74);
  expect(records.session.segments).toHaveLength(1);
  expect(records.distance?.distance).toEqual({ value: 1500, unit: "meters" });
  expect(records.calories?.energy).toEqual({ value: 235, unit: "kilocalories" });
});

test("a swim in open water says no location, as before", () => {
  const workout = { ...poolWorkoutOf(swim(), 60)!, pool: undefined };
  expect(appleWorkout(workout).metadata).not.toHaveProperty("HKSwimmingLocationType");
  expect(healthConnectWorkout(workout).session.exerciseType).toBe(73);
});

test("written with «Save» when the phone allows it, never failing", async () => {
  const write = jest.fn(async () => true);
  const phone: HealthPhone = {
    store: "apple",
    available: async () => true,
    permission: async () => "allowed",
    ask: async () => {},
    write,
  };
  expect(await savePoolToHealth(phone, swim(), 60)).toBe(true);
  expect(write).toHaveBeenCalledWith(expect.objectContaining({ distanceM: 1500 }));
  expect(
    await savePoolToHealth({ ...phone, permission: async () => "refused" }, swim(), 60),
  ).toBe(false);
  expect(
    await savePoolToHealth(
      {
        ...phone,
        write: async () => {
          throw new Error("no");
        },
      },
      swim(),
      60,
    ),
  ).toBe(false);
  expect(await savePoolToHealth(null, swim(), 60)).toBe(false);
});
