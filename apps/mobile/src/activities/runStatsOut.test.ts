import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { ActivityFix, ActivityRequest } from "../api/activities";
import { MAX_ELEVATION_POINTS } from "../api/runStats";
import { NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { elevationProfile, runStatsRequest } from "./runStatsOut";

// What the phone sends at the end of an activity for its post (TASK-410
// part C): the profile from the heights of the fixes, and the calories.

const START = 46.0671;
const LON = 11.1214;
const EARTH_RADIUS_M = 6_371_000;
const BASE: ActivityRequest = request as ActivityRequest;

/** A fix `metres` north of START, where the metres come back exactly. */
function north(metres: number, seconds: number, height?: number): ActivityFix {
  const fix: ActivityFix = {
    point: [START + ((metres / EARTH_RADIUS_M) * 180) / Math.PI, LON],
    time_ms: 1_790_000_000_000 + seconds * 1000,
  };
  return height === undefined ? fix : { ...fix, altitude_m: height };
}

const run = (track: ActivityFix[], pauses: ActivityRequest["pauses"] = []) => ({
  ...BASE,
  track,
  pauses,
});
const COUNTED = { activity: "running" as const, metres: 4000, seconds: 1200 };

test("the profile is the heights at the metres run to them", () => {
  const profile = elevationProfile(
    run([north(0, 0, 194), north(500, 150), north(1000, 300, 201.46)]),
  );
  // The fix without a height counts for the metres only.
  expect(profile).toEqual([
    { distance_m: 0, altitude_m: 194 },
    { distance_m: 1000, altitude_m: 201.5 },
  ]);
});

test("a long run's profile is reduced to the points the page draws", () => {
  // 500 fixes 10 m apart, climbing a metre every 10 m.
  const track = Array.from({ length: 500 }, (_, i) => north(i * 10, i * 3, 100 + i));
  const profile = elevationProfile(run(track));
  expect(profile).toHaveLength(MAX_ELEVATION_POINTS);
  expect(profile?.[0]).toEqual({ distance_m: 0, altitude_m: 100 });
  expect(profile?.[MAX_ELEVATION_POINTS - 1]).toEqual({
    distance_m: 4990,
    altitude_m: 599,
  });
  // Even steps, the heights along the line between the fixes.
  expect(profile?.[60].distance_m).toBe(Math.round((4990 * 60) / 119));
  expect(profile?.[60].altitude_m).toBeCloseTo(100 + (4990 * 60) / 119 / 10, 0);
});

test("a step across a pause asked for is no metre of the profile", () => {
  const track = [north(0, 0, 200), north(400, 120, 205), north(600, 400, 210)];
  const asked = [{ from_ms: 1_790_000_150_000, to_ms: 1_790_000_350_000, auto: false }];
  expect(elevationProfile(run(track, asked))?.map((p) => p.distance_m)).toEqual([
    0, 400, 400,
  ]);
  // Only one point with a height, or a run that went nowhere: no profile.
  expect(elevationProfile(run([north(0, 0, 200), north(400, 120)]))).toBeNull();
  expect(elevationProfile(run([north(0, 0, 200), north(0, 60, 201)]))).toBeNull();
});

test("the calories are the post's, counted with the phone's body", () => {
  const sent = runStatsRequest(BASE, COUNTED, NO_BODY, 2026);
  // The example run has no heights: the calories alone.
  expect(sent).toEqual({
    elevation: null,
    cadence_spm: null,
    kcal: activeKcal({ ...COUNTED, climbM: null }, NO_BODY, 2026),
  });
  expect(sent?.kcal).toBeGreaterThan(0);
  const heavier = runStatsRequest(BASE, COUNTED, { ...NO_BODY, weightKg: 90 }, 2026);
  expect(heavier?.kcal).toBeGreaterThan(sent?.kcal ?? 0);
});

test("nothing to send: no figures", () => {
  // At the gym or on the snow there are no calories of this kind, and an
  // activity of no metres has none.
  for (const activity of ["gym", "skiing"] as const) {
    expect(runStatsRequest(BASE, { ...COUNTED, activity }, NO_BODY, 2026)).toBeNull();
  }
  expect(runStatsRequest(BASE, { ...COUNTED, metres: 0 }, NO_BODY, 2026)).toBeNull();
  // A run with heights still sends its profile.
  const track = [north(0, 0, 200), north(400, 120, 205)];
  expect(
    runStatsRequest(run(track), { ...COUNTED, activity: "gym" }, NO_BODY, 2026)
      ?.elevation,
  ).toHaveLength(2);
});
