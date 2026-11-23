/**
 * What the live link of a workout at the gym sends (TASK-424 part B2): the
 * time without the pauses, the exercise in progress by its name, the
 * calories as the screen counts them, no distance.
 */
import { NO_BODY } from "../body/bodyProfile";
import { gymKcal } from "./gymKcal";
import { gymLiveStats } from "./gymLive";
import type { Entry } from "./setKinds";
import { chooseExercise, logSet, newWorkout, pauseWorkout } from "./workout";

const T0 = Date.UTC(2026, 10, 10, 17);
const MIN = 60_000;

function name(entry: Entry): string {
  return "exercise" in entry ? `name of ${entry.exercise}` : entry.name;
}

test("before the first exercise: the time and the calories, no exercise", () => {
  const stats = gymLiveStats(newWorkout("k", T0), T0 + 10 * MIN, NO_BODY, name, null);
  expect(stats).toEqual({
    duration_s: 600,
    kcal: gymKcal([], 600, NO_BODY, 2026),
    heart_bpm: null,
    exercise: null,
  });
  expect(stats).not.toHaveProperty("distance_m");
});

test("the exercise in progress, the sets in the calories, the pause out of the time", () => {
  let workout = newWorkout("k", T0);
  workout = chooseExercise(workout, { exercise: "bench_press", kind: "load" }, T0);
  workout = logSet(workout, { reps: 8, load_kg: 60 }, T0 + 2 * MIN)!;
  workout = pauseWorkout(workout, T0 + 20 * MIN);
  const stats = gymLiveStats(workout, T0 + 30 * MIN, NO_BODY, name, 118);
  expect(stats).toEqual({
    duration_s: 1200,
    kcal: gymKcal(workout.sets, 1200, NO_BODY, 2026),
    heart_bpm: 118,
    exercise: "name of bench_press",
  });
});
