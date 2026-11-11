import { NO_BODY } from "../body/bodyProfile";
import type { Track } from "../navigation/trackRecorder";
import { appleWorkout, DISTANCE_TYPE } from "./appleWorkout";
import { healthConnectWorkout } from "./healthConnectWorkout";
import { workoutOf } from "./workout";

// A morning on the snow (TASK-375): 8 km in two hours, two fixes.
const START = Date.UTC(2027, 0, 10, 9, 0, 0);
const DAY: Track = {
  fixes: [
    { point: [46.4097, 11.8441], timeMs: START, accuracyM: 5 },
    { point: [46.4817, 11.8441], timeMs: START + 7_200_000, accuracyM: 5 },
  ],
  distanceM: 8000,
  pauses: [],
};

test("a day of alpine skiing goes to Apple Health as downhill skiing", () => {
  const workout = workoutOf(DAY, "skiing", NO_BODY);
  // Its energy on the descents (TASK-424 part C2); with no heights the
  // whole day is one: two hours at 5.3 MET, 70 kg, less the rest.
  expect(workout).toMatchObject({ activity: "skiing", distanceM: 8000, kcal: 632 });
  const apple = appleWorkout(workout!);
  // HKWorkoutActivityType.downhillSkiing.
  expect(apple.activityType).toBe(61);
  // Its own distance would be a new permission: the total only, and the
  // energy every workout writes.
  expect(apple.quantities.map((sample) => sample.quantityType)).toEqual([
    "HKQuantityTypeIdentifierActiveEnergyBurned",
  ]);
  expect(apple.totals).toEqual({ distance: 8000, energyBurned: 632 });
  expect(apple.locations).toHaveLength(2);
  // Nothing new to ask Apple Health for.
  expect(Object.keys(DISTANCE_TYPE)).not.toContain("skiing");
});

test("a day of cross-country skiing goes to Apple Health as such", () => {
  const apple = appleWorkout(workoutOf(DAY, "xc_skiing", NO_BODY)!);
  // HKWorkoutActivityType.crossCountrySkiing.
  expect(apple.activityType).toBe(60);
  // 4 km/h on average: slow, 6.8 MET for two hours.
  expect(
    apple.quantities.map((sample) => [sample.quantityType, sample.quantity]),
  ).toEqual([["HKQuantityTypeIdentifierActiveEnergyBurned", 853]]);
  expect(Object.keys(DISTANCE_TYPE)).not.toContain("xc_skiing");
});

test.each(["skiing", "xc_skiing"] as const)(
  "a day of %s goes to Health Connect as skiing, with its distance",
  (activity) => {
    const records = healthConnectWorkout(workoutOf(DAY, activity, NO_BODY)!);
    // ExerciseSessionRecord.EXERCISE_TYPE_SKIING, for both.
    expect(records.session.exerciseType).toBe(61);
    expect(records.distance?.distance).toEqual({ value: 8000, unit: "meters" });
    // Its energy too (TASK-424 part C2).
    expect(records.calories?.energy.unit).toBe("kilocalories");
    expect(records.calories?.energy.value).toBeGreaterThan(0);
  },
);

test("a run keeps its distance and energy as before", () => {
  const apple = appleWorkout(workoutOf(DAY, "running", NO_BODY)!);
  expect(apple.activityType).toBe(37);
  expect(apple.quantities.map((sample) => sample.quantityType)).toEqual([
    "HKQuantityTypeIdentifierDistanceWalkingRunning",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
  ]);
});
