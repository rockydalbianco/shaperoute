/**
 * The numbers of a recording without a track (TASK-424 part B2), within the
 * bounds the API takes (`LiveStatsBody`).
 */
import { tracklessStats } from "./liveStats";

test("whole numbers; no calories for zero; a heart rate out of bounds is none", () => {
  expect(tracklessStats({ activeMs: 61_400, kcal: 0, bpm: 300, lengths: 2.4 })).toEqual(
    { duration_s: 61, kcal: null, heart_bpm: null, lengths: 2 },
  );
  expect(tracklessStats({ activeMs: 1_000, kcal: 12.6, bpm: 140.4 })).toEqual({
    duration_s: 1,
    kcal: 13,
    heart_bpm: 140,
  });
});

test("the bounds of the API: lengths, time, calories", () => {
  expect(
    tracklessStats({ activeMs: 9e9, kcal: 9e9, bpm: null, lengths: 5000 }),
  ).toEqual({ duration_s: 200_000, kcal: 50_000, heart_bpm: null, lengths: 1000 });
});

test("the exercise: trimmed, at most 80 characters, none when empty", () => {
  const long = `  ${"🏋️".repeat(50)}  `;
  const stats = tracklessStats({ activeMs: 0, kcal: null, bpm: null, exercise: long });
  expect(Array.from(stats.exercise ?? "")).toHaveLength(80);
  expect(
    tracklessStats({ activeMs: 0, kcal: null, bpm: null, exercise: "   " }).exercise,
  ).toBeNull();
  expect(
    tracklessStats({ activeMs: 0, kcal: null, bpm: null, exercise: " Squat " })
      .exercise,
  ).toBe("Squat");
});
