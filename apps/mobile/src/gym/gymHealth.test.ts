import { NO_BODY } from "../body/bodyProfile";
import { appleWorkout } from "../health/appleWorkout";
import { healthConnectWorkout } from "../health/healthConnectWorkout";
import type { HealthPhone } from "../health/healthPhone";
import { gymWorkoutOf, saveGymToHealth } from "./gymHealth";
import {
  chooseExercise,
  finishWorkout,
  logSet,
  newWorkout,
  pauseWorkout,
  resumeWorkout,
} from "./workout";

// TASK-385 part C, ADR-0327: a workout at the gym in Apple Health and
// Health Connect, as strength training with its energy.

jest.mock("../health/healthChoice", () => ({ loadHealthOn: () => true }));

const T0 = Date.UTC(2026, 10, 6, 7);
const MIN = 60_000;

function workout() {
  let going = newWorkout("gymkey12345", T0);
  going = chooseExercise(going, { exercise: "bench_press", kind: "load" }, T0 + MIN);
  going = logSet(going, { reps: 8, load_kg: 60 }, T0 + 2 * MIN)!;
  going = pauseWorkout(going, T0 + 30 * MIN);
  going = resumeWorkout(going, T0 + 40 * MIN);
  return finishWorkout(going, T0 + 70 * MIN);
}

test("the workout is strength training of its time, pauses out, no route", () => {
  // 60 minutes of weights with no body: 184 kcal (gymKcal.test.ts).
  expect(gymWorkoutOf(workout(), NO_BODY)).toEqual({
    activity: "gym",
    startMs: T0,
    endMs: T0 + 70 * MIN,
    distanceM: 0,
    kcal: 184,
    route: [],
    pauses: [{ fromMs: T0 + 30 * MIN, toMs: T0 + 40 * MIN }],
    syncId: "gymkey12345",
  });
  expect(gymWorkoutOf(newWorkout("k", T0), NO_BODY)).toBeNull();
});

test("Apple Health takes it indoors, with its energy and no distance", () => {
  const apple = appleWorkout(gymWorkoutOf(workout(), NO_BODY)!);
  // HKWorkoutActivityType.traditionalStrengthTraining.
  expect(apple.activityType).toBe(50);
  expect(apple.metadata.HKIndoorWorkout).toBe(true);
  expect(apple.quantities.map((sample) => sample.quantityType)).toEqual([
    "HKQuantityTypeIdentifierActiveEnergyBurned",
  ]);
  expect(apple.totals).toEqual({ distance: 0, energyBurned: 184 });
  expect(apple.locations).toEqual([]);
});

test("Health Connect takes it as STRENGTH_TRAINING, with its calories", () => {
  const records = healthConnectWorkout(gymWorkoutOf(workout(), NO_BODY)!);
  expect(records.session.exerciseType).toBe(70);
  expect(records.session.segments).toHaveLength(1);
  expect(records.distance).toBeNull();
  expect(records.calories?.energy).toEqual({ value: 184, unit: "kilocalories" });
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
  expect(await saveGymToHealth(phone, workout())).toBe(true);
  expect(write).toHaveBeenCalledWith(expect.objectContaining({ activity: "gym" }));
  expect(
    await saveGymToHealth({ ...phone, permission: async () => "refused" }, workout()),
  ).toBe(false);
  expect(
    await saveGymToHealth(
      {
        ...phone,
        write: async () => {
          throw new Error("no");
        },
      },
      workout(),
    ),
  ).toBe(false);
  expect(await saveGymToHealth(null, workout())).toBe(false);
});
