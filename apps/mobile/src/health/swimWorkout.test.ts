import type { Track } from "../navigation/trackRecorder";
import { appleWorkout, DISTANCE_TYPE } from "./appleWorkout";
import { healthConnectWorkout } from "./healthConnectWorkout";
import { workoutOf } from "./workout";

// A swim along a beach (TASK-323 C2): two fixes ten minutes apart.
const START = Date.UTC(2026, 6, 14, 8, 0, 0);
const SWIM: Track = {
  fixes: [
    { point: [44.0, 12.65], timeMs: START, accuracyM: 6 },
    { point: [44.0009, 12.6512], timeMs: START + 600_000, accuracyM: 9 },
  ],
  distanceM: 520,
  pauses: [],
};

test("a swim goes to Apple Health as a swim, with the swimming distance and energy", () => {
  const workout = workoutOf(SWIM, "swimming");
  // A pool's bands (TASK-424 part C2): 520 m in 10 min, 1:55 /100 m, 8 MET.
  expect(workout).toMatchObject({ activity: "swimming", kcal: 86 });
  const apple = appleWorkout(workout!);
  // HKWorkoutActivityType.swimming.
  expect(apple.activityType).toBe(46);
  expect(apple.quantities.map((sample) => sample.quantityType)).toEqual([
    "HKQuantityTypeIdentifierDistanceSwimming",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
  ]);
  expect(apple.totals).toEqual({ distance: 520, energyBurned: 86 });
  expect(DISTANCE_TYPE.swimming).toBe("HKQuantityTypeIdentifierDistanceSwimming");
});

test("a swim goes to Health Connect as open-water swimming", () => {
  const records = healthConnectWorkout(workoutOf(SWIM, "swimming")!);
  // ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER.
  expect(records.session.exerciseType).toBe(73);
});
